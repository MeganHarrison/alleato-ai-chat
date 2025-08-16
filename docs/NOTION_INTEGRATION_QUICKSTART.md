# Notion Integration Quick Start Guide

## 30-Minute Setup Checklist

### Prerequisites ✓
- [ ] Notion account with database(s) created
- [ ] Cloudflare account with Workers enabled
- [ ] D1 database with tables matching Notion structure
- [ ] Node.js & pnpm installed

### Step 1: Create Notion Integration (5 min)
1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name it (e.g., "D1 Sync")
4. Copy the token (starts with `secret_` or `ntn_`)
5. **Important**: Grant it access to your databases (Share → Invite)

### Step 2: Get Database IDs (5 min)
1. Open each Notion database
2. Copy the ID from the URL:
   ```
   https://notion.so/workspace/[DATABASE_ID]?v=xxx
   ```
3. Save these IDs:
   - Projects: `_________________`
   - Meetings: `_________________`
   - Clients: `_________________`

### Step 3: Add to Environment Variables (2 min)
```env
# .env.local
NOTION_TOKEN=your_token_here
NOTION_PROJECTS_DB_ID=your_projects_id
NOTION_MEETINGS_DB_ID=your_meetings_id
NOTION_CLIENTS_DB_ID=your_clients_id
```

### Step 4: Configure Mappings (10 min)
Edit `/config/notion-mappings.ts`:
```typescript
export const NOTION_MAPPINGS = {
  projects: {
    notionDatabaseId: 'your_projects_id',
    titleProperty: 'name', // ← MUST match your Notion title column
    mappings: [
      { d1Column: 'id', notionProperty: 'ID', notionType: 'rich_text' },
      { d1Column: 'name', notionProperty: 'Name', notionType: 'title' },
      // Add all your columns here
    ]
  }
}
```

**⚠️ Critical**: The `titleProperty` MUST be the column that's set as "Title" in Notion!

### Step 5: Test Locally (5 min)
1. Start dev server: `pnpm dev`
2. Visit: `http://localhost:3000/dashboard/projects`
3. Try adding a record
4. Check browser console for sync errors

### Step 6: Deploy Worker (3 min)
```bash
cd workers/notion-sync
pnpm install
wrangler secret put NOTION_TOKEN  # Enter token when prompted
wrangler deploy
```

Save the worker URL: `https://notion-sync.xxx.workers.dev`

### Step 7: Final Configuration (2 min)
Add to `.env.local`:
```env
NOTION_SYNC_WORKER_URL=https://notion-sync.xxx.workers.dev
```

## Quick Troubleshooting

### Nothing syncing to Notion?
1. Check browser Network tab for `/api/notion/sync` calls
2. Verify Notion integration has database access (Share → Check members)
3. Check property names match EXACTLY (case-sensitive!)

### "No mapping found" error?
- Add table to `NOTION_MAPPINGS` in `/config/notion-mappings.ts`

### "Property not found" error?
- Property names must match Notion EXACTLY
- Common mistake: `rich_text` not `text`

### Sync seems slow?
- Normal: First sync can take 30+ seconds
- Check worker logs: `wrangler tail`

## Testing Commands

```bash
# Test schema detection
curl http://localhost:3000/api/schema/projects

# Test create
curl -X POST http://localhost:3000/api/tables/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "status": "Active"}'

# Check worker logs
cd workers/notion-sync && wrangler tail
```

## Common Gotchas

1. **Title Property**: Every Notion DB needs ONE title column
2. **Property Types**: Use `rich_text` not `text`
3. **Relations**: Need the related database ID
4. **Permissions**: Integration must be invited to EACH database
5. **Rate Limits**: Notion allows ~3 requests/second

## Need More Help?

See the full guide: [NOTION_INTEGRATION_GUIDE.md](./NOTION_INTEGRATION_GUIDE.md)