import type { D1Database } from '@cloudflare/workers-types';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

export class D1QueryBuilder {
  constructor(private db: D1Database) {}

  async select(tableName: string, options: QueryOptions = {}) {
    let query = `SELECT * FROM ${tableName}`;
    const bindings: any[] = [];

    // Add WHERE clause if filters exist
    if (options.filters && Object.keys(options.filters).length > 0) {
      const conditions = Object.entries(options.filters)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          bindings.push(value);
          return `${key} = ?`;
        });
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    // Add ORDER BY
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }

    // Add LIMIT and OFFSET
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const stmt = this.db.prepare(query);
    if (bindings.length > 0) {
      return await stmt.bind(...bindings).all();
    }
    return await stmt.all();
  }

  async insert(tableName: string, data: Record<string, any>) {
    const columns = Object.keys(data).filter(key => data[key] !== undefined);
    const values = columns.map(key => data[key]);
    const placeholders = columns.map(() => '?').join(', ');

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    return await this.db.prepare(query).bind(...values).first();
  }

  async update(tableName: string, id: string | number, data: Record<string, any>) {
    const columns = Object.keys(data).filter(key => data[key] !== undefined);
    const values = columns.map(key => data[key]);
    values.push(id); // Add id for WHERE clause

    const setClause = columns.map(col => `${col} = ?`).join(', ');

    const query = `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE id = ?
      RETURNING *
    `;

    return await this.db.prepare(query).bind(...values).first();
  }

  async delete(tableName: string, id: string | number) {
    const query = `
      DELETE FROM ${tableName}
      WHERE id = ?
      RETURNING *
    `;

    return await this.db.prepare(query).bind(id).first();
  }

  async count(tableName: string, filters?: Record<string, any>) {
    let query = `SELECT COUNT(*) as count FROM ${tableName}`;
    const bindings: any[] = [];

    if (filters && Object.keys(filters).length > 0) {
      const conditions = Object.entries(filters)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          bindings.push(value);
          return `${key} = ?`;
        });
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const stmt = this.db.prepare(query);
    const result = bindings.length > 0 
      ? await stmt.bind(...bindings).first()
      : await stmt.first();
    
    return result?.count || 0;
  }
}