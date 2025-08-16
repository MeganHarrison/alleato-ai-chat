'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TableColumn } from '@/lib/d1/introspection';

interface RelationCellProps {
  value: any;
  column: TableColumn;
  isEditing: boolean;
  onEdit: (value: any) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export function RelationCell({
  value,
  column,
  isEditing,
  onEdit,
  onStartEdit,
  onCancelEdit,
}: RelationCellProps) {
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (column.foreignKeyTable) {
      fetchRelatedData();
    }
  }, [column.foreignKeyTable]);

  useEffect(() => {
    // Find display value for current selection
    const selected = options.find(opt => opt.id === value);
    setDisplayValue(selected?.name || value || '');
  }, [value, options]);

  const fetchRelatedData = async () => {
    if (!column.foreignKeyTable) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/tables/${column.foreignKeyTable}?limit=100`);
      const result = await response.json();
      
      if (result.success) {
        // Try to find a 'name' or 'title' column for display
        const displayOptions = result.data.map((item: any) => ({
          id: item.id,
          name: item.name || item.title || item.email || `${column.foreignKeyTable} #${item.id}`,
        }));
        setOptions(displayOptions);
      }
    } catch (error) {
      console.error('Failed to fetch related data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <Select
        value={value?.toString() || ''}
        onValueChange={(newValue) => {
          onEdit(newValue);
          onCancelEdit();
        }}
      >
        <SelectTrigger className="h-8">
          <SelectValue placeholder={loading ? 'Loading...' : 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div
      className="min-h-[32px] px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-blue-600 dark:text-blue-400"
      onDoubleClick={onStartEdit}
    >
      {displayValue || '-'}
    </div>
  );
}