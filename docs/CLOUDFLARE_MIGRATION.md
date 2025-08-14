# Cloudflare Migration Guide

This guide explains how to migrate from Vercel/Redis infrastructure to Cloudflare's ecosystem.

## Overview

The migration replaces:
- **Redis** → Cloudflare KV (for stream state management)
- **Vercel Blob** → Cloudflare R2 (for file storage)
- **Neon PostgreSQL** → Cloudflare D1 (for database)

## Prerequisites

1. Cloudflare account with Workers, KV, R2, and D1 enabled
2. Wrangler CLI installed: `npm install -g wrangler`
3. Cloudflare API token with appropriate permissions

## Setup Steps

### 1. Create Cloudflare Resources

```bash
# Login to Cloudflare
wrangler login

# Create KV namespace for streams
wrangler kv:namespace create "STREAMS"

# Create R2 bucket
wrangler r2 bucket create alleato

# Create D1 database (if not existing)
wrangler d1 create alleato --experimental-backend
```

### 2. Configure R2 Public Access

1. Go to Cloudflare Dashboard → R2
2. Select your "alleato" bucket
3. Settings → Public Access → Enable
4. Note your public URL (format: `https://pub-[hash].r2.dev`)

### 3. Update Configuration Files

1. Update `wrangler.toml` with your actual IDs:
   - KV namespace ID from step 1
   - R2 public URL from step 2
   - Generate a secure WORKER_TOKEN

2. Update `.env.local`:
```env
USE_CLOUDFLARE=true
CLOUDFLARE_WORKER_URL=https://alleato-ai-chat.[your-subdomain].workers.dev
CLOUDFLARE_WORKER_TOKEN=your-secure-token
R2_PUBLIC_URL=https://pub-[your-hash].r2.dev
```

### 4. Deploy Database Schema

```bash
# Convert PostgreSQL migrations to D1
npm run migrate:to-d1

# Apply migrations to D1
wrangler d1 migrations apply ALLEATO_DB --local=false
```

### 5. Deploy Worker

```bash
# Install worker dependencies
cd workers/api
npm install hono

# Deploy to Cloudflare
wrangler deploy
```

### 6. Test the Migration

1. Set `USE_CLOUDFLARE=true` in `.env.local`
2. Start the development server: `npm run dev`
3. Test file uploads and chat functionality

## Migration Checklist

- [ ] Created KV namespace for streams
- [ ] Created R2 bucket with public access
- [ ] D1 database created and schema migrated
- [ ] Worker deployed successfully
- [ ] Environment variables updated
- [ ] File uploads working with R2
- [ ] Chat streams working with KV
- [ ] Database queries working with D1

## Rollback Plan

To rollback to Vercel/Redis:
1. Set `USE_CLOUDFLARE=false` in `.env.local`
2. Ensure Vercel services are still active
3. Redeploy to Vercel

## Performance Considerations

### KV vs Redis
- KV has eventual consistency (up to 60 seconds globally)
- For real-time needs, consider Durable Objects instead
- KV is globally distributed by default

### R2 vs Vercel Blob
- R2 has no bandwidth fees
- Slightly higher latency for first access
- Automatic global distribution

### D1 vs PostgreSQL
- D1 is SQLite-based (different SQL dialect)
- Better for read-heavy workloads
- Limited to 1GB per database

## Troubleshooting

### Worker not responding
- Check worker logs: `wrangler tail`
- Verify WORKER_TOKEN matches in both places
- Check CORS settings if frontend errors

### File uploads failing
- Verify R2 bucket has public access enabled
- Check file size limits in worker
- Ensure R2_PUBLIC_URL is correct

### Database errors
- Check SQL syntax compatibility
- Verify D1 migrations ran successfully
- Use `wrangler d1 execute` for debugging

## Cost Comparison

### Vercel/Redis
- Redis: ~$0.15/GB/month
- Blob: $0.15/GB/month + bandwidth
- Postgres: Starting at $15/month

### Cloudflare
- KV: $0.50/million reads, $5/million writes
- R2: $0.015/GB/month storage, no bandwidth fees
- D1: Free tier includes 5GB storage, 5M reads/day

## Next Steps

1. Monitor worker analytics in Cloudflare dashboard
2. Set up error alerting
3. Implement caching strategies
4. Consider Durable Objects for real-time features