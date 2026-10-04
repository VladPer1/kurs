import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

export const ENV = {
  PORT: 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'course-platform-super-secret-access-token-key-256bit',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'course-platform-super-secret-refresh-token-key-256bit',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  // 32 bytes hex for AES-256-GCM (64 hex characters)
  AES_SECRET_KEY: process.env.AES_SECRET_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  DATABASE_URL: process.env.DATABASE_URL || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || true,
  BRUTE_FORCE_MAX_ATTEMPTS: 5,
  LOCK_TIME_MINUTES: 15,
};
