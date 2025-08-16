# Notion Integration Troubleshooting Guide

## Error Reference

### 🔴 ClientFetchError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON

**Cause**: NextAuth SessionProvider trying to fetch from non-existent `/api/auth/session`

**Solution**:
1. Remove `SessionProvider` from `/app/layout.tsx`
2. Remove all `useSession` hooks
3. Replace with Supabase auth:
```typescript
// Old (NextAuth)
import { useSession } from 'next-auth/react';
const { data: session } = useSession();

// New (Supabase)
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
```

### 🔴 Error: No mapping found for table: [tableName]

**Cause**: Table not configured in Notion mappings

**Solution**: Add to `/config/notion-mappings.ts`:
```typescript
export const NOTION_MAPPINGS = {
  [tableName]: {
    notionDatabaseId: 'xxx',
    titleProperty: 'name',
    mappings: [...]
  }
}
```

### 🔴 Error: Property 'Title' not found

**Cause**: Notion requires exactly one title property, and the name must match

**Solution**:
1. Check which column is set as "Title" in Notion
2. Update `titleProperty` in mappings:
```typescript
projects: {
  titleProperty: 'name', // Must match Notion's title column
}
```

### 🔴 Invalid property type error

**Cause**: Using wrong Notion property type

**Common Mistakes**:
- ❌ `text` → ✅ `rich_text`
- ❌ `string` → ✅ `rich_text`
- ❌ `boolean` → ✅ `checkbox`
- ❌ `datetime` → ✅ `date`

### 🔴 Relations not syncing

**Cause**: Relations need page IDs, not values

**Solution**:
1. First sync the related table
2. Store Notion page IDs in your D1 database
3. Use the page ID for relations:
```typescript
// Wrong
{ project: "Project Name" }

// Correct
{ project: [{ id: "notion-page-id-here" }] }
```

### 🔴 Worker deployment fails

**Cause**: Usually missing dependencies or config

**Solution**:
1. Check `wrangler.toml` has correct D1 database ID
2. Install dependencies: `cd workers/notion-sync && pnpm install`
3. Don't hardcode secrets in `wrangler.toml`

### 🔴 Sync jobs stuck in "pending"

**Cause**: Worker not processing queue

**Solution**:
1. Check worker is deployed: `wrangler tail`
2. Verify queue binding in `wrangler.toml`
3. Check for errors in worker logs

## Performance Issues

### Slow Initial Load

**Symptom**: Table takes 5+ seconds to load

**Solutions**:
1. Add pagination (already implemented)
2. Index frequently queried columns in D1
3. Cache schema in localStorage

### Sync Delays

**Symptom**: Changes take minutes to appear in Notion

**Solutions**:
1. Check worker is running: `wrangler tail`
2. Reduce sync interval (currently 5 minutes)
3. Implement webhook for instant updates

## Debug Commands

```bash
# Check if worker is receiving requests
cd workers/notion-sync && wrangler tail

# Test sync endpoint directly
curl -X POST http://localhost:3000/api/notion/sync \
  -H "Content-Type: application/json" \
  -d '{"tableName": "projects", "recordId": "123", "operation": "update"}'

# Check D1 sync status
wrangler d1 execute alleato --command "SELECT * FROM notion_sync_status"

# Check failed sync jobs
wrangler d1 execute alleato --command "SELECT * FROM notion_sync_queue WHERE status = 'failed'"
```

## Common Patterns That Cause Issues

### 1. Forgetting Timestamps
```typescript
// Bad - sync won't know what changed
const data = { name: "Project" };

// Good - always include timestamps
const data = {
  name: "Project",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

### 2. Not Handling Pagination
```typescript
// Bad - only gets first 100 items
const pages = await notion.queryDatabase(databaseId);

// Good - gets all items
const pages = [];
let hasMore = true;
let cursor;
while (hasMore) {
  const response = await notion.queryDatabase(databaseId, filter, sorts, cursor);
  pages.push(...response.results);
  hasMore = response.hasMore;
  cursor = response.nextCursor;
}
```

### 3. Awaiting Sync Operations
```typescript
// Bad - blocks user interaction
await triggerNotionSync(tableName, recordId, 'update');
return response;

// Good - queue and continue
triggerNotionSync(tableName, recordId, 'update'); // No await
return response;
```

## Prevention Tips

1. **Always test with one table first** (projects is good)
2. **Use TypeScript** - Notion's types are complex
3. **Check property names** are EXACTLY the same (case-sensitive)
4. **Add logging** to sync operations
5. **Monitor worker logs** during development
6. **Test pagination** with 100+ records
7. **Handle network failures** gracefully

## Still Stuck?

1. Check the [full guide](./NOTION_INTEGRATION_GUIDE.md)
2. Review worker logs: `wrangler tail`
3. Check browser console for API errors
4. Verify all environment variables are set
5. Ensure Notion integration has database access