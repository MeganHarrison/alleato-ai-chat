import { NotionSyncManager } from './sync-engine';
import { validateWebhook } from './webhook-validator';

export interface Env {
  DB: D1Database;
  SYNC_QUEUE: Queue;
  NOTION_TOKEN: string;
  NOTION_PROJECTS_DB_ID: string;
  NOTION_WEBHOOK_SECRET?: string;
}

export default {
  // Handle HTTP requests (webhooks)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle Notion webhooks
    if (url.pathname === '/webhook/notion' && request.method === 'POST') {
      return handleNotionWebhook(request, env, ctx);
    }

    // Handle manual sync trigger
    if (url.pathname === '/sync' && request.method === 'POST') {
      return handleManualSync(request, env, ctx);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    return new Response('Not found', { status: 404 });
  },

  // Handle scheduled events (cron)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Running scheduled sync at', new Date().toISOString());
    
    const syncManager = new NotionSyncManager(env.DB, env.NOTION_TOKEN);
    
    try {
      // Process pending sync jobs
      await syncManager.processPendingJobs(20);
      
      // Clean up old jobs
      await syncManager.cleanup(7);
      
      // Optional: Full sync for specific tables
      if (event.cron === '0 2 * * *') { // Daily at 2 AM
        await performFullSync(env);
      }
    } catch (error) {
      console.error('Scheduled sync error:', error);
    }
  },

  // Handle queue messages
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
    const syncManager = new NotionSyncManager(env.DB, env.NOTION_TOKEN);
    
    for (const message of batch.messages) {
      try {
        const { tableName, recordId, operation, data } = message.body;
        
        // Process the sync job
        await syncManager.queueSync(tableName, recordId, operation, data);
        
        // Acknowledge the message
        message.ack();
      } catch (error) {
        console.error('Queue processing error:', error);
        // Retry the message
        message.retry();
      }
    }
  },
};

// Handle Notion webhook
async function handleNotionWebhook(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    // Validate webhook signature if configured
    if (env.NOTION_WEBHOOK_SECRET) {
      const isValid = await validateWebhook(request, env.NOTION_WEBHOOK_SECRET);
      if (!isValid) {
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const payload = await request.json() as any;
    console.log('Received Notion webhook:', payload);

    // Queue sync job based on webhook type
    if (payload.type === 'page' && payload.operation) {
      const tableName = detectTableFromNotionDatabase(payload.database_id);
      if (tableName) {
        await env.SYNC_QUEUE.send({
          tableName,
          recordId: payload.page_id,
          operation: mapNotionOperationToSync(payload.operation),
          data: payload.properties,
        });
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
}

// Handle manual sync trigger
async function handleManualSync(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const { tableName, recordId } = await request.json() as any;
    
    if (!tableName) {
      return new Response('Table name required', { status: 400 });
    }

    await env.SYNC_QUEUE.send({
      tableName,
      recordId,
      operation: 'update',
    });

    return new Response('Sync queued', { status: 200 });
  } catch (error) {
    console.error('Manual sync error:', error);
    return new Response('Internal error', { status: 500 });
  }
}

// Perform full sync for all tables
async function performFullSync(env: Env): Promise<void> {
  const syncManager = new NotionSyncManager(env.DB, env.NOTION_TOKEN);
  const tables = ['projects', 'meetings', 'clients', 'tasks'];

  for (const table of tables) {
    try {
      console.log(`Starting full sync for ${table}`);
      await syncManager.syncFromNotion(table);
      console.log(`Completed full sync for ${table}`);
    } catch (error) {
      console.error(`Full sync error for ${table}:`, error);
    }
  }
}

// Helper functions
function detectTableFromNotionDatabase(databaseId: string): string | null {
  // Map Notion database IDs to table names
  const mapping: Record<string, string> = {
    '18fee3c6d9968192a666fe6b55e99f52': 'projects',
    'fb73a7587ceb44dfaa7be6713930a705': 'meetings',
    '248ee3c6-d996-807a-bd99-d2b2202b7ba2': 'clients',
    // Add more mappings as needed
  };
  
  return mapping[databaseId] || null;
}

function mapNotionOperationToSync(operation: string): 'create' | 'update' | 'delete' {
  switch (operation) {
    case 'created':
      return 'create';
    case 'updated':
      return 'update';
    case 'deleted':
    case 'archived':
      return 'delete';
    default:
      return 'update';
  }
}