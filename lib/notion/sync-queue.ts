import type { D1Database } from '@cloudflare/workers-types';

export interface SyncJob {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'create' | 'update' | 'delete';
  data?: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  error?: string;
  created_at: string;
  processed_at?: string;
}

export class SyncQueue {
  constructor(private db: D1Database) {}

  // Initialize sync tables
  async initialize() {
    // Create sync job queue table
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS notion_sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME
      )
    `).run();

    // Create sync status tracking table
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS notion_sync_status (
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        d1_updated_at DATETIME,
        notion_page_id TEXT,
        last_synced_at DATETIME,
        sync_status TEXT,
        PRIMARY KEY (table_name, record_id)
      )
    `).run();

    // Create sync log table for history
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS notion_sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  // Add a job to the queue
  async addJob(
    tableName: string,
    recordId: string,
    operation: 'create' | 'update' | 'delete',
    data?: any
  ): Promise<string> {
    const jobId = crypto.randomUUID();
    
    await this.db.prepare(`
      INSERT INTO notion_sync_queue (id, table_name, record_id, operation, data)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      jobId,
      tableName,
      recordId,
      operation,
      data ? JSON.stringify(data) : null
    ).run();

    return jobId;
  }

  // Get pending jobs
  async getPendingJobs(limit: number = 10): Promise<SyncJob[]> {
    const result = await this.db.prepare(`
      SELECT * FROM notion_sync_queue
      WHERE status = 'pending'
      AND attempts < 3
      ORDER BY created_at ASC
      LIMIT ?
    `).bind(limit).all();

    return result.results.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data as string) : null,
    })) as SyncJob[];
  }

  // Update job status
  async updateJobStatus(
    jobId: string,
    status: 'processing' | 'completed' | 'failed',
    error?: string
  ) {
    await this.db.prepare(`
      UPDATE notion_sync_queue
      SET status = ?, 
          error = ?,
          attempts = attempts + 1,
          processed_at = CASE WHEN ? IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE processed_at END
      WHERE id = ?
    `).bind(status, error || null, status, jobId).run();
  }

  // Get sync status for a record
  async getSyncStatus(tableName: string, recordId: string) {
    const result = await this.db.prepare(`
      SELECT * FROM notion_sync_status
      WHERE table_name = ? AND record_id = ?
    `).bind(tableName, recordId).first();

    return result;
  }

  // Update sync status
  async updateSyncStatus(
    tableName: string,
    recordId: string,
    notionPageId: string,
    status: 'synced' | 'pending' | 'error'
  ) {
    await this.db.prepare(`
      INSERT INTO notion_sync_status (table_name, record_id, notion_page_id, last_synced_at, sync_status)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(table_name, record_id) DO UPDATE SET
        notion_page_id = excluded.notion_page_id,
        last_synced_at = excluded.last_synced_at,
        sync_status = excluded.sync_status
    `).bind(tableName, recordId, notionPageId, status).run();
  }

  // Log sync operation
  async logSync(
    tableName: string,
    recordId: string,
    operation: string,
    status: 'success' | 'failure',
    details?: string
  ) {
    await this.db.prepare(`
      INSERT INTO notion_sync_log (table_name, record_id, operation, status, details)
      VALUES (?, ?, ?, ?, ?)
    `).bind(tableName, recordId, operation, status, details || null).run();
  }

  // Clean up old completed jobs
  async cleanupOldJobs(daysToKeep: number = 7) {
    await this.db.prepare(`
      DELETE FROM notion_sync_queue
      WHERE status IN ('completed', 'failed')
      AND processed_at < datetime('now', '-' || ? || ' days')
    `).bind(daysToKeep).run();
  }

  // Get sync statistics
  async getSyncStats() {
    const stats = await this.db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM notion_sync_queue
      GROUP BY status
    `).all();

    const recentSync = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_synced,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) as failed
      FROM notion_sync_log
      WHERE synced_at > datetime('now', '-1 day')
    `).first();

    return {
      queue: stats.results,
      recent: recentSync,
    };
  }
}