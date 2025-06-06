import { supabaseAdmin } from '../config/supabase.js';
import logger from '../utils/logger.ts';
import { validationResult } from 'express-validator';

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 0,
    currency: 'USD',
    features: {
      dailyRecommendations: 3,
      strategies: ['jesse-livermore'],
      portfolioLimit: 1,
      realTimeAlerts: false,
      apiAccess: false,
      backtesting: false,
      support: 'community'
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 29,
    currency: 'USD',
    features: {
      dailyRecommendations: 50,
      strategies: ['jesse-livermore', 'larry-williams', 'stan-weinstein'],
      portfolioLimit: 3,
      realTimeAlerts: true,
      apiAccess: false,
      backtesting: false,
      support: 'email'
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 99,
    currency: 'USD',
    features: {
      dailyRecommendations: null, // unlimited
      strategies: ['jesse-livermore', 'larry-williams', 'stan-weinstein'],
      portfolioLimit: 10,
      realTimeAlerts: true,
      apiAccess: true,
      backtesting: true,
      support: 'priority'
    }
  }
};

// Get available subscription plans
export const getPlans = async (req, res, next) => {
  try {
    const plans = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
      ...plan,
      features: {
        ...plan.features,
        dailyRecommendations: plan.features.dailyRecommendations || 'Unlimited'
      }
    }));

    res.json({
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

// Get current subscription
export const getCurrentSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error;
    }

    // If no active subscription, return basic tier info
    if (!subscription) {
      return res.json({
        data: {
          tier: 'basic',
          status: 'active',
          features: SUBSCRIPTION_PLANS.basic.features,
          expires_at: null
        }
      });
    }

    const plan = SUBSCRIPTION_PLANS[subscription.tier];

    res.json({
      data: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        started_at: subscription.started_at,
        expires_at: subscription.expires_at,
        auto_renew: subscription.auto_renew,
        features: plan.features,
        price: plan.price,
        currency: plan.currency
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create or update subscription
export const createSubscription = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { tier, payment_method_id } = req.body;

    // Validate tier
    if (!SUBSCRIPTION_PLANS[tier]) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid subscription tier'
      });
    }

    const plan = SUBSCRIPTION_PLANS[tier];

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'You already have an active subscription. Please upgrade or cancel your current subscription first.'
      });
    }

    // For basic tier, no payment required
    if (tier === 'basic') {
      const { data: subscription, error } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          tier: 'basic',
          status: 'active',
          started_at: new Date().toISOString(),
          auto_renew: false
        })
        .select()
        .single();

      if (error) throw error;

      // Update user profile
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_tier: 'basic',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return res.status(201).json({
        message: 'Basic subscription activated',
        data: subscription
      });
    }

    // For paid tiers, process payment (simplified for demo)
    // In production, integrate with Stripe or similar payment processor
    const paymentResult = await processPayment(payment_method_id, plan.price, plan.currency);

    if (!paymentResult.success) {
      return res.status(400).json({
        error: 'Payment Failed',
        message: paymentResult.error
      });
    }

    // Create subscription
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        tier,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        auto_renew: true,
        payment_method_id,
        last_payment_id: paymentResult.payment_id,
        last_payment_amount: plan.price
      })
      .select()
      .single();

    if (error) throw error;

    // Update user profile
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    // Log subscription event
    await supabaseAdmin
      .from('subscription_events')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        event_type: 'SUBSCRIPTION_CREATED',
        tier,
        amount: plan.price,
        details: { payment_id: paymentResult.payment_id }
      });

    logger.info(`User ${userId} subscribed to ${tier} plan`);

    res.status(201).json({
      message: `Successfully subscribed to ${plan.name} plan`,
      data: {
        ...subscription,
        features: plan.features
      }
    });
  } catch (error) {
    next(error);
  }
};

// Upgrade subscription
export const upgradeSubscription = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { new_tier, payment_method_id } = req.body;

    // Get current subscription
    const { data: currentSubscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError || !currentSubscription) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No active subscription found'
      });
    }

    // Validate upgrade path
    const tierHierarchy = { basic: 0, premium: 1, professional: 2 };
    if (tierHierarchy[new_tier] <= tierHierarchy[currentSubscription.tier]) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Can only upgrade to a higher tier'
      });
    }

    const newPlan = SUBSCRIPTION_PLANS[new_tier];
    const currentPlan = SUBSCRIPTION_PLANS[currentSubscription.tier];

    // Calculate prorated amount
    const daysRemaining = Math.max(0, 
      Math.ceil((new Date(currentSubscription.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    );
    const proratedCredit = (currentPlan.price / 30) * daysRemaining;
    const amountDue = newPlan.price - proratedCredit;

    // Process payment for upgrade
    const paymentResult = await processPayment(payment_method_id, amountDue, newPlan.currency);

    if (!paymentResult.success) {
      return res.status(400).json({
        error: 'Payment Failed',
        message: paymentResult.error
      });
    }

    // Update subscription
    const { data: updatedSubscription, error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        tier: new_tier,
        last_payment_id: paymentResult.payment_id,
        last_payment_amount: amountDue,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSubscription.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update user profile
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: new_tier,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    // Log upgrade event
    await supabaseAdmin
      .from('subscription_events')
      .insert({
        user_id: userId,
        subscription_id: currentSubscription.id,
        event_type: 'SUBSCRIPTION_UPGRADED',
        tier: new_tier,
        amount: amountDue,
        details: {
          from_tier: currentSubscription.tier,
          prorated_credit: proratedCredit,
          payment_id: paymentResult.payment_id
        }
      });

    logger.info(`User ${userId} upgraded from ${currentSubscription.tier} to ${new_tier}`);

    res.json({
      message: `Successfully upgraded to ${newPlan.name} plan`,
      data: {
        ...updatedSubscription,
        features: newPlan.features,
        prorated_credit: proratedCredit,
        amount_paid: amountDue
      }
    });
  } catch (error) {
    next(error);
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reason, feedback } = req.body;

    // Get current subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No active subscription found'
      });
    }

    if (subscription.tier === 'basic') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot cancel basic tier subscription'
      });
    }

    // Update subscription to cancelled
    const { data: cancelledSubscription, error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renew: false,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        cancellation_feedback: feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // The subscription remains active until expires_at
    // Update user profile when it actually expires
    
    // Log cancellation event
    await supabaseAdmin
      .from('subscription_events')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        event_type: 'SUBSCRIPTION_CANCELLED',
        tier: subscription.tier,
        details: { reason, feedback }
      });

    logger.info(`User ${userId} cancelled ${subscription.tier} subscription`);

    res.json({
      message: 'Subscription cancelled successfully',
      data: {
        ...cancelledSubscription,
        active_until: subscription.expires_at,
        will_downgrade_to: 'basic'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get subscription usage
export const getUsage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = 'current' } = req.query;

    // Get current subscription
    const userTier = req.user.subscription_tier || 'basic';
    const plan = SUBSCRIPTION_PLANS[userTier];

    // Calculate usage period
    let startDate, endDate;
    if (period === 'current') {
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    } else {
      // Parse custom period
      [startDate, endDate] = period.split(',').map(d => new Date(d));
    }

    // Get recommendation views count
    const { count: recommendationViews } = await supabaseAdmin
      .from('user_recommendation_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('viewed_at', startDate.toISOString())
      .lte('viewed_at', endDate.toISOString());

    // Get API calls count (if applicable)
    let apiCalls = 0;
    if (plan.features.apiAccess) {
      const { count } = await supabaseAdmin
        .from('api_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      apiCalls = count || 0;
    }

    // Get portfolio count
    const { count: portfolioCount } = await supabaseAdmin
      .from('portfolios')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get active strategy subscriptions
    const { data: strategySubscriptions } = await supabaseAdmin
      .from('user_strategy_subscriptions')
      .select('strategy_id')
      .eq('user_id', userId);

    const usage = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      tier: userTier,
      limits: plan.features,
      current: {
        dailyRecommendations: {
          used: recommendationViews || 0,
          limit: plan.features.dailyRecommendations || 'Unlimited',
          remaining: plan.features.dailyRecommendations 
            ? Math.max(0, plan.features.dailyRecommendations - (recommendationViews || 0))
            : 'Unlimited'
        },
        portfolios: {
          used: portfolioCount || 0,
          limit: plan.features.portfolioLimit
        },
        strategies: {
          subscribed: strategySubscriptions?.map(s => s.strategy_id) || [],
          available: plan.features.strategies
        },
        apiCalls: plan.features.apiAccess ? {
          used: apiCalls,
          limit: 'Unlimited'
        } : null
      }
    };

    res.json({ data: usage });
  } catch (error) {
    next(error);
  }
};

// Get subscription history
export const getSubscriptionHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const { data: events, error, count } = await supabaseAdmin
      .from('subscription_events')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      data: events,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update payment method
export const updatePaymentMethod = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { payment_method_id } = req.body;

    // Get active subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No active subscription found'
      });
    }

    if (subscription.tier === 'basic') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Basic tier does not require payment method'
      });
    }

    // Validate payment method (simplified)
    const isValid = await validatePaymentMethod(payment_method_id);
    if (!isValid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payment method'
      });
    }

    // Update subscription
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        payment_method_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      message: 'Payment method updated successfully',
      data: {
        subscription_id: updated.id,
        payment_method_id: updated.payment_method_id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Mock payment processing function (replace with real payment processor)
async function processPayment(paymentMethodId, amount, currency) {
  // Simulate payment processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock success/failure
  if (Math.random() > 0.1) { // 90% success rate
    return {
      success: true,
      payment_id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      currency
    };
  } else {
    return {
      success: false,
      error: 'Payment declined'
    };
  }
}

// Mock payment method validation
async function validatePaymentMethod(paymentMethodId) {
  // In production, validate with payment processor
  return paymentMethodId && paymentMethodId.startsWith('pm_');
}

