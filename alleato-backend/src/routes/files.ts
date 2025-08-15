import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { Env, AuthenticatedContext } from '../types/env';

const filesRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: AuthenticatedContext;
  };
}>();

// Apply authentication
filesRouter.use('*', requireAuth);

// POST /files/upload
filesRouter.post('/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type' }, 400);
  }
  
  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'File too large' }, 400);
  }
  
  try {
    // Upload to R2
    const key = `${Date.now()}-${file.name}`;
    await c.env.FILES.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });
    
    const url = `${c.env.R2_PUBLIC_URL}/${key}`;
    
    return c.json({
      url,
      id: key,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    return c.json({ error: 'Upload failed' }, 500);
  }
});

// GET /files/:id
filesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  try {
    const object = await c.env.FILES.get(id);
    if (!object) {
      return c.json({ error: 'File not found' }, 404);
    }
    
    return c.json({
      id,
      url: `${c.env.R2_PUBLIC_URL}/${id}`,
      size: object.size,
      uploaded: object.uploaded,
    });
  } catch (error) {
    return c.json({ error: 'Failed to get file' }, 500);
  }
});

// DELETE /files/:id
filesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  
  try {
    await c.env.FILES.delete(id);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete file' }, 500);
  }
});

export { filesRouter };