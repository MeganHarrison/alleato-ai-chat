// Cloudflare configuration with granular control

export const cloudflareConfig = {
  // Master switch for Cloudflare services
  enabled: process.env.USE_CLOUDFLARE === 'true',
  
  // Individual service toggles (can be controlled separately)
  services: {
    // Use Cloudflare KV for streams instead of Redis
    streams: process.env.USE_CLOUDFLARE_STREAMS !== 'false',
    
    // Use R2 for file storage instead of Vercel Blob
    storage: process.env.USE_CLOUDFLARE_STORAGE !== 'false',
    
    // Use D1 for database instead of PostgreSQL
    database: process.env.USE_CLOUDFLARE_DATABASE === 'true', // Default false for now
  },
  
  // Worker configuration
  worker: {
    url: process.env.CLOUDFLARE_WORKER_URL || process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || '',
    token: process.env.CLOUDFLARE_WORKER_TOKEN || '',
  },
  
  // R2 configuration
  r2: {
    publicUrl: process.env.R2_PUBLIC_URL || 'https://pub-9d242043d9cd491095cb8e4b2e7b8bfc.r2.dev',
    bucketName: process.env.R2_BUCKET_NAME || 'alleato',
  },
};

// Helper to check if a specific Cloudflare service is enabled
export function useCloudflareService(service: keyof typeof cloudflareConfig.services): boolean {
  return cloudflareConfig.enabled && cloudflareConfig.services[service];
}