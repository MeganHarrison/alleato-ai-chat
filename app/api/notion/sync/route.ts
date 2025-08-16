import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Trigger sync job via Cloudflare Worker
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tableName, recordId, operation, data } = await request.json();

    // Call Cloudflare Worker to queue sync
    const workerUrl = process.env.NOTION_SYNC_WORKER_URL || 'https://notion-sync.YOUR_SUBDOMAIN.workers.dev';
    
    const response = await fetch(`${workerUrl}/sync`, {
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
      throw new Error('Failed to queue sync job');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error triggering sync:', error);
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}