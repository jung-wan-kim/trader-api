const { supabase } = require('../config/database');
const logger = require('../utils/logger');

const getRecommendations = async (req, res, next) => {
  try {
    const { 
      action, 
      riskLevel, 
      timeframe, 
      sortBy = 'created_at',
      order = 'desc',
      limit = 20,
      offset = 0 
    } = req.query;

    let query = supabase
      .from('recommendations')
      .select(`
        *,
        trader:traders(id, name, rating, followers_count)
      `)
      .eq('status', 'active');

    // Apply filters
    if (action) query = query.eq('action', action);
    if (riskLevel) query = query.eq('risk_level', riskLevel);
    if (timeframe) query = query.eq('timeframe', timeframe);

    // Apply sorting
    const validSortFields = ['created_at', 'confidence', 'likes_count'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(sortField, { ascending: order === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: recommendations, error, count } = await query;

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

const getRecommendationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: recommendation, error } = await supabase
      .from('recommendations')
      .select(`
        *,
        trader:traders(id, name, rating, followers_count),
        strategy:strategies(id, name, description)
      `)
      .eq('id', id)
      .single();

    if (error || !recommendation) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recommendation not found'
      });
    }

    res.json({ data: recommendation });
  } catch (error) {
    next(error);
  }
};

const getRecommendationsByTrader = async (req, res, next) => {
  try {
    const { traderId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const { data: recommendations, error, count } = await supabase
      .from('recommendations')
      .select('*', { count: 'exact' })
      .eq('trader_id', traderId)
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

const getRecommendationPerformance = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get recommendation
    const { data: recommendation, error: recError } = await supabase
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

    // Get positions based on this recommendation
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .eq('recommendation_id', id);

    if (posError) throw posError;

    // Calculate performance metrics
    const totalPositions = positions.length;
    const closedPositions = positions.filter(p => p.status === 'closed');
    const profitablePositions = closedPositions.filter(p => p.profit_loss > 0);
    const totalProfitLoss = closedPositions.reduce((sum, p) => sum + (p.profit_loss || 0), 0);
    
    const performance = {
      recommendation_id: id,
      total_followers: totalPositions,
      closed_positions: closedPositions.length,
      profitable_positions: profitablePositions.length,
      win_rate: closedPositions.length > 0 
        ? (profitablePositions.length / closedPositions.length * 100).toFixed(2)
        : 0,
      total_profit_loss: totalProfitLoss,
      average_profit_loss: closedPositions.length > 0 
        ? (totalProfitLoss / closedPositions.length).toFixed(2)
        : 0,
      status: recommendation.status,
      created_at: recommendation.created_at
    };

    res.json({ data: performance });
  } catch (error) {
    next(error);
  }
};

const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('user_recommendation_likes')
      .select('*')
      .eq('user_id', userId)
      .eq('recommendation_id', id)
      .single();

    if (existingLike) {
      // Unlike
      await supabase
        .from('user_recommendation_likes')
        .delete()
        .eq('user_id', userId)
        .eq('recommendation_id', id);

      // Decrement likes count
      await supabase.rpc('decrement_likes', { rec_id: id });

      res.json({ message: 'Recommendation unliked', liked: false });
    } else {
      // Like
      await supabase
        .from('user_recommendation_likes')
        .insert([{ user_id: userId, recommendation_id: id }]);

      // Increment likes count
      await supabase.rpc('increment_likes', { rec_id: id });

      res.json({ message: 'Recommendation liked', liked: true });
    }
  } catch (error) {
    next(error);
  }
};

const followRecommendation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { quantity, portfolioId } = req.body;

    // Get recommendation details
    const { data: recommendation, error: recError } = await supabase
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

    // Get user's portfolio
    const { data: portfolio, error: portError } = await supabase
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

    // Create position
    const { data: position, error: posError } = await supabase
      .from('positions')
      .insert([{
        portfolio_id: portfolioId,
        recommendation_id: id,
        stock_code: recommendation.stock_code,
        stock_name: recommendation.stock_name,
        position_type: recommendation.action === 'BUY' ? 'LONG' : 'SHORT',
        quantity: quantity,
        entry_price: recommendation.current_price,
        stop_loss: recommendation.stop_loss,
        take_profit: recommendation.target_price,
        status: 'open'
      }])
      .select()
      .single();

    if (posError) throw posError;

    logger.info(`User ${userId} followed recommendation ${id}`);

    res.status(201).json({
      message: 'Position created successfully',
      data: position
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
  getRecommendationById,
  getRecommendationsByTrader,
  getRecommendationPerformance,
  toggleLike,
  followRecommendation
};