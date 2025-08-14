# Alleato Architecture Documentation

## 📊 System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND (Next.js)                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│  📱 UI Components          │  🔧 Services           │  🎯 SDK                   │
│  • Chat Interface          │  • Authentication      │  • alleato.auth.*         │
│  • File Upload             │  • Chat Management     │  • alleato.chats.*        │
│  • Document Editor         │  • Stream Handler      │  • alleato.files.*        │
│  • Artifact Viewer         │  • File Manager        │  • alleato.streams.*      │
└────────────────────────────┴──────────────────────┴─────────────────────────────┘
                                          │
                                          │ HTTPS/API Calls
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (Cloudflare Workers)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🚀 API Routes             │  🛡️ Middleware          │  💼 Services             │
│  • /auth/*                 │  • Authentication      │  • AuthService           │
│  • /chats/*                │  • Rate Limiting       │  • ChatService           │
│  • /files/*                │  • CORS                │  • FileService           │
│  • /streams/*              │  • Error Handling      │  • StreamService         │
│  • /documents/*            │  • API Key Validation  │  • AIService             │
└────────────────────────────┴──────────────────────┴─────────────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
         ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
         │   Cloudflare KV   │  │        R2        │  │        D1        │
         ├──────────────────┤  ├──────────────────┤  ├──────────────────┤
         │ • Sessions        │  │ • File Storage   │  │ • Users          │
         │ • Streams         │  │ • Images         │  │ • Chats          │
         │ • Cache           │  │ • Documents      │  │ • Messages       │
         │ • Rate Limits     │  │ • Attachments    │  │ • Documents      │
         └──────────────────┘  └──────────────────┘  └──────────────────┘
```

## 📁 File Structure Tables

### Frontend Structure

| Directory | Purpose | Key Files | Description |
|-----------|---------|-----------|-------------|
| `/app` | Next.js App Router | `layout.tsx`, `page.tsx` | Main application routes and layouts |
| `/app/(auth)` | Authentication pages | `login/page.tsx`, `register/page.tsx` | User authentication UI |
| `/app/(chat)` | Chat interface | `chat/[id]/page.tsx` | Main chat functionality |
| `/app/api` | API routes (legacy) | Various routes | Being migrated to Workers |
| `/components` | React components | `chat.tsx`, `sidebar.tsx` | Reusable UI components |
| `/lib` | Utilities & SDK | `alleato-sdk/`, `db/`, `ai/` | Core business logic |
| `/artifacts` | Content renderers | `code.tsx`, `document.tsx` | Artifact display components |
| `/hooks` | React hooks | `use-chat.ts`, `use-auth.ts` | Custom React hooks |

### Backend Structure (Cloudflare Workers)

| Directory | Purpose | Key Files | Description |
|-----------|---------|-----------|-------------|
| `/src/index.ts` | Main entry | Worker initialization | App setup and routing |
| `/src/routes` | API endpoints | `auth.ts`, `chat.ts`, `files.ts` | RESTful API routes |
| `/src/services` | Business logic | `auth.ts`, `chat.ts`, `ai.ts` | Core service implementations |
| `/src/middleware` | Request processing | `auth.ts`, `rate-limit.ts` | Request interceptors |
| `/src/types` | TypeScript types | `env.ts`, `models.ts` | Type definitions |
| `/src/utils` | Helper functions | `crypto.ts`, `validation.ts` | Utility functions |
| `/src/durable-objects` | Stateful workers | `chat-room.ts` | Real-time features |

## 🔧 Service Breakdown

### Frontend Services

| Service | Location | Purpose | Dependencies |
|---------|----------|---------|--------------|
| **Authentication** | `/lib/auth` | User session management | NextAuth, Cookies |
| **Chat Management** | `/lib/chat` | Chat state & operations | React Context, SWR |
| **File Upload** | `/lib/upload` | File handling | FormData, Blob API |
| **AI Integration** | `/lib/ai` | AI model interactions | Vercel AI SDK |
| **Database** | `/lib/db` | Data persistence | Drizzle ORM |

### Backend Services (Workers)

| Service | Endpoint | Purpose | Storage |
|---------|----------|---------|---------|
| **AuthService** | `/api/v1/auth/*` | User authentication | D1 (users), KV (sessions) |
| **ChatService** | `/api/v1/chats/*` | Chat CRUD operations | D1 (chats, messages) |
| **FileService** | `/api/v1/files/*` | File management | R2 (files), D1 (metadata) |
| **StreamService** | `/api/v1/streams/*` | Real-time streams | KV (stream data) |
| **AIService** | Internal | AI model calls | OpenAI API |

## 🗄️ Storage Systems

### Cloudflare KV (Key-Value)

| Namespace | Purpose | Data Structure | TTL |
|-----------|---------|----------------|-----|
| **SESSIONS** | User sessions | `session:{token}` → User data | 7 days |
| **STREAMS** | Chat streams | `stream:{id}` → Stream state | 24 hours |
| **CACHE** | API cache | `cache:{key}` → Response data | 1 hour |
| **RATE_LIMITS** | Rate limiting | `rate:{ip}:{endpoint}` → Count | 1 minute |

### Cloudflare R2 (Object Storage)

| Bucket | Purpose | File Types | Access |
|--------|---------|------------|--------|
| **alleato** | User uploads | Images, PDFs, Documents | Public read |
| **avatars** | Profile pictures | JPEG, PNG | Public read |
| **exports** | Data exports | JSON, CSV | Private |

### Cloudflare D1 (SQL Database)

| Table | Purpose | Key Fields | Relationships |
|-------|---------|------------|---------------|
| **User** | User accounts | id, email, password | → Chats, Documents |
| **Chat** | Conversations | id, userId, title | → Messages, User |
| **Message_v2** | Chat messages | id, chatId, content | → Chat |
| **Document** | Saved documents | id, userId, content | → User, Suggestions |
| **Vote_v2** | Message feedback | chatId, messageId | → Message |
| **Stream** | Stream references | id, chatId | → Chat |

## 🔌 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| POST | `/auth/register` | Create account | `{email, password}` | `{user, token}` |
| POST | `/auth/login` | Login | `{email, password}` | `{user, token}` |
| POST | `/auth/guest` | Guest login | None | `{user, token}` |
| POST | `/auth/logout` | Logout | None | `{success}` |
| GET | `/auth/me` | Current user | None | `{user}` |

### Chat Endpoints

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| GET | `/chats` | List chats | None | `{chats[]}` |
| POST | `/chats` | Create chat | `{title, visibility}` | `{chat}` |
| GET | `/chats/:id` | Get chat | None | `{chat, messages[]}` |
| POST | `/chats/:id/messages` | Send message | `{messages[]}` | SSE Stream |
| DELETE | `/chats/:id` | Delete chat | None | `{success}` |

### File Endpoints

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| POST | `/files/upload` | Upload file | FormData | `{url, id, size}` |
| GET | `/files/:id` | Get file info | None | `{file}` |
| DELETE | `/files/:id` | Delete file | None | `{success}` |

## 🚀 Deployment Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|--------------|-------------|---------|
| **Development** | http://localhost:3000 | http://localhost:8787 | Local development |
| **Staging** | https://staging.alleato.ai | https://staging-api.alleato.ai | Testing |
| **Production** | https://alleato.ai | https://api.alleato.ai | Live users |

## 🔐 Security Layers

| Layer | Implementation | Purpose |
|-------|----------------|---------|
| **Authentication** | JWT tokens | User identity verification |
| **Authorization** | Role-based access | Permission management |
| **Rate Limiting** | IP-based limits | Prevent abuse |
| **CORS** | Origin whitelist | Cross-origin security |
| **Input Validation** | Zod schemas | Data integrity |
| **SQL Injection** | Prepared statements | Database security |
| **XSS Prevention** | Content sanitization | Output security |

## 📈 Data Flow Examples

### User Login Flow
```
1. User → Frontend: Enter credentials
2. Frontend → SDK: alleato.auth.login()
3. SDK → Backend API: POST /auth/login
4. Backend → D1: Verify user
5. Backend → KV: Store session
6. Backend → Frontend: Return JWT token
7. Frontend: Store token, redirect
```

### Chat Message Flow
```
1. User → Frontend: Type message
2. Frontend → SDK: alleato.chats.sendMessage()
3. SDK → Backend API: POST /chats/:id/messages
4. Backend → OpenAI: Stream completion
5. Backend → D1: Save messages
6. Backend → Frontend: SSE stream
7. Frontend: Display streaming response
```

### File Upload Flow
```
1. User → Frontend: Select file
2. Frontend → SDK: alleato.files.upload()
3. SDK → Backend API: POST /files/upload
4. Backend → R2: Store file
5. Backend → D1: Save metadata
6. Backend → Frontend: Return file URL
7. Frontend: Display uploaded file
```

## 🛠️ Development Workflow

| Task | Location | Command | Description |
|------|----------|---------|-------------|
| **Frontend Dev** | `/` | `pnpm dev` | Start Next.js dev server |
| **Backend Dev** | `/alleato-backend` | `npm run dev` | Start Wrangler dev |
| **Deploy Frontend** | `/` | `vercel deploy` | Deploy to Vercel |
| **Deploy Backend** | `/alleato-backend` | `npm run deploy` | Deploy to Workers |
| **Run Tests** | Both | `npm test` | Execute test suites |
| **Type Check** | Both | `npm run typecheck` | Check TypeScript |

## 📊 Monitoring & Debugging

| Tool | Purpose | Access |
|------|---------|--------|
| **Wrangler Tail** | Real-time logs | `wrangler tail` |
| **Cloudflare Dashboard** | Analytics & metrics | dashboard.cloudflare.com |
| **Vercel Dashboard** | Frontend metrics | vercel.com/dashboard |
| **D1 Console** | Database queries | `wrangler d1 execute` |
| **R2 Browser** | File management | Cloudflare dashboard |

## 🎯 Quick Reference

### Environment Variables

| Variable | Frontend | Backend | Purpose |
|----------|----------|---------|---------|
| `OPENAI_API_KEY` | ✓ | ✓ | AI model access |
| `DATABASE_URL` | ✓ | - | PostgreSQL connection |
| `NEXT_PUBLIC_ALLEATO_API_URL` | ✓ | - | Backend API URL |
| `JWT_SECRET` | - | ✓ | Token signing |
| `R2_PUBLIC_URL` | ✓ | ✓ | File access URL |

### Common Tasks

| Task | Command/Action |
|------|----------------|
| Add new API endpoint | 1. Create route in `/src/routes`<br>2. Add to router in `index.ts`<br>3. Update SDK |
| Add new database table | 1. Update D1 schema<br>2. Run migration<br>3. Update types |
| Add new UI component | 1. Create in `/components`<br>2. Add to page<br>3. Connect to SDK |
| Debug production issue | 1. Check `wrangler tail`<br>2. Review error logs<br>3. Test locally |

This documentation provides a complete overview of the Alleato architecture, making it easy to understand how all the pieces fit together!