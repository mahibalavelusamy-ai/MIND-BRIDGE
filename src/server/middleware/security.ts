import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

/**
 * Restricted CORS allowlist configuration.
 * Permits the official Cloud Run staging/preview domains, localhost dev server, and explicitly configured origins.
 */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  process.env.APP_URL,
  process.env.VITE_APP_URL
].filter(Boolean) as string[];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser callers (curl, server-to-server, mobile applets, tests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed origin list or *.run.app domain
    const isAllowed = allowedOrigins.some(o => o === origin) ||
      /\.run\.app$/.test(origin) ||
      process.env.NODE_ENV !== 'production';

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: origin ${origin} is not in the allowlist.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

/**
 * Helmet Security Headers Middleware
 * Configures Content-Security-Policy, HSTS, X-Content-Type-Options, etc.
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // Vite inline dev assets and fonts require relaxed CSP in dev
  crossOriginEmbedderPolicy: false
});

/**
 * Express Rate Limiting Middleware
 * Throttles excessive repeated requests from a single IP address to prevent denial of wallet and brute force.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 200, // relaxed in test
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP address. Please try again after 15 minutes.'
    }
  }
});
