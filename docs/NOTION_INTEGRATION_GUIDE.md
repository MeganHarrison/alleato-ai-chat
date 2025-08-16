# Complete Notion Integration Setup Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture Decision](#architecture-decision)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
6. [Testing & Debugging](#testing--debugging)
7. [Production Deployment](#production-deployment)

## Overview

This guide documents the complete process of setting up a two-way sync between a D1 database and Notion, with a dynamic table UI that supports inline editing.

### What We Built
- Dynamic table routes that work with any D1 table
- Inline editing with automatic Notion sync
- Cloudflare Worker for background synchronization
- Meeting transcript viewer with download functionality
- Full CRUD operations with real-time updates

## Architecture Decision

### Why D1 as Primary Database?
We chose D1 as the primary database with Notion sync (rather than using Notion API directly) because:
1. **Performance**: D1 queries are instant, Notion API can be slow
2. **Flexibility**: Full SQL capabilities for complex queries
3. **Cost**: No API rate limits or usage costs
4. **Offline capability**: App works even if Notion is down

### Sync Strategy
- **D1 → Notion**: Immediate queue on changes
- **Notion → D1**: Webhook + scheduled sync every 5 minutes
- **Conflict resolution**: Last write wins with audit log

## Prerequisites

### Required Accounts & Tools
1. **Cloudflare Account** with Workers enabled
2. **Notion Integration** (create at https://www.notion.so/my-integrations)
3. **D1 Database** already set up with your tables
4. **Node.js & pnpm** installed locally

### Required Information
- Notion Integration Token (starts with `secret_` or `ntn_`)
- Notion Database IDs for each table
- D1 Database ID
- Cloudflare Account ID

## Step-by-Step Implementation

### Phase 1: Schema Introspection System

1. **Create D1 introspection utilities** (`/lib/d1/introspection.ts`):
```typescript
// This allows dynamic schema detection
export async function getTableSchema(db: D1Database, tableName: string)
```

**⚠️ Pitfall #1**: D1's PRAGMA commands return different formats than standard SQLite. Always test the actual response structure.

2. **Create schema API endpoint** (`/app/api/schema/[tableName]/route.ts`):
```typescript
// Returns table structure for frontend
export async function GET(request, { params })
```

### Phase 2: Dynamic Table UI

3. **Create dynamic route** (`/app/dashboard/[tableName]/page.tsx`):
```typescript
// Single page handles ALL tables
const ALLOWED_TABLES = ['projects', 'meetings', 'clients', ...];
```

**⚠️ Pitfall #2**: Always whitelist allowed tables for security. Never trust user input for table names.

4. **Build DataTable component** (`/components/data-table/DataTable.tsx`):
- Double-click to edit cells
- Escape to cancel
- Tab to move between cells
- Auto-save on blur

**💡 Key Decision**: We used inline editing (spreadsheet-style) instead of modal forms for better UX.

### Phase 3: CRUD Operations

5. **Create generic CRUD API** (`/app/api/tables/[tableName]/route.ts`):
```typescript
// Handles all tables with single endpoint
const queryBuilder = new D1QueryBuilder(db);
```

**⚠️ Pitfall #3**: Always add `created_at` and `updated_at` timestamps. Notion sync relies on these.

### Phase 4: Notion Integration

6. **Set up Notion client** (`/lib/notion/client.ts`):
```typescript
// Wrapper around official Notion SDK
export class NotionClient {
  async findPageByD1Id(databaseId: string, d1Id: string)
}
```

**⚠️ Pitfall #4**: Notion API has a 100-item limit per query. Always implement pagination:
```typescript
while (hasMore) {
  const response = await this.queryDatabase(databaseId, filter, sorts, startCursor);
  pages.push(...response.results);
  hasMore = response.hasMore;
  startCursor = response.nextCursor;
}
```

7. **Create property converters** (`/lib/notion/property-converters.ts`):

**⚠️ Pitfall #5**: Notion property types are complex. Key mappings:
- D1 `TEXT` → Notion `rich_text` (not `text`!)
- D1 `VARCHAR` → Notion `rich_text`
- Every Notion database MUST have one `title` property
- Relations need page IDs, not values

8. **Configure table mappings** (`/config/notion-mappings.ts`):
```typescript
export const NOTION_MAPPINGS = {
  projects: {
    notionDatabaseId: 'xxx',
    titleProperty: 'name', // CRITICAL: Specify which field is the title
    mappings: [...]
  }
}
```

**⚠️ Pitfall #6**: Always specify the `titleProperty`. Notion requires exactly one title field per database.

### Phase 5: Sync System

9. **Create sync queue** (`/lib/notion/sync-queue.ts`):
```sql
-- Track sync status for each record
CREATE TABLE notion_sync_status (
  table_name TEXT,
  record_id TEXT,
  notion_page_id TEXT,
  last_synced_at DATETIME,
  PRIMARY KEY (table_name, record_id)
);
```

**💡 Key Decision**: Use a queue system to handle failures gracefully and enable retries.

10. **Implement sync manager** (`/lib/notion/sync-manager.ts`):

**⚠️ Pitfall #7**: Notion has a 25-relation limit per API call:
```typescript
// Split relations into chunks
const chunks = chunkArray(relations, 25);
for (const chunk of chunks) {
  await updateNotionPage(pageId, { relations: chunk });
}
```

### Phase 6: Cloudflare Worker

11. **Create worker structure**:
```
/workers/notion-sync/
  src/
    index.ts          # Main entry
    sync-engine.ts    # Import from lib
    webhook-validator.ts
  wrangler.toml       # Config
  package.json
```

**⚠️ Pitfall #8**: Never hardcode secrets in wrangler.toml. Use:
```bash
wrangler secret put NOTION_TOKEN
```

12. **Configure worker** (`wrangler.toml`):
```toml
[[d1_databases]]
binding = "DB"
database_id = "your-d1-id"

[[queues.producers]]
binding = "SYNC_QUEUE"
```

**⚠️ Pitfall #9**: The worker needs explicit D1 bindings. You can't just import from your main app.

### Phase 7: Trigger Sync from Frontend

13. **Add sync triggers** to CRUD operations:
```typescript
// In /app/api/tables/[tableName]/route.ts
await triggerNotionSync(tableName, recordId, 'create', data);
```

**💡 Key Decision**: Don't await sync operations. Queue them and return immediately for better UX.

## Common Pitfalls & Solutions

### Authentication Issues

**Problem**: "ClientFetchError: Unexpected token '<'"  
**Cause**: NextAuth trying to fetch session from removed endpoint  
**Solution**: Remove ALL NextAuth imports and SessionProvider wrappers

### Notion API Limitations

1. **100 items per query**: Always paginate
2. **25 relations per update**: Chunk relation arrays
3. **2MB per property**: Split large text fields
4. **Rate limits**: Implement exponential backoff

### D1 Specific Issues

1. **No native boolean type**: Use INTEGER (0/1)
2. **PRAGMA returns arrays**: Access via `.results`
3. **Transactions in Workers**: Not supported, design accordingly

### Type Mismatches

**Problem**: Notion expects specific property formats  
**Solution**: Always use property converters:
```typescript
// Wrong
{ title: "My Title" }

// Correct
{ title: [{ type: 'text', text: { content: "My Title" } }] }
```

## Testing & Debugging

### Local Development

1. **Test schema introspection**:
```bash
curl http://localhost:3000/api/schema/projects
```

2. **Test CRUD operations**:
```bash
# Create
curl -X POST http://localhost:3000/api/tables/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project"}'
```

3. **Debug Notion sync**:
- Check browser Network tab for `/api/notion/sync` calls
- Look for console errors in sync operations
- Verify D1 has `notion_sync_status` table

### Common Debug Scenarios

**Sync not working?**
1. Check if `triggerNotionSync` is being called
2. Verify environment variables are set
3. Check worker logs: `wrangler tail`

**Data not appearing in Notion?**
1. Verify Notion integration has database access
2. Check property mappings match exactly
3. Look for type conversion errors

## Production Deployment

### Environment Variables

```env
# Frontend (.env.local)
NOTION_SYNC_WORKER_URL=https://notion-sync.subdomain.workers.dev

# Worker (set as secrets)
wrangler secret put NOTION_TOKEN
```

### Deployment Steps

1. **Deploy Worker**:
```bash
cd workers/notion-sync
pnpm install
wrangler deploy
```

2. **Set up Notion webhook** (optional):
- Go to Notion integration settings
- Add webhook URL: `https://your-worker.workers.dev/webhook/notion`

3. **Grant database access**:
- Open each Notion database
- Share → Invite your integration

### Monitoring

- Worker logs: `wrangler tail`
- Sync status: Query `notion_sync_status` table
- Failed jobs: Check `notion_sync_queue` where `status = 'failed'`

## Key Architectural Decisions Summary

1. **D1 as primary**: Better performance, no API limits
2. **Queue-based sync**: Handles failures gracefully
3. **Inline editing**: Better UX than modal forms
4. **Dynamic routes**: One component for all tables
5. **Property converters**: Handle Notion's complex types
6. **Worker for sync**: Runs independently of main app

## Lessons Learned

1. **Start with one table**: Get projects working before adding others
2. **Test property mappings early**: Notion's format is unintuitive
3. **Plan for pagination**: Both D1 and Notion have limits
4. **Use TypeScript**: Notion's types are complex
5. **Handle failures gracefully**: Network issues will happen
6. **Document your mappings**: Future you will thank you

## Quick Reference

### Add a New Table

1. Add to `ALLOWED_TABLES` in `/app/dashboard/[tableName]/page.tsx`
2. Add mapping to `/config/notion-mappings.ts`
3. Add database ID to worker's `detectTableFromNotionDatabase()`
4. Grant Notion integration access to the database

### Debug Sync Issues

1. Check `/api/notion/sync` is being called
2. Verify worker is deployed: `wrangler tail`
3. Check `notion_sync_status` table for last sync time
4. Look for failed jobs in `notion_sync_queue`

### Common Errors

- "No mapping found": Add table to `NOTION_MAPPINGS`
- "Property not found": Check exact property names in Notion
- "Invalid property type": Use correct converter (rich_text, not text)
- "Page not found": Ensure D1 ID is stored in Notion ID property

This implementation provides a robust, scalable solution for Notion integration that handles real-world edge cases and limitations.