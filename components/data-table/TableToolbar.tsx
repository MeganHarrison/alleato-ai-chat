'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AddRecordDialog } from './AddRecordDialog';
import type { TableSchema } from '@/lib/d1/introspection';

interface TableToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddRecord: (record: any) => void;
  schema: TableSchema;
}

export function TableToolbar({
  searchQuery,
  onSearchChange,
  onAddRecord,
  schema,
}: TableToolbarProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-white dark:bg-gray-900"
          />
        </div>
        
        <Button
          onClick={() => setShowAddDialog(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Record
        </Button>
      </div>

      <AddRecordDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        schema={schema}
        onSubmit={(data) => {
          onAddRecord(data);
          setShowAddDialog(false);
        }}
      />
    </>
  );
}