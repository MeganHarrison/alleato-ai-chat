import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CloudflareStreamManager } from '../../lib/cloudflare/kv-stream';
import { R2Storage } from '../../lib/cloudflare/r2-storage';
import { createD1Database } from '../../lib/cloudflare/d1-adapter';

export interface Env {
  // KV Namespaces
  STREAMS: KVNamespace;
  
  // R2 Buckets
  ALLEATO_BUCKET: R2Bucket;
  
  // D1 Databases
  ALLEATO_DB: D1Database;
  
  // Environment variables
  R2_PUBLIC_URL: string;
  WORKER_TOKEN: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use('/*', cors());

// Authentication middleware
app.use('/api/*', async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.WORKER_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});

// Stream management endpoints
app.post('/api/streams', async (c) => {
  const streamManager = new CloudflareStreamManager(c.env.STREAMS);
  const streamId = await streamManager.createStream();
  return c.json({ streamId });
});

app.get('/api/streams/:id', async (c) => {
  const streamManager = new CloudflareStreamManager(c.env.STREAMS);
  const streamId = c.req.param('id');
  const stream = await streamManager.getStream(streamId);
  
  if (!stream) {
    return c.json({ error: 'Stream not found' }, 404);
  }
  
  return c.json(stream);
});

app.post('/api/streams/:id/append', async (c) => {
  const streamManager = new CloudflareStreamManager(c.env.STREAMS);
  const streamId = c.req.param('id');
  const message = await c.req.json();
  
  try {
    await streamManager.appendToStream(streamId, message);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Stream not found' }, 404);
  }
});

app.delete('/api/streams/:id', async (c) => {
  const streamManager = new CloudflareStreamManager(c.env.STREAMS);
  const streamId = c.req.param('id');
  await streamManager.deleteStream(streamId);
  return c.json({ success: true });
});

// File upload endpoint
app.post('/api/files/upload', async (c) => {
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
  
  const storage = new R2Storage(
    c.env.ALLEATO_BUCKET,
    'alleato',
    c.env.R2_PUBLIC_URL
  );
  
  try {
    const result = await storage.upload(file, {
      access: 'public',
      contentType: file.type,
    });
    
    return c.json({
      url: result.url,
      pathname: result.pathname,
      contentType: result.contentType,
    });
  } catch (error) {
    return c.json({ error: 'Upload failed' }, 500);
  }
});

// Database proxy endpoint (optional - for complex queries)
app.post('/api/db/query', async (c) => {
  const { query, params } = await c.req.json();
  const db = createD1Database(c.env.ALLEATO_DB);
  
  try {
    const result = await db.prepare(query).bind(...params).all();
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Query failed' }, 500);
  }
});

export default app;