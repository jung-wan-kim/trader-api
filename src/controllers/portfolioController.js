const { supabase } = require('../config/database');
const finnhubService = require('../services/finnhubService');
const logger = require('../utils/logger');

const getPortfolio = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: portfolios, error } = await supabase
      .from('portfolios')
      .select(`
        *,
        positions:positions(*)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    // Update current values with live prices
    for (const portfolio of portfolios) {
      let totalValue = 0;
      
      for (const position of portfolio.positions) {
        if (position.status === 'open') {
          try {
            const quote = await finnhubService.getQuote(position.stock_code);
            position.current_price = quote.c;
            position.unrealized_pnl = (quote.c - position.entry_price) * position.quantity;
            totalValue += quote.c * position.quantity;
          } catch (err) {
            logger.error(`Failed to get quote for ${position.stock_code}`);
          }
        }
      }
      
      portfolio.current_value = totalValue;
      portfolio.total_profit_loss = totalValue - portfolio.initial_capital;
    }

    res.json({ data: portfolios });
  } catch (error) {
    next(error);
  }
};

const getPerformance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = '1M' } = req.query;

    const { data: portfolio, error: portError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (portError) throw portError;

    // Get closed positions for the period
    const startDate = getStartDate(period);
    
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .eq('portfolio_id', portfolio.id)
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

    res.json({
      data: {
        period,
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: winRate.toFixed(2),
        totalProfitLoss: totalProfitLoss.toFixed(2),
        avgWin: avgWin.toFixed(2),
        avgLoss: avgLoss.toFixed(2),
        profitFactor: profitFactor === Infinity ? 'Infinity' : profitFactor.toFixed(2),
        currentValue: portfolio.current_value,
        totalReturn: ((portfolio.current_value - portfolio.initial_capital) / portfolio.initial_capital * 100).toFixed(2)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getPositions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status = 'open', limit = 50, offset = 0 } = req.query;

    // Get user's portfolio
    const { data: portfolio, error: portError } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (portError) throw portError;

    const { data: positions, error, count } = await supabase
      .from('positions')
      .select('*', { count: 'exact' })
      .eq('portfolio_id', portfolio.id)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Update current prices for open positions
    if (status === 'open') {
      for (const position of positions) {
        try {
          const quote = await finnhubService.getQuote(position.stock_code);
          position.current_price = quote.c;
          position.unrealized_pnl = (quote.c - position.entry_price) * position.quantity;
          position.unrealized_pnl_percent = ((quote.c - position.entry_price) / position.entry_price * 100).toFixed(2);
        } catch (err) {
          logger.error(`Failed to get quote for ${position.stock_code}`);
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

const addPosition = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      stockCode, 
      stockName, 
      quantity, 
      price, 
      type = 'BUY',
      stopLoss,
      takeProfit,
      recommendationId
    } = req.body;

    // Get user's portfolio
    const { data: portfolio, error: portError } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (portError) throw portError;

    // Create position
    const { data: position, error: posError } = await supabase
      .from('positions')
      .insert([{
        portfolio_id: portfolio.id,
        recommendation_id: recommendationId,
        stock_code: stockCode.toUpperCase(),
        stock_name: stockName,
        position_type: type === 'BUY' ? 'LONG' : 'SHORT',
        quantity,
        entry_price: price,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        status: 'open'
      }])
      .select()
      .single();

    if (posError) throw posError;

    logger.info(`User ${userId} opened position: ${stockCode} x${quantity} @ ${price}`);

    res.status(201).json({
      message: 'Position created successfully',
      data: position
    });
  } catch (error) {
    next(error);
  }
};

const updatePosition = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { stopLoss, takeProfit } = req.body;

    // Verify position ownership
    const { data: position, error: getError } = await supabase
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
    const updates = {};
    if (stopLoss !== undefined) updates.stop_loss = stopLoss;
    if (takeProfit !== undefined) updates.take_profit = takeProfit;

    const { data: updated, error: updateError } = await supabase
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

const closePosition = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { price } = req.body;

    // Verify position ownership
    const { data: position, error: getError } = await supabase
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
        message: 'Position already closed'
      });
    }

    // Get current price if not provided
    const exitPrice = price || (await finnhubService.getQuote(position.stock_code)).c;
    
    // Calculate profit/loss
    const profitLoss = (exitPrice - position.entry_price) * position.quantity;

    // Close position
    const { data: closed, error: closeError } = await supabase
      .from('positions')
      .update({
        status: 'closed',
        exit_price: exitPrice,
        profit_loss: profitLoss,
        closed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (closeError) throw closeError;

    logger.info(`User ${userId} closed position: ${position.stock_code} with P&L: ${profitLoss}`);

    res.json({
      message: 'Position closed successfully',
      data: closed
    });
  } catch (error) {
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Get user's portfolio
    const { data: portfolio, error: portError } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (portError) throw portError;

    const { data: history, error, count } = await supabase
      .from('positions')
      .select('*', { count: 'exact' })
      .eq('portfolio_id', portfolio.id)
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

const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's portfolio
    const { data: portfolio, error: portError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (portError) throw portError;

    // Get all positions
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .eq('portfolio_id', portfolio.id);

    if (posError) throw posError;

    // Group by stock
    const stockAnalytics = {};
    
    for (const position of positions) {
      if (!stockAnalytics[position.stock_code]) {
        stockAnalytics[position.stock_code] = {
          symbol: position.stock_code,
          name: position.stock_name,
          totalTrades: 0,
          openPositions: 0,
          closedPositions: 0,
          totalProfitLoss: 0,
          winningTrades: 0,
          losingTrades: 0
        };
      }

      const stock = stockAnalytics[position.stock_code];
      stock.totalTrades++;

      if (position.status === 'open') {
        stock.openPositions++;
      } else {
        stock.closedPositions++;
        stock.totalProfitLoss += position.profit_loss || 0;
        
        if (position.profit_loss > 0) {
          stock.winningTrades++;
        } else if (position.profit_loss < 0) {
          stock.losingTrades++;
        }
      }
    }

    // Calculate portfolio-wide metrics
    const closedPositions = positions.filter(p => p.status === 'closed');
    const bestTrade = closedPositions.reduce((best, p) => 
      (!best || p.profit_loss > best.profit_loss) ? p : best, null
    );
    const worstTrade = closedPositions.reduce((worst, p) => 
      (!worst || p.profit_loss < worst.profit_loss) ? p : worst, null
    );

    res.json({
      data: {
        portfolio: {
          initialCapital: portfolio.initial_capital,
          currentValue: portfolio.current_value,
          totalProfitLoss: portfolio.total_profit_loss,
          totalReturn: ((portfolio.current_value - portfolio.initial_capital) / portfolio.initial_capital * 100).toFixed(2)
        },
        tradingStats: {
          totalTrades: positions.length,
          openPositions: positions.filter(p => p.status === 'open').length,
          closedPositions: closedPositions.length,
          winRate: closedPositions.length > 0 
            ? (closedPositions.filter(p => p.profit_loss > 0).length / closedPositions.length * 100).toFixed(2)
            : 0
        },
        bestTrade: bestTrade ? {
          symbol: bestTrade.stock_code,
          profitLoss: bestTrade.profit_loss,
          percentage: ((bestTrade.exit_price - bestTrade.entry_price) / bestTrade.entry_price * 100).toFixed(2)
        } : null,
        worstTrade: worstTrade ? {
          symbol: worstTrade.stock_code,
          profitLoss: worstTrade.profit_loss,
          percentage: ((worstTrade.exit_price - worstTrade.entry_price) / worstTrade.entry_price * 100).toFixed(2)
        } : null,
        stockAnalytics: Object.values(stockAnalytics)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function
function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case '1D': return new Date(now - 24 * 60 * 60 * 1000);
    case '1W': return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '1M': return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case '3M': return new Date(now - 90 * 24 * 60 * 60 * 1000);
    case '6M': return new Date(now - 180 * 24 * 60 * 60 * 1000);
    case '1Y': return new Date(now - 365 * 24 * 60 * 60 * 1000);
    default: return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
}

module.exports = {
  getPortfolio,
  getPerformance,
  getPositions,
  addPosition,
  updatePosition,
  closePosition,
  getHistory,
  getAnalytics
};