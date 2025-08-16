# Notion Integration File Structure Reference

## Complete File List

This is the exact structure needed for a working Notion integration:

```
project-root/
├── app/
│   ├── api/
│   │   ├── schema/
│   │   │   └── [tableName]/
│   │   │       └── route.ts          # Schema introspection endpoint
│   │   ├── tables/
│   │   │   └── [tableName]/
│   │   │       └── route.ts          # CRUD operations
│   │   └── notion/
│   │       └── sync/
│   │           └── route.ts          # Sync trigger endpoint
│   ├── dashboard/
│   │   └── [tableName]/
│   │       ├── page.tsx              # Dynamic table page
│   │       └── loading.tsx           # Loading skeleton
│   └── meetings/
│       └── [id]/
│           └── transcript/
│               └── page.tsx          # Transcript viewer
├── components/
│   ├── data-table/
│   │   ├── DataTable.tsx           # Main table component
│   │   ├── TableHeader.tsx         # Sortable headers
│   │   ├── TableRow.tsx            # Row with actions
│   │   ├── TableToolbar.tsx        # Search & add button
│   │   ├── TablePagination.tsx     # Pagination controls
│   │   ├── EditableCell.tsx        # Inline editing
│   │   ├── RelationCell.tsx        # Foreign key dropdowns
│   │   └── AddRecordDialog.tsx     # Add new record form
│   └── transcript-viewer.tsx        # Meeting transcript display
├── config/
│   └── notion-mappings.ts          # Table → Notion mappings
├── lib/
│   ├── d1/
│   │   ├── introspection.ts        # Schema detection
│   │   └── query-builder.ts        # SQL query builder
│   └── notion/
│       ├── client.ts               # Notion API wrapper
│       ├── property-converters.ts  # Type conversions
│       ├── sync-manager.ts         # Sync orchestration
│       ├── sync-queue.ts           # Queue management
│       └── trigger-sync.ts         # Sync trigger helper
└── workers/
    └── notion-sync/
        ├── src/
        │   ├── index.ts            # Worker entry point
        │   ├── sync-engine.ts      # Re-exports from lib
        │   └── webhook-validator.ts # Webhook security
        ├── wrangler.toml           # Worker config
        ├── package.json            # Dependencies
        └── README.md               # Setup instructions
```

## Key Files to Create

### 1. Dynamic Table Route
```typescript
// app/dashboard/[tableName]/page.tsx
const ALLOWED_TABLES = [
  'projects', 'meetings', 'clients', 'tasks'
];

export default async function TablePage({ params }) {
  if (!ALLOWED_TABLES.includes(params.tableName)) {
    notFound();
  }
  return <DataTable tableName={params.tableName} />;
}
```

### 2. Schema API
```typescript
// app/api/schema/[tableName]/route.ts
export async function GET(request, { params }) {
  const schema = await getTableSchema(db, params.tableName);
  return Response.json({ schema });
}
```

### 3. CRUD API
```typescript
// app/api/tables/[tableName]/route.ts
export async function POST(request, { params }) {
  const data = await request.json();
  const result = await queryBuilder.insert(params.tableName, data);
  await triggerNotionSync(params.tableName, result.id, 'create');
  return Response.json({ data: result });
}
```

### 4. Notion Mappings
```typescript
// config/notion-mappings.ts
export const NOTION_MAPPINGS = {
  projects: {
    notionDatabaseId: 'xxx',
    titleProperty: 'name',
    mappings: [
      { d1Column: 'id', notionProperty: 'ID', notionType: 'rich_text' },
      { d1Column: 'name', notionProperty: 'Name', notionType: 'title' }
    ]
  }
};
```

### 5. Property Converters
```typescript
// lib/notion/property-converters.ts
export function d1ToNotionValue(value: any, notionType: string) {
  switch (notionType) {
    case 'title':
      return {
        title: [{
          type: 'text',
          text: { content: value || 'Untitled' }
        }]
      };
    case 'rich_text':
      return {
        rich_text: [{
          type: 'text',
          text: { content: value || '' }
        }]
      };
    // ... other types
  }
}
```

### 6. Worker Configuration
```toml
# workers/notion-sync/wrangler.toml
name = "notion-sync"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_id = "your-d1-id"

[[queues.producers]]
binding = "SYNC_QUEUE"
queue = "notion-sync-queue"

[vars]
NOTION_PROJECTS_DB_ID = "xxx"
# NOTION_TOKEN set as secret
```

## Environment Variables

### Development (.env.local)
```env
# Notion
NOTION_TOKEN=secret_xxx
NOTION_PROJECTS_DB_ID=xxx
NOTION_MEETINGS_DB_ID=xxx
NOTION_SYNC_WORKER_URL=http://localhost:8787

# D1 (if using local)
D1_DATABASE_ID=xxx
```

### Production
```env
# Same as above but with production URLs
NOTION_SYNC_WORKER_URL=https://notion-sync.xxx.workers.dev
```

## Database Schema Requirements

Your D1 tables should have:
```sql
-- Required columns for sync
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- your other columns
);

-- Sync tracking tables (created by worker)
CREATE TABLE notion_sync_status (
  table_name TEXT,
  record_id TEXT,
  notion_page_id TEXT,
  last_synced_at DATETIME,
  PRIMARY KEY (table_name, record_id)
);

CREATE TABLE notion_sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT,
  record_id TEXT,
  operation TEXT,
  data TEXT,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME
);
```

## Package Dependencies

### Main App
```json
{
  "dependencies": {
    "@notionhq/client": "^2.2.14",
    "@cloudflare/workers-types": "^4.0.0",
    "date-fns": "^2.30.0"
  }
}
```

### Worker
```json
{
  "dependencies": {
    "@notionhq/client": "^2.2.14"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "wrangler": "^3.0.0"
  }
}
```

## Deployment Checklist

- [ ] All files created as shown above
- [ ] Environment variables set
- [ ] D1 database has required columns
- [ ] Notion integration created and invited to databases
- [ ] Worker deployed with `wrangler deploy`
- [ ] Worker URL added to environment variables
- [ ] Test with one table first (projects recommended)

## Testing Each Component

```bash
# 1. Test schema detection
curl http://localhost:3000/api/schema/projects

# 2. Test CRUD
curl -X POST http://localhost:3000/api/tables/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'

# 3. Test worker
cd workers/notion-sync
wrangler dev  # Local testing
wrangler tail # Production logs
```

This structure has been tested and works reliably with Notion's API limitations and Cloudflare's infrastructure.