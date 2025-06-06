import { query, body } from 'express-validator';

export const validateRecommendationQuery = [
  query('strategy_id')
    .optional()
    .isIn(['jesse-livermore', 'larry-williams', 'stan-weinstein'])
    .withMessage('Invalid strategy ID'),
  query('action')
    .optional()
    .isIn(['BUY', 'SELL', 'HOLD'])
    .withMessage('Invalid action'),
  query('risk_level')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid risk level'),
  query('confidence_min')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Confidence must be between 0 and 100'),
  query('sortBy')
    .optional()
    .isIn(['created_at', 'confidence', 'expected_return', 'risk_reward_ratio'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sort order'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .withMessage('Offset must be a positive integer')
];

export const validateFollowRecommendation = [
  body('portfolio_id')
    .notEmpty()
    .isUUID()
    .withMessage('Valid portfolio ID is required'),
  body('quantity')
    .notEmpty()
    .isFloat({ min: 0.0001 })
    .withMessage('Quantity must be a positive number'),
  body('entry_price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Entry price must be a positive number'),
  body('custom_stop_loss')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Stop loss must be a positive number'),
  body('custom_take_profit')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Take profit must be a positive number')
    .custom((value, { req }) => {
      if (req.body.entry_price && value <= req.body.entry_price) {
        throw new Error('Take profit must be higher than entry price for long positions');
      }
      return true;
    })
];