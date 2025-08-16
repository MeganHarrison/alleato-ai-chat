# Alleato Backend Architecture Strategy

## Overview
A fully decoupled, edge-native backend running on Cloudflare Workers, serving as a standalone API for the Alleato AI Chat application.

## Architecture Design

```
┌─────────────────────────────────────────────────────────┐
│                 FRONTEND (Any Platform)                  │
│         Next.js / React Native / Flutter / etc.          │
│                    (Stateless UI)                        │
└────────────────┬────────────────────────────────────────┘
                 │ HTTPS REST/SSE API
                 ▼
┌─────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKERS BACKEND                  │
│                alleato-api.workers.dev                   │
├───────────────────────────────────────────────────────────┤
│  API Gateway Layer (Hono Router)                         │
│  ├── /api/v1/auth/*    → Authentication Service         │
│  ├── /api/v1/chats/*   → Chat Service                   │
│  ├── /api/v1/streams/* → Streaming Service              │
│  ├── /api/v1/files/*   → File Service                   │
│  ├── /api/v1/admin/*   → Admin Service                  │
│  └── /api/v1/public/*  → Public Endpoints               │
├───────────────────────────────────────────────────────────┤
│  Middleware Pipeline                                     │
│  ├── CORS Handler                                        │
│  ├── Rate Limiter (KV-based)                           │
│  ├── JWT Authentication                                  │
│  ├── Request Validation (Zod)                          │
│  └── Error Handler                                       │
├───────────────────────────────────────────────────────────┤
│  Core Services                                           │
│  ├── ChatService       → AI Chat Logic                  │
│  ├── AuthService       → User Management                │
│  ├── StreamService     → SSE/WebSocket Handler          │
│  ├── StorageService    → File Management                │
│  └── CacheService      → Response Caching               │
├───────────────────────────────────────────────────────────┤
│  Data Layer                                              │
│  ├── D1 Database       → Primary Storage                │
│  ├── KV Namespaces     → Sessions/Cache/Rate Limits     │
│  ├── R2 Storage        → File Storage                   │
│  ├── Durable Objects   → Real-time State                │
│  └── Vectorize         → Embeddings (Future)            │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
alleato-backend/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth/
│   │   │   │   ├── routes.ts
│   │   │   │   ├── handlers.ts
│   │   │   │   └── validators.ts
│   │   │   ├── chats/
│   │   │   │   ├── routes.ts
│   │   │   │   ├── handlers.ts
│   │   │   │   └── validators.ts
│   │   │   ├── streams/
│   │   │   ├── files/
│   │   │   └── admin/
│   │   └── middleware/
│   │       ├── auth.ts
│   │       ├── rateLimit.ts
│   │       ├── validation.ts
│   │       └── error.ts
│   ├── services/
│   │   ├── chat.service.ts
│   │   ├── auth.service.ts
│   │   ├── stream.service.ts
│   │   ├── storage.service.ts
│   │   └── cache.service.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── chat.repository.ts
│   │   ├── message.repository.ts
│   │   └── base.repository.ts
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   ├── migrations/
│   │   │   └── index.ts
│   │   ├── kv/
│   │   │   ├── session.ts
│   │   │   ├── cache.ts
│   │   │   └── rateLimit.ts
│   │   ├── ai/
│   │   │   ├── openai.ts
│   │   │   └── streaming.ts
│   │   └── utils/
│   │       ├── jwt.ts
│   │       ├── crypto.ts
│   │       └── validators.ts
│   └── types/
│       ├── env.ts
│       ├── api.ts
│       └── models.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── migrations/
│   └── 0001_initial.sql
├── wrangler.toml
├── package.json
└── README.md
```

## API Design

### Versioned REST API

All endpoints follow RESTful conventions with API versioning:

```typescript
BASE_URL: https://alleato-api.workers.dev/api/v1

Headers:
- Authorization: Bearer <jwt_token>
- X-API-Key: <api_key> (for admin routes)
- Content-Type: application/json
```

### Core Endpoints

#### Authentication
```
POST   /api/v1/auth/register     # Create account
POST   /api/v1/auth/login        # Login with credentials
POST   /api/v1/auth/guest        # Create guest session
POST   /api/v1/auth/refresh      # Refresh JWT token
POST   /api/v1/auth/logout       # Invalidate session
GET    /api/v1/auth/me           # Get current user
```

#### Chat Management
```
GET    /api/v1/chats             # List user's chats
POST   /api/v1/chats             # Create new chat
GET    /api/v1/chats/:id         # Get chat details
PATCH  /api/v1/chats/:id         # Update chat (title, etc.)
DELETE /api/v1/chats/:id         # Delete chat
GET    /api/v1/chats/:id/export  # Export chat history
```

#### Messaging (with SSE)
```
GET    /api/v1/chats/:id/messages    # Get message history
POST   /api/v1/chats/:id/messages    # Send message (SSE response)
PATCH  /api/v1/messages/:id          # Edit message
DELETE /api/v1/messages/:id          # Delete message
POST   /api/v1/messages/:id/vote     # Vote on message
```

#### Streaming
```
POST   /api/v1/streams               # Create stream session
GET    /api/v1/streams/:id           # Connect to SSE stream
POST   /api/v1/streams/:id/append    # Append to stream
DELETE /api/v1/streams/:id           # Close stream
```

#### File Management
```
POST   /api/v1/files/upload         # Upload file
GET    /api/v1/files/:id            # Get file metadata
GET    /api/v1/files/:id/download   # Download file
DELETE /api/v1/files/:id            # Delete file
POST   /api/v1/files/:id/analyze    # Analyze file with AI
```

## Implementation Details

### 1. Main Router (src/index.ts)
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './api/v1/auth/routes';
import { chatRoutes } from './api/v1/chats/routes';
import { streamRoutes } from './api/v1/streams/routes';
import { fileRoutes } from './api/v1/files/routes';
import { errorMiddleware } from './api/middleware/error';
import { rateLimitMiddleware } from './api/middleware/rateLimit';

export interface Env {
  // Database
  DB: D1Database;
  
  // Storage
  R2: R2Bucket;
  
  // KV Namespaces
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  RATE_LIMIT: KVNamespace;
  
  // Secrets
  JWT_SECRET: string;
  OPENAI_API_KEY: string;
  ADMIN_API_KEY: string;
  
  // Environment
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    const allowed = [
      'http://localhost:3000',
      'https://alleato.vercel.app',
      'https://alleato.com'
    ];
    return allowed.includes(origin) ? origin : allowed[0];
  },
  credentials: true,
}));

app.use('*', errorMiddleware());
app.use('/api/*', rateLimitMiddleware());

// Health check
app.get('/health', (c) => c.json({ 
  status: 'healthy',
  version: '1.0.0',
  environment: c.env.ENVIRONMENT 
}));

// API routes
const api = app.basePath('/api/v1');
api.route('/auth', authRoutes);
api.route('/chats', chatRoutes);
api.route('/streams', streamRoutes);
api.route('/files', fileRoutes);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
```

### 2. Service Layer Example (src/services/chat.service.ts)
```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Database } from '../lib/db';
import type { KVCache } from '../lib/kv/cache';
import { ChatRepository } from '../repositories/chat.repository';
import { MessageRepository } from '../repositories/message.repository';

export class ChatService {
  private chatRepo: ChatRepository;
  private messageRepo: MessageRepository;

  constructor(
    private db: Database,
    private cache: KVCache,
    private openaiKey: string
  ) {
    this.chatRepo = new ChatRepository(db);
    this.messageRepo = new MessageRepository(db);
  }

  async createChat(userId: string, title?: string) {
    const chat = await this.chatRepo.create({
      userId,
      title: title || `Chat ${Date.now()}`,
      visibility: 'private'
    });
    return chat;
  }

  async streamMessage(chatId: string, messages: Message[]) {
    // Check cache for similar queries
    const cacheKey = this.generateCacheKey(messages);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { 'X-Cache': 'HIT' }
      });
    }

    // Generate streaming response
    const result = await streamText({
      model: openai('gpt-4o'),
      messages,
      temperature: 0.7,
      async onFinish({ text }) {
        // Save assistant message
        await this.messageRepo.create({
          chatId,
          role: 'assistant',
          content: text
        });
        
        // Cache response
        await this.cache.set(cacheKey, text, 3600);
      }
    });

    return result.toDataStreamResponse({
      headers: { 'X-Cache': 'MISS' }
    });
  }

  private generateCacheKey(messages: Message[]): string {
    const lastMessage = messages[messages.length - 1];
    return `chat:${this.hashMessage(lastMessage.content)}`;
  }

  private hashMessage(content: string): string {
    // Simple hash for demo - use crypto.subtle.digest in production
    return btoa(content).substring(0, 16);
  }
}
```

### 3. Repository Pattern (src/repositories/base.repository.ts)
```typescript
import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '../lib/db';

export abstract class BaseRepository<T> {
  constructor(
    protected db: Database,
    protected table: any
  ) {}

  async findById(id: string): Promise<T | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .get();
    return result || null;
  }

  async findAll(limit = 10, offset = 0): Promise<T[]> {
    return await this.db
      .select()
      .from(this.table)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(this.table.createdAt));
  }

  async create(data: Partial<T>): Promise<T> {
    const result = await this.db
      .insert(this.table)
      .values(data)
      .returning()
      .get();
    return result;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const result = await this.db
      .update(this.table)
      .set(data)
      .where(eq(this.table.id, id))
      .returning()
      .get();
    return result || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(this.table)
      .where(eq(this.table.id, id))
      .returning()
      .get();
    return !!result;
  }
}
```

## Frontend SDK

### TypeScript SDK (frontend/lib/alleato-sdk.ts)
```typescript
interface AlleatoConfig {
  baseURL?: string;
  token?: string;
  onError?: (error: Error) => void;
}

class AlleatoSDK {
  private baseURL: string;
  private token: string | null = null;
  
  constructor(config: AlleatoConfig = {}) {
    this.baseURL = config.baseURL || process.env.NEXT_PUBLIC_API_URL!;
    this.token = config.token || null;
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('alleato_token', token);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api/v1${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  auth = {
    register: (data: RegisterDto) => 
      this.request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    login: (data: LoginDto) =>
      this.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    guest: () =>
      this.request<AuthResponse>('/auth/guest', {
        method: 'POST',
      }),
    
    me: () =>
      this.request<User>('/auth/me'),
  };

  chats = {
    list: () => 
      this.request<Chat[]>('/chats'),
    
    create: (data: CreateChatDto) =>
      this.request<Chat>('/chats', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    sendMessage: async (chatId: string, messages: Message[]) => {
      const response = await fetch(
        `${this.baseURL}/api/v1/chats/${chatId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
          },
          body: JSON.stringify({ messages }),
        }
      );
      
      return response; // Return raw response for streaming
    },
  };

  files = {
    upload: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(
        `${this.baseURL}/api/v1/files/upload`,
        {
          method: 'POST',
          headers: {
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
          },
          body: formData,
        }
      );
      
      return response.json();
    },
  };
}

export const alleato = new AlleatoSDK();
```

## Deployment Strategy

### Environment Configuration
```toml
# wrangler.toml
name = "alleato-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.staging]
name = "alleato-backend-staging"
vars = { ENVIRONMENT = "staging" }

[env.production]
name = "alleato-backend"
vars = { ENVIRONMENT = "production" }

[[d1_databases]]
binding = "DB"
database_name = "alleato"
database_id = "fc7c9a6d-ca65-4768-b3f9-07ec5afb38c5"

[[r2_buckets]]
binding = "R2"
bucket_name = "alleato"

[[kv_namespaces]]
binding = "SESSIONS"
id = "sessions-namespace-id"

[[kv_namespaces]]
binding = "CACHE"
id = "cache-namespace-id"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "rate-limit-namespace-id"
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'alleato-backend/**'
  pull_request:
    branches: [main]
    paths:
      - 'alleato-backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test

  deploy-staging:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: deploy --env staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: deploy --env production
```

## Key Advantages

### 1. **True Decoupling**
- Backend is a standalone product
- Can serve multiple frontends
- Independent versioning and deployment
- No shared dependencies

### 2. **Developer Experience**
- Type-safe SDK for frontend
- Hot reload in development
- Comprehensive logging
- Easy local testing

### 3. **Production Ready**
- Built-in rate limiting
- JWT authentication
- Input validation
- Error handling
- CORS configured

### 4. **Scalability**
- Auto-scales globally
- No cold starts
- Edge caching
- Efficient database queries

### 5. **Cost Optimization**
- Pay per request
- Free tier generous
- No idle costs
- R2 has no egress fees

## Migration Path

1. **Phase 1: Core API** (Week 1)
   - Authentication endpoints
   - Basic chat CRUD
   - Message streaming

2. **Phase 2: Storage** (Week 2)
   - File upload to R2
   - Attachment handling
   - Export functionality

3. **Phase 3: Advanced** (Week 3)
   - Real-time with Durable Objects
   - Analytics
   - Admin panel

4. **Phase 4: Optimization** (Week 4)
   - Caching strategies
   - Performance tuning
   - Monitoring setup

## Testing Strategy

```typescript
// tests/integration/chat.test.ts
import { describe, it, expect } from 'vitest';
import { alleato } from '../fixtures/sdk';

describe('Chat API', () => {
  it('should create and send message', async () => {
    // Login
    const { token } = await alleato.auth.guest();
    alleato.setToken(token);
    
    // Create chat
    const chat = await alleato.chats.create({ 
      title: 'Test Chat' 
    });
    expect(chat.id).toBeDefined();
    
    // Send message
    const response = await alleato.chats.sendMessage(
      chat.id,
      [{ role: 'user', content: 'Hello' }]
    );
    expect(response.ok).toBe(true);
  });
});
```

## Monitoring & Observability

- **Logs**: `wrangler tail` for real-time
- **Analytics**: Cloudflare Analytics
- **Errors**: Sentry integration
- **Performance**: Web Analytics
- **Uptime**: Better Stack or Pingdom

## Security Checklist

- [x] JWT with short expiry (15 min)
- [x] Refresh tokens in KV
- [x] Rate limiting per IP/User
- [x] Input validation with Zod
- [x] SQL injection prevention
- [x] XSS protection headers
- [x] CORS properly configured
- [x] Secrets in environment variables
- [x] Admin routes protected
- [x] File upload restrictions

## Future Enhancements

1. **WebSocket Support** via Durable Objects
2. **Vector Search** with Vectorize
3. **Multi-tenant** support
4. **API Key Management** for developers
5. **Webhook System** for integrations
6. **GraphQL Gateway** option
7. **SDK for other languages** (Python, Go)
8. **OpenAPI Documentation** generation

This architecture provides a robust, scalable, and maintainable backend that can grow with your application needs while keeping costs minimal and performance optimal.