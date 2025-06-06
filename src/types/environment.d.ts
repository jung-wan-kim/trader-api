declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
      SUPABASE_SERVICE_KEY: string;
      JWT_SECRET: string;
      JWT_EXPIRES_IN: string;
      FINNHUB_API_KEY: string;
      FINNHUB_WEBHOOK_SECRET?: string;
      RATE_LIMIT_WINDOW_MS?: string;
      RATE_LIMIT_MAX_REQUESTS?: string;
      LOG_LEVEL?: string;
      REDIS_URL?: string;
      SENTRY_DSN?: string;
      ENCRYPTION_KEY?: string;
      API_VERSION?: string;
      CORS_ORIGIN?: string;
      SSL_CERT_PATH?: string;
      SSL_KEY_PATH?: string;
    }
  }
}

export {};