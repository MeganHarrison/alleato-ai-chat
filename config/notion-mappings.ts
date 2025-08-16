// Notion database mappings configuration
// Maps D1 tables to Notion databases and their properties

export interface NotionPropertyMapping {
  d1Column: string;
  notionProperty: string;
  notionType: string;
  options?: any; // For select/multi-select options
}

export interface NotionTableMapping {
  notionDatabaseId: string;
  titleProperty: string; // Which D1 column maps to Notion title
  mappings: NotionPropertyMapping[];
  relations?: {
    d1Column: string;
    notionProperty: string;
    relatedDatabaseId: string;
  }[];
}

export const NOTION_MAPPINGS: Record<string, NotionTableMapping> = {
  projects: {
    notionDatabaseId: process.env.NOTION_PROJECTS_DB_ID || '18fee3c6d9968192a666fe6b55e99f52',
    titleProperty: 'name', // Projects.name → Notion title
    mappings: [
      { d1Column: 'id', notionProperty: 'ID', notionType: 'rich_text' },
      { d1Column: 'name', notionProperty: 'Name', notionType: 'title' },
      { d1Column: 'description', notionProperty: 'Description', notionType: 'rich_text' },
      { d1Column: 'status', notionProperty: 'Status', notionType: 'select' },
      { d1Column: 'start_date', notionProperty: 'Start Date', notionType: 'date' },
      { d1Column: 'end_date', notionProperty: 'End Date', notionType: 'date' },
      { d1Column: 'budget', notionProperty: 'Budget', notionType: 'number' },
      { d1Column: 'actual_cost', notionProperty: 'Actual Cost', notionType: 'number' },
    ],
    relations: [
      {
        d1Column: 'client_id',
        notionProperty: 'Client',
        relatedDatabaseId: process.env.NOTION_CLIENTS_DB_ID || '',
      },
    ],
  },
  meetings: {
    notionDatabaseId: process.env.NOTION_MEETINGS_DB_ID || 'fb73a7587ceb44dfaa7be6713930a705',
    titleProperty: 'title',
    mappings: [
      { d1Column: 'id', notionProperty: 'ID', notionType: 'rich_text' },
      { d1Column: 'title', notionProperty: 'Title', notionType: 'title' },
      { d1Column: 'date', notionProperty: 'Date', notionType: 'date' },
      { d1Column: 'duration', notionProperty: 'Duration', notionType: 'number' },
      { d1Column: 'summary', notionProperty: 'Summary', notionType: 'rich_text' },
      { d1Column: 'transcript_url', notionProperty: 'Transcript', notionType: 'url' },
      { d1Column: 'fireflies_url', notionProperty: 'Fireflies Link', notionType: 'url' },
      { d1Column: 'action_items', notionProperty: 'Action Items', notionType: 'rich_text' },
    ],
    relations: [
      {
        d1Column: 'project_id',
        notionProperty: 'Project',
        relatedDatabaseId: process.env.NOTION_PROJECTS_DB_ID || '18fee3c6d9968192a666fe6b55e99f52',
      },
    ],
  },
  clients: {
    notionDatabaseId: process.env.NOTION_CLIENTS_DB_ID || '',
    titleProperty: 'name',
    mappings: [
      { d1Column: 'id', notionProperty: 'ID', notionType: 'rich_text' },
      { d1Column: 'name', notionProperty: 'Name', notionType: 'title' },
      { d1Column: 'email', notionProperty: 'Email', notionType: 'email' },
      { d1Column: 'phone', notionProperty: 'Phone', notionType: 'phone_number' },
      { d1Column: 'address', notionProperty: 'Address', notionType: 'rich_text' },
      { d1Column: 'website', notionProperty: 'Website', notionType: 'url' },
      { d1Column: 'status', notionProperty: 'Status', notionType: 'select' },
    ],
    relations: [
      {
        d1Column: 'company_id',
        notionProperty: 'Company',
        relatedDatabaseId: process.env.NOTION_COMPANIES_DB_ID || '',
      },
    ],
  },
  tasks: {
    notionDatabaseId: process.env.NOTION_TASKS_DB_ID || '',
    titleProperty: 'title',
    mappings: [
      { d1Column: 'id', notionProperty: 'ID', notionType: 'rich_text' },
      { d1Column: 'title', notionProperty: 'Title', notionType: 'title' },
      { d1Column: 'description', notionProperty: 'Description', notionType: 'rich_text' },
      { d1Column: 'status', notionProperty: 'Status', notionType: 'select' },
      { d1Column: 'priority', notionProperty: 'Priority', notionType: 'select' },
      { d1Column: 'due_date', notionProperty: 'Due Date', notionType: 'date' },
      { d1Column: 'completed_at', notionProperty: 'Completed At', notionType: 'date' },
    ],
    relations: [
      {
        d1Column: 'project_id',
        notionProperty: 'Project',
        relatedDatabaseId: process.env.NOTION_PROJECTS_DB_ID || '18fee3c6d9968192a666fe6b55e99f52',
      },
      {
        d1Column: 'assigned_to',
        notionProperty: 'Assigned To',
        relatedDatabaseId: process.env.NOTION_EMPLOYEES_DB_ID || '',
      },
    ],
  },
};