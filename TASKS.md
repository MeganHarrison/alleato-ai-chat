# TASKS

## Update code to use Cloudflare Workers.
1.  Switch from using redis to a cloudflare workers functionality that does the same thing.
2. Switch from vercel blob to R2 storage (R2_ACCOUNT_ID=d1416265449d2a0bae41c45c791270ec R2_BUCKET_NAME=alleato)
3. Switch from Neon to Cloudflare D1 database (ALLEATO_DATABASE_ID=fc7c9a6d-ca65-4768-b3f9-07ec5afb38c5)

 - user needs to be redirected to the login page if they are not logged in
 - sign up page
 - user database
 - Update sidebar to use alleato logo and favicon

### ACTION STEPS

#### Phase 1: Analysis and Planning
     ✓ Analyze current Redis usage in the codebase
       - Redis used for resumable streams via `resumable-stream` package
       - Affects /app/(chat)/api/chat/route.ts and stream routes
     ✓ Analyze Vercel Blob usage
       - Used in /app/(chat)/api/files/upload/route.ts
       - Handles image uploads (JPEG/PNG/GIF/WebP) up to 5MB
     ✓ Analyze database structure and Drizzle ORM usage
       - PostgreSQL with 7 main tables
       - Drizzle ORM configuration in /lib/db/

#### Phase 2: Implementation
     ✓ Create Cloudflare KV stream manager (/lib/cloudflare/kv-stream.ts)
       - CloudflareStreamManager with create, get, append, delete operations
       - 24-hour TTL for stream data
     ✓ Create R2 storage implementation (/lib/cloudflare/r2-storage.ts)
       - R2Storage class with upload, delete, get, list operations
       - Support for public URL generation
     ✓ Create D1 database adapter (/lib/cloudflare/d1-adapter.ts)
       - PostgreSQL to SQLite conversion utilities
       - Drizzle ORM adapter for D1
     ✓ Create Cloudflare Worker (/workers/api/index.ts)
       - Hono-based API with stream, file, and database endpoints
       - Bearer token authentication
     ✓ Create client utilities (/lib/cloudflare/client.ts)
       - CloudflareClient for API communication
       - Methods for streams, files, and database queries

#### Phase 3: Migration Scripts
     ✓ Create D1 migration script (/scripts/migrate-to-d1.ts)
       - Converts PostgreSQL migrations to SQLite syntax
       - Handles data type conversions
     ☐ Test PostgreSQL to D1 migration script
     ☐ Verify data integrity after migration

#### Phase 4: Configuration
     ✓ Create wrangler.toml configuration
       - KV namespace, R2 bucket, and D1 database bindings
       - Environment variables setup
     ✓ Update .env.example with Cloudflare variables
       - USE_CLOUDFLARE flag for gradual migration
       - All required Cloudflare configuration
     ✓ Update file upload route for dual support
       - Supports both Vercel Blob and R2 based on USE_CLOUDFLARE flag

#### Phase 5: Testing and Verification
     ✓ Deploy Cloudflare Worker
       - Run: wrangler deploy
       - Worker deployed at: https://alleato-ai-chat.megan-d14.workers.dev
     ✓ Test KV stream functionality
       - Create, read, append, and delete streams tested successfully
       - 24-hour TTL configured (needs long-term verification)
     ✓ Test R2 file uploads
       - File upload endpoint functional
       - Public URL access verified: https://pub-9d242043d9cd491095cb8e4b2e7b8bfc.r2.dev
       - Image type validation working
     ✓ Test D1 database operations
       - ✓ D1 schema created successfully (local)
       - ✓ Test CRUD operations verified (User table tested)
       - ✓ Indexes created for performance
       - ☐ Deploy schema to remote D1 (pending auth fix)
     ☐ Integration testing
       - Test complete chat flow with Cloudflare backend
       - Verify streaming works correctly
       - Test file attachments in messages
     ☐ Performance testing
       - Compare latency with Vercel/Redis
       - Monitor worker CPU time
       - Check global distribution performance

#### Phase 6: Documentation and Cleanup
     ✓ Create migration guide (/docs/CLOUDFLARE_MIGRATION.md)
       - Complete setup instructions
       - Troubleshooting guide
       - Cost comparison
     ☐ Update CLAUDE.md with Cloudflare information
     ☐ Clean up unused Vercel dependencies (after full migration)

### DETAILED IMPLEMENTATION STATUS

## Database Structure (PostgreSQL → D1)

  - Users: Authentication and user data
  - Chats: Conversation metadata
  - Messages: Chat messages with parts-based structure
  - Documents: Artifacts (code, text, images, sheets)
  - Suggestions: Document improvement suggestions
  - Votes: Message feedback
  - Streams: SSE stream management

  Migration Requirements

  1. Vercel Blob → Cloudflare R2 ✓
  - ✓ Created R2Storage class with Cloudflare R2 API
  - ✓ Updated /app/(chat)/api/files/upload/route.ts with dual support
  - ✓ Changed from put() to R2's put() method via worker
  - ✓ Updated environment variables for R2 credentials

  2. Neon PostgreSQL → Cloudflare D1 ✓
  - ✓ Created D1 adapter with PostgreSQL to SQLite conversion
  - ✓ Prepared Drizzle ORM schema for D1-compatible format
  - ✓ Created migration script for D1
  - ☐ Test migrated data integrity
  - ☐ Update all database queries in /lib/db/queries.ts for D1
  - ☐ Run and verify migrations in D1 format
  - ☐ Replace POSTGRES_URL with D1 database binding in production

  3. Redis → Cloudflare KV/Durable Objects ✓
  - ✓ Implemented KV-based stream management
  - ✓ Created CloudflareStreamManager for SSE streaming
  - ☐ Test stream resumption functionality
  - ☐ Consider Durable Objects for real-time features

  4. Next.js → Cloudflare Workers (Partial)
  - ✓ Created Worker API routes in Workers format
  - ✓ Implemented authentication via bearer tokens
  - ✓ Handle file uploads via Workers API
  - ☐ Full Next.js app deployment to Cloudflare Pages
  - ☐ Replace Next.js middleware with Workers middleware

  5. Environment Changes ✓
  - ✓ Added Cloudflare Workers types (@cloudflare/workers-types)
  - ✓ Updated build scripts for Workers deployment
  - ✓ Configured wrangler.toml for Workers settings
  - ☐ Remove Vercel-specific dependencies after full migration

### COMPLETED STEPS ✅

1. ✓ Authenticated with Cloudflare via `wrangler login`
2. ✓ Created KV namespace "STREAMS" (ID: edb32b0ffbd544dd86afd3841110dc59)
3. ✓ Updated wrangler.toml with all configurations
4. ✓ Deployed worker at: https://alleato-ai-chat.megan-d14.workers.dev
5. ✓ Enabled R2 public access: https://pub-9d242043d9cd491095cb8e4b2e7b8bfc.r2.dev
6. ✓ Updated .env.local with Cloudflare credentials
7. ✓ Tested core functionality with USE_CLOUDFLARE=true

### REMAINING TASKS

1. Deploy D1 schema to remote database (currently working locally)
2. Update database queries in /lib/db/queries.ts for D1 compatibility
3. Full integration testing with the Next.js app
4. Performance benchmarking vs Vercel/Redis setup


I want to create as much as I can directly in cloudflare 
  workers so its separate from the front end. what do you 
  recommend so its easier to make changes and deploy and less
   opportunity to create conflicts or break things