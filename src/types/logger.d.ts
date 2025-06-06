import winston from 'winston';

declare module 'winston' {
  interface Logger {
    stream: {
      write: (message: string) => void;
    };
  }
}

export interface LogContext {
  userId?: string | number;
  requestId?: string;
  [key: string]: any;
}

export interface ApiLogContext extends LogContext {
  service: string;
  endpoint: string;
  method?: string;
  statusCode?: number;
  duration?: number;
}

export interface DatabaseLogContext extends LogContext {
  query: string;
  params?: any[];
  duration?: number;
  rowCount?: number;
}

export interface ErrorLogContext extends LogContext {
  errorCode?: string;
  errorType?: string;
  stackTrace?: string;
  originalError?: any;
}