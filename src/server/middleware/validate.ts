import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Zod Request Body Validation Middleware
 *
 * Validates incoming JSON payloads against a strongly-typed schema.
 * Rejects invalid payloads with HTTP 400 and a standardized error response shape:
 * `{ error: { code: "VALIDATION_ERROR", message: string, details?: any[] } }`
 *
 * @param schema - The Zod schema to validate req.body against.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errorMessages = err.issues.map(e => `${e.path.join('.') || 'body'}: ${e.message}`).join(', ');
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Validation failed: ${errorMessages}`,
            details: err.issues
          }
        });
        return;
      }
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body.'
        }
      });
    }
  };
}
