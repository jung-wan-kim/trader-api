const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const logger = require('../utils/logger');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: passwordHash,
          name
        }
      ])
      .select('id, email, name')
      .single();

    if (error) {
      throw error;
    }

    // Create default portfolio
    await supabase
      .from('portfolios')
      .insert([
        {
          user_id: user.id,
          name: 'Main Portfolio',
          initial_capital: 10000,
          current_value: 10000
        }
      ]);

    // Generate token
    const token = generateToken(user.id);

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        ignoreExpiration: true
      });

      // Check if token is not too old (max 30 days)
      const tokenAge = Date.now() / 1000 - decoded.iat;
      if (tokenAge > 30 * 24 * 60 * 60) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token too old, please login again'
        });
      }

      // Generate new token
      const newToken = generateToken(decoded.userId);

      res.json({
        message: 'Token refreshed successfully',
        token: newToken
      });
    } catch (err) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // In a more complex implementation, you might want to:
    // - Add the token to a blacklist
    // - Clear refresh tokens from database
    // - Log the logout event
    
    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout
};