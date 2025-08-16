# 🚀 Alleato Quick Reference Card

## 🎯 Developer Cheat Sheet

### 🔧 Common Commands

| What | Where | Command | Notes |
|------|-------|---------|-------|
| **Start Frontend** | `/` | `pnpm dev` | Port 3000 |
| **Start Backend** | `/alleato-backend` | `npm run dev` | Port 8787 |
| **Deploy Frontend** | `/` | `git push` | Auto-deploy via Vercel |
| **Deploy Backend** | `/alleato-backend` | `npm run deploy` | To Cloudflare Workers |
| **View Logs** | `/alleato-backend` | `wrangler tail` | Real-time logs |
| **Database Console** | `/alleato-backend` | `wrangler d1 execute DB --command "SELECT * FROM User"` | Query D1 |

### 📁 Where to Find Things

```
FRONTEND CODE:
✏️  New UI Component → /components/
🎨  Styling → /app/globals.css or component.module.css
🔌  API Integration → /lib/alleato-sdk/
🪝  React Hooks → /hooks/
📄  New Page → /app/(section)/page.tsx

BACKEND CODE:
🛣️  New API Route → /alleato-backend/src/routes/
💼  Business Logic → /alleato-backend/src/services/
🛡️  Middleware → /alleato-backend/src/middleware/
📊  Database Schema → /alleato-backend/migrations/
🔐  Auth Logic → /alleato-backend/src/services/auth.ts
```

### 🔌 API Quick Reference

```typescript
// Frontend Usage Examples

import { alleato } from '@/lib/alleato-sdk';

// Auth
await alleato.auth.login(email, password);
await alleato.auth.register(email, password);
await alleato.auth.guest();
await alleato.auth.logout();

// Chats
const { chats } = await alleato.chats.list();
const { chat } = await alleato.chats.create({ title: 'New Chat' });
const stream = await alleato.chats.sendMessage(chatId, messages);
await alleato.chats.delete(chatId);

// Files
const result = await alleato.files.upload(file);
await alleato.files.delete(fileId);

// Streams
const { streamId } = await alleato.streams.create();
await alleato.streams.append(streamId, data);
const stream = await alleato.streams.get(streamId);
```

### 🗄️ Database Queries

```sql
-- Common D1 Queries (run with wrangler d1 execute)

-- Get all users
SELECT * FROM User;

-- Get user's chats
SELECT * FROM Chat WHERE userId = 'USER_ID';

-- Get chat messages
SELECT * FROM Message_v2 WHERE chatId = 'CHAT_ID' ORDER BY createdAt;

-- Get recent chats
SELECT c.*, COUNT(m.id) as message_count 
FROM Chat c 
LEFT JOIN Message_v2 m ON c.id = m.chatId 
GROUP BY c.id 
ORDER BY c.createdAt DESC 
LIMIT 10;
```

### 🔧 Environment Variables

```bash
# Frontend (.env.local)
OPENAI_API_KEY=sk-...
POSTGRES_URL=postgres://...
NEXT_PUBLIC_ALLEATO_API_URL=https://alleato-backend.workers.dev
USE_CLOUDFLARE=true
USE_CLOUDFLARE_DATABASE=false  # Keep PostgreSQL for now

# Backend (wrangler.toml + secrets)
wrangler secret put OPENAI_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put ADMIN_API_KEY
```

### 🐛 Debugging Tips

| Issue | Check This | Solution |
|-------|------------|----------|
| **Auth Error** | PostgreSQL connection | Ensure `USE_CLOUDFLARE_DATABASE=false` |
| **CORS Error** | Backend CORS config | Update `CORS_ORIGIN` in wrangler.toml |
| **File Upload Fail** | R2 bucket permissions | Check R2 public access is enabled |
| **Stream Not Working** | KV namespace | Verify KV namespace ID in wrangler.toml |
| **API 404** | Route registration | Check route is added to index.ts |

### 📝 Adding New Features

#### Add New API Endpoint
```typescript
// 1. Create route file: /alleato-backend/src/routes/myfeature.ts
import { Hono } from 'hono';
const myFeatureRouter = new Hono();
myFeatureRouter.get('/', async (c) => { /* ... */ });
export { myFeatureRouter };

// 2. Register in index.ts
api.route('/myfeature', myFeatureRouter);

// 3. Add to SDK: /lib/alleato-sdk/index.ts
myfeature = {
  get: async () => this.request('/api/v1/myfeature')
}
```

#### Add New UI Component
```typescript
// 1. Create component: /components/my-component.tsx
export function MyComponent({ data }) {
  return <div>{data}</div>;
}

// 2. Use in page: /app/(chat)/page.tsx
import { MyComponent } from '@/components/my-component';
<MyComponent data={someData} />
```

#### Add Database Table
```sql
-- 1. Create migration: /alleato-backend/migrations/add_my_table.sql
CREATE TABLE MyTable (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Run migration
wrangler d1 migrations apply DB

-- 3. Update types and services
```

### 🚨 Emergency Procedures

```bash
# Rollback Frontend
git revert HEAD && git push

# Rollback Backend
npm run deploy:previous

# Check System Status
curl https://alleato-backend.workers.dev/health

# View Error Logs
wrangler tail --format pretty

# Clear KV Cache
wrangler kv:key delete --namespace-id=NAMESPACE_ID "cache:*"

# Database Backup
wrangler d1 backup create DB
```

### 📞 Quick Links

- **Frontend Repo**: `/Users/meganharrison/Documents/github/alleato-ai-chat`
- **Backend Repo**: `/Users/meganharrison/Documents/github/alleato-ai-chat/alleato-backend`
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **API Docs**: See ARCHITECTURE.md
- **Visual Guide**: See ARCHITECTURE-VISUAL.md

### 💡 Pro Tips

1. **Use the SDK** - Don't make raw API calls from frontend
2. **Check Types** - TypeScript will catch most errors
3. **Test Locally** - Both frontend and backend have dev servers
4. **Monitor Logs** - `wrangler tail` is your friend
5. **Version Control** - Commit backend and frontend separately
6. **Cache Wisely** - KV has 60s eventual consistency
7. **Rate Limits** - 100 req/min per IP by default

---
*Last Updated: [Current Date] | Version: 1.0*