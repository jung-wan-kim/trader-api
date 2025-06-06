import { body, validationResult } from 'express-validator';

const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('investmentStyle')
    .optional()
    .isIn(['conservative', 'moderate', 'aggressive'])
    .withMessage('Invalid investment style')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('investment_style')
    .optional()
    .isIn(['conservative', 'moderate', 'aggressive'])
    .withMessage('Invalid investment style'),
  body('risk_tolerance')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid risk tolerance'),
  body('notification_preferences')
    .optional()
    .isObject()
    .withMessage('Notification preferences must be an object')
];

const validatePasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => value !== req.body.current_password)
    .withMessage('New password must be different from current password')
];

export {
  validateRegister,
  validateLogin,
  validateProfile,
  validatePasswordChange,
  validationResult
};