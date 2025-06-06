const Joi = require('joi');

const validateSymbol = (req, res, next) => {
  const schema = Joi.object({
    symbol: Joi.string().uppercase().min(1).max(10).required()
  });

  const { error } = schema.validate(req.params);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid stock symbol'
    });
  }

  next();
};

const validateCandleQuery = (req, res, next) => {
  const schema = Joi.object({
    resolution: Joi.string().valid('1', '5', '15', '30', '60', 'D', 'W', 'M').optional(),
    from: Joi.number().integer().positive().optional(),
    to: Joi.number().integer().positive().optional()
  });

  const { error } = schema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.details[0].message
    });
  }

  // Validate date range
  if (req.query.from && req.query.to && req.query.from >= req.query.to) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'From date must be before to date'
    });
  }

  next();
};

module.exports = {
  validateSymbol,
  validateCandleQuery
};