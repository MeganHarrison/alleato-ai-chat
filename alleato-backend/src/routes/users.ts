import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { Env, AuthenticatedContext } from '../types/env';

const usersRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: AuthenticatedContext;
  };
}>();

// Apply authentication
usersRouter.use('*', requireAuth);

// GET /users/me - Get current user
usersRouter.get('/me', async (c) => {
  const user = c.get('user');
  
  try {
    const result = await c.env.DB.prepare(
      'SELECT id, email, createdAt FROM User WHERE id = ?'
    ).bind(user.userId).first();
    
    if (!result) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({
      id: result.id,
      email: result.email,
      type: user.type,
      createdAt: result.createdAt,
    });
  } catch (error) {
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

// PUT /users/me - Update current user
usersRouter.put('/me', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  // Only allow email updates for now
  if (body.email) {
    try {
      await c.env.DB.prepare(
        'UPDATE User SET email = ? WHERE id = ?'
      ).bind(body.email, user.userId).run();
      
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: 'Failed to update user' }, 500);
    }
  }
  
  return c.json({ error: 'No valid fields to update' }, 400);
});

// DELETE /users/me - Delete current user
usersRouter.delete('/me', async (c) => {
  const user = c.get('user');
  
  if (user.type === 'guest') {
    return c.json({ error: 'Cannot delete guest user' }, 400);
  }
  
  try {
    // Delete user's data
    await c.env.DB.prepare('DELETE FROM Chat WHERE userId = ?').bind(user.userId).run();
    await c.env.DB.prepare('DELETE FROM Document WHERE userId = ?').bind(user.userId).run();
    await c.env.DB.prepare('DELETE FROM User WHERE id = ?').bind(user.userId).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

export { usersRouter };