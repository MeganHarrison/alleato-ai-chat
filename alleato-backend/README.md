# Alleato Backend

A standalone Cloudflare Workers backend for the Alleato AI Chat application.

## Architecture Benefits

### 1. **Complete Separation of Concerns**
- Backend runs entirely on Cloudflare Workers
- Frontend is just a static Next.js app
- Can deploy and scale independently
- Different teams can work on frontend/backend without conflicts

### 2. **Edge-Native Performance**
- Runs at 300+ Cloudflare edge locations globally
- Sub-10ms latency for most users
- Automatic scaling with no cold starts
- Built-in DDoS protection

### 3. **Cost Effective**
- Workers: 100k requests/day free
- D1: 5GB storage, 5M reads/day free
- KV: 100k reads/day, 1k writes/day free
- R2: No egress fees

### 4. **Easy Deployment**
```bash
# Development
npm run dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/guest` - Create guest session
- `POST /api/v1/auth/logout` - Logout user

### Chats
- `GET /api/v1/chats` - List user's chats
- `POST /api/v1/chats` - Create new chat
- `GET /api/v1/chats/:id` - Get chat details
- `POST /api/v1/chats/:id/messages` - Send message (SSE stream)
- `DELETE /api/v1/chats/:id` - Delete chat

### Files
- `POST /api/v1/files/upload` - Upload file to R2
- `GET /api/v1/files/:id` - Get file info
- `DELETE /api/v1/files/:id` - Delete file

### Streams
- `POST /api/v1/streams` - Create stream
- `GET /api/v1/streams/:id` - Get stream data
- `POST /api/v1/streams/:id/append` - Append to stream
- `DELETE /api/v1/streams/:id` - Delete stream

## Frontend Integration

Use the provided SDK for type-safe API access:

```typescript
import { alleato } from '@/lib/alleato-sdk';

// Login
const { user, token } = await alleato.auth.login(email, password);

// Create chat
const { chat } = await alleato.chats.create({ title: 'New Chat' });

// Send message with streaming
const stream = await alleato.chats.sendMessage(
  chat.id,
  [{ role: 'user', content: 'Hello!' }]
);

// Upload file
const result = await alleato.files.upload(file);
```

## Environment Setup

1. Create KV namespaces:
```bash
wrangler kv:namespace create "SESSIONS"
wrangler kv:namespace create "CACHE"
```

2. Set secrets:
```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put ADMIN_API_KEY
```

3. Deploy:
```bash
npm run deploy
```

## Development Workflow

1. **Backend Changes**
   - Make changes in `alleato-backend/`
   - Test locally: `npm run dev`
   - Deploy: `npm run deploy:staging`
   - No frontend rebuild needed!

2. **Frontend Changes**
   - Use the SDK in your components
   - Backend API is always available
   - No CORS issues (configured in backend)

3. **Database Migrations**
   - Run migrations: `wrangler d1 migrations apply DB`
   - Migrations in `migrations/` folder
   - Automatic backup before migrations

## Monitoring

- Real-time logs: `wrangler tail`
- Analytics: Cloudflare dashboard
- Error tracking: Built into Workers
- Performance metrics: Automatic

## Security Features

- JWT-based authentication
- Rate limiting per IP
- API key for admin routes
- Secure headers (HSTS, CSP, etc.)
- Input validation with Zod
- SQL injection protection (D1 prepared statements)

## Scaling

The backend automatically scales:
- No server management
- No capacity planning
- Pay per request
- Global distribution

## Testing

```bash
# Run tests
npm test

# Run specific test
npm test auth.test.ts
```

## CI/CD

GitHub Actions workflow included for:
- Automated testing
- Staging deployment on PR
- Production deployment on merge to main