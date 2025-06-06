const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { validationResult } = require('express-validator');

// TypeScript 타입 임포트
import type { Request, Response } from 'express';

/**
 * 인증 컨트롤러
 * @description 사용자 인증 관련 비즈니스 로직 처리
 */

// 타입 정의
interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name?: string;
    subscription_tier: string;
  };
}

/**
 * JWT 토큰 생성
 */
function generateToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      sub: userId,
      email: email
    },
    secret,
    {
      expiresIn: '7d'
    }
  );
}

/**
 * 비밀번호 해시 생성
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * 비밀번호 검증
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 회원가입
 */
const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // 입력 검증
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const { email, password, name } = req.body as RegisterRequest;

    // 이메일 중복 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      res.status(409).json({
        error: 'Email already exists',
        message: 'An account with this email already exists'
      });
      return;
    }

    // 비밀번호 해시
    const hashedPassword = await hashPassword(password);

    // Supabase Auth로 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || null
        }
      }
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create auth user');
    }

    // 데이터베이스에 사용자 정보 저장
    const { data: user, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name: name || null,
        password_hash: hashedPassword,
        subscription_tier: 'basic',
        subscription_status: 'active',
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일 무료
      })
      .select()
      .single();

    if (dbError || !user) {
      // Auth 사용자 삭제 (롤백)
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(dbError?.message || 'Failed to create user record');
    }

    // JWT 토큰 생성
    const token = generateToken(user.id, user.email);

    // 응답
    const response: TokenResponse = {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 60 * 60, // 7일 (초)
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscription_tier: user.subscription_tier
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    
    res.status(500).json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

/**
 * 로그인
 */
const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // 입력 검증
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const { email, password } = req.body as LoginRequest;

    // 사용자 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, password_hash, subscription_tier, subscription_status, subscription_end_date')
      .eq('email', email)
      .single();

    if (userError || !user) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
      return;
    }

    // 비밀번호 검증
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
      return;
    }

    // 구독 상태 확인
    if (user.subscription_status !== 'active') {
      res.status(403).json({
        error: 'Subscription inactive',
        message: 'Your subscription is not active. Please renew your subscription.'
      });
      return;
    }

    // 마지막 로그인 시간 업데이트
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // JWT 토큰 생성
    const token = generateToken(user.id, user.email);

    // 응답
    const response: TokenResponse = {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 60 * 60, // 7일 (초)
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscription_tier: user.subscription_tier
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    
    res.status(500).json({
      error: 'Login failed',
      message: 'An unexpected error occurred during login'
    });
  }
};

/**
 * 로그아웃
 */
const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Supabase Auth 세션 종료
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Supabase signOut error:', error);
    }

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    res.status(500).json({
      error: 'Logout failed',
      message: 'An unexpected error occurred during logout'
    });
  }
};

/**
 * 토큰 갱신
 */
const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No user information found'
      });
      return;
    }

    // 새 토큰 생성
    const newToken = generateToken(req.user.id, req.user.email);

    // 응답
    const response: TokenResponse = {
      access_token: newToken,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 60 * 60, // 7일 (초)
      user: {
        id: req.user.id,
        email: req.user.email,
        name: undefined, // refreshToken에서는 name을 포함하지 않음
        subscription_tier: req.user.subscription_tier
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Token refresh error:', error);
    
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'An unexpected error occurred while refreshing token'
    });
  }
};

/**
 * 현재 사용자 정보 조회
 */
const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No user information found'
      });
      return;
    }

    // 상세 사용자 정보 조회
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        subscription_tier,
        subscription_status,
        subscription_end_date,
        created_at,
        last_login_at
      `)
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      res.status(404).json({
        error: 'User not found',
        message: 'Failed to retrieve user information'
      });
      return;
    }

    res.json({
      user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    
    res.status(500).json({
      error: 'Failed to get user',
      message: 'An unexpected error occurred while retrieving user information'
    });
  }
};

/**
 * 비밀번호 변경
 */
const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No user information found'
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // 현재 비밀번호 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      res.status(404).json({
        error: 'User not found',
        message: 'Failed to retrieve user information'
      });
      return;
    }

    const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
      return;
    }

    // 새 비밀번호 해시
    const newHashedPassword = await hashPassword(newPassword);

    // 비밀번호 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: newHashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (updateError) {
      throw updateError;
    }

    // Supabase Auth 비밀번호도 업데이트
    const { error: authError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (authError) {
      console.error('Supabase auth password update error:', authError);
    }

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    res.status(500).json({
      error: 'Password change failed',
      message: 'An unexpected error occurred while changing password'
    });
  }
};

/**
 * 계정 삭제
 */
const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No user information found'
      });
      return;
    }

    const { password } = req.body;

    // 비밀번호 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      res.status(404).json({
        error: 'User not found',
        message: 'Failed to retrieve user information'
      });
      return;
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Invalid password',
        message: 'Password is incorrect'
      });
      return;
    }

    // 사용자 데이터 소프트 삭제 (실제로는 비활성화)
    const { error: deleteError } = await supabase
      .from('users')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        email: `deleted_${req.user.id}@deleted.com` // 이메일 중복 방지
      })
      .eq('id', req.user.id);

    if (deleteError) {
      throw deleteError;
    }

    // Supabase Auth 사용자도 삭제
    const { error: authError } = await supabase.auth.admin.deleteUser(req.user.id);
    
    if (authError) {
      console.error('Supabase auth user deletion error:', authError);
    }

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    
    res.status(500).json({
      error: 'Account deletion failed',
      message: 'An unexpected error occurred while deleting account'
    });
  }
};

// CommonJS exports
exports.register = register;
exports.login = login;
exports.logout = logout;
exports.refreshToken = refreshToken;
exports.getCurrentUser = getCurrentUser;
exports.changePassword = changePassword;
exports.deleteAccount = deleteAccount;

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  changePassword,
  deleteAccount
};