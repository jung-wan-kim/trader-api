import { param, query, body } from 'express-validator';

export const validateStrategyId = [
  param('id')
    .isIn(['jesse-livermore', 'larry-williams', 'stan-weinstein'])
    .withMessage('Invalid strategy ID. Must be one of: jesse-livermore, larry-williams, stan-weinstein')
];

export const validateStrategyQuery = [
  query('type')
    .optional()
    .isIn(['trend_following', 'momentum', 'stage_analysis'])
    .withMessage('Invalid strategy type'),
  query('risk_level')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid risk level'),
  query('tier_required')
    .optional()
    .isIn(['basic', 'premium', 'professional'])
    .withMessage('Invalid tier')
];

export const validateBacktestRequest = [
  param('id')
    .isIn(['jesse-livermore', 'larry-williams', 'stan-weinstein'])
    .withMessage('Invalid strategy ID'),
  body('symbol')
    .notEmpty()
    .trim()
    .toUpperCase()
    .isLength({ min: 1, max: 10 })
    .withMessage('Stock symbol must be between 1 and 10 characters')
    .matches(/^[A-Z]+$/)
    .withMessage('Stock symbol must contain only letters'),
  body('start_date')
    .notEmpty()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('end_date')
    .notEmpty()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('initial_capital')
    .optional()
    .isFloat({ min: 1000 })
    .withMessage('Initial capital must be at least $1000'),
  body('position_size')
    .optional()
    .isFloat({ min: 0.01, max: 1 })
    .withMessage('Position size must be between 0.01 and 1 (1% to 100%)'),
  body('commission')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Commission must be between 0 and 100'),
  body('slippage')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Slippage must be between 0 and 10%')
];

export const validatePerformanceQuery = [
  param('id')
    .isIn(['jesse-livermore', 'larry-williams', 'stan-weinstein'])
    .withMessage('Invalid strategy ID'),
  query('period')
    .optional()
    .isIn(['1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'])
    .withMessage('Invalid period. Must be one of: 1M, 3M, 6M, 1Y, 3Y, 5Y, ALL'),
  query('metrics')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const metrics = value.split(',');
        const validMetrics = [
          'total_return', 'annual_return', 'sharpe_ratio', 
          'max_drawdown', 'win_rate', 'profit_factor'
        ];
        return metrics.every(metric => validMetrics.includes(metric.toLowerCase()));
      }
      return true;
    })
    .withMessage('Invalid metrics. Must be comma-separated list of valid metrics')
];