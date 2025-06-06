// 기본 타입 정의
export interface User {
  id: string;
  email: string;
  username: string;
  created_at: Date;
  updated_at: Date;
}

export interface Portfolio {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  purchase_price: number;
  purchase_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  type: 'trend_following' | 'mean_reversion' | 'momentum' | 'value' | 'custom';
  parameters: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Recommendation {
  id: string;
  user_id: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  reason: string;
  target_price?: number;
  stop_loss?: number;
  created_at: Date;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}