const { body, param } = require('express-validator');

const validateSubscription = [
  body('plan_id')
    .notEmpty()
    .isIn(['basic', 'premium', 'professional'])
    .withMessage('Invalid plan ID. Must be one of: basic, premium, professional'),
  body('billing_cycle')
    .optional()
    .isIn(['monthly', 'annual'])
    .withMessage('Invalid billing cycle. Must be monthly or annual'),
  body('payment_method_id')
    .optional()
    .isString()
    .withMessage('Payment method ID must be a string')
];

const validateUpgrade = [
  body('new_plan_id')
    .notEmpty()
    .isIn(['basic', 'premium', 'professional'])
    .withMessage('Invalid plan ID. Must be one of: basic, premium, professional')
    .custom((value, { req }) => {
      // This would be validated against current plan in the controller
      // to ensure it's actually an upgrade
      return true;
    }),
  body('immediate')
    .optional()
    .isBoolean()
    .withMessage('Immediate flag must be a boolean')
];

const validatePaymentMethod = [
  body('payment_method_id')
    .notEmpty()
    .isString()
    .withMessage('Payment method ID is required'),
  body('type')
    .optional()
    .isIn(['card', 'bank_account'])
    .withMessage('Invalid payment type. Must be card or bank_account'),
  body('billing_details')
    .optional()
    .isObject()
    .withMessage('Billing details must be an object')
    .custom((value) => {
      if (value && typeof value === 'object') {
        // Basic validation for billing details structure
        if (value.name && typeof value.name !== 'string') {
          throw new Error('Billing name must be a string');
        }
        if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
          throw new Error('Invalid billing email');
        }
        if (value.address && typeof value.address !== 'object') {
          throw new Error('Billing address must be an object');
        }
      }
      return true;
    })
];

const validateUsageQuery = [
  param('metric')
    .optional()
    .isIn(['recommendations', 'api_calls', 'portfolios', 'strategies'])
    .withMessage('Invalid metric type'),
  param('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Invalid period. Must be daily, weekly, or monthly'),
  param('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  param('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.start_date && new Date(value) <= new Date(req.query.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];