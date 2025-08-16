'use client';

import { useState, useEffect, useCallback } from 'react';
import { TableToolbar } from './TableToolbar';
import { TableHeader } from './TableHeader';
import { TableRow } from './TableRow';
import { TablePagination } from './TablePagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { TableColumn, TableSchema } from '@/lib/d1/introspection';

interface DataTableProps {
  tableName: string;
}

export function DataTable({ tableName }: DataTableProps) {
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null);
  
  const pageSize = 50;

  // Fetch schema
  useEffect(() => {
    fetchSchema();
  }, [tableName]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [tableName, searchQuery, sortColumn, sortDirection, currentPage]);

  const fetchSchema = async () => {
    try {
      const response = await fetch(`/api/schema/${tableName}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch schema');
      }
      
      setSchema(result.schema);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schema');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
        orderBy: sortColumn,
        orderDirection: sortDirection,
      });
      
      if (searchQuery) {
        // Add search to first text column
        const textColumn = schema?.columns.find(col => 
          col.type.toUpperCase().includes('TEXT') || 
          col.type.toUpperCase().includes('VARCHAR')
        );
        if (textColumn) {
          params.set(textColumn.name, searchQuery);
        }
      }
      
      const response = await fetch(`/api/tables/${tableName}?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }
      
      setData(result.data);
      setTotalRecords(result.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortColumn(column);
      setSortDirection('ASC');
    }
    setCurrentPage(1);
  };

  const handleCellEdit = async (rowId: string, column: string, value: any) => {
    try {
      const response = await fetch(`/api/tables/${tableName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rowId, [column]: value }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update record');
      }
      
      // Update local data
      setData(data.map(row => 
        row.id === rowId ? { ...row, [column]: value } : row
      ));
      
      setEditingCell(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record');
    }
  };

  const handleAddRecord = async (newRecord: any) => {
    try {
      const response = await fetch(`/api/tables/${tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create record');
      }
      
      // Refresh data
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/tables/${tableName}?id=${recordId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete record');
      }
      
      // Refresh data
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    }
  };

  if (!schema) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const visibleColumns = schema.columns.filter(col => 
    !['created_at', 'updated_at'].includes(col.name)
  );

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddRecord={handleAddRecord}
        schema={schema}
      />

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHeader
              columns={visibleColumns}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    {visibleColumns.map((col) => (
                      <td key={col.name} className="px-6 py-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-20" />
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td 
                    colSpan={visibleColumns.length + 1} 
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No records found
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <TableRow
                    key={row.id}
                    row={row}
                    columns={visibleColumns}
                    tableName={tableName}
                    editingCell={editingCell}
                    onEdit={(column, value) => handleCellEdit(row.id, column, value)}
                    onEditStart={(column) => setEditingCell({ rowId: row.id, column })}
                    onEditCancel={() => setEditingCell(null)}
                    onDelete={() => handleDeleteRecord(row.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}