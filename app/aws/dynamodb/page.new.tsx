'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Plus } from '@/app/components/ui/icons';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { DataTable } from '@/app/components/ui/data-table';
import { logger } from '@/app/utils/logger';
import { DynamoDBTableItems } from '@/app/aws/dynamodb/components/DynamoDBTableItems';
import { DynamoDBTableSchema } from '@/app/aws/dynamodb/components/DynamoDBTableSchema';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';

interface DynamoDBTableData {
  TableName: string;
  PartitionKey: {
    name: string;
    type: 'String' | 'Number' | 'Binary';
  };
  SortKey?: {
    name: string;
    type: 'String' | 'Number' | 'Binary';
  };
  BillingMode: 'PROVISIONED' | 'PAY_PER_REQUEST';
  ProvisionedThroughput?: {
    ReadCapacityUnits: number;
    WriteCapacityUnits: number;
  };
  Tags?: Array<{ Key: string; Value: string }>;
}

interface CreateTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DynamoDBTableData) => Promise<void>;
}

function CreateTableDialog({ isOpen, onClose, onSubmit }: CreateTableDialogProps) {
  const [formData, setFormData] = useState<DynamoDBTableData>({
    TableName: '',
    PartitionKey: { name: '', type: 'String' },
    BillingMode: 'PAY_PER_REQUEST',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSortKey, setHasSortKey] = useState(false);
  const [isProvisioned, setIsProvisioned] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.info('CreateTableDialog: Starting table creation', {
      component: 'CreateTableDialog',
      data: { formData }
    });
    
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
      logger.info('CreateTableDialog: Table creation submitted successfully', {
        component: 'CreateTableDialog',
        data: { tableName: formData.TableName }
      });
      onClose();
    } catch (error) {
      logger.error('CreateTableDialog: Error creating table', {
        component: 'CreateTableDialog',
        data: {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error',
          formData
        }
      });
      setError(error instanceof Error ? error.message : 'Failed to create table');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (updates: Partial<DynamoDBTableData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
            <DialogDescription>
              Create a new DynamoDB table with the specified schema and configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <label htmlFor="tableName" className="block text-sm font-medium text-gray-700">
                Table Name
              </label>
              <input
                type="text"
                id="tableName"
                value={formData.TableName}
                onChange={(e) => updateFormData({ TableName: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
                pattern="^[a-zA-Z0-9_.-]+$"
                minLength={3}
                maxLength={255}
              />
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Partition Key</h4>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Key Name"
                  value={formData.PartitionKey.name}
                  onChange={(e) => updateFormData({
                    PartitionKey: { ...formData.PartitionKey, name: e.target.value }
                  })}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
                <select
                  value={formData.PartitionKey.type}
                  onChange={(e) => updateFormData({
                    PartitionKey: { ...formData.PartitionKey, type: e.target.value as 'String' | 'Number' | 'Binary' }
                  })}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  <option value="String">String</option>
                  <option value="Number">Number</option>
                  <option value="Binary">Binary</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="hasSortKey"
                  checked={hasSortKey}
                  onChange={(e) => {
                    setHasSortKey(e.target.checked);
                    if (!e.target.checked) {
                      updateFormData({ SortKey: undefined });
                    } else {
                      updateFormData({
                        SortKey: { name: '', type: 'String' }
                      });
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="hasSortKey" className="ml-2 text-sm font-medium text-gray-700">
                  Add Sort Key
                </label>
              </div>

              {hasSortKey && (
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Sort Key Name"
                    value={formData.SortKey?.name || ''}
                    onChange={(e) => updateFormData({
                      SortKey: { ...formData.SortKey!, name: e.target.value }
                    })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                  <select
                    value={formData.SortKey?.type || 'String'}
                    onChange={(e) => updateFormData({
                      SortKey: { ...formData.SortKey!, type: e.target.value as 'String' | 'Number' | 'Binary' }
                    })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  >
                    <option value="String">String</option>
                    <option value="Number">Number</option>
                    <option value="Binary">Binary</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="isProvisioned"
                  checked={isProvisioned}
                  onChange={(e) => {
                    setIsProvisioned(e.target.checked);
                    updateFormData({
                      BillingMode: e.target.checked ? 'PROVISIONED' : 'PAY_PER_REQUEST',
                      ProvisionedThroughput: e.target.checked
                        ? { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
                        : undefined
                    });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isProvisioned" className="ml-2 text-sm font-medium text-gray-700">
                  Use Provisioned Capacity
                </label>
              </div>

              {isProvisioned && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="readCapacity" className="block text-sm font-medium text-gray-700">
                      Read Capacity Units
                    </label>
                    <input
                      type="number"
                      id="readCapacity"
                      min="1"
                      value={formData.ProvisionedThroughput?.ReadCapacityUnits || 5}
                      onChange={(e) => updateFormData({
                        ProvisionedThroughput: {
                          ...formData.ProvisionedThroughput!,
                          ReadCapacityUnits: parseInt(e.target.value)
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="writeCapacity" className="block text-sm font-medium text-gray-700">
                      Write Capacity Units
                    </label>
                    <input
                      type="number"
                      id="writeCapacity"
                      min="1"
                      value={formData.ProvisionedThroughput?.WriteCapacityUnits || 5}
                      onChange={(e) => updateFormData({
                        ProvisionedThroughput: {
                          ...formData.ProvisionedThroughput!,
                          WriteCapacityUnits: parseInt(e.target.value)
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Table'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TableItem {
  name: string;
}

interface DynamoDBTableViewProps {
  tableName: string;
}

function DynamoDBTableView({ tableName }: DynamoDBTableViewProps) {
  return (
    <Tabs defaultValue="items" className="space-y-4">
      <TabsList>
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="schema">Schema</TabsTrigger>
      </TabsList>
      <TabsContent value="items">
        <DynamoDBTableItems tableName={tableName} />
      </TabsContent>
      <TabsContent value="schema">
        <DynamoDBTableSchema tableName={tableName} />
      </TabsContent>
    </Tabs>
  );
}

export default function DynamoDBPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  async function loadTables() {
    logger.info('DynamoDBPage: Starting to load tables', {
      component: 'DynamoDBPage'
    });
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dynamodb/tables');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      logger.info('DynamoDBPage: Successfully loaded tables', {
        component: 'DynamoDBPage',
        data: { tableCount: data.tables.length }
      });
      setTables(data.tables.map((table: string) => ({ name: table })));
    } catch (error) {
      logger.error('DynamoDBPage: Error loading tables', {
        component: 'DynamoDBPage',
        data: {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error'
        }
      });
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTables();
  }, []);

  const handleCreateTable = async (data: DynamoDBTableData) => {
    logger.info('DynamoDBPage: Creating new table', {
      component: 'DynamoDBPage',
      data: { tableData: data }
    });

    try {
      const response = await fetch('/api/dynamodb/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        logger.error('DynamoDBPage: Error creating table', {
          component: 'DynamoDBPage',
          data: {
            status: response.status,
            statusText: response.statusText,
            responseData,
            requestData: data
          }
        });
        throw new Error(responseData.message || 'Failed to create table');
      }

      logger.info('DynamoDBPage: Table created successfully', {
        component: 'DynamoDBPage',
        data: { 
          tableName: data.TableName,
          response: responseData
        }
      });

      await loadTables();
      setIsCreateDialogOpen(false);
    } catch (error) {
      logger.error('DynamoDBPage: Exception while creating table', {
        component: 'DynamoDBPage',
        data: {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error',
          requestData: data
        }
      });
      throw error;
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Table Name',
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (table: TableItem) => (
        <div className="flex justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedTable(table.name)}>
            View Items
          </Button>
          <Button variant="outline" size="sm">
            Edit Schema
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">DynamoDB Tables</h1>
      {selectedTable ? (
        <DynamoDBTableView tableName={selectedTable} />
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Table
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={tables}
                columns={columns}
                keyExtractor={(table) => table.name}
                isLoading={loading}
                emptyMessage="No tables found. Create your first table to get started."
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Table Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Monitor table performance and capacity usage</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Backup & Restore</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Manage table backups and point-in-time recovery</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <CreateTableDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateTable}
      />
    </div>
  );
} 