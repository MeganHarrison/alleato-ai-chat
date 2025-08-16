# Alleato Architecture Documentation

> **Last Updated**: August 2025
> **Architecture Pattern**: Hybrid Next.js + Edge-Ready Cloudflare Workers
> **Migration Status**: Phase 2 - Dual Implementation

## 📊 System Overview

Alleato uses a sophisticated hybrid architecture that supports both traditional deployment (Vercel + PostgreSQL) and edge computing (Cloudflare Workers + D1/KV/R2). This allows for zero-downtime migration and A/B testing of different infrastructure approaches.

### Current Architecture State

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           HYBRID ARCHITECTURE OVERVIEW                           │
└─────────────────────────────────────────────────────────────────────────────────┘

                              🌐 User Request
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (Next.js on Vercel)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│  📱 UI Layer               │  🔄 Adapter Layer        │  🎯 SDK Layer            │
│  • /app (App Router)       │  • Feature Flags        │  • alleato-sdk           │
│  • /components             │  • Service Adapters     │  • Unified API           │
│  • /artifacts              │  • Storage Adapters     │  • Type Safety           │
│  • /hooks                  │  • Database Adapters    │  • Auto-switching        │
└────────────────────────────┴─────────────────────────┴──────────────────────────┘
                    │                                             │
                    │ Traditional Path                            │ Edge Path
                    │ (Current Production)                        │ (Migration Ready)
                    ▼                                             ▼
┌───────────────────────────────────┐         ┌───────────────────────────────────┐
│   Next.js API Routes              │         │   Cloudflare Workers Backend      │
├───────────────────────────────────┤         ├───────────────────────────────────┤
│  • /app/(chat)/api/*              │         │  • /api/v1/auth/*                 │
│  • Direct AI SDK integration      │         │  • /api/v1/chats/*                │
│  • Server Components              │         │  • /api/v1/files/*                │
│  • NextAuth.js                    │         │  • /api/v1/streams/*              │
│  • Drizzle ORM                    │         │  • /api/v1/documents/*            │
└───────────────────────────────────┘         └───────────────────────────────────┘
                    │                                             │
                    ▼                                             ▼
┌───────────────────────────────────┐         ┌───────────────────────────────────┐
│   Traditional Infrastructure      │         │   Edge Infrastructure             │
├───────────────────────────────────┤         ├───────────────────────────────────┤
│  • PostgreSQL (Neon)              │         │  • D1 (SQLite)                    │
│  • Vercel Blob Storage            │         │  • R2 Object Storage              │
│  • Redis (Upstash)                │         │  • KV (Key-Value)                 │
│  • Vercel Functions               │         │  • Workers (Global)               │
└───────────────────────────────────┘         └───────────────────────────────────┘

                    Feature Flags Control Which Path Is Used
                    ─────────────────────────────────────────
                    USE_CLOUDFLARE=false → Traditional Path
                    USE_CLOUDFLARE=true  → Edge Path
```

## 📁 File Structure Tables

### Frontend Structure (Next.js)

| Directory | Purpose | Key Files | Description |
|-----------|---------|-----------|-------------|
| `/app` | Next.js App Router | `layout.tsx`, `page.tsx` | Main application with route groups |
| `/app/(auth)` | Auth pages | `login/`, `register/` | Public authentication routes |
| `/app/(chat)` | Protected routes | `chat/[id]/`, `api/` | Chat UI and Next.js API routes |
| `/app/(chat)/api` | Active API routes | `chat/`, `files/`, `history/` | Currently serving production |
| `/app/(auth)` | Auth pages | `login/`, `register/` | Being replaced with Supabase UI |
| `/components` | React components | `chat.tsx`, `sidebar.tsx` | Reusable UI components |
| `/lib` | Core logic | `ai/`, `db/`, `config/` | Business logic and adapters |
| `/lib/config` | Feature flags | `cloudflare.ts` | Runtime service selection |
| `/lib/alleato-sdk` | API client | `index.ts` | Unified frontend API |
| `/artifacts` | Content renderers | `code.tsx`, `document.tsx` | Artifact display components |
| `/hooks` | React hooks | Custom hooks | Shared React logic |

### Backend Structure (Cloudflare Workers)

| Directory | Purpose | Key Files | Status |
|-----------|---------|-----------|--------|
| `/alleato-backend` | Separate backend project | `package.json`, `wrangler.toml` | **Deployed** |
| `/src/index.ts` | Main entry | Worker & routing | ✅ Implemented |
| `/src/routes` | API endpoints | `auth.ts`, `chat.ts`, `files.ts` | ✅ Implemented |
| `/src/services` | Business logic | `auth.ts`, `chat.ts` | ✅ Implemented |
| `/src/middleware` | Request handlers | `auth.ts`, `rate-limit.ts`, `error.ts` | ✅ Implemented |
| `/src/types` | TypeScript types | `env.ts` | ✅ Implemented |
| `/src/utils` | Helpers | - | ❌ Not implemented |
| `/src/durable-objects` | Real-time | - | ❌ Using KV instead |

## 🔧 Service Breakdown

### Frontend Services

| Service | Location | Purpose | Dependencies |
|---------|----------|---------|--------------|
| **Authentication** | `/lib/supabase` | User session management | Supabase Auth, Supabase UI |
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

| Environment | Frontend URL | Backend URL | Status | Infrastructure |
|-------------|--------------|-------------|--------|----------------|
| **Development** | http://localhost:3000 | http://localhost:8787 | Active | Local |
| **Production (Current)** | https://alleato-ai-chat.vercel.app | Same (Next.js API) | **Live** | Vercel + PostgreSQL |
| **Production (Edge)** | https://alleato-ai-chat.vercel.app | https://alleato-backend.megan-d14.workers.dev | **Ready** | Vercel + Cloudflare |
| **Migration Path** | No change | Feature flag controlled | Testing | Hybrid |

## 🔐 Security Layers

| Layer | Implementation | Purpose |
|-------|----------------|---------|
| **Authentication** | Supabase Auth | User identity verification |
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
| **Frontend Dev** | `/` | `pnpm dev` | Start Next.js (includes API) |
| **Backend Dev** | `/alleato-backend` | `npm run dev` | Start Workers locally |
| **Test Edge Mode** | `/` | `USE_CLOUDFLARE=true pnpm dev` | Test with Workers backend |
| **Deploy Frontend** | `/` | `vercel --prod` | Deploy to Vercel |
| **Deploy Backend** | `/alleato-backend` | `npm run deploy` | Deploy to Cloudflare |
| **Run Tests** | `/` | `pnpm test` | Playwright E2E tests |
| **Type Check** | Both | `npm run typecheck` | TypeScript validation |
| **Database Migration** | `/` | `pnpm db:migrate` | Run Drizzle migrations |

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

| Variable | Frontend | Backend | Purpose | Required |
|----------|----------|---------|---------|----------|
| `OPENAI_API_KEY` | ✓ | ✓ | AI model access | Yes |
| `DATABASE_URL` | ✓ | - | PostgreSQL connection | Yes |
| `POSTGRES_URL` | ✓ | - | Primary DB connection | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | - | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | - | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | - | Supabase service key | Yes |
| `USE_CLOUDFLARE` | ✓ | - | Enable edge backend | No |
| `USE_CLOUDFLARE_DATABASE` | ✓ | - | Use D1 instead of PostgreSQL | No |
| `USE_CLOUDFLARE_STORAGE` | ✓ | - | Use R2 instead of Blob | No |
| `USE_CLOUDFLARE_STREAMS` | ✓ | - | Use KV instead of Redis | No |
| `NEXT_PUBLIC_ALLEATO_API_URL` | ✓ | - | Workers backend URL | When USE_CLOUDFLARE=true |
| `JWT_SECRET` | - | ✓ | Token signing | Yes |
| `ADMIN_API_KEY` | - | ✓ | Admin endpoints | Yes |
| `R2_PUBLIC_URL` | ✓ | ✓ | File access URL | When using R2 |

### Common Tasks

| Task | Command/Action |
|------|----------------|
| Add new API endpoint | 1. Create route in `/src/routes`<br>2. Add to router in `index.ts`<br>3. Update SDK |
| Add new database table | 1. Update D1 schema<br>2. Run migration<br>3. Update types |
| Add new UI component | 1. Create in `/components`<br>2. Add to page<br>3. Connect to SDK |
| Debug production issue | 1. Check `wrangler tail`<br>2. Review error logs<br>3. Test locally |

## 🔄 Migration Strategy

### Current State (Phase 2)
The application runs primarily on Next.js with Vercel infrastructure while the Cloudflare Workers backend is deployed and ready for gradual migration.

### Migration Phases

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| **Phase 1** | Traditional Next.js app | ✅ Complete | Current production |
| **Phase 2** | Build parallel Workers backend | ✅ Complete | Deployed and ready |
| **Phase 3** | Feature flag integration | 🟡 In Progress | Adapter layer built |
| **Phase 4** | Gradual service migration | 🔴 Planned | Start with file storage |
| **Phase 5** | Full edge deployment | 🔴 Future | Complete migration |

### Service Migration Order
1. **File Storage** (R2) - Lowest risk, immediate benefits
2. **Stream Storage** (KV) - Better global performance
3. **New Features** - Build on Workers first
4. **Chat API** - After validation
5. **Database** (D1) - Highest risk, last to migrate

### Benefits of This Architecture

1. **Zero Downtime**: Switch services individually without disruption
2. **Risk Mitigation**: Instant rollback via feature flags  
3. **Performance Testing**: A/B test edge vs traditional
4. **Cost Optimization**: Use best tool for each service
5. **Global Scale**: Edge-ready when needed

### Architectural Principles

1. **Adapter Pattern**: All services use adapters for backend switching
2. **Feature Flags**: Runtime control over infrastructure
3. **API Compatibility**: Both backends implement same contracts
4. **Progressive Enhancement**: Edge features enhance, not replace
5. **Developer Experience**: Maintain simplicity during transition

This hybrid architecture represents a sophisticated approach to modernizing infrastructure while maintaining stability and flexibility.