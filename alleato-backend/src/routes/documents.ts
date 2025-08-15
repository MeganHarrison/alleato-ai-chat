import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { nanoid } from 'nanoid';
import type { Env, AuthenticatedContext } from '../types/env';

const documentsRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: AuthenticatedContext;
  };
}>();

// Apply authentication
documentsRouter.use('*', requireAuth);

// GET /documents - List user's documents
documentsRouter.get('/', async (c) => {
  const user = c.get('user');
  
  try {
    const results = await c.env.DB.prepare(
      'SELECT id, title, content, createdAt, updatedAt FROM Document WHERE userId = ? ORDER BY updatedAt DESC'
    ).bind(user.userId).all();
    
    return c.json({ documents: results.results || [] });
  } catch (error) {
    return c.json({ error: 'Failed to list documents' }, 500);
  }
});

// POST /documents - Create new document
documentsRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  if (!body.title || !body.content) {
    return c.json({ error: 'Title and content required' }, 400);
  }
  
  const documentId = nanoid();
  const now = new Date().toISOString();
  
  try {
    await c.env.DB.prepare(
      'INSERT INTO Document (id, userId, title, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(documentId, user.userId, body.title, body.content, now, now).run();
    
    return c.json({
      id: documentId,
      title: body.title,
      content: body.content,
      createdAt: now,
      updatedAt: now,
    }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create document' }, 500);
  }
});

// GET /documents/:id - Get specific document
documentsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const documentId = c.req.param('id');
  
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM Document WHERE id = ? AND userId = ?'
    ).bind(documentId, user.userId).first();
    
    if (!result) {
      return c.json({ error: 'Document not found' }, 404);
    }
    
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to get document' }, 500);
  }
});

// PUT /documents/:id - Update document
documentsRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const documentId = c.req.param('id');
  const body = await c.req.json();
  
  const updates = [];
  const values = [];
  
  if (body.title !== undefined) {
    updates.push('title = ?');
    values.push(body.title);
  }
  
  if (body.content !== undefined) {
    updates.push('content = ?');
    values.push(body.content);
  }
  
  if (updates.length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400);
  }
  
  updates.push('updatedAt = ?');
  values.push(new Date().toISOString());
  
  values.push(documentId, user.userId);
  
  try {
    const result = await c.env.DB.prepare(
      `UPDATE Document SET ${updates.join(', ')} WHERE id = ? AND userId = ?`
    ).bind(...values).run();
    
    if (result.meta.changes === 0) {
      return c.json({ error: 'Document not found' }, 404);
    }
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to update document' }, 500);
  }
});

// DELETE /documents/:id - Delete document
documentsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const documentId = c.req.param('id');
  
  try {
    const result = await c.env.DB.prepare(
      'DELETE FROM Document WHERE id = ? AND userId = ?'
    ).bind(documentId, user.userId).run();
    
    if (result.meta.changes === 0) {
      return c.json({ error: 'Document not found' }, 404);
    }
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete document' }, 500);
  }
});

export { documentsRouter };