const Joi = require('joi');

const validateRecommendationQuery = (req, res, next) => {
  const schema = Joi.object({
    action: Joi.string().valid('BUY', 'SELL', 'HOLD').optional(),
    riskLevel: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').optional(),
    timeframe: Joi.string().valid('SHORT', 'MEDIUM', 'LONG').optional(),
    sortBy: Joi.string().valid('created_at', 'confidence', 'likes_count').optional(),
    order: Joi.string().valid('asc', 'desc').optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional()
  });

  const { error } = schema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.details[0].message
    });
  }

  next();
};

module.exports = {
  validateRecommendationQuery
};