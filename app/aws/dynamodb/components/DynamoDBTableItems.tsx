import React, { useState, useEffect } from 'react';
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

interface DynamoDBTableItemsProps {
  tableName: string;
}

export function DynamoDBTableItems({ tableName }: DynamoDBTableItemsProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState<any>({});
  const [editItem, setEditItem] = useState<any>(null);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);

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
    fetchItems();
  }, [tableName]);

  const handleCreateItem = async () => {
    try {
      const response = await fetch(`/api/dynamodb/tables/${tableName}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Item: newItem }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      toast.success('Item created successfully');
      setShowNewItemDialog(false);
      setNewItem({});
      fetchItems();
    } catch (error) {
      toast.error('Failed to create item');
      console.error('Error creating item:', error);
    }
  };

  const handleUpdateItem = async () => {
    try {
      const { key, ...attributes } = editItem;
      const updateExpression = 'SET ' + Object.keys(attributes)
        .map(attr => `#${attr} = :${attr}`)
        .join(', ');

      const expressionAttributeNames = Object.keys(attributes).reduce(
        (acc, attr) => ({ ...acc, [`#${attr}`]: attr }),
        {}
      );

      const expressionAttributeValues = Object.entries(attributes).reduce(
        (acc, [attr, value]) => ({ ...acc, [`:${attr}`]: value }),
        {}
      );

      const response = await fetch(`/api/dynamodb/tables/${tableName}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Key: key,
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      toast.success('Item updated successfully');
      setShowEditItemDialog(false);
      setEditItem(null);
      fetchItems();
    } catch (error) {
      toast.error('Failed to update item');
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (key: any) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`/api/dynamodb/tables/${tableName}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Key: key }),
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
                {Object.entries(newItem).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Attribute name"
                      value={key}
                      onChange={(e) => {
                        const { [key]: _, ...rest } = newItem;
                        setNewItem({ ...rest, [e.target.value]: value });
                      }}
                    />
                    <Input
                      placeholder="Value"
                      value={value as string}
                      onChange={(e) => setNewItem({ ...newItem, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setNewItem({ ...newItem, '': '' })}
                >
                  Add Attribute
                </Button>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewItemDialog(false)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editItem && (
              <div className="grid gap-4">
                {Object.entries(editItem).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Attribute name"
                      value={key}
                      onChange={(e) => {
                        const { [key]: _, ...rest } = editItem;
                        setEditItem({ ...rest, [e.target.value]: value });
                      }}
                    />
                    <Input
                      placeholder="Value"
                      value={value as string}
                      onChange={(e) => setEditItem({ ...editItem, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setEditItem({ ...editItem, '': '' })}
                >
                  Add Attribute
                </Button>
              </div>
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