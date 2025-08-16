import { NotionClient } from './client';
import { SyncQueue } from './sync-queue';
import { NOTION_MAPPINGS } from '@/config/notion-mappings';
import { convertD1RecordToNotionProperties, convertNotionPageToD1Record } from './property-converters';
import type { D1Database } from '@cloudflare/workers-types';
import { D1QueryBuilder } from '@/lib/d1/query-builder';

export class NotionSyncManager {
  private notion: NotionClient;
  private syncQueue: SyncQueue;
  private queryBuilder: D1QueryBuilder;

  constructor(
    private db: D1Database,
    notionToken?: string
  ) {
    this.notion = new NotionClient(notionToken);
    this.syncQueue = new SyncQueue(db);
    this.queryBuilder = new D1QueryBuilder(db);
  }

  // Initialize sync system
  async initialize() {
    await this.syncQueue.initialize();
  }

  // Queue a sync job when D1 data changes
  async queueSync(
    tableName: string,
    recordId: string,
    operation: 'create' | 'update' | 'delete',
    data?: any
  ) {
    const jobId = await this.syncQueue.addJob(tableName, recordId, operation, data);
    return jobId;
  }

  // Process pending sync jobs
  async processPendingJobs(limit: number = 10) {
    const jobs = await this.syncQueue.getPendingJobs(limit);
    
    for (const job of jobs) {
      await this.processJob(job);
    }
  }

  // Process a single sync job
  private async processJob(job: any) {
    try {
      await this.syncQueue.updateJobStatus(job.id, 'processing');

      switch (job.operation) {
        case 'create':
          await this.syncCreateToNotion(job.table_name, job.record_id, job.data);
          break;
        case 'update':
          await this.syncUpdateToNotion(job.table_name, job.record_id, job.data);
          break;
        case 'delete':
          await this.syncDeleteToNotion(job.table_name, job.record_id);
          break;
      }

      await this.syncQueue.updateJobStatus(job.id, 'completed');
      await this.syncQueue.logSync(
        job.table_name,
        job.record_id,
        job.operation,
        'success'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.syncQueue.updateJobStatus(job.id, 'failed', errorMessage);
      await this.syncQueue.logSync(
        job.table_name,
        job.record_id,
        job.operation,
        'failure',
        errorMessage
      );
      throw error;
    }
  }

  // Sync new record to Notion
  private async syncCreateToNotion(tableName: string, recordId: string, data?: any) {
    const mapping = NOTION_MAPPINGS[tableName];
    if (!mapping) {
      throw new Error(`No mapping found for table: ${tableName}`);
    }

    // Get the full record from D1 if not provided
    if (!data) {
      const result = await this.queryBuilder.select(tableName, {
        filters: { id: recordId },
        limit: 1,
      });
      data = result.results[0];
    }

    if (!data) {
      throw new Error(`Record not found: ${recordId}`);
    }

    // Convert to Notion properties
    const properties = convertD1RecordToNotionProperties(data, mapping.mappings);

    // Handle relations
    if (mapping.relations) {
      for (const relation of mapping.relations) {
        if (data[relation.d1Column]) {
          // Find the related Notion page
          const relatedPageId = await this.findRelatedNotionPage(
            relation.relatedDatabaseId,
            data[relation.d1Column]
          );
          
          if (relatedPageId) {
            properties[relation.notionProperty] = {
              relation: [{ id: relatedPageId }],
            };
          }
        }
      }
    }

    // Create Notion page
    const page = await this.notion.createPage({
      parent: { database_id: mapping.notionDatabaseId },
      properties,
    });

    // Update sync status
    await this.syncQueue.updateSyncStatus(tableName, recordId, page.id, 'synced');
  }

  // Sync update to Notion
  private async syncUpdateToNotion(tableName: string, recordId: string, data?: any) {
    const mapping = NOTION_MAPPINGS[tableName];
    if (!mapping) {
      throw new Error(`No mapping found for table: ${tableName}`);
    }

    // Find existing Notion page
    const notionPage = await this.notion.findPageByD1Id(
      mapping.notionDatabaseId,
      recordId
    );

    if (!notionPage) {
      // Page doesn't exist, create it
      return this.syncCreateToNotion(tableName, recordId, data);
    }

    // Get the full record from D1 if not provided
    if (!data) {
      const result = await this.queryBuilder.select(tableName, {
        filters: { id: recordId },
        limit: 1,
      });
      data = result.results[0];
    }

    // Convert to Notion properties
    const properties = convertD1RecordToNotionProperties(data, mapping.mappings);

    // Handle relations
    if (mapping.relations) {
      for (const relation of mapping.relations) {
        if (data[relation.d1Column]) {
          const relatedPageId = await this.findRelatedNotionPage(
            relation.relatedDatabaseId,
            data[relation.d1Column]
          );
          
          if (relatedPageId) {
            properties[relation.notionProperty] = {
              relation: [{ id: relatedPageId }],
            };
          }
        }
      }
    }

    // Update Notion page
    await this.notion.updatePage(notionPage.id, properties);

    // Update sync status
    await this.syncQueue.updateSyncStatus(tableName, recordId, notionPage.id, 'synced');
  }

  // Sync delete to Notion
  private async syncDeleteToNotion(tableName: string, recordId: string) {
    const mapping = NOTION_MAPPINGS[tableName];
    if (!mapping) {
      throw new Error(`No mapping found for table: ${tableName}`);
    }

    // Find existing Notion page
    const notionPage = await this.notion.findPageByD1Id(
      mapping.notionDatabaseId,
      recordId
    );

    if (notionPage) {
      // Archive the page
      await this.notion.deletePage(notionPage.id);
    }

    // Update sync status
    await this.syncQueue.updateSyncStatus(tableName, recordId, '', 'synced');
  }

  // Sync from Notion to D1
  async syncFromNotion(tableName: string) {
    const mapping = NOTION_MAPPINGS[tableName];
    if (!mapping) {
      throw new Error(`No mapping found for table: ${tableName}`);
    }

    // Get all pages from Notion
    const pages = await this.notion.getAllPages(mapping.notionDatabaseId);

    for (const page of pages) {
      try {
        // Convert Notion page to D1 record
        const record = convertNotionPageToD1Record(page, mapping.mappings);

        // Check if record exists in D1
        const existing = await this.queryBuilder.select(tableName, {
          filters: { notion_page_id: page.id },
          limit: 1,
        });

        if (existing.results.length > 0) {
          // Update existing record
          await this.queryBuilder.update(tableName, existing.results[0].id, record);
        } else {
          // Create new record
          await this.queryBuilder.insert(tableName, record);
        }

        await this.syncQueue.logSync(
          tableName,
          record.id || page.id,
          'sync_from_notion',
          'success'
        );
      } catch (error) {
        await this.syncQueue.logSync(
          tableName,
          page.id,
          'sync_from_notion',
          'failure',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  }

  // Find related Notion page by D1 ID
  private async findRelatedNotionPage(
    databaseId: string,
    d1Id: string
  ): Promise<string | null> {
    const page = await this.notion.findPageByD1Id(databaseId, d1Id);
    return page?.id || null;
  }

  // Get sync statistics
  async getSyncStats() {
    return this.syncQueue.getSyncStats();
  }

  // Clean up old sync jobs
  async cleanup(daysToKeep: number = 7) {
    await this.syncQueue.cleanupOldJobs(daysToKeep);
  }
}