import { Client } from '@notionhq/client';
import type { 
  PageObjectResponse, 
  DatabaseObjectResponse,
  QueryDatabaseParameters,
  CreatePageParameters,
  UpdatePageParameters,
} from '@notionhq/client/build/src/api-endpoints';

export class NotionClient {
  private client: Client;

  constructor(auth?: string) {
    this.client = new Client({
      auth: auth || process.env.NOTION_TOKEN,
    });
  }

  // Query database with pagination support
  async queryDatabase(
    databaseId: string,
    filter?: QueryDatabaseParameters['filter'],
    sorts?: QueryDatabaseParameters['sorts'],
    startCursor?: string
  ) {
    try {
      const response = await this.client.databases.query({
        database_id: databaseId,
        filter,
        sorts,
        start_cursor: startCursor,
        page_size: 100,
      });

      return {
        results: response.results as PageObjectResponse[],
        hasMore: response.has_more,
        nextCursor: response.next_cursor,
      };
    } catch (error) {
      console.error('Error querying Notion database:', error);
      throw error;
    }
  }

  // Get database schema
  async getDatabase(databaseId: string) {
    try {
      const response = await this.client.databases.retrieve({
        database_id: databaseId,
      });
      return response as DatabaseObjectResponse;
    } catch (error) {
      console.error('Error retrieving Notion database:', error);
      throw error;
    }
  }

  // Create a new page
  async createPage(properties: CreatePageParameters) {
    try {
      const response = await this.client.pages.create(properties);
      return response as PageObjectResponse;
    } catch (error) {
      console.error('Error creating Notion page:', error);
      throw error;
    }
  }

  // Update existing page
  async updatePage(pageId: string, properties: UpdatePageParameters['properties']) {
    try {
      const response = await this.client.pages.update({
        page_id: pageId,
        properties,
      });
      return response as PageObjectResponse;
    } catch (error) {
      console.error('Error updating Notion page:', error);
      throw error;
    }
  }

  // Delete page (archive)
  async deletePage(pageId: string) {
    try {
      const response = await this.client.pages.update({
        page_id: pageId,
        archived: true,
      });
      return response;
    } catch (error) {
      console.error('Error deleting Notion page:', error);
      throw error;
    }
  }

  // Search for pages by ID property
  async findPageByD1Id(databaseId: string, d1Id: string) {
    try {
      const response = await this.queryDatabase(databaseId, {
        property: 'ID',
        rich_text: {
          equals: d1Id,
        },
      });

      return response.results.length > 0 ? response.results[0] : null;
    } catch (error) {
      console.error('Error finding page by D1 ID:', error);
      return null;
    }
  }

  // Get all pages from a database (handles pagination)
  async getAllPages(databaseId: string) {
    const pages: PageObjectResponse[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await this.queryDatabase(databaseId, undefined, undefined, startCursor);
      pages.push(...response.results);
      hasMore = response.hasMore;
      startCursor = response.nextCursor || undefined;
    }

    return pages;
  }
}