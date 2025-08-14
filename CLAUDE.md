# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
pnpm dev          # Start development server (port 3000)
pnpm dev --turbo  # Start with Turbo mode

# Build & Production
pnpm build        # Build for production (runs migrations + Next.js build)
pnpm start        # Start production server

# Code Quality
pnpm lint         # Run linters (Next.js + Biome)
pnpm lint:fix     # Fix linting issues
pnpm format       # Format code with Biome

# Database
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Drizzle Studio for DB management
pnpm db:push      # Push schema changes directly to DB

# Testing
pnpm test         # Run Playwright E2E tests
```

## Architecture Overview

This is a Next.js 15 AI chatbot application using:
- **AI**: Vercel AI SDK v5 (beta) with OpenAI models
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Auth.js v5 (NextAuth)
- **UI**: shadcn/ui components with Tailwind CSS
- **Storage**: Vercel Blob for file uploads
- **Streaming**: Redis for SSE stream management

### Key Directories

- `/app/(chat)` - Main chat interface and API routes
- `/app/api` - API endpoints for chat, documents, files
- `/lib/ai` - AI providers, models, and tools configuration
- `/lib/db` - Database schema and queries
- `/components` - React components (chat UI, editors, artifacts)
- `/artifacts` - Artifact system for code, text, images, sheets

### Important Files

- `/lib/ai/models.ts` - AI model configurations
- `/lib/db/schema.ts` - Database schema definition
- `/app/(chat)/api/chat/route.ts` - Main chat API endpoint
- `/components/custom/chat.tsx` - Core chat component

## Key Technical Details

### AI Models
- Chat: `gpt-5` (default model with vision support)
- Reasoning: `o1` (with reasoning extraction)
- Title/Artifact generation: `gpt-4o-mini`
- Image generation: `dall-e-3`

### Database Migration
The app migrated from `Message` to `Message_v2` table structure. New messages use a parts-based architecture for better multi-modal support.

### Message Structure
Messages are stored with parts (text, tool calls, tool results) rather than raw content. The `getMessageText` utility extracts display text from message parts.

### Streaming Architecture
- Uses Server-Sent Events (SSE) for real-time updates
- Redis integration for managing active streams
- Custom stream wrapper in `/lib/ai/stream-wrapper.ts`

### Authentication
- Supports email/password and guest mode
- Session management via Auth.js
- Protected routes use middleware checks

## Common Development Tasks

### Adding a New AI Provider
1. Add provider config to `/lib/ai/providers.ts`
2. Update model registry in `/lib/ai/models.ts`
3. Add environment variables for API keys

### Modifying Database Schema
1. Edit schema in `/lib/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:migrate` to apply changes

### Creating New API Routes
- Follow App Router conventions in `/app/api`
- Use `auth()` from `/lib/auth` for authentication
- Return proper error responses with status codes

### Working with Artifacts
- Artifacts support code, text, images, and spreadsheets
- Each type has its own component in `/artifacts`
- Use the artifact system for any generated content

## Testing Approach

- E2E tests use Playwright (see `/tests`)
- Test files follow `*.spec.ts` pattern
- Run specific tests with `pnpm test <test-name>`
- Tests cover artifacts, chat flows, and API routes