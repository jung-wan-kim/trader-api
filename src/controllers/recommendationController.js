const { supabaseAdmin } = require('../config/supabase.js');
const logger = require('../utils/logger.js');
const { getFinnhubClient } = require('../services/finnhubService.js');
const dayjs = require('dayjs');

// Get recommendations based on user's subscribed strategies
const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userTier = req.user.subscription_tier || 'basic';
    const { 
      strategy_id,
      action,
      risk_level,
      confidence_min,
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      order = 'desc'
    } = req.query;

    // Get daily recommendation limit based on subscription tier
    const dailyLimits = {
      basic: 3,
      premium: 50,
      professional: null // unlimited
    };

    // Build base query
    let query = supabaseAdmin
      .from('recommendations')
      .select(`
        *,
        strategy:strategies(id, name, type),
        positions:positions(count)
      `, { count: 'exact' })
      .eq('status', 'active');

    // Filter by user's subscribed strategies if not admin
    if (userTier === 'basic') {
      // Basic users only see Jesse Livermore recommendations
      query = query.eq('strategy_id', 'jesse-livermore');
    } else if (strategy_id) {
      query = query.eq('strategy_id', strategy_id);
    } else {
      // Get user's subscribed strategies
      const { data: subscriptions } = await supabaseAdmin
        .from('user_strategy_subscriptions')
        .select('strategy_id')
        .eq('user_id', userId);
      
      if (subscriptions && subscriptions.length > 0) {
        const strategyIds = subscriptions.map(s => s.strategy_id);
        query = query.in('strategy_id', strategyIds);
      }
    }

    // Apply filters
    if (action) query = query.eq('action', action);
    if (risk_level) query = query.eq('risk_level', risk_level);
    if (confidence_min) query = query.gte('confidence', parseFloat(confidence_min));

    // Apply sorting
    const validSortFields = ['created_at', 'confidence', 'expected_return', 'risk_reward_ratio'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(sortField, { ascending: order === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: recommendations, error, count } = await query;

    if (error) throw error;

    // Check daily limit for basic users
    if (userTier === 'basic' && dailyLimits[userTier]) {
      const today = dayjs().format('YYYY-MM-DD');
      const { count: todayCount } = await supabaseAdmin
        .from('user_recommendation_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('viewed_at', today);

      const remaining = dailyLimits[userTier] - (todayCount || 0);
      
      if (remaining <= 0) {
        return res.status(403).json({
          error: 'Limit Exceeded',
          message: 'Daily recommendation limit reached. Upgrade to Premium for more recommendations.'
        });
      }

      // Log view for basic users
      const viewsToLog = recommendations.slice(0, remaining).map(rec => ({
        user_id: userId,
        recommendation_id: rec.id,
        viewed_at: new Date().toISOString()
      }));

      if (viewsToLog.length > 0) {
        await supabaseAdmin
          .from('user_recommendation_views')
          .insert(viewsToLog);
      }

      // Limit recommendations to remaining count
      if (recommendations.length > remaining) {
        recommendations.length = remaining;
      }
    }

    res.json({
      data: recommendations,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      },
      daily_limit: dailyLimits[userTier],
      daily_remaining: userTier === 'basic' ? dailyLimits[userTier] - recommendations.length : null
    });
  } catch (error) {
    next(error);
  }
};

// Get recommendation by ID
const getRecommendationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userTier = req.user.subscription_tier || 'basic';

    const { data: recommendation, error } = await supabaseAdmin
      .from('recommendations')
      .select(`
        *,
        strategy:strategies(id, name, type, description),
        technical_analysis,
        risk_analysis
      `)
      .eq('id', id)
      .single();

    if (error || !recommendation) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recommendation not found'
      });
    }

    // Check access permissions
    if (userTier === 'basic' && recommendation.strategy_id !== 'jesse-livermore') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Upgrade to Premium to access this recommendation'
      });
    }

    // Get real-time price update
    try {
      const finnhub = getFinnhubClient();
      const quote = await finnhub.quote(recommendation.symbol);
      recommendation.current_market_price = quote.c;
      recommendation.price_change = quote.d;
      recommendation.price_change_percent = quote.dp;
    } catch (error) {
      logger.error('Error fetching real-time price:', error);
    }

    // Get performance if position exists
    const { data: positions } = await supabaseAdmin
      .from('positions')
      .select('*')
      .eq('recommendation_id', id);

    if (positions && positions.length > 0) {
      const closedPositions = positions.filter(p => p.status === 'closed');
      const totalProfitLoss = closedPositions.reduce((sum, p) => sum + (p.profit_loss || 0), 0);
      const winningTrades = closedPositions.filter(p => p.profit_loss > 0).length;

      recommendation.performance = {
        total_followers: positions.length,
        closed_positions: closedPositions.length,
        winning_trades: winningTrades,
        total_profit_loss: totalProfitLoss,
        win_rate: closedPositions.length > 0 
          ? (winningTrades / closedPositions.length * 100).toFixed(2)
          : 0
      };
    }

    res.json({ data: recommendation });
  } catch (error) {
    next(error);
  }
};

// Get recommendations for a specific strategy
const getRecommendationsByStrategy = async (req, res, next) => {
  try {
    const { strategyId } = req.params;
    const userTier = req.user.subscription_tier || 'basic';
    const { limit = 20, offset = 0 } = req.query;

    // Check access permissions
    if (userTier === 'basic' && strategyId !== 'jesse-livermore') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Upgrade to Premium to access this strategy'
      });
    }

    const { data: recommendations, error, count } = await supabaseAdmin
      .from('recommendations')
      .select('*', { count: 'exact' })
      .eq('strategy_id', strategyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      data: recommendations,
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

// Get live/real-time recommendations (WebSocket endpoint info)
const getLiveRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userTier = req.user.subscription_tier || 'basic';

    if (userTier === 'basic') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Real-time recommendations are available for Premium and Professional subscribers only'
      });
    }

    // Return WebSocket connection info
    res.json({
      websocket_url: `${process.env.WS_URL}/recommendations`,
      connection_params: {
        authorization: req.headers.authorization
      },
      channels: {
        all: '/recommendations/all',
        strategy: '/recommendations/strategy/{strategy_id}',
        high_confidence: '/recommendations/high-confidence'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Follow a recommendation (create position)
const followRecommendation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { 
      portfolio_id,
      quantity,
      entry_price,
      custom_stop_loss,
      custom_take_profit 
    } = req.body;

    // Get recommendation details
    const { data: recommendation, error: recError } = await supabaseAdmin
      .from('recommendations')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (recError || !recommendation) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recommendation not found or no longer active'
      });
    }

    // Verify portfolio ownership
    const { data: portfolio, error: portError } = await supabaseAdmin
      .from('portfolios')
      .select('*')
      .eq('id', portfolio_id)
      .eq('user_id', userId)
      .single();

    if (portError || !portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found'
      });
    }

    // Calculate position size based on risk management
    const positionValue = quantity * (entry_price || recommendation.entry_price);
    const portfolioRiskLimit = portfolio.current_value * 0.1; // Max 10% per position

    if (positionValue > portfolioRiskLimit) {
      return res.status(400).json({
        error: 'Risk Limit Exceeded',
        message: `Position size exceeds 10% portfolio limit. Maximum allowed: $${portfolioRiskLimit.toFixed(2)}`
      });
    }

    // Create position
    const { data: position, error: posError } = await supabaseAdmin
      .from('positions')
      .insert({
        portfolio_id,
        recommendation_id: id,
        user_id: userId,
        symbol: recommendation.symbol,
        company_name: recommendation.company_name,
        action: recommendation.action,
        quantity,
        entry_price: entry_price || recommendation.entry_price,
        stop_loss: custom_stop_loss || recommendation.stop_loss,
        take_profit: custom_take_profit || recommendation.take_profit,
        strategy_id: recommendation.strategy_id,
        status: 'open',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (posError) throw posError;

    // Update portfolio
    const newCashBalance = portfolio.cash_balance - positionValue;
    await supabaseAdmin
      .from('portfolios')
      .update({
        cash_balance: newCashBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', portfolio_id);

    // Log activity
    await supabaseAdmin
      .from('trading_activities')
      .insert({
        user_id: userId,
        portfolio_id,
        position_id: position.id,
        action: 'OPEN_POSITION',
        details: {
          recommendation_id: id,
          symbol: recommendation.symbol,
          quantity,
          entry_price: position.entry_price,
          position_value: positionValue
        }
      });

    logger.info(`User ${userId} followed recommendation ${id}`);

    res.status(201).json({
      message: 'Position created successfully',
      data: position
    });
  } catch (error) {
    next(error);
  }
};

// Like/Unlike recommendation
const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if already liked
    const { data: existingLike } = await supabaseAdmin
      .from('recommendation_likes')
      .select('*')
      .eq('user_id', userId)
      .eq('recommendation_id', id)
      .single();

    if (existingLike) {
      // Unlike
      await supabaseAdmin
        .from('recommendation_likes')
        .delete()
        .eq('user_id', userId)
        .eq('recommendation_id', id);

      await supabaseAdmin.rpc('decrement_recommendation_likes', { 
        recommendation_id_param: id 
      });

      res.json({ 
        message: 'Recommendation unliked', 
        liked: false 
      });
    } else {
      // Like
      await supabaseAdmin
        .from('recommendation_likes')
        .insert({
          user_id: userId,
          recommendation_id: id
        });

      await supabaseAdmin.rpc('increment_recommendation_likes', { 
        recommendation_id_param: id 
      });

      res.json({ 
        message: 'Recommendation liked', 
        liked: true 
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get recommendation performance analytics
const getRecommendationPerformance = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get recommendation
    const { data: recommendation, error: recError } = await supabaseAdmin
      .from('recommendations')
      .select('*')
      .eq('id', id)
      .single();

    if (recError || !recommendation) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recommendation not found'
      });
    }

    // Get all positions based on this recommendation
    const { data: positions, error: posError } = await supabaseAdmin
      .from('positions')
      .select('*')
      .eq('recommendation_id', id);

    if (posError) throw posError;

    // Calculate performance metrics
    const totalPositions = positions.length;
    const openPositions = positions.filter(p => p.status === 'open');
    const closedPositions = positions.filter(p => p.status === 'closed');
    const profitablePositions = closedPositions.filter(p => p.profit_loss > 0);
    const totalProfitLoss = closedPositions.reduce((sum, p) => sum + (p.profit_loss || 0), 0);
    const totalInvestment = closedPositions.reduce((sum, p) => sum + (p.quantity * p.entry_price), 0);

    // Get current market price
    let currentPrice = recommendation.entry_price;
    try {
      const finnhub = getFinnhubClient();
      const quote = await finnhub.quote(recommendation.symbol);
      currentPrice = quote.c;
    } catch (error) {
      logger.error('Error fetching current price:', error);
    }

    // Calculate unrealized P&L for open positions
    const unrealizedPL = openPositions.reduce((sum, p) => {
      const pl = (currentPrice - p.entry_price) * p.quantity;
      return sum + (p.action === 'SELL' ? -pl : pl);
    }, 0);

    const performance = {
      recommendation_id: id,
      symbol: recommendation.symbol,
      strategy_id: recommendation.strategy_id,
      created_at: recommendation.created_at,
      entry_price: recommendation.entry_price,
      current_price: currentPrice,
      price_change: ((currentPrice - recommendation.entry_price) / recommendation.entry_price * 100).toFixed(2),
      metrics: {
        total_followers: totalPositions,
        open_positions: openPositions.length,
        closed_positions: closedPositions.length,
        profitable_positions: profitablePositions.length,
        losing_positions: closedPositions.length - profitablePositions.length,
        win_rate: closedPositions.length > 0 
          ? (profitablePositions.length / closedPositions.length * 100).toFixed(2)
          : 0,
        total_profit_loss: totalProfitLoss.toFixed(2),
        total_return: totalInvestment > 0
          ? (totalProfitLoss / totalInvestment * 100).toFixed(2)
          : 0,
        unrealized_profit_loss: unrealizedPL.toFixed(2),
        average_profit: profitablePositions.length > 0
          ? (profitablePositions.reduce((sum, p) => sum + p.profit_loss, 0) / profitablePositions.length).toFixed(2)
          : 0,
        average_loss: (closedPositions.length - profitablePositions.length) > 0
          ? (closedPositions.filter(p => p.profit_loss < 0).reduce((sum, p) => sum + p.profit_loss, 0) / (closedPositions.length - profitablePositions.length)).toFixed(2)
          : 0
      },
      target_reached: recommendation.take_profit && currentPrice >= recommendation.take_profit,
      stop_loss_hit: recommendation.stop_loss && currentPrice <= recommendation.stop_loss
    };

    res.json({ data: performance });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
  getRecommendationById,
  getRecommendationsByStrategy,
  getLiveRecommendations,
  followRecommendation,
  toggleLike,
  getRecommendationPerformance
};

export default {
  getRecommendations,
  getRecommendationById,
  getRecommendationsByStrategy,
  getLiveRecommendations,
  followRecommendation,
  toggleLike,
  getRecommendationPerformance
};