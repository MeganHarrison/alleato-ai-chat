import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';

interface RateLimitInfo {
  count: number;
  resetAt: number;
}

export const rateLimiter: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const key = `ratelimit:${ip}`;
  
  // Get current rate limit info
  const data = await c.env.CACHE.get(key);
  const now = Date.now();
  
  let info: RateLimitInfo;
  if (data) {
    info = JSON.parse(data);
    if (now > info.resetAt) {
      // Reset window
      info = { count: 1, resetAt: now + 60000 }; // 1 minute window
    } else {
      info.count++;
    }
  } else {
    info = { count: 1, resetAt: now + 60000 };
  }
  
  // Check limit (60 requests per minute)
  const limit = 60;
  if (info.count > limit) {
    const retryAfter = Math.ceil((info.resetAt - now) / 1000);
    return c.json({
      error: 'Too Many Requests',
      retryAfter,
    }, 429, {
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(info.resetAt).toISOString(),
    });
  }
  
  // Update rate limit
  await c.env.CACHE.put(key, JSON.stringify(info), {
    expirationTtl: 60, // 1 minute
  });
  
  // Add headers
  c.header('X-RateLimit-Limit', limit.toString());
  c.header('X-RateLimit-Remaining', (limit - info.count).toString());
  c.header('X-RateLimit-Reset', new Date(info.resetAt).toISOString());
  
  await next();
};