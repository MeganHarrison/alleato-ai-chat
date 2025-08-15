import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { AuthService } from '../services/auth';
import type { Env } from '../types/env';

const authRouter = new Hono<{ Bindings: Env }>();

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Register schema
const registerSchema = loginSchema;

// POST /auth/login
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const authService = new AuthService(c.env);
  
  const user = await authService.validateUser(email, password);
  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  
  const session = await authService.createSession(user);
  return c.json({ user, token: session.token });
});

// POST /auth/register
authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const authService = new AuthService(c.env);
  
  try {
    const user = await authService.createUser(email, password);
    const session = await authService.createSession(user);
    return c.json({ user, token: session.token }, 201);
  } catch (error) {
    return c.json({ error: 'User already exists' }, 400);
  }
});

// POST /auth/guest
authRouter.post('/guest', async (c) => {
  const authService = new AuthService(c.env);
  
  const user = await authService.createGuestUser();
  const session = await authService.createSession(user);
  return c.json({ user, token: session.token }, 201);
});

// POST /auth/logout
authRouter.post('/logout', async (c) => {
  // Token invalidation would happen here
  return c.json({ success: true });
});

export { authRouter };