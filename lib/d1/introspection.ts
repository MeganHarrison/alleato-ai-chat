import { D1Database } from '@cloudflare/workers-types';

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
  isForeignKey: boolean;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
}

export interface TableSchema {
  tableName: string;
  columns: TableColumn[];
  primaryKey: string[];
  foreignKeys: ForeignKey[];
}

export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export async function getTableSchema(db: D1Database, tableName: string): Promise<TableSchema> {
  // Get table columns
  const columnsQuery = await db.prepare(`
    PRAGMA table_info('${tableName}')
  `).all();

  if (!columnsQuery.results || columnsQuery.results.length === 0) {
    throw new Error(`Table ${tableName} not found`);
  }

  // Get foreign keys
  const foreignKeysQuery = await db.prepare(`
    PRAGMA foreign_key_list('${tableName}')
  `).all();

  const columns: TableColumn[] = columnsQuery.results.map((col: any) => ({
    name: col.name,
    type: col.type,
    nullable: col.notnull === 0,
    isPrimary: col.pk === 1,
    isForeignKey: false, // Will be updated below
    foreignKeyTable: undefined,
    foreignKeyColumn: undefined,
  }));

  const foreignKeys: ForeignKey[] = foreignKeysQuery.results.map((fk: any) => ({
    column: fk.from,
    referencedTable: fk.table,
    referencedColumn: fk.to,
  }));

  // Update columns with foreign key information
  foreignKeys.forEach(fk => {
    const column = columns.find(col => col.name === fk.column);
    if (column) {
      column.isForeignKey = true;
      column.foreignKeyTable = fk.referencedTable;
      column.foreignKeyColumn = fk.referencedColumn;
    }
  });

  const primaryKey = columns
    .filter(col => col.isPrimary)
    .map(col => col.name);

  return {
    tableName,
    columns,
    primaryKey,
    foreignKeys,
  };
}

export async function listTables(db: D1Database): Promise<string[]> {
  const query = await db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
    AND name NOT LIKE '_cf_%'
    ORDER BY name
  `).all();

  return query.results.map((row: any) => row.name);
}

// Map D1 types to display-friendly types
export function mapD1TypeToUIType(d1Type: string): string {
  const typeMap: Record<string, string> = {
    'TEXT': 'text',
    'VARCHAR': 'text',
    'INTEGER': 'number',
    'REAL': 'number',
    'BOOLEAN': 'boolean',
    'DATE': 'date',
    'DATETIME': 'datetime',
    'BLOB': 'binary',
  };

  const upperType = d1Type.toUpperCase();
  for (const [key, value] of Object.entries(typeMap)) {
    if (upperType.includes(key)) {
      return value;
    }
  }

  return 'text'; // Default to text
}

// Map D1 types to Notion property types
export function mapD1TypeToNotionType(d1Type: string, isForeignKey: boolean = false): string {
  if (isForeignKey) {
    return 'relation';
  }

  const typeMap: Record<string, string> = {
    'TEXT': 'rich_text',
    'VARCHAR': 'rich_text',
    'INTEGER': 'number',
    'REAL': 'number',
    'BOOLEAN': 'checkbox',
    'DATE': 'date',
    'DATETIME': 'date',
  };

  const upperType = d1Type.toUpperCase();
  for (const [key, value] of Object.entries(typeMap)) {
    if (upperType.includes(key)) {
      return value;
    }
  }

  return 'rich_text'; // Default to rich_text
}