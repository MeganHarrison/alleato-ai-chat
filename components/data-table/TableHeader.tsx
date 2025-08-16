'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { TableColumn } from '@/lib/d1/introspection';

interface TableHeaderProps {
  columns: TableColumn[];
  sortColumn: string;
  sortDirection: 'ASC' | 'DESC';
  onSort: (column: string) => void;
}

export function TableHeader({
  columns,
  sortColumn,
  sortDirection,
  onSort,
}: TableHeaderProps) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-800">
      <tr>
        {columns.map((column) => (
          <th
            key={column.name}
            onClick={() => onSort(column.name)}
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span>{formatColumnName(column.name)}</span>
              <span className="text-gray-400">
                {sortColumn === column.name ? (
                  sortDirection === 'ASC' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )
                ) : (
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                )}
              </span>
            </div>
          </th>
        ))}
        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
  );
}

function formatColumnName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}