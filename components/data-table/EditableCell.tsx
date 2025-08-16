'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { mapD1TypeToUIType } from '@/lib/d1/introspection';
import type { TableColumn } from '@/lib/d1/introspection';

interface EditableCellProps {
  value: any;
  column: TableColumn;
  isEditing: boolean;
  onEdit: (value: any) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export function EditableCell({
  value,
  column,
  isEditing,
  onEdit,
  onStartEdit,
  onCancelEdit,
}: EditableCellProps) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const uiType = mapD1TypeToUIType(column.type);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancelEdit();
      setEditValue(value);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      // TODO: Move to next cell
    }
  };

  const handleSave = () => {
    const finalValue = convertValue(editValue, column.type);
    onEdit(finalValue);
  };

  const convertValue = (val: any, type: string) => {
    if (val === '' || val === null) return null;
    
    const upperType = type.toUpperCase();
    if (upperType.includes('INTEGER') || upperType.includes('REAL')) {
      return Number(val);
    } else if (upperType.includes('BOOLEAN')) {
      return Boolean(val);
    }
    
    return val;
  };

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '';
    
    if (uiType === 'date' || uiType === 'datetime') {
      try {
        const date = new Date(val);
        return uiType === 'date' 
          ? format(date, 'yyyy-MM-dd')
          : format(date, 'yyyy-MM-dd HH:mm');
      } catch {
        return val;
      }
    }
    
    if (uiType === 'boolean') {
      return val ? 'Yes' : 'No';
    }
    
    return val.toString();
  };

  if (isEditing) {
    if (uiType === 'boolean') {
      return (
        <Checkbox
          checked={editValue}
          onCheckedChange={(checked) => {
            setEditValue(checked);
            onEdit(checked);
          }}
          onKeyDown={handleKeyDown}
        />
      );
    }

    return (
      <Input
        ref={inputRef}
        type={uiType === 'number' ? 'number' : uiType === 'date' ? 'date' : 'text'}
        value={editValue || ''}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 py-1 px-2"
      />
    );
  }

  return (
    <div
      className="min-h-[32px] px-2 py-1 cursor-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
      onDoubleClick={onStartEdit}
    >
      {formatValue(value)}
    </div>
  );
}