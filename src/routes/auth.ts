const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');

/**
 * 인증 라우터
 * @description 인증 관련 API 엔드포인트 정의
 */

const router = Router();

/**
 * 입력 검증 규칙
 */
const validationRules = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces')
  ],
  
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
      .custom((value, { req }) => value !== req.body.currentPassword)
      .withMessage('New password must be different from current password')
  ],
  
  deleteAccount: [
    body('password')
      .notEmpty()
      .withMessage('Password is required to delete account')
  ]
};

/**
 * 에러 처리 미들웨어
 */
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * 라우트 정의
 */

// 회원가입
router.post(
  '/register',
  rateLimiter.strict, // 엄격한 rate limit (분당 5회)
  validationRules.register,
  handleValidationErrors,
  authController.register
);

// 로그인
router.post(
  '/login',
  rateLimiter.auth, // 인증용 rate limit (분당 10회)
  validationRules.login,
  handleValidationErrors,
  authController.login
);

// 로그아웃
router.post(
  '/logout',
  authenticate,
  authController.logout
);

// 토큰 갱신
router.post(
  '/refresh',
  authenticate,
  authController.refreshToken
);

// 현재 사용자 정보 조회
router.get(
  '/me',
  authenticate,
  authController.getCurrentUser
);

// 비밀번호 변경
router.put(
  '/password',
  authenticate,
  rateLimiter.strict, // 보안상 엄격한 rate limit
  validationRules.changePassword,
  handleValidationErrors,
  authController.changePassword
);

// 계정 삭제
router.delete(
  '/account',
  authenticate,
  rateLimiter.strict, // 보안상 엄격한 rate limit
  validationRules.deleteAccount,
  handleValidationErrors,
  authController.deleteAccount
);

/**
 * 소셜 로그인 라우트 (향후 구현)
 */

// Google OAuth
router.get('/google', (_req, res) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Google OAuth login will be available soon'
  });
});

router.get('/google/callback', (_req, res) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Google OAuth callback will be available soon'
  });
});

// GitHub OAuth
router.get('/github', (_req, res) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'GitHub OAuth login will be available soon'
  });
});

router.get('/github/callback', (_req, res) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'GitHub OAuth callback will be available soon'
  });
});

/**
 * 비밀번호 재설정 라우트 (향후 구현)
 */

// 비밀번호 재설정 요청
router.post('/forgot-password', 
  rateLimiter.strict,
  body('email').isEmail().normalizeEmail(),
  handleValidationErrors,
  (_req, res) => {
    res.status(501).json({
      error: 'Not implemented',
      message: 'Password reset functionality will be available soon'
    });
  }
);

// 비밀번호 재설정
router.post('/reset-password',
  rateLimiter.strict,
  [
    body('token').notEmpty(),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  ],
  handleValidationErrors,
  (_req: any, res: any) => {
    res.status(501).json({
      error: 'Not implemented',
      message: 'Password reset functionality will be available soon'
    });
  }
);

/**
 * 이메일 인증 라우트 (향후 구현)
 */

// 이메일 인증 요청
router.post('/verify-email/request',
  authenticate,
  rateLimiter.strict,
  (_req, res) => {
    res.status(501).json({
      error: 'Not implemented',
      message: 'Email verification will be available soon'
    });
  }
);

// 이메일 인증 확인
router.post('/verify-email/confirm',
  rateLimiter.strict,
  body('token').notEmpty(),
  handleValidationErrors,
  (_req, res) => {
    res.status(501).json({
      error: 'Not implemented',
      message: 'Email verification will be available soon'
    });
  }
);

module.exports = router;