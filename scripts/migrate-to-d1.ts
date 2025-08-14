#!/usr/bin/env tsx

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { convertPostgreSQLToSQLite } from '../lib/cloudflare/d1-adapter';

async function migrateSchemasToD1() {
  console.log('Converting PostgreSQL migrations to D1 SQLite format...\n');

  const migrationsDir = join(process.cwd(), 'lib/db/migrations');
  const files = await readdir(migrationsDir);
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

  const d1Migrations: string[] = [];

  for (const file of sqlFiles) {
    console.log(`Processing: ${file}`);
    const content = await readFile(join(migrationsDir, file), 'utf-8');
    const converted = convertPostgreSQLToSQLite(content);
    
    // Save to D1 migrations
    d1Migrations.push(`-- Migration: ${file}\n${converted}`);
  }

  // Write D1 migration file
  const d1MigrationPath = join(process.cwd(), 'workers/migrations/schema.sql');
  await writeFile(d1MigrationPath, d1Migrations.join('\n\n'));
  
  console.log(`\n✅ D1 migrations saved to: ${d1MigrationPath}`);
  console.log('\nNext steps:');
  console.log('1. Review the converted SQL for any manual adjustments needed');
  console.log('2. Run: wrangler d1 migrations apply ALLEATO_DB');
}

// Additional D1-specific schema adjustments
const D1_SCHEMA_ADDITIONS = `
-- Create indexes for better performance
CREATE INDEX idx_messages_chat_id ON "Message_v2" ("chatId");
CREATE INDEX idx_messages_created_at ON "Message_v2" ("createdAt");
CREATE INDEX idx_chats_user_id ON "Chat" ("userId");
CREATE INDEX idx_documents_user_id ON "Document" ("userId");

-- Create views for common queries
CREATE VIEW recent_chats AS
SELECT c.*, 
       (SELECT COUNT(*) FROM "Message_v2" m WHERE m."chatId" = c.id) as message_count,
       (SELECT MAX(m."createdAt") FROM "Message_v2" m WHERE m."chatId" = c.id) as last_message_at
FROM "Chat" c
ORDER BY last_message_at DESC;
`;

import { writeFile } from 'fs/promises';

migrateSchemasToD1().catch(console.error);