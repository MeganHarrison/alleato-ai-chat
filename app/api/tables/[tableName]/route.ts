import { NextRequest, NextResponse } from 'next/server';
import { D1QueryBuilder } from '@/lib/d1/query-builder';
import { getDb } from '@/lib/db/drizzle';
import { auth } from '@/lib/auth';
import { triggerNotionSync } from '@/lib/notion/trigger-sync';

export async function GET(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tableName } = params;
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderBy = searchParams.get('orderBy') || 'id';
    const orderDirection = (searchParams.get('orderDirection') || 'DESC') as 'ASC' | 'DESC';
    
    // Parse filters from query string
    const filters: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      if (!['limit', 'offset', 'orderBy', 'orderDirection'].includes(key)) {
        filters[key] = value;
      }
    });

    const db = await getDb();
    const queryBuilder = new D1QueryBuilder(db as any);
    
    // Get data
    const result = await queryBuilder.select(tableName, {
      limit,
      offset,
      orderBy,
      orderDirection,
      filters,
    });

    // Get total count
    const count = await queryBuilder.count(tableName, filters);

    return NextResponse.json({
      success: true,
      data: result.results,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch table data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tableName } = params;
    const data = await request.json();

    const db = await getDb();
    const queryBuilder = new D1QueryBuilder(db as any);
    
    // Add timestamps
    const recordData = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await queryBuilder.insert(tableName, recordData);

    // Queue Notion sync job
    if (result) {
      await triggerNotionSync(tableName, result.id, 'create', result);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tableName } = params;
    const { id, ...data } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const queryBuilder = new D1QueryBuilder(db as any);
    
    // Add updated timestamp
    const recordData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const result = await queryBuilder.update(tableName, id, recordData);

    // Queue Notion sync job
    if (result) {
      await triggerNotionSync(tableName, id, 'update', result);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tableName } = params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const queryBuilder = new D1QueryBuilder(db as any);
    
    const result = await queryBuilder.delete(tableName, id);

    // Queue Notion sync job
    await triggerNotionSync(tableName, id, 'delete');

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}