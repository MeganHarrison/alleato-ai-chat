'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Trash2, ExternalLink, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditableCell } from './EditableCell';
import { RelationCell } from './RelationCell';
import type { TableColumn } from '@/lib/d1/introspection';

interface TableRowProps {
  row: any;
  columns: TableColumn[];
  tableName: string;
  editingCell: { rowId: string; column: string } | null;
  onEdit: (column: string, value: any) => void;
  onEditStart: (column: string) => void;
  onEditCancel: () => void;
  onDelete: () => void;
}

export function TableRow({
  row,
  columns,
  tableName,
  editingCell,
  onEdit,
  onEditStart,
  onEditCancel,
  onDelete,
}: TableRowProps) {
  const isEditing = (column: string) => 
    editingCell?.rowId === row.id && editingCell?.column === column;

  // Special handling for meetings table
  const isMeetingsTable = tableName === 'meetings';
  const hasTranscript = isMeetingsTable && row.transcript_url;
  const hasFirefliesLink = isMeetingsTable && row.fireflies_url;

  const handleRowClick = () => {
    if (isMeetingsTable && hasTranscript) {
      window.location.href = `/meetings/${row.id}/transcript`;
    }
  };

  return (
    <tr 
      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      onClick={handleRowClick}
    >
      {columns.map((column) => (
        <td
          key={column.name}
          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {column.isForeignKey ? (
            <RelationCell
              value={row[column.name]}
              column={column}
              isEditing={isEditing(column.name)}
              onEdit={(value) => onEdit(column.name, value)}
              onStartEdit={() => onEditStart(column.name)}
              onCancelEdit={onEditCancel}
            />
          ) : (
            <EditableCell
              value={row[column.name]}
              column={column}
              isEditing={isEditing(column.name)}
              onEdit={(value) => onEdit(column.name, value)}
              onStartEdit={() => onEditStart(column.name)}
              onCancelEdit={onEditCancel}
            />
          )}
        </td>
      ))}
      <td 
        className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isMeetingsTable && (
              <>
                {hasTranscript && (
                  <>
                    <DropdownMenuItem
                      onClick={() => window.location.href = `/meetings/${row.id}/transcript`}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Transcript
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        // Download transcript logic
                        window.open(row.transcript_url, '_blank');
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Transcript
                    </DropdownMenuItem>
                  </>
                )}
                {hasFirefliesLink && (
                  <DropdownMenuItem
                    onClick={() => window.open(row.fireflies_url, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in Fireflies
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}