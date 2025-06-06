import { supabaseAdmin } from '../config/supabase.js';
import finnhubService from '../services/finnhubService.js';
import logger from '../utils/logger.js';
import { validationResult } from 'express-validator';

// Get user's portfolios
export const getPortfolios = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: portfolios, error } = await supabaseAdmin
      .from('portfolios')
      .select(`
        *,
        positions:positions(
          *,
          count
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Update current values with live prices
    for (const portfolio of portfolios) {
      let totalValue = portfolio.cash_balance || 0;
      let openPositionsValue = 0;
      let totalUnrealizedPL = 0;
      
      const openPositions = portfolio.positions?.filter(p => p.status === 'open') || [];
      
      for (const position of openPositions) {
        try {
          const quote = await finnhubService.getQuote(position.symbol);
          const currentPrice = quote.c;
          const positionValue = currentPrice * position.quantity;
          const unrealizedPL = (currentPrice - position.entry_price) * position.quantity;
          
          position.current_price = currentPrice;
          position.unrealized_pl = unrealizedPL;
          position.unrealized_pl_percent = ((currentPrice - position.entry_price) / position.entry_price * 100).toFixed(2);
          
          openPositionsValue += positionValue;
          totalUnrealizedPL += unrealizedPL;
        } catch (err) {
          logger.error(`Failed to get quote for ${position.symbol}:`, err);
          // Use entry price as fallback
          openPositionsValue += position.entry_price * position.quantity;
        }
      }
      
      portfolio.current_value = totalValue + openPositionsValue;
      portfolio.total_profit_loss = (portfolio.current_value - portfolio.initial_capital) + (portfolio.realized_profit_loss || 0);
      portfolio.total_return_percent = ((portfolio.current_value - portfolio.initial_capital) / portfolio.initial_capital * 100).toFixed(2);
      portfolio.unrealized_profit_loss = totalUnrealizedPL;
      portfolio.open_positions_count = openPositions.length;
    }

    res.json({ 
      data: portfolios,
      count: portfolios.length 
    });
  } catch (error) {
    next(error);
  }
};

// Get portfolio by ID
export const getPortfolioById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: portfolio, error } = await supabaseAdmin
      .from('portfolios')
      .select(`
        *,
        positions:positions(*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found'
      });
    }

    // Calculate live portfolio value
    let totalValue = portfolio.cash_balance || 0;
    let openPositionsValue = 0;
    let totalUnrealizedPL = 0;
    
    const openPositions = portfolio.positions?.filter(p => p.status === 'open') || [];
    
    for (const position of openPositions) {
      try {
        const quote = await finnhubService.getQuote(position.symbol);
        const currentPrice = quote.c;
        const positionValue = currentPrice * position.quantity;
        const unrealizedPL = (currentPrice - position.entry_price) * position.quantity;
        
        position.current_price = currentPrice;
        position.unrealized_pl = unrealizedPL;
        position.unrealized_pl_percent = ((currentPrice - position.entry_price) / position.entry_price * 100).toFixed(2);
        
        openPositionsValue += positionValue;
        totalUnrealizedPL += unrealizedPL;
      } catch (err) {
        logger.error(`Failed to get quote for ${position.symbol}:`, err);
        openPositionsValue += position.entry_price * position.quantity;
      }
    }
    
    portfolio.current_value = totalValue + openPositionsValue;
    portfolio.total_profit_loss = (portfolio.current_value - portfolio.initial_capital) + (portfolio.realized_profit_loss || 0);
    portfolio.total_return_percent = ((portfolio.current_value - portfolio.initial_capital) / portfolio.initial_capital * 100).toFixed(2);
    portfolio.unrealized_profit_loss = totalUnrealizedPL;

    res.json({ data: portfolio });
  } catch (error) {
    next(error);
  }
};

// Create new portfolio
export const createPortfolio = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { name, initial_capital, description } = req.body;

    const { data: portfolio, error } = await supabaseAdmin
      .from('portfolios')
      .insert({
        user_id: userId,
        name,
        initial_capital,
        current_value: initial_capital,
        cash_balance: initial_capital,
        description,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`User ${userId} created portfolio: ${name}`);

    res.status(201).json({
      message: 'Portfolio created successfully',
      data: portfolio
    });
  } catch (error) {
    next(error);
  }
};

// Update portfolio
export const updatePortfolio = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { name, description } = req.body;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('portfolios')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found'
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    updateData.updated_at = new Date().toISOString();

    const { data: portfolio, error } = await supabaseAdmin
      .from('portfolios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Portfolio updated successfully',
      data: portfolio
    });
  } catch (error) {
    next(error);
  }
};

// Delete portfolio (only if no open positions)
export const deletePortfolio = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check ownership and open positions
    const { data: portfolio, error: getError } = await supabaseAdmin
      .from('portfolios')
      .select(`
        *,
        positions:positions(id, status)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (getError || !portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found'
      });
    }

    const openPositions = portfolio.positions?.filter(p => p.status === 'open') || [];
    if (openPositions.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot delete portfolio with open positions'
      });
    }

    // Delete portfolio (cascade will handle positions)
    const { error: deleteError } = await supabaseAdmin
      .from('portfolios')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({
      message: 'Portfolio deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get portfolio performance
export const getPortfolioPerformance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { period = '1M' } = req.query;

    // Verify ownership
    const { data: portfolio, error: portError } = await supabaseAdmin
      .from('portfolios')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (portError || !portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found'
      });
    }

    // Get closed positions for the period
    const startDate = getStartDate(period);
    
    const { data: positions, error: posError } = await supabaseAdmin
      .from('positions')
      .select('*')
      .eq('portfolio_id', id)
      .eq('status', 'closed')
      .gte('closed_at', startDate.toISOString());

    if (posError) throw posError;

    // Calculate performance metrics
    const totalTrades = positions.length;
    const winningTrades = positions.filter(p => p.profit_loss > 0).length;
    const losingTrades = positions.filter(p => p.profit_loss < 0).length;
    const totalProfitLoss = positions.reduce((sum, p) => sum + (p.profit_loss || 0), 0);
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100) : 0;
    const avgWin = winningTrades > 0 
      ? positions.filter(p => p.profit_loss > 0).reduce((sum, p) => sum + p.profit_loss, 0) / winningTrades
      : 0;
    const avgLoss = losingTrades > 0
      ? positions.filter(p => p.profit_loss < 0).reduce((sum, p) => sum + Math.abs(p.profit_loss), 0) / losingTrades
      : 0;
    
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

    // Get performance by strategy
    const strategyPerformance = {};
    positions.forEach(position => {
      const strategyId = position.strategy_id || 'manual';
      if (!strategyPerformance[strategyId]) {
        strategyPerformance[strategyId] = {
          trades: 0,
          wins: 0,
          losses: 0,
          profit_loss: 0
        };
      }
      
      strategyPerformance[strategyId].trades++;
      strategyPerformance[strategyId].profit_loss += position.profit_loss || 0;
      
      if (position.profit_loss > 0) {
        strategyPerformance[strategyId].wins++;
      } else if (position.profit_loss < 0) {
        strategyPerformance[strategyId].losses++;
      }
    });

    // Calculate monthly returns
    const monthlyReturns = calculateMonthlyReturns(positions, portfolio.initial_capital);

    res.json({
      data: {
        portfolio_id: id,
        period,
        metrics: {
          total_trades: totalTrades,
          winning_trades: winningTrades,
          losing_trades: losingTrades,
          win_rate: winRate.toFixed(2),
          total_profit_loss: totalProfitLoss.toFixed(2),
          average_win: avgWin.toFixed(2),
          average_loss: avgLoss.toFixed(2),
          profit_factor: profitFactor === Infinity ? 'Infinity' : profitFactor.toFixed(2),
          current_value: portfolio.current_value,
          total_return: ((portfolio.current_value - portfolio.initial_capital) / portfolio.initial_capital * 100).toFixed(2)
        },
        strategy_performance: Object.entries(strategyPerformance).map(([strategyId, stats]) => ({
          strategy_id: strategyId,
          ...stats,
          win_rate: stats.trades > 0 ? (stats.wins / stats.trades * 100).toFixed(2) : 0
        })),
        monthly_returns: monthlyReturns
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get portfolio positions
export const getPositions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { portfolioId } = req.params;
    const { status = 'all', limit = 50, offset = 0 } = req.query;

    // Verify portfolio ownership
    const { data: portfolio } = await supabaseAdmin
      .from('portfolios')
      .select('id')
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .single();

    if (!portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found'
      });
    }

    let query = supabaseAdmin
      .from('positions')
      .select('*', { count: 'exact' })
      .eq('portfolio_id', portfolioId);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: positions, error, count } = await query;

    if (error) throw error;

    // Update current prices for open positions
    if (status === 'open' || status === 'all') {
      for (const position of positions.filter(p => p.status === 'open')) {
        try {
          const quote = await finnhubService.getQuote(position.symbol);
          position.current_price = quote.c;
          position.unrealized_pl = (quote.c - position.entry_price) * position.quantity;
          position.unrealized_pl_percent = ((quote.c - position.entry_price) / position.entry_price * 100).toFixed(2);
        } catch (err) {
          logger.error(`Failed to get quote for ${position.symbol}:`, err);
        }
      }
    }

    res.json({
      data: positions,
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

// Add position to portfolio
export const addPosition = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { portfolioId } = req.params;
    const { 
      symbol, 
      company_name, 
      quantity, 
      entry_price, 
      action = 'BUY',
      stop_loss,
      take_profit,
      recommendation_id,
      strategy_id,
      notes
    } = req.body;

    // Verify portfolio ownership
    const { data: portfolio, error: portError } = await supabaseAdmin
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .single();

    if (portError || !portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found'
      });
    }

    // Check if enough cash balance
    const positionValue = quantity * entry_price;
    if (portfolio.cash_balance < positionValue) {
      return res.status(400).json({
        error: 'Insufficient Funds',
        message: `Not enough cash balance. Required: $${positionValue.toFixed(2)}, Available: $${portfolio.cash_balance.toFixed(2)}`
      });
    }

    // Create position
    const { data: position, error: posError } = await supabaseAdmin
      .from('positions')
      .insert({
        portfolio_id: portfolioId,
        user_id: userId,
        recommendation_id,
        strategy_id,
        symbol: symbol.toUpperCase(),
        company_name,
        action,
        quantity,
        entry_price,
        stop_loss,
        take_profit,
        notes,
        status: 'open',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (posError) throw posError;

    // Update portfolio cash balance
    const newCashBalance = portfolio.cash_balance - positionValue;
    await supabaseAdmin
      .from('portfolios')
      .update({
        cash_balance: newCashBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', portfolioId);

    // Log activity
    await supabaseAdmin
      .from('trading_activities')
      .insert({
        user_id: userId,
        portfolio_id: portfolioId,
        position_id: position.id,
        action: 'OPEN_POSITION',
        details: {
          symbol,
          quantity,
          entry_price,
          position_value: positionValue
        }
      });

    logger.info(`User ${userId} opened position: ${symbol} x${quantity} @ ${entry_price}`);

    res.status(201).json({
      message: 'Position created successfully',
      data: position
    });
  } catch (error) {
    next(error);
  }
};

// Update position (stop loss, take profit)
export const updatePosition = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { stop_loss, take_profit, notes } = req.body;

    // Verify position ownership
    const { data: position, error: getError } = await supabaseAdmin
      .from('positions')
      .select('*, portfolio:portfolios!inner(user_id)')
      .eq('id', id)
      .single();

    if (getError || !position || position.portfolio.user_id !== userId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Position not found'
      });
    }

    if (position.status !== 'open') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot update closed position'
      });
    }

    // Update position
    const updates = { updated_at: new Date().toISOString() };
    if (stop_loss !== undefined) updates.stop_loss = stop_loss;
    if (take_profit !== undefined) updates.take_profit = take_profit;
    if (notes !== undefined) updates.notes = notes;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('positions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      message: 'Position updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// Close position
export const closePosition = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { exit_price, notes } = req.body;

    // Verify position ownership
    const { data: position, error: getError } = await supabaseAdmin
      .from('positions')
      .select('*, portfolio:portfolios!inner(*)')
      .eq('id', id)
      .single();

    if (getError || !position || position.portfolio.user_id !== userId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Position not found'
      });
    }

    if (position.status !== 'open') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Position already closed'
      });
    }

    // Get current price if not provided
    let exitPrice = exit_price;
    if (!exitPrice) {
      try {
        const quote = await finnhubService.getQuote(position.symbol);
        exitPrice = quote.c;
      } catch (error) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Could not fetch current price. Please provide exit price.'
        });
      }
    }
    
    // Calculate profit/loss
    const profitLoss = position.action === 'BUY' 
      ? (exitPrice - position.entry_price) * position.quantity
      : (position.entry_price - exitPrice) * position.quantity;

    const profitLossPercent = ((exitPrice - position.entry_price) / position.entry_price * 100).toFixed(2);

    // Close position
    const { data: closed, error: closeError } = await supabaseAdmin
      .from('positions')
      .update({
        status: 'closed',
        exit_price: exitPrice,
        profit_loss: profitLoss,
        profit_loss_percent: profitLossPercent,
        closed_at: new Date().toISOString(),
        notes: notes || position.notes
      })
      .eq('id', id)
      .select()
      .single();

    if (closeError) throw closeError;

    // Update portfolio
    const newCashBalance = position.portfolio.cash_balance + (position.quantity * exitPrice);
    const newRealizedPL = (position.portfolio.realized_profit_loss || 0) + profitLoss;
    
    await supabaseAdmin
      .from('portfolios')
      .update({
        cash_balance: newCashBalance,
        realized_profit_loss: newRealizedPL,
        updated_at: new Date().toISOString()
      })
      .eq('id', position.portfolio_id);

    // Log activity
    await supabaseAdmin
      .from('trading_activities')
      .insert({
        user_id: userId,
        portfolio_id: position.portfolio_id,
        position_id: position.id,
        action: 'CLOSE_POSITION',
        details: {
          symbol: position.symbol,
          quantity: position.quantity,
          entry_price: position.entry_price,
          exit_price: exitPrice,
          profit_loss: profitLoss,
          profit_loss_percent: profitLossPercent
        }
      });

    logger.info(`User ${userId} closed position: ${position.symbol} with P&L: ${profitLoss}`);

    res.json({
      message: 'Position closed successfully',
      data: closed
    });
  } catch (error) {
    next(error);
  }
};

// Get trading history
export const getTradingHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { portfolioId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify portfolio ownership
    const { data: portfolio } = await supabaseAdmin
      .from('portfolios')
      .select('id')
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .single();

    if (!portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found'
      });
    }

    const { data: history, error, count } = await supabaseAdmin
      .from('positions')
      .select('*', { count: 'exact' })
      .eq('portfolio_id', portfolioId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      data: history,
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

// Helper functions
function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case '1D': return new Date(now - 24 * 60 * 60 * 1000);
    case '1W': return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '1M': return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case '3M': return new Date(now - 90 * 24 * 60 * 60 * 1000);
    case '6M': return new Date(now - 180 * 24 * 60 * 60 * 1000);
    case '1Y': return new Date(now - 365 * 24 * 60 * 60 * 1000);
    case 'ALL': return new Date('2020-01-01');
    default: return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
}

function calculateMonthlyReturns(positions, initialCapital) {
  const monthlyData = {};
  let runningCapital = initialCapital;
  
  positions.forEach(position => {
    if (position.closed_at && position.profit_loss !== null) {
      const month = new Date(position.closed_at).toISOString().slice(0, 7);
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          profit_loss: 0,
          trades: 0,
          winning_trades: 0,
          starting_capital: runningCapital
        };
      }
      
      monthlyData[month].profit_loss += position.profit_loss;
      monthlyData[month].trades++;
      
      if (position.profit_loss > 0) {
        monthlyData[month].winning_trades++;
      }
      
      runningCapital += position.profit_loss;
    }
  });

  return Object.values(monthlyData).map(data => ({
    ...data,
    return_percentage: data.starting_capital > 0 
      ? ((data.profit_loss / data.starting_capital) * 100).toFixed(2)
      : 0,
    win_rate: data.trades > 0 
      ? (data.winning_trades / data.trades * 100).toFixed(2) 
      : 0
  }));
}

export default {
  getPortfolios,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioPerformance,
  getPositions,
  addPosition,
  updatePosition,
  closePosition,
  getTradingHistory
};