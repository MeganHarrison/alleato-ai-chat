import type { 
  RichTextItemResponse,
  PageObjectResponse 
} from '@notionhq/client/build/src/api-endpoints';

// Convert D1 value to Notion property value
export function d1ToNotionValue(value: any, notionType: string, propertyName?: string) {
  if (value === null || value === undefined) {
    return getEmptyValue(notionType);
  }

  switch (notionType) {
    case 'title':
      return {
        title: [{
          type: 'text',
          text: { content: value.toString() || 'Untitled' },
        }],
      };
    
    case 'rich_text':
      return {
        rich_text: [{
          type: 'text',
          text: { content: value.toString() || '' },
        }],
      };
    
    case 'number':
      return { number: parseFloat(value) || 0 };
    
    case 'date':
      if (!value) return { date: null };
      try {
        const date = new Date(value);
        return { date: { start: date.toISOString().split('T')[0] } };
      } catch {
        return { date: null };
      }
    
    case 'checkbox':
      return { checkbox: Boolean(value) };
    
    case 'select':
      return { select: { name: value.toString() } };
    
    case 'multi_select':
      const values = Array.isArray(value) ? value : [value];
      return {
        multi_select: values.map(v => ({ name: v.toString() })),
      };
    
    case 'url':
      return { url: value ? value.toString() : null };
    
    case 'email':
      return { email: value ? value.toString() : null };
    
    case 'phone_number':
      return { phone_number: value ? value.toString() : null };
    
    case 'relation':
      // Relations need page IDs, not values
      // This should be handled separately
      return { relation: [] };
    
    default:
      return { rich_text: [{ type: 'text', text: { content: value.toString() } }] };
  }
}

// Convert Notion property value to D1 value
export function notionToD1Value(property: any, notionType: string): any {
  if (!property) return null;

  switch (notionType) {
    case 'title':
      return property.title?.[0]?.text?.content || '';
    
    case 'rich_text':
      return property.rich_text?.[0]?.text?.content || '';
    
    case 'number':
      return property.number;
    
    case 'date':
      return property.date?.start || null;
    
    case 'checkbox':
      return property.checkbox || false;
    
    case 'select':
      return property.select?.name || null;
    
    case 'multi_select':
      return property.multi_select?.map((item: any) => item.name).join(',') || '';
    
    case 'url':
      return property.url || null;
    
    case 'email':
      return property.email || null;
    
    case 'phone_number':
      return property.phone_number || null;
    
    case 'relation':
      // Return first related page ID
      return property.relation?.[0]?.id || null;
    
    case 'rollup':
      // Handle rollup based on type
      if (property.rollup?.type === 'number') {
        return property.rollup.number;
      } else if (property.rollup?.type === 'array') {
        return property.rollup.array;
      }
      return null;
    
    case 'formula':
      // Handle formula based on type
      if (property.formula?.type === 'string') {
        return property.formula.string;
      } else if (property.formula?.type === 'number') {
        return property.formula.number;
      } else if (property.formula?.type === 'boolean') {
        return property.formula.boolean;
      }
      return null;
    
    case 'created_time':
      return property.created_time;
    
    case 'last_edited_time':
      return property.last_edited_time;
    
    default:
      return null;
  }
}

// Get empty value for a Notion property type
function getEmptyValue(notionType: string) {
  switch (notionType) {
    case 'title':
      return { title: [{ type: 'text', text: { content: 'Untitled' } }] };
    case 'rich_text':
      return { rich_text: [] };
    case 'number':
      return { number: null };
    case 'date':
      return { date: null };
    case 'checkbox':
      return { checkbox: false };
    case 'select':
      return { select: null };
    case 'multi_select':
      return { multi_select: [] };
    case 'url':
      return { url: null };
    case 'email':
      return { email: null };
    case 'phone_number':
      return { phone_number: null };
    case 'relation':
      return { relation: [] };
    default:
      return { rich_text: [] };
  }
}

// Convert D1 record to Notion properties based on mapping
export function convertD1RecordToNotionProperties(
  record: any,
  mappings: Array<{ d1Column: string; notionProperty: string; notionType: string }>
) {
  const properties: any = {};

  for (const mapping of mappings) {
    const value = record[mapping.d1Column];
    properties[mapping.notionProperty] = d1ToNotionValue(
      value,
      mapping.notionType,
      mapping.notionProperty
    );
  }

  return properties;
}

// Convert Notion page to D1 record based on mapping
export function convertNotionPageToD1Record(
  page: PageObjectResponse,
  mappings: Array<{ d1Column: string; notionProperty: string; notionType: string }>
) {
  const record: any = {};

  for (const mapping of mappings) {
    const property = (page.properties as any)[mapping.notionProperty];
    if (property) {
      record[mapping.d1Column] = notionToD1Value(property, mapping.notionType);
    }
  }

  // Add Notion metadata
  record.notion_page_id = page.id;
  record.notion_last_edited = page.last_edited_time;

  return record;
}