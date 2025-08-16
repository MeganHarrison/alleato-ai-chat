// Trigger Notion sync for a record
export async function triggerNotionSync(
  tableName: string,
  recordId: string,
  operation: 'create' | 'update' | 'delete',
  data?: any
) {
  try {
    // In development, just log the sync request
    if (process.env.NODE_ENV === 'development') {
      console.log('Sync triggered:', { tableName, recordId, operation });
      return;
    }

    // In production, call the internal API endpoint
    const response = await fetch('/api/notion/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableName,
        recordId,
        operation,
        data,
      }),
    });

    if (!response.ok) {
      console.error('Failed to trigger sync:', await response.text());
    }
  } catch (error) {
    // Don't fail the main operation if sync fails
    console.error('Error triggering Notion sync:', error);
  }
}