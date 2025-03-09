import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';

interface DynamoDBTableSchemaProps {
  tableName: string;
  onSchemaUpdate?: () => void;
}

export function DynamoDBTableSchema({ tableName, onSchemaUpdate }: DynamoDBTableSchemaProps) {
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editSchema, setEditSchema] = useState<any>(null);

  const fetchSchema = async () => {
    try {
      const response = await fetch(`/api/dynamodb/tables/${tableName}/schema`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setSchema(data.schema);
    } catch (error) {
      toast.error('Failed to fetch table schema');
      console.error('Error fetching schema:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, [tableName]);

  const handleUpdateSchema = async () => {
    try {
      const response = await fetch(`/api/dynamodb/tables/${tableName}/schema`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSchema),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      toast.success('Schema updated successfully');
      setShowEditDialog(false);
      fetchSchema();
      if (onSchemaUpdate) onSchemaUpdate();
    } catch (error) {
      toast.error('Failed to update schema');
      console.error('Error updating schema:', error);
    }
  };

  if (loading) {
    return <div>Loading schema...</div>;
  }

  if (!schema) {
    return <div>No schema found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Table Schema</h2>
        <Button onClick={() => {
          setEditSchema(schema);
          setShowEditDialog(true);
        }}>
          Edit Schema
        </Button>
      </div>

      <div className="space-y-4 border rounded-lg p-4">
        <div>
          <h3 className="font-semibold">Table Details</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>Table Name:</div>
            <div>{schema.TableName}</div>
            <div>Status:</div>
            <div>{schema.TableStatus}</div>
            <div>Creation Date:</div>
            <div>{new Date(schema.CreationDateTime).toLocaleString()}</div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold">Key Schema</h3>
          <div className="mt-2">
            {schema.KeySchema.map((key: any, index: number) => (
              <div key={index} className="grid grid-cols-2 gap-2">
                <div>{key.KeyType}:</div>
                <div>{key.AttributeName}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold">Attribute Definitions</h3>
          <div className="mt-2">
            {schema.AttributeDefinitions.map((attr: any, index: number) => (
              <div key={index} className="grid grid-cols-2 gap-2">
                <div>{attr.AttributeName}:</div>
                <div>{attr.AttributeType}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold">Provisioned Throughput</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>Read Capacity Units:</div>
            <div>{schema.ProvisionedThroughput?.ReadCapacityUnits || 'N/A'}</div>
            <div>Write Capacity Units:</div>
            <div>{schema.ProvisionedThroughput?.WriteCapacityUnits || 'N/A'}</div>
          </div>
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schema</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editSchema && (
              <>
                <div>
                  <h3 className="font-semibold mb-2">Provisioned Throughput</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label>Read Capacity Units</label>
                      <Input
                        type="number"
                        value={editSchema.ProvisionedThroughput?.ReadCapacityUnits || ''}
                        onChange={(e) => setEditSchema({
                          ...editSchema,
                          ProvisionedThroughput: {
                            ...editSchema.ProvisionedThroughput,
                            ReadCapacityUnits: parseInt(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label>Write Capacity Units</label>
                      <Input
                        type="number"
                        value={editSchema.ProvisionedThroughput?.WriteCapacityUnits || ''}
                        onChange={(e) => setEditSchema({
                          ...editSchema,
                          ProvisionedThroughput: {
                            ...editSchema.ProvisionedThroughput,
                            WriteCapacityUnits: parseInt(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateSchema}>Save Changes</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 