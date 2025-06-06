const { supabase } = require('../config/database');
const logger = require('../utils/logger');

const getStrategies = async (req, res, next) => {
  try {
    const { 
      tradingStyle, 
      riskLevel,
      minWinRate,
      sortBy = 'followers_count',
      order = 'desc',
      limit = 20,
      offset = 0
    } = req.query;

    let query = supabase
      .from('strategies')
      .select(`
        *,
        trader:traders(id, name, rating, followers_count)
      `, { count: 'exact' })
      .eq('is_active', true);

    // Apply filters
    if (tradingStyle) query = query.eq('trading_style', tradingStyle);
    if (riskLevel) query = query.eq('risk_level', riskLevel);
    if (minWinRate) query = query.gte('win_rate', minWinRate);

    // Apply sorting
    const validSortFields = ['followers_count', 'win_rate', 'sharpe_ratio', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'followers_count';
    query = query.order(sortField, { ascending: order === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: strategies, error, count } = await query;

    if (error) throw error;

    res.json({
      data: strategies,
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

const getStrategyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: strategy, error } = await supabase
      .from('strategies')
      .select(`
        *,
        trader:traders(id, name, bio, rating, followers_count, verified)
      `)
      .eq('id', id)
      .single();

    if (error || !strategy) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Strategy not found'
      });
    }

    // Get recent performance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentRecommendations } = await supabase
      .from('recommendations')
      .select('id, created_at, action, confidence')
      .eq('strategy_id', id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    strategy.recent_recommendations = recentRecommendations || [];

    res.json({ data: strategy });
  } catch (error) {
    next(error);
  }
};

const getStrategiesByTrader = async (req, res, next) => {
  try {
    const { traderId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const { data: strategies, error, count } = await supabase
      .from('strategies')
      .select('*', { count: 'exact' })
      .eq('trader_id', traderId)
      .eq('is_active', true)
      .order('followers_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      data: strategies,
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

const subscribeToStrategy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if strategy exists
    const { data: strategy, error: stratError } = await supabase
      .from('strategies')
      .select('id, name')
      .eq('id', id)
      .single();

    if (stratError || !strategy) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Strategy not found'
      });
    }

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('user_strategy_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('strategy_id', id)
      .single();

    if (existing) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Already subscribed to this strategy'
      });
    }

    // Create subscription
    const { error: subError } = await supabase
      .from('user_strategy_subscriptions')
      .insert([{ user_id: userId, strategy_id: id }]);

    if (subError) throw subError;

    logger.info(`User ${userId} subscribed to strategy ${id}`);

    res.status(201).json({
      message: 'Successfully subscribed to strategy',
      data: { strategy_id: id, strategy_name: strategy.name }
    });
  } catch (error) {
    next(error);
  }
};

const unsubscribeFromStrategy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('user_strategy_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('strategy_id', id);

    if (error) throw error;

    logger.info(`User ${userId} unsubscribed from strategy ${id}`);

    res.json({
      message: 'Successfully unsubscribed from strategy'
    });
  } catch (error) {
    next(error);
  }
};

const getStrategyPerformance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { period = '1M' } = req.query;

    // Get strategy
    const { data: strategy, error: stratError } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', id)
      .single();

    if (stratError || !strategy) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Strategy not found'
      });
    }

    // Get recommendations for the period
    const startDate = getStartDate(period);
    
    const { data: recommendations, error: recError } = await supabase
      .from('recommendations')
      .select('id, created_at, action, confidence')
      .eq('strategy_id', id)
      .gte('created_at', startDate.toISOString());

    if (recError) throw recError;

    // Get positions based on these recommendations
    const recommendationIds = recommendations.map(r => r.id);
    
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .in('recommendation_id', recommendationIds);

    if (posError) throw posError;

    // Calculate performance metrics
    const closedPositions = positions.filter(p => p.status === 'closed');
    const totalProfitLoss = closedPositions.reduce((sum, p) => sum + (p.profit_loss || 0), 0);
    const winningTrades = closedPositions.filter(p => p.profit_loss > 0).length;
    
    const periodWinRate = closedPositions.length > 0 
      ? (winningTrades / closedPositions.length * 100)
      : 0;

    // Monthly returns calculation
    const monthlyReturns = calculateMonthlyReturns(closedPositions);

    res.json({
      data: {
        strategy_id: id,
        period,
        overall: {
          win_rate: strategy.win_rate,
          average_return: strategy.average_return,
          sharpe_ratio: strategy.sharpe_ratio,
          max_drawdown: strategy.max_drawdown,
          total_trades: strategy.total_trades
        },
        period_performance: {
          total_recommendations: recommendations.length,
          total_positions: positions.length,
          closed_positions: closedPositions.length,
          winning_trades: winningTrades,
          losing_trades: closedPositions.length - winningTrades,
          win_rate: periodWinRate.toFixed(2),
          total_profit_loss: totalProfitLoss.toFixed(2)
        },
        monthly_returns: monthlyReturns
      }
    });
  } catch (error) {
    next(error);
  }
};

const getStrategyFollowers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Get strategy
    const { data: strategy, error: stratError } = await supabase
      .from('strategies')
      .select('id, name, trader_id')
      .eq('id', id)
      .single();

    if (stratError || !strategy) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Strategy not found'
      });
    }

    // Get subscribers count
    const { count: totalFollowers, error: countError } = await supabase
      .from('user_strategy_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('strategy_id', id);

    if (countError) throw countError;

    // Get recent subscribers
    const { data: recentSubscribers, error: subError } = await supabase
      .from('user_strategy_subscriptions')
      .select(`
        created_at,
        user:users(id, name)
      `)
      .eq('strategy_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (subError) throw subError;

    res.json({
      data: {
        strategy_id: id,
        strategy_name: strategy.name,
        total_followers: totalFollowers,
        recent_subscribers: recentSubscribers,
        pagination: {
          total: totalFollowers,
          limit,
          offset,
          hasMore: offset + limit < totalFollowers
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case '1W': return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '1M': return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case '3M': return new Date(now - 90 * 24 * 60 * 60 * 1000);
    case '6M': return new Date(now - 180 * 24 * 60 * 60 * 1000);
    case '1Y': return new Date(now - 365 * 24 * 60 * 60 * 1000);
    case 'ALL': return new Date('2020-01-01');
    default: return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
}

function calculateMonthlyReturns(positions) {
  const monthlyData = {};
  
  positions.forEach(position => {
    if (position.closed_at && position.profit_loss !== null) {
      const month = new Date(position.closed_at).toISOString().slice(0, 7);
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          profit_loss: 0,
          trades: 0,
          winning_trades: 0
        };
      }
      
      monthlyData[month].profit_loss += position.profit_loss;
      monthlyData[month].trades++;
      if (position.profit_loss > 0) {
        monthlyData[month].winning_trades++;
      }
    }
  });

  return Object.values(monthlyData).map(data => ({
    ...data,
    win_rate: data.trades > 0 ? (data.winning_trades / data.trades * 100).toFixed(2) : 0
  }));
}

module.exports = {
  getStrategies,
  getStrategyById,
  getStrategiesByTrader,
  subscribeToStrategy,
  unsubscribeFromStrategy,
  getStrategyPerformance,
  getStrategyFollowers
};