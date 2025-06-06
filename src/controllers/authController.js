const { supabase, supabaseAdmin } = require('../config/supabase.js');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger.js');

// Register new user
const register = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, investmentStyle } = req.body;

    // Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          investment_style: investmentStyle
        }
      }
    });

    if (authError) {
      logger.error('Signup error:', authError);
      return res.status(400).json({
        error: 'Registration failed',
        message: authError.message
      });
    }

    // Create profile in database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        name,
        investment_style: investmentStyle,
        subscription_tier: 'basic',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      logger.error('Profile creation error:', profileError);
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        error: 'Registration failed',
        message: 'Failed to create user profile'
      });
    }

    // Create default portfolio
    await supabaseAdmin
      .from('portfolios')
      .insert({
        user_id: authData.user.id,
        name: 'Main Portfolio',
        initial_capital: 10000,
        current_value: 10000
      });

    logger.info(`New user registered: ${email}`);

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        investment_style: investmentStyle
      },
      session: authData.session
    });
  } catch (error) {
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: error.message
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*, subscriptions(*)')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      logger.error('Profile fetch error:', profileError);
    }

    logger.info(`User logged in: ${email}`);

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile
      },
      session: data.session
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Refresh token is required'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        error: 'Token refresh failed',
        message: error.message
      });
    }

    return res.status(200).json({
      message: 'Token refreshed successfully',
      session: data.session
    });
  } catch (error) {
    next(error);
  }
};

// Logout user
const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);

    if (token) {
      // Sign out from Supabase
      await supabase.auth.signOut();
    }

    return res.status(200).json({
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

// Get user profile
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        subscriptions (
          id,
          tier,
          status,
          started_at,
          expires_at
        ),
        portfolio_stats:portfolio_performance (
          total_value,
          total_profit_loss,
          total_profit_loss_percentage,
          winning_trades,
          losing_trades,
          win_rate
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Profile fetch error:', error);
      return res.status(404).json({
        error: 'Not found',
        message: 'Profile not found'
      });
    }

    return res.status(200).json({
      profile
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { name, investment_style, risk_tolerance, notification_preferences } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (investment_style !== undefined) updateData.investment_style = investment_style;
    if (risk_tolerance !== undefined) updateData.risk_tolerance = risk_tolerance;
    if (notification_preferences !== undefined) updateData.notification_preferences = notification_preferences;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Profile update error:', error);
      return res.status(400).json({
        error: 'Update failed',
        message: 'Failed to update profile'
      });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    next(error);
  }
};

// Change password
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { current_password, new_password } = req.body;
    const userEmail = req.user.email;

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: current_password
    });

    if (signInError) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password
    });

    if (updateError) {
      return res.status(400).json({
        error: 'Update failed',
        message: updateError.message
      });
    }

    return res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Request password reset
const requestPasswordReset = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      return res.status(400).json({
        error: 'Reset failed',
        message: error.message
      });
    }

    return res.status(200).json({
      message: 'Password reset email sent'
    });
  } catch (error) {
    next(error);
  }
};

// Delete account
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password
    });

    if (signInError) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Password is incorrect'
      });
    }

    // Delete user data (cascade delete will handle related records)
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      logger.error('Profile deletion error:', deleteError);
    }

    // Delete auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      logger.error('Auth deletion error:', authDeleteError);
      return res.status(500).json({
        error: 'Deletion failed',
        message: 'Failed to delete account'
      });
    }

    return res.status(200).json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  deleteAccount
};

export default {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  deleteAccount
};