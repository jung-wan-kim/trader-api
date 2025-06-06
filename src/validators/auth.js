const Joi = require('joi');

const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(100).required()
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

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
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
  validateRegister,
  validateLogin
};