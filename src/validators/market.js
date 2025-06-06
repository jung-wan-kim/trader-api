import { param, query } from 'express-validator';

const validateSymbol = [
  param('symbol')
    .trim()
    .toUpperCase()
    .isLength({ min: 1, max: 10 })
    .withMessage('Stock symbol must be between 1 and 10 characters')
    .matches(/^[A-Z]+$/)
    .withMessage('Stock symbol must contain only letters')
];

const validateCandleQuery = [
  query('resolution')
    .optional()
    .isIn(['1', '5', '15', '30', '60', 'D', 'W', 'M'])
    .withMessage('Invalid resolution. Must be one of: 1, 5, 15, 30, 60, D, W, M'),
  query('from')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('From timestamp must be a positive integer'),
  query('to')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('To timestamp must be a positive integer')
    .custom((value, { req }) => {
      if (req.query.from && value <= req.query.from) {
        throw new Error('To timestamp must be after from timestamp');
      }
      return true;
    })
];

const validateIndicatorQuery = [
  param('symbol')
    .trim()
    .toUpperCase()
    .isLength({ min: 1, max: 10 })
    .withMessage('Stock symbol must be between 1 and 10 characters')
    .matches(/^[A-Z]+$/)
    .withMessage('Stock symbol must contain only letters'),
  query('period')
    .optional()
    .isIn(['1D', '1W', '1M', '3M', '6M', '1Y'])
    .withMessage('Invalid period. Must be one of: 1D, 1W, 1M, 3M, 6M, 1Y'),
  query('indicators')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const indicators = value.split(',');
        const validIndicators = ['sma', 'ema', 'rsi', 'macd', 'bollinger', 'williams'];
        return indicators.every(ind => validIndicators.includes(ind.toLowerCase()));
      }
      return true;
    })
    .withMessage('Invalid indicators. Must be comma-separated list of: sma, ema, rsi, macd, bollinger, williams')
];

const validateSearchQuery = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Search query must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-\.]+$/)
    .withMessage('Search query contains invalid characters')
];

const validateStrategySignalQuery = [
  param('symbol')
    .trim()
    .toUpperCase()
    .isLength({ min: 1, max: 10 })
    .withMessage('Stock symbol must be between 1 and 10 characters')
    .matches(/^[A-Z]+$/)
    .withMessage('Stock symbol must contain only letters'),
  param('strategy')
    .isIn(['jesse-livermore', 'larry-williams', 'stan-weinstein'])
    .withMessage('Invalid strategy. Must be one of: jesse-livermore, larry-williams, stan-weinstein'),
  query('timeframe')
    .optional()
    .isIn(['intraday', 'daily', 'weekly', 'monthly'])
    .withMessage('Invalid timeframe. Must be one of: intraday, daily, weekly, monthly')
];

export {
  validateSymbol,
  validateCandleQuery,
  validateSearchQuery,
  validateIndicatorQuery,
  validateStrategySignalQuery
};