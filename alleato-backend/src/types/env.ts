export interface Env {
  // KV Namespaces
  STREAMS: KVNamespace;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  
  // R2 Buckets
  FILES: R2Bucket;
  
  // D1 Database
  DB: D1Database;
  
  // Durable Objects
  CHAT_ROOMS: DurableObjectNamespace;
  
  // Rate Limiter
  RATE_LIMITER: any;
  
  // Environment Variables
  ENVIRONMENT: 'development' | 'staging' | 'production';
  API_VERSION: string;
  CORS_ORIGIN: string;
  
  // AI Configuration
  AI_PROVIDER: string;
  AI_CHAT_MODEL: string;
  AI_REASONING_MODEL: string;
  AI_TITLE_MODEL: string;
  
  // Secrets
  OPENAI_API_KEY: string;
  JWT_SECRET: string;
  ADMIN_API_KEY: string;
  
  // R2 Configuration
  R2_PUBLIC_URL?: string;
}

// Request context with authenticated user
export interface AuthenticatedContext {
  userId: string;
  email: string;
  type: 'guest' | 'regular';
}