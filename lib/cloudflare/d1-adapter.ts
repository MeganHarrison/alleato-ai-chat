import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

export function createD1Database(d1: D1Database) {
  return drizzle(d1, { schema });
}

// Helper to convert PostgreSQL queries to SQLite syntax
export function convertPostgreSQLToSQLite(query: string): string {
  // Replace PostgreSQL-specific syntax with SQLite equivalents
  let sqliteQuery = query;
  
  // Replace SERIAL with INTEGER PRIMARY KEY AUTOINCREMENT
  sqliteQuery = sqliteQuery.replace(/SERIAL\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  
  // Replace UUID type with TEXT
  sqliteQuery = sqliteQuery.replace(/UUID/gi, 'TEXT');
  
  // Replace TIMESTAMP WITH TIME ZONE with TEXT (store as ISO string)
  sqliteQuery = sqliteQuery.replace(/TIMESTAMP\s+WITH\s+TIME\s+ZONE/gi, 'TEXT');
  sqliteQuery = sqliteQuery.replace(/TIMESTAMPTZ/gi, 'TEXT');
  sqliteQuery = sqliteQuery.replace(/timestamp/gi, 'TEXT');
  
  // Replace JSONB with TEXT (store as JSON string)
  sqliteQuery = sqliteQuery.replace(/JSONB/gi, 'TEXT');
  
  // Replace BOOLEAN with INTEGER (0/1)
  sqliteQuery = sqliteQuery.replace(/BOOLEAN/gi, 'INTEGER');
  
  // Replace NOW() with datetime('now')
  sqliteQuery = sqliteQuery.replace(/NOW\(\)/gi, "datetime('now')");
  
  // Replace gen_random_uuid() with a placeholder (needs to be handled in application)
  sqliteQuery = sqliteQuery.replace(/gen_random_uuid\(\)/gi, "lower(hex(randomblob(16)))");
  
  // Replace gen_random_TEXT() (artifact from conversion)
  sqliteQuery = sqliteQuery.replace(/gen_random_TEXT\(\)/gi, "lower(hex(randomblob(16)))");
  
  // Remove PostgreSQL-specific syntax
  sqliteQuery = sqliteQuery.replace(/DO \$\$ BEGIN[\s\S]*?END \$\$;/gi, '');
  sqliteQuery = sqliteQuery.replace(/ON DELETE no action ON UPDATE no action/gi, '');
  sqliteQuery = sqliteQuery.replace(/--> statement-breakpoint/gi, '');
  
  // Replace json type with TEXT
  sqliteQuery = sqliteQuery.replace(/\bjson\b/gi, 'TEXT');
  
  // Replace varchar with TEXT
  sqliteQuery = sqliteQuery.replace(/varchar\(\d+\)/gi, 'TEXT');
  sqliteQuery = sqliteQuery.replace(/\bvarchar\b/gi, 'TEXT');
  
  // Fix text type
  sqliteQuery = sqliteQuery.replace(/\btext\b/gi, 'TEXT');
  
  return sqliteQuery;
}

// Migration helper for D1
export async function migrateToD1(d1: D1Database, migrations: string[]) {
  for (const migration of migrations) {
    const sqliteQuery = convertPostgreSQLToSQLite(migration);
    await d1.prepare(sqliteQuery).run();
  }
}