import { NextRequest, NextResponse } from 'next/server';
import { getTableSchema } from '@/lib/d1/introspection';
import { getDb } from '@/lib/db/drizzle';

export async function GET(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params;
    
    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    // Get D1 database instance
    const db = await getDb();
    
    // Get table schema
    const schema = await getTableSchema(db as any, tableName);
    
    return NextResponse.json({ 
      success: true,
      schema 
    });
  } catch (error) {
    console.error('Error fetching table schema:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch table schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}