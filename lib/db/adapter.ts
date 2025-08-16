import 'server-only';

import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import postgres from 'postgres';
import * as schema from './schema';
import { isCloudflareServiceEnabled } from '../config/cloudflare';

// Database adapter that switches between PostgreSQL and D1
export function getDatabase() {
  const useCloudflareDB = isCloudflareServiceEnabled('database');
  
  if (useCloudflareDB) {
    // For D1, we need to use the Cloudflare Worker API
    // Since we're in Next.js, we'll proxy through our worker
    return createD1ProxyAdapter();
  } else {
    // Use PostgreSQL directly
    const client = postgres(process.env.POSTGRES_URL!);
    return drizzlePostgres(client, { schema });
  }
}

// Create a proxy adapter that calls our Cloudflare Worker
function createD1ProxyAdapter() {
  const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
  const workerToken = process.env.CLOUDFLARE_WORKER_TOKEN;
  
  if (!workerUrl || !workerToken) {
    throw new Error('Cloudflare Worker URL and token are required when using D1');
  }
  
  // For now, return the PostgreSQL adapter as a fallback
  // In production, this would proxy to the D1 database via the worker
  console.warn('D1 proxy adapter not fully implemented, falling back to PostgreSQL');
  const client = postgres(process.env.POSTGRES_URL!);
  return drizzlePostgres(client, { schema });
}

export const db = getDatabase();