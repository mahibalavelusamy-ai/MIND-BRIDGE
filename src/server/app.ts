import express, { Express } from 'express';
import { helmetMiddleware, corsMiddleware, apiRateLimiter } from './middleware/security';
import { centralErrorHandler } from './middleware/errorHandler';
import { apiRouter } from './routes/api';

/**
 * Creates and configures the Express application instance for Mind Bridge.
 *
 * Configures:
 * - Helmet security headers
 * - CORS allowlist
 * - Rate limiting (120 req / 15 min per IP)
 * - 2MB body size limit on incoming JSON
 * - /api routes with Zod validation, token authentication, and resilient Gemini fallbacks
 * - Centralized error handling returning standardized { error: { code, message } }
 */
export function createApp(): Express {
  const app = express();

  // Security headers & CORS
  app.use(helmetMiddleware);
  app.use(corsMiddleware);

  // Body parser with 2MB limit
  app.use(express.json({ limit: '2mb' }));

  // Global rate limiter on API surface
  app.use('/api', apiRateLimiter);

  // API router
  app.use('/api', apiRouter);

  // Central error handling middleware
  app.use(centralErrorHandler);

  return app;
}
