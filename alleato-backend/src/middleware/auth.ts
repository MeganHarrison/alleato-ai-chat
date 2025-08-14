import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { AuthService } from '../services/auth';
import type { Env, AuthenticatedContext } from '../types/env';

export const authenticate = createMiddleware<{
  Bindings: Env;
  Variables: {
    user: AuthenticatedContext;
  };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  const authService = new AuthService(c.env);
  const user = await authService.validateSession(token);
  
  if (!user) {
    throw new HTTPException(401, { message: 'Invalid token' });
  }
  
  // Set user context
  c.set('user', {
    userId: user.id,
    email: user.email,
    type: user.type,
  });
  
  await next();
});

export const requireAuth = authenticate;

export const optionalAuth = createMiddleware<{
  Bindings: Env;
  Variables: {
    user?: AuthenticatedContext;
  };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const authService = new AuthService(c.env);
    const user = await authService.validateSession(token);
    
    if (user) {
      c.set('user', {
        userId: user.id,
        email: user.email,
        type: user.type,
      });
    }
  }
  
  await next();
});