import { Request, Response, NextFunction } from 'express';

/**
 * Central Error Handler Middleware
 *
 * Catches unhandled synchronous or asynchronous exceptions across all Express routes
 * and guarantees a standardized JSON error shape: `{ error: { code, message } }`.
 */
export function centralErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || (statusCode === 400 ? 'BAD_REQUEST' : statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected internal server error occurred.';

  // Suppress sensitive stack traces in production responses
  if (process.env.NODE_ENV !== 'test') {
    console.error('[MindBridge CentralErrorHandler]', err);
  }

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message
    }
  });
}
