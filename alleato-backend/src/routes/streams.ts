import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { nanoid } from 'nanoid';
import type { Env, AuthenticatedContext } from '../types/env';

const streamsRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: AuthenticatedContext;
  };
}>();

// Apply authentication
streamsRouter.use('*', requireAuth);

interface StreamData {
  id: string;
  data: any[];
  createdAt: number;
  updatedAt: number;
}

// POST /streams - Create new stream
streamsRouter.post('/', async (c) => {
  const streamId = nanoid();
  const streamData: StreamData = {
    id: streamId,
    data: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await c.env.STREAMS.put(
    `stream:${streamId}`,
    JSON.stringify(streamData),
    { expirationTtl: 86400 } // 24 hours
  );
  
  return c.json({ streamId }, 201);
});

// GET /streams/:id - Get stream data
streamsRouter.get('/:id', async (c) => {
  const streamId = c.req.param('id');
  const data = await c.env.STREAMS.get(`stream:${streamId}`);
  
  if (!data) {
    return c.json({ error: 'Stream not found' }, 404);
  }
  
  return c.json(JSON.parse(data));
});

// POST /streams/:id/append - Append to stream
streamsRouter.post('/:id/append', async (c) => {
  const streamId = c.req.param('id');
  const body = await c.req.json();
  
  const existingData = await c.env.STREAMS.get(`stream:${streamId}`);
  if (!existingData) {
    return c.json({ error: 'Stream not found' }, 404);
  }
  
  const streamData: StreamData = JSON.parse(existingData);
  streamData.data.push(body);
  streamData.updatedAt = Date.now();
  
  await c.env.STREAMS.put(
    `stream:${streamId}`,
    JSON.stringify(streamData),
    { expirationTtl: 86400 }
  );
  
  return c.json({ success: true });
});

// DELETE /streams/:id - Delete stream
streamsRouter.delete('/:id', async (c) => {
  const streamId = c.req.param('id');
  await c.env.STREAMS.delete(`stream:${streamId}`);
  return c.json({ success: true });
});

export { streamsRouter };