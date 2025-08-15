import type { ErrorHandler } from 'hono';
import type { Env } from '../types/env';

export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err, c) => {
  console.error(`Error: ${err.message}`, err);
  
  // Don't expose internal errors in production
  const isDev = c.env.ENVIRONMENT === 'development';
  
  if (err.name === 'ZodError') {
    return c.json({
      error: 'Validation Error',
      details: isDev ? err : undefined,
    }, 400);
  }
  
  if (err.name === 'UnauthorizedError') {
    return c.json({
      error: 'Unauthorized',
      message: err.message,
    }, 401);
  }
  
  // Default error response
  return c.json({
    error: 'Internal Server Error',
    message: isDev ? err.message : 'An unexpected error occurred',
    stack: isDev ? err.stack : undefined,
  }, 500);
};