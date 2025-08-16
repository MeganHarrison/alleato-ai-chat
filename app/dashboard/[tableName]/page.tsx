import { notFound } from 'next/navigation';
import { DataTable } from '@/components/data-table/DataTable';
import { auth } from '@/lib/auth';

interface PageProps {
  params: {
    tableName: string;
  };
}

// Define allowed tables for security
const ALLOWED_TABLES = [
  'projects',
  'meetings', 
  'clients',
  'contacts',
  'tasks',
  'subcontractors',
  'employees',
  'leads',
  'estimates',
  'contracts',
  'quotes',
  'sales',
];

export default async function TablePage({ params }: PageProps) {
  const session = await auth();
  
  if (!session?.user) {
    notFound();
  }

  const { tableName } = params;

  // Security check - only allow specific tables
  if (!ALLOWED_TABLES.includes(tableName)) {
    notFound();
  }

  // Format table name for display
  const displayName = tableName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {displayName}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your {tableName} data with real-time Notion sync
        </p>
      </div>

      <DataTable tableName={tableName} />
    </div>
  );
}