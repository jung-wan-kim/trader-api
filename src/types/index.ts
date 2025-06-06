/**
 * 전역 타입 정의 파일
 * @description 프로젝트 전반에서 사용되는 공통 타입 정의
 */

// 구독 티어 타입
export type SubscriptionTier = 'basic' | 'premium' | 'professional';

// 구독 상태 타입
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

// 전략 타입
export type TradingStrategy = 'livermore' | 'williams' | 'weinstein';

// 거래 액션 타입
export type TradeAction = 'buy' | 'sell' | 'hold';

// 알림 타입
export type NotificationType = 'price_alert' | 'stop_loss_triggered' | 'take_profit_reached' | 'new_recommendation';

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// 페이지네이션 응답 타입
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// 에러 응답 타입
export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  path?: string;
  status: number;
}

// 기술적 지표 타입
export interface TechnicalIndicators {
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema12?: number;
  ema26?: number;
  rsi?: number;
  macd?: {
    value: number;
    signal: number;
    histogram: number;
  };
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
  };
  volume?: {
    current: number;
    average: number;
    ratio: number;
  };
}

// 주식 데이터 타입
export interface StockData {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high52Week?: number;
  low52Week?: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  timestamp: string;
}

// 포트폴리오 성과 타입
export interface PortfolioPerformance {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  realizedGainLoss: number;
  unrealizedGainLoss: number;
  positions: number;
  winRate: number;
  averageReturn: number;
  bestPerformer?: {
    symbol: string;
    gainPercent: number;
  };
  worstPerformer?: {
    symbol: string;
    lossPercent: number;
  };
}

// 추천 이유 타입
export interface RecommendationReasoning {
  strategy: TradingStrategy;
  signals: string[];
  technicalScore: number;
  fundamentalScore?: number;
  sentimentScore?: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeHorizon: 'short' | 'medium' | 'long';
  keyFactors: Array<{
    factor: string;
    impact: 'positive' | 'negative';
    weight: number;
  }>;
}

// 리스크 메트릭스 타입
export interface RiskMetrics {
  stopLoss: number;
  stopLossPercent: number;
  takeProfit: number;
  takeProfitPercent: number;
  riskRewardRatio: number;
  positionSize: number;
  maxLoss: number;
  expectedReturn: number;
  sharpeRatio?: number;
  volatility?: number;
  beta?: number;
}

// 백테스트 결과 타입
export interface BacktestResult {
  strategy: TradingStrategy;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalReturn: number;
    annualizedReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    averageWin: number;
    averageLoss: number;
    bestTrade: number;
    worstTrade: number;
  };
  trades: Array<{
    entryDate: string;
    exitDate: string;
    symbol: string;
    side: 'long' | 'short';
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    profit: number;
    profitPercent: number;
  }>;
}

// 마켓 스크리너 필터 타입
export interface MarketScreenerFilters {
  exchanges?: string[];
  sectors?: string[];
  marketCapMin?: number;
  marketCapMax?: number;
  priceMin?: number;
  priceMax?: number;
  volumeMin?: number;
  peRatioMax?: number;
  dividendYieldMin?: number;
  rsiMin?: number;
  rsiMax?: number;
  strategies?: TradingStrategy[];
}

// WebSocket 메시지 타입
export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'update' | 'error' | 'connected' | 'disconnected';
  data?: any;
  symbols?: string[];
  error?: string;
  timestamp?: string;
}

// 실시간 가격 업데이트 타입
export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: string;
}

// API 키 정보 타입
export interface ApiKeyInfo {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  permissions: string[];
  rate_limit: {
    requests_per_minute: number;
    requests_per_day: number;
  };
}

// 시스템 상태 타입
export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  checks: {
    database: 'healthy' | 'unhealthy';
    cache?: 'healthy' | 'unhealthy';
    external_apis?: Record<string, 'healthy' | 'unhealthy'>;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    uptime: number;
  };
}

// 감사 로그 타입
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  duration_ms?: number;
  status: 'success' | 'failure';
  error?: string;
}