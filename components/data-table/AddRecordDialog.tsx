'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { mapD1TypeToUIType } from '@/lib/d1/introspection';
import type { TableSchema } from '@/lib/d1/introspection';

interface AddRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: TableSchema;
  onSubmit: (data: any) => void;
}

export function AddRecordDialog({
  open,
  onOpenChange,
  schema,
  onSubmit,
}: AddRecordDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({});
  };

  const handleChange = (columnName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [columnName]: value,
    }));
  };

  // Filter out auto-generated columns
  const editableColumns = schema.columns.filter(col => 
    !col.isPrimary && 
    !['created_at', 'updated_at'].includes(col.name)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Record</DialogTitle>
            <DialogDescription>
              Fill in the details for the new {schema.tableName} record.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {editableColumns.map((column) => {
              const uiType = mapD1TypeToUIType(column.type);
              
              return (
                <div key={column.name} className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={column.name} className="text-right">
                    {formatColumnName(column.name)}
                    {!column.nullable && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  
                  <div className="col-span-3">
                    {uiType === 'boolean' ? (
                      <Checkbox
                        id={column.name}
                        checked={formData[column.name] || false}
                        onCheckedChange={(checked) => handleChange(column.name, checked)}
                      />
                    ) : (
                      <Input
                        id={column.name}
                        type={uiType === 'number' ? 'number' : uiType === 'date' ? 'date' : 'text'}
                        value={formData[column.name] || ''}
                        onChange={(e) => handleChange(column.name, e.target.value)}
                        required={!column.nullable}
                        placeholder={column.nullable ? 'Optional' : 'Required'}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Record</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatColumnName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}