'use client'

import React, { useState, useEffect } from 'react';
import type { JSX } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { ScrollArea } from '@/app/components/ui/scroll-area';

interface DynamoDBTableItemsProps {
  tableName: string;
}

interface AttributeEntry {
  key: string;
  value: string;
}

interface TableSchema {
  KeySchema: Array<{
    AttributeName: string;
    KeyType: 'HASH' | 'RANGE';
  }>;
}

// Add these interfaces for JSON editor
interface JsonEditorProps {
  data: any;
  onChange: (data: any) => void;
  readOnly?: boolean;
  requiredKeys?: string[];
}

interface JsonFormFieldProps {
  path: string[];
  value: any;
  onChange: (path: string[], value: any) => void;
  readOnly?: boolean;
  isRequired?: boolean;
}

function JsonFormField({ path, value, onChange, readOnly, isRequired }: JsonFormFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(path, e.target.value);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium min-w-[150px]">{path[path.length - 1]}:</span>
      <Input
        value={value}
        onChange={handleChange}
        disabled={readOnly}
        required={isRequired}
        className="flex-1"
      />
    </div>
  );
}

function JsonEditor({ data, onChange, readOnly, requiredKeys = [] }: JsonEditorProps) {
  const [jsonString, setJsonString] = useState('');

  useEffect(() => {
    setJsonString(JSON.stringify(data, null, 2));
  }, [data]);

  const updateValue = (path: string[], value: any) => {
    const newData = { ...data };
    let current = newData;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    onChange(newData);
  };

  const renderFormFields = (obj: any, path: string[] = []): JSX.Element[] => {
    return Object.entries(obj).map(([key, value]) => {
      const currentPath = [...path, key];
      if (typeof value === 'object' && value !== null) {
        return (
          <div key={currentPath.join('.')} className="space-y-2">
            <h4 className="font-semibold">{key}</h4>
            <div className="pl-4 space-y-2">
              {renderFormFields(value, currentPath)}
            </div>
          </div>
        );
      }
      return (
        <JsonFormField
          key={currentPath.join('.')}
          path={currentPath}
          value={value}
          onChange={updateValue}
          readOnly={readOnly || requiredKeys.includes(key)}
          isRequired={requiredKeys.includes(key)}
        />
      );
    });
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-[400px]">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Form View</h3>
        <ScrollArea className="h-[350px]">
          <div className="space-y-4">
            {renderFormFields(data)}
          </div>
        </ScrollArea>
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">JSON View</h3>
        <ScrollArea className="h-[350px]">
          <pre className="text-sm whitespace-pre-wrap">
            {jsonString}
          </pre>
        </ScrollArea>
      </div>
    </div>
  );
}

export function DynamoDBTableItems({ tableName }: DynamoDBTableItemsProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [tableSchema, setTableSchema] = useState<TableSchema | null>(null);
  const [requiredKeys, setRequiredKeys] = useState<string[]>([]);

  const fetchSchema = async () => {
    try {
      const response = await fetch(`/api/dynamodb/tables/${tableName}/schema`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setTableSchema(data.schema);
      
      // Extract required key attributes from schema
      const keys = data.schema.KeySchema.map((keySchema: { AttributeName: string }) => keySchema.AttributeName);
      setRequiredKeys(keys);
      
      // Initialize attributes with required keys
      setAttributes(keys.map((key: TableSchema['KeySchema'][number]['AttributeName']) => ({ key, value: '' })));
    } catch (error) {
      toast.error('Failed to fetch table schema');
      console.error('Error fetching schema:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/dynamodb/tables/${tableName}/items`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setItems(data.items);
    } catch (error) {
      toast.error('Failed to fetch items');
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
    fetchItems();
  }, [tableName]);

  const handleCreateItem = async () => {
    try {
      // Validate required keys
      const missingKeys = requiredKeys.filter(key => 
        !attributes.some(attr => attr.key === key && attr.value.trim() !== '')
      );

      if (missingKeys.length > 0) {
        toast.error(`Missing required key(s): ${missingKeys.join(', ')}`);
        return;
      }

      // Filter out empty attributes and create item object
      const validAttributes = attributes.filter(attr => 
        attr.key.trim() !== '' && 
        (requiredKeys.includes(attr.key) || attr.value.trim() !== '')
      );
      
      if (validAttributes.length === 0) {
        toast.error('Please add at least one valid attribute');
        return;
      }

      const newItem = validAttributes.reduce((acc, { key, value }) => ({
        ...acc,
        [key.trim()]: value.trim()
      }), {});

      const response = await fetch(`/api/dynamodb/tables/${tableName}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Item: newItem }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      toast.success('Item created successfully');
      setShowNewItemDialog(false);
      // Reset attributes to just the required keys
      setAttributes(requiredKeys.map(key => ({ key, value: '' })));
      fetchItems();
    } catch (error) {
      toast.error('Failed to create item');
      console.error('Error creating item:', error);
    }
  };

  const [attributes, setAttributes] = useState<AttributeEntry[]>([
    { key: '', value: '' }
  ]);

  const addAttribute = () => {
    setAttributes([...attributes, { key: '', value: '' }]);
  };

  const removeAttribute = (index: number) => {
    // Don't allow removing required key attributes
    const attr = attributes[index];
    if (requiredKeys.includes(attr.key)) {
      toast.error('Cannot remove required key attributes');
      return;
    }
    
    if (attributes.length > requiredKeys.length) {
      setAttributes(attributes.filter((_, i) => i !== index));
    }
  };

  const updateAttribute = (index: number, field: 'key' | 'value', value: string) => {
    const newAttributes = [...attributes];
    const attr = newAttributes[index];
    
    // Don't allow changing required key names
    if (field === 'key' && requiredKeys.includes(attr.key)) {
      toast.error('Cannot modify required key attributes');
      return;
    }
    
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  const handleUpdateItem = async () => {
    try {
      if (!editItem || !tableSchema) {
        toast.error('No item to update or schema not loaded');
        return;
      }

      // Extract key attributes from schema
      const keyAttributes = tableSchema.KeySchema.reduce((acc, keyDef) => ({
        ...acc,
        [keyDef.AttributeName]: editItem[keyDef.AttributeName]
      }), {});

      // Remove key attributes from updates
      const updates = Object.fromEntries(
        Object.entries(editItem)
          .filter(([key]) => !tableSchema.KeySchema.some(k => k.AttributeName === key))
          .filter(([_, value]) => value !== undefined && value !== null)
      );

      const response = await fetch(`/api/dynamodb/tables/${tableName}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Key: keyAttributes,
          updates
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update item');

      toast.success('Item updated successfully');
      setShowEditItemDialog(false);
      setEditItem(null);
      await fetchItems();
    } catch (error) {
      toast.error(`Error updating item: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!tableSchema) {
      toast.error('Table schema not loaded');
      return;
    }

    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      // Extract primary key attributes from the item
      const keyAttributes = tableSchema.KeySchema.reduce((acc, keyDef) => ({
        ...acc,
        [keyDef.AttributeName]: item[keyDef.AttributeName]
      }), {});

      const response = await fetch(`/api/dynamodb/tables/${tableName}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Key: keyAttributes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      toast.success('Item deleted successfully');
      fetchItems();
    } catch (error) {
      toast.error('Failed to delete item');
      console.error('Error deleting item:', error);
    }
  };

  if (loading) {
    return <div>Loading items...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Table Items</h2>
        <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
          <DialogTrigger asChild>
            <Button>Add New Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4">
                {attributes.map((attr, index) => (
                  <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                    <Input
                      placeholder="Attribute name"
                      value={attr.key}
                      onChange={(e) => updateAttribute(index, 'key', e.target.value)}
                      required
                      disabled={requiredKeys.includes(attr.key)}
                    />
                    <Input
                      placeholder="Value"
                      value={attr.value}
                      onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                      required
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeAttribute(index)}
                      disabled={requiredKeys.includes(attr.key)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={addAttribute}
                >
                  Add Attribute
                </Button>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setShowNewItemDialog(false);
                  setAttributes(requiredKeys.map(key => ({ key, value: '' })));
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateItem}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Attributes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditItem(item);
                        setShowEditItemDialog(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteItem(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showEditItemDialog} onOpenChange={setShowEditItemDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editItem && (
              <JsonEditor
                data={editItem}
                onChange={setEditItem}
                requiredKeys={requiredKeys}
              />
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditItemDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateItem}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 