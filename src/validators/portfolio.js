import { body, param } from 'express-validator';

export const validatePortfolio = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Portfolio name must be between 1 and 100 characters'),
  body('initial_capital')
    .optional()
    .isFloat({ min: 100 })
    .withMessage('Initial capital must be at least $100'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
];

export const validatePosition = [
  body('symbol')
    .trim()
    .toUpperCase()
    .isLength({ min: 1, max: 10 })
    .withMessage('Stock symbol is required and must be 1-10 characters'),
  body('company_name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Company name is required'),
  body('quantity')
    .isFloat({ min: 0.0001 })
    .withMessage('Quantity must be a positive number'),
  body('entry_price')
    .isFloat({ min: 0.01 })
    .withMessage('Entry price must be a positive number'),
  body('action')
    .optional()
    .isIn(['BUY', 'SELL'])
    .withMessage('Action must be BUY or SELL'),
  body('stop_loss')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Stop loss must be a positive number')
    .custom((value, { req }) => {
      if (req.body.action === 'BUY' && value >= req.body.entry_price) {
        throw new Error('Stop loss must be below entry price for buy positions');
      }
      if (req.body.action === 'SELL' && value <= req.body.entry_price) {
        throw new Error('Stop loss must be above entry price for sell positions');
      }
      return true;
    }),
  body('take_profit')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Take profit must be a positive number')
    .custom((value, { req }) => {
      if (req.body.action === 'BUY' && value <= req.body.entry_price) {
        throw new Error('Take profit must be above entry price for buy positions');
      }
      if (req.body.action === 'SELL' && value >= req.body.entry_price) {
        throw new Error('Take profit must be below entry price for sell positions');
      }
      return true;
    }),
  body('recommendation_id')
    .optional()
    .isUUID()
    .withMessage('Invalid recommendation ID'),
  body('strategy_id')
    .optional()
    .isIn(['jesse-livermore', 'larry-williams', 'stan-weinstein'])
    .withMessage('Invalid strategy ID'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

export const validatePositionUpdate = [
  param('id')
    .isUUID()
    .withMessage('Invalid position ID'),
  body('stop_loss')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Stop loss must be a positive number'),
  body('take_profit')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Take profit must be a positive number'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

export const validateClosePosition = [
  param('id')
    .isUUID()
    .withMessage('Invalid position ID'),
  body('exit_price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Exit price must be a positive number'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];