# Notion Sync Worker

This Cloudflare Worker handles synchronization between D1 database and Notion.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set the Notion API token as a secret:
   ```bash
   wrangler secret put NOTION_TOKEN
   # Enter your Notion token when prompted
   ```

3. Deploy the worker:
   ```bash
   wrangler deploy
   ```

## Configuration

The following environment variables are configured in `wrangler.toml`:
- `NOTION_PROJECTS_DB_ID`: Notion database ID for projects
- `NOTION_MEETINGS_DB_ID`: Notion database ID for meetings

The following must be set as a secret:
- `NOTION_TOKEN`: Your Notion integration token

## Features

- Scheduled sync every 5 minutes
- Webhook endpoint for real-time Notion updates
- Queue-based processing for reliability
- Automatic conflict resolution

## Endpoints

- `POST /webhook/notion`: Receive Notion webhook events
- `POST /sync`: Manually trigger sync for a table
- `GET /health`: Health check endpoint