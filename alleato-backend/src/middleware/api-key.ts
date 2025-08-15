import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';

export const validateApiKey: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  
  if (!apiKey) {
    return c.json({
      error: 'Unauthorized',
      message: 'API key required',
    }, 401);
  }
  
  if (apiKey !== c.env.ADMIN_API_KEY) {
    return c.json({
      error: 'Unauthorized',
      message: 'Invalid API key',
    }, 401);
  }
  
  await next();
};