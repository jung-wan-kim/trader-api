const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// TypeScript 타입 임포트
import type { SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

/**
 * Supabase 클라이언트 설정
 * @description Supabase 서비스와의 연결을 관리하는 클라이언트 인스턴스
 */

// 환경 변수 유효성 검사
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anonymous Key in environment variables');
}

// Supabase 클라이언트 인스턴스 생성
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'trader-api'
    }
  }
});

/**
 * 타입 정의
 */

// 사용자 타입
interface User {
  id: string;
  email: string;
  created_at: string;
  subscription_tier: 'basic' | 'premium' | 'professional';
  subscription_status: 'active' | 'cancelled' | 'expired';
  subscription_end_date?: string;
}

// 포트폴리오 타입
interface Portfolio {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  average_cost: number;
  current_price?: number;
  purchase_date: string;
  strategy: 'livermore' | 'williams' | 'weinstein';
  stop_loss?: number;
  take_profit?: number;
  created_at: string;
  updated_at: string;
}

// 추천 타입
interface Recommendation {
  id: string;
  symbol: string;
  strategy: 'livermore' | 'williams' | 'weinstein';
  action: 'buy' | 'sell' | 'hold';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  position_size: number;
  confidence_score: number;
  reasoning: string;
  created_at: string;
}

// 거래 히스토리 타입
interface TradeHistory {
  id: string;
  user_id: string;
  portfolio_id: string;
  action: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  price: number;
  commission?: number;
  executed_at: string;
  strategy: 'livermore' | 'williams' | 'weinstein';
  profit_loss?: number;
}

// 알림 타입
interface Notification {
  id: string;
  user_id: string;
  type: 'price_alert' | 'stop_loss_triggered' | 'take_profit_reached' | 'new_recommendation';
  title: string;
  message: string;
  symbol?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Database 헬퍼 함수들
 */

// 에러 처리 헬퍼
function handleSupabaseError(error: any): Error {
  if (error?.message) {
    return new Error(error.message);
  }
  return new Error('An unexpected error occurred with Supabase');
}

// 재시도 로직을 포함한 쿼리 실행
async function executeWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await queryFn();
      
      if (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          // 지수 백오프로 재시도 대기
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          continue;
        }
        throw handleSupabaseError(error);
      }
      
      if (!data) {
        throw new Error('No data returned from query');
      }
      
      return data;
    } catch (error) {
      lastError = error;
      if (i === maxRetries - 1) {
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Query failed after retries');
}

// 트랜잭션 시뮬레이션 (Supabase는 직접적인 트랜잭션을 지원하지 않음)
async function executeTransaction<T>(
  operations: Array<() => Promise<{ data: any; error: any }>>
): Promise<T[]> {
  const results: T[] = [];
  const rollbackOperations: Array<() => Promise<void>> = [];
  
  try {
    for (const operation of operations) {
      const { data, error } = await operation();
      
      if (error) {
        // 롤백 실행
        for (const rollback of rollbackOperations.reverse()) {
          try {
            await rollback();
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }
        }
        throw handleSupabaseError(error);
      }
      
      results.push(data);
    }
    
    return results;
  } catch (error) {
    throw error;
  }
}

// CommonJS exports
exports.supabase = supabase;
exports.handleSupabaseError = handleSupabaseError;
exports.executeWithRetry = executeWithRetry;
exports.executeTransaction = executeTransaction;

// TypeScript 타입 export
export type { User, Portfolio, Recommendation, TradeHistory, Notification };

module.exports = supabase;
module.exports.supabase = supabase;
module.exports.handleSupabaseError = handleSupabaseError;
module.exports.executeWithRetry = executeWithRetry;
module.exports.executeTransaction = executeTransaction;