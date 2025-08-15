import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

// Import routers
import { authRouter } from './routes/auth';
import { chatRouter } from './routes/chat';
import { filesRouter } from './routes/files';
import { streamsRouter } from './routes/streams';
import { usersRouter } from './routes/users';
import { documentsRouter } from './routes/documents';

// Import middleware
import { errorHandler } from './middleware/error';
import { rateLimiter } from './middleware/rate-limit';
import { validateApiKey } from './middleware/api-key';

// Types
import type { Env } from './types/env';

// Create the main Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', prettyJSON());

// CORS configuration
app.use('*', cors({
  origin: (origin, c) => {
    const allowedOrigins = c.env.CORS_ORIGIN?.split(',') || ['*'];
    return allowedOrigins.includes('*') || allowedOrigins.includes(origin) ? origin : null;
  },
  credentials: true,
}));

// Error handling
app.onError(errorHandler);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    version: c.env.API_VERSION,
  });
});

// API documentation
app.get('/', (c) => {
  return c.json({
    name: 'Alleato Backend API',
    version: c.env.API_VERSION,
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth/*',
      users: '/api/v1/users/*',
      chats: '/api/v1/chats/*',
      files: '/api/v1/files/*',
      streams: '/api/v1/streams/*',
      documents: '/api/v1/documents/*',
    },
    documentation: 'https://github.com/yourusername/alleato-backend#api-documentation',
  });
});

// API routes with versioning
const api = app.basePath('/api/v1');

// Apply rate limiting to API routes
api.use('*', rateLimiter);

// Mount routers
api.route('/auth', authRouter);
api.route('/users', usersRouter);
api.route('/chats', chatRouter);
api.route('/files', filesRouter);
api.route('/streams', streamsRouter);
api.route('/documents', documentsRouter);

// Admin routes (protected by API key)
const admin = app.basePath('/admin');
admin.use('*', validateApiKey);

admin.get('/stats', async (c) => {
  // Return usage statistics
  return c.json({
    users: { total: 0 },
    chats: { total: 0 },
    files: { total: 0, storage: '0 MB' },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: `Route ${c.req.path} not found`,
  }, 404);
});

export default app;

// Export Durable Object classes
// TODO: Uncomment when ChatRoom is implemented
// export { ChatRoom } from './durable-objects/chat-room';