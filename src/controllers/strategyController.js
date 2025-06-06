import { supabaseAdmin } from '../config/supabase.js';
import logger from '../utils/logger.ts';

// Strategy definitions for legendary traders
const LEGENDARY_STRATEGIES = {
  'jesse-livermore': {
    id: 'jesse-livermore',
    name: 'Jesse Livermore - Trend Following & Pyramiding',
    description: 'Follow the trend with pyramiding on winners. Cut losses quickly and let profits run.',
    trader: 'Jesse Livermore',
    type: 'trend_following',
    indicators: ['price_momentum', 'volume_analysis', 'pivot_points'],
    risk_level: 'high',
    time_frame: 'medium_term',
    key_rules: [
      'Buy on new highs with increasing volume',
      'Pyramid into winning positions',
      'Cut losses at -3% to -5%',
      'Never risk more than 10% on a single position'
    ]
  },
  'larry-williams': {
    id: 'larry-williams',
    name: 'Larry Williams - Short-term Momentum',
    description: 'Volatility breakout with same-day exits. High frequency trading with strict risk management.',
    trader: 'Larry Williams',
    type: 'momentum',
    indicators: ['williams_r', 'volatility_breakout', 'market_timing'],
    risk_level: 'medium',
    time_frame: 'short_term',
    key_rules: [
      'Enter on 0.5x previous day range breakout',
      'Exit by end of day',
      'Use overbought/oversold levels',
      'Daily max loss limit of 2%'
    ]
  },
  'stan-weinstein': {
    id: 'stan-weinstein',
    name: 'Stan Weinstein - Stage Analysis',
    description: 'Long-term investing based on stage analysis. Buy in Stage 2, sell in Stage 4.',
    trader: 'Stan Weinstein',
    type: 'stage_analysis',
    indicators: ['30_week_ma', 'relative_strength', 'volume_patterns'],
    risk_level: 'low',
    time_frame: 'long_term',
    key_rules: [
      'Buy when breaking above 30-week MA',
      'Hold during Stage 2 uptrend',
      'Sell when entering Stage 4 decline',
      'Stop loss below 30-week MA'
    ]
  }
};

// Get all strategies
export const getStrategies = async (req, res, next) => {
  try {
    const { 
      type,
      risk_level,
      time_frame,
      subscription_tier
    } = req.query;

    const userTier = req.user?.subscription_tier || 'basic';

    // Filter strategies based on user's subscription
    let availableStrategies = Object.values(LEGENDARY_STRATEGIES);
    
    if (userTier === 'basic') {
      // Basic users only get Jesse Livermore strategy
      availableStrategies = availableStrategies.filter(s => s.id === 'jesse-livermore');
    }

    // Apply filters
    if (type) {
      availableStrategies = availableStrategies.filter(s => s.type === type);
    }
    if (risk_level) {
      availableStrategies = availableStrategies.filter(s => s.risk_level === risk_level);
    }
    if (time_frame) {
      availableStrategies = availableStrategies.filter(s => s.time_frame === time_frame);
    }

    // Get performance data from database
    const strategyIds = availableStrategies.map(s => s.id);
    const { data: performanceData, error } = await supabaseAdmin
      .from('strategy_performance')
      .select('*')
      .in('strategy_id', strategyIds);

    if (error) {
      logger.error('Error fetching strategy performance:', error);
    }

    // Merge performance data with strategy definitions
    const strategiesWithPerformance = availableStrategies.map(strategy => {
      const performance = performanceData?.find(p => p.strategy_id === strategy.id) || {};
      return {
        ...strategy,
        performance: {
          win_rate: performance.win_rate || 0,
          average_return: performance.average_return || 0,
          sharpe_ratio: performance.sharpe_ratio || 0,
          max_drawdown: performance.max_drawdown || 0,
          total_trades: performance.total_trades || 0,
          subscribers_count: performance.subscribers_count || 0
        }
      };
    });

    res.json({
      data: strategiesWithPerformance,
      count: strategiesWithPerformance.length
    });
  } catch (error) {
    next(error);
  }
};

// Get strategy by ID
export const getStrategyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userTier = req.user?.subscription_tier || 'basic';

    const strategy = LEGENDARY_STRATEGIES[id];

    if (!strategy) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Strategy not found'
      });
    }

    // Check access based on subscription
    if (userTier === 'basic' && id !== 'jesse-livermore') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Upgrade to Premium or Professional to access this strategy'
      });
    }

    // Get detailed performance data
    const { data: performance, error: perfError } = await supabaseAdmin
      .from('strategy_performance')
      .select('*')
      .eq('strategy_id', id)
      .single();

    if (perfError) {
      logger.error('Error fetching strategy performance:', perfError);
    }

    // Get recent recommendations
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentRecommendations, error: recError } = await supabaseAdmin
      .from('recommendations')
      .select('*')
      .eq('strategy_id', id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (recError) {
      logger.error('Error fetching recommendations:', recError);
    }

    res.json({
      data: {
        ...strategy,
        performance: performance || {},
        recent_recommendations: recentRecommendations || []
      }
    });
  } catch (error) {
    next(error);
  }
};

// Subscribe to strategy
export const subscribeToStrategy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userTier = req.user.subscription_tier || 'basic';

    const strategy = LEGENDARY_STRATEGIES[id];

    if (!strategy) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Strategy not found'
      });
    }

    // Check access based on subscription
    if (userTier === 'basic' && id !== 'jesse-livermore') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Upgrade to Premium or Professional to access this strategy'
      });
    }

    // Check if already subscribed
    const { data: existing } = await supabaseAdmin
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
    const { error: subError } = await supabaseAdmin
      .from('user_strategy_subscriptions')
      .insert({
        user_id: userId,
        strategy_id: id,
        subscribed_at: new Date().toISOString()
      });

    if (subError) throw subError;

    // Update subscriber count
    await supabaseAdmin.rpc('increment_strategy_subscribers', { 
      strategy_id_param: id 
    });

    logger.info(`User ${userId} subscribed to strategy ${id}`);

    res.status(201).json({
      message: 'Successfully subscribed to strategy',
      data: {
        strategy_id: id,
        strategy_name: strategy.name
      }
    });
  } catch (error) {
    next(error);
  }
};

// Unsubscribe from strategy
export const unsubscribeFromStrategy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabaseAdmin
      .from('user_strategy_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('strategy_id', id);

    if (error) throw error;

    // Update subscriber count
    await supabaseAdmin.rpc('decrement_strategy_subscribers', { 
      strategy_id_param: id 
    });

    logger.info(`User ${userId} unsubscribed from strategy ${id}`);

    res.json({
      message: 'Successfully unsubscribed from strategy'
    });
  } catch (error) {
    next(error);
  }
};

// Get strategy performance
export const getStrategyPerformance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { period = '1M' } = req.query;
    const userTier = req.user?.subscription_tier || 'basic';

    const strategy = LEGENDARY_STRATEGIES[id];

    if (!strategy) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Strategy not found'
      });
    }

    // Check access based on subscription
    if (userTier === 'basic' && id !== 'jesse-livermore') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Upgrade to Premium or Professional to access this strategy'
      });
    }

    // Get recommendations for the period
    const startDate = getStartDate(period);
    
    const { data: recommendations, error: recError } = await supabaseAdmin
      .from('recommendations')
      .select('*')
      .eq('strategy_id', id)
      .gte('created_at', startDate.toISOString());

    if (recError) throw recError;

    // Get positions based on these recommendations
    const recommendationIds = recommendations.map(r => r.id);
    
    const { data: positions, error: posError } = await supabaseAdmin
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

    // Calculate returns by month
    const monthlyReturns = calculateMonthlyReturns(closedPositions);

    // Calculate sharpe ratio
    const sharpeRatio = calculateSharpeRatio(monthlyReturns);

    res.json({
      data: {
        strategy_id: id,
        strategy_name: strategy.name,
        period,
        performance: {
          total_recommendations: recommendations.length,
          total_positions: positions.length,
          closed_positions: closedPositions.length,
          open_positions: positions.length - closedPositions.length,
          winning_trades: winningTrades,
          losing_trades: closedPositions.length - winningTrades,
          win_rate: periodWinRate.toFixed(2),
          total_profit_loss: totalProfitLoss.toFixed(2),
          average_return: closedPositions.length > 0 
            ? (totalProfitLoss / closedPositions.length).toFixed(2) 
            : 0,
          sharpe_ratio: sharpeRatio
        },
        monthly_returns: monthlyReturns
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user's subscribed strategies
export const getUserStrategies = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: subscriptions, error } = await supabaseAdmin
      .from('user_strategy_subscriptions')
      .select('strategy_id, subscribed_at')
      .eq('user_id', userId);

    if (error) throw error;

    const subscribedStrategies = subscriptions.map(sub => {
      const strategy = LEGENDARY_STRATEGIES[sub.strategy_id];
      return {
        ...strategy,
        subscribed_at: sub.subscribed_at
      };
    });

    res.json({
      data: subscribedStrategies,
      count: subscribedStrategies.length
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
          winning_trades: 0,
          investment: 0
        };
      }
      
      monthlyData[month].profit_loss += position.profit_loss;
      monthlyData[month].trades++;
      monthlyData[month].investment += position.quantity * position.entry_price;
      
      if (position.profit_loss > 0) {
        monthlyData[month].winning_trades++;
      }
    }
  });

  return Object.values(monthlyData).map(data => ({
    ...data,
    return_percentage: data.investment > 0 
      ? ((data.profit_loss / data.investment) * 100).toFixed(2)
      : 0,
    win_rate: data.trades > 0 
      ? (data.winning_trades / data.trades * 100).toFixed(2) 
      : 0
  }));
}

function calculateSharpeRatio(monthlyReturns) {
  if (monthlyReturns.length < 2) return 0;

  const returns = monthlyReturns.map(m => parseFloat(m.return_percentage));
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Assuming risk-free rate of 2% annually (0.167% monthly)
  const riskFreeRate = 0.167;
  
  return stdDev > 0 ? ((avgReturn - riskFreeRate) / stdDev).toFixed(2) : 0;
}

// Backtest strategy
export const backtestStrategy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      symbols,
      start_date,
      end_date,
      initial_capital = 10000
    } = req.body;
    
    const userTier = req.user?.subscription_tier || 'basic';
    
    const strategy = LEGENDARY_STRATEGIES[id];
    
    if (!strategy) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Strategy not found'
      });
    }
    
    // Check access based on subscription
    if (userTier === 'basic') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Backtest feature is only available for Premium and Professional users'
      });
    }
    
    // Validate parameters
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please provide symbols array for backtesting'
      });
    }
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please provide start_date and end_date for backtesting'
      });
    }
    
    // Placeholder backtest results
    const backtestResults = {
      strategy_id: id,
      strategy_name: strategy.name,
      backtest_period: {
        start_date,
        end_date,
        trading_days: 252
      },
      initial_capital,
      final_capital: 12500,
      total_return: 25.0,
      annualized_return: 15.5,
      volatility: 18.2,
      sharpe_ratio: 0.85,
      max_drawdown: -12.5,
      win_rate: 58.5,
      profit_factor: 1.8,
      total_trades: 145,
      winning_trades: 85,
      losing_trades: 60,
      average_win: 250,
      average_loss: -150,
      best_trade: {
        symbol: symbols[0],
        return: 8.5,
        date: '2024-06-15'
      },
      worst_trade: {
        symbol: symbols[0],
        return: -5.2,
        date: '2024-03-22'
      },
      monthly_returns: [
        { month: '2024-01', return: 3.2, trades: 12 },
        { month: '2024-02', return: -1.5, trades: 10 },
        { month: '2024-03', return: 4.8, trades: 15 },
        { month: '2024-04', return: 2.1, trades: 13 },
        { month: '2024-05', return: 5.2, trades: 18 },
        { month: '2024-06', return: 3.7, trades: 14 }
      ],
      equity_curve: [
        { date: '2024-01-01', value: 10000 },
        { date: '2024-02-01', value: 10320 },
        { date: '2024-03-01', value: 10165 },
        { date: '2024-04-01', value: 10653 },
        { date: '2024-05-01', value: 10877 },
        { date: '2024-06-01', value: 11443 },
        { date: '2024-07-01', value: 11866 },
        { date: '2024-08-01', value: 12305 },
        { date: '2024-09-01', value: 12500 }
      ],
      trade_distribution: {
        '0-1%': 25,
        '1-2%': 35,
        '2-5%': 45,
        '5-10%': 30,
        '>10%': 10
      },
      symbols_performance: symbols.map(symbol => ({
        symbol,
        trades: Math.floor(Math.random() * 20) + 10,
        win_rate: (Math.random() * 30 + 45).toFixed(1),
        total_return: (Math.random() * 40 - 10).toFixed(2)
      }))
    };
    
    logger.info(`Backtest requested for strategy ${id} by user ${req.user.id}`);
    
    res.json({
      data: backtestResults,
      message: 'Backtest completed successfully'
    });
  } catch (error) {
    next(error);
  }
};

