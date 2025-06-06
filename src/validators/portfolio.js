const Joi = require('joi');

const validatePosition = (req, res, next) => {
  const schema = Joi.object({
    stockCode: Joi.string().uppercase().min(1).max(10).required(),
    stockName: Joi.string().min(1).max(255).required(),
    quantity: Joi.number().integer().positive().required(),
    price: Joi.number().positive().required(),
    type: Joi.string().valid('BUY', 'SELL').optional(),
    stopLoss: Joi.number().positive().optional(),
    takeProfit: Joi.number().positive().optional(),
    recommendationId: Joi.string().uuid().optional()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.details[0].message
    });
  }

  // Validate stop loss and take profit logic
  if (req.body.type === 'BUY') {
    if (req.body.stopLoss && req.body.stopLoss >= req.body.price) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Stop loss must be below entry price for buy positions'
      });
    }
    if (req.body.takeProfit && req.body.takeProfit <= req.body.price) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Take profit must be above entry price for buy positions'
      });
    }
  }

  next();
};

const validatePositionUpdate = (req, res, next) => {
  const schema = Joi.object({
    stopLoss: Joi.number().positive().optional(),
    takeProfit: Joi.number().positive().optional()
  }).min(1); // At least one field required

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.details[0].message
    });
  }

  next();
};

const validateClosePosition = (req, res, next) => {
  const schema = Joi.object({
    price: Joi.number().positive().optional()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.details[0].message
    });
  }

  next();
};

module.exports = {
  validatePosition,
  validatePositionUpdate,
  validateClosePosition
};