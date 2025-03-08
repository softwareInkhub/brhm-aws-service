import { 
  DynamoDBClient, 
  ListTablesCommand, 
  CreateTableCommand, 
  DeleteTableCommand, 
  DescribeTableCommand,
  ScalarAttributeType,
  KeyType,
  BillingMode,
  AttributeDefinition,
  KeySchemaElement,
  Tag
} from '@aws-sdk/client-dynamodb';
import { AWSService, AWSResponse } from './base';
import { logger } from '@/app/utils/logger';

export interface DynamoDBTableData {
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

export interface DynamoDBResponse<T> {
  data: T;
  requestId: string;
  timestamp: string;
}

export interface DynamoDBError {
  error: string;
  message: string;
  requestId?: string;
  timestamp?: string;
}

export interface DynamoDBItem {
  [key: string]: any;
}

export interface DynamoDBUpdateParams {
  TableName: string;
  Key: { [key: string]: any };
  UpdateExpression: string;
  ExpressionAttributeNames?: { [key: string]: string };
  ExpressionAttributeValues?: { [key: string]: any };
  ConditionExpression?: string;
  ReturnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
}

export class DynamoDBService extends AWSService {
  private client: DynamoDBClient;

  constructor() {
    super('DynamoDB');
    this.client = new DynamoDBClient({
      region: this.region,
      credentials: this.credentials,
    });
  }

  private mapAttributeType(type: 'String' | 'Number' | 'Binary'): ScalarAttributeType {
    switch (type) {
      case 'String': return 'S';
      case 'Number': return 'N';
      case 'Binary': return 'B';
    }
  }

  async listTables(): Promise<AWSResponse<string[]>> {
    this.logOperation('List Tables');
    
    try {
      const command = new ListTablesCommand({});
      const response = await this.client.send(command);
      
      return this.createResponse(
        response.TableNames || [], 
        response.$metadata.requestId!
      );
    } catch (error) {
      throw this.createError(error);
    }
  }

  async createTable(data: DynamoDBTableData): Promise<AWSResponse<string>> {
    this.logOperation('Create Table', { tableName: data.TableName });
    
    try {
      const attributeDefinitions: AttributeDefinition[] = [
        {
          AttributeName: data.PartitionKey.name,
          AttributeType: this.mapAttributeType(data.PartitionKey.type)
        }
      ];

      if (data.SortKey) {
        attributeDefinitions.push({
          AttributeName: data.SortKey.name,
          AttributeType: this.mapAttributeType(data.SortKey.type)
        });
      }

      const keySchema: KeySchemaElement[] = [
        {
          AttributeName: data.PartitionKey.name,
          KeyType: 'HASH'
        }
      ];

      if (data.SortKey) {
        keySchema.push({
          AttributeName: data.SortKey.name,
          KeyType: 'RANGE'
        });
      }

      const command = new CreateTableCommand({
        TableName: data.TableName,
        AttributeDefinitions: attributeDefinitions,
        KeySchema: keySchema,
        BillingMode: data.BillingMode as BillingMode,
        ...(data.BillingMode === 'PROVISIONED' && {
          ProvisionedThroughput: {
            ReadCapacityUnits: data.ProvisionedThroughput!.ReadCapacityUnits,
            WriteCapacityUnits: data.ProvisionedThroughput!.WriteCapacityUnits
          }
        }),
        ...(data.Tags && {
          Tags: data.Tags.map(t => ({ Key: t.Key, Value: t.Value }))
        })
      });

      const response = await this.client.send(command);
      
      return this.createResponse(
        response.TableDescription!.TableName!, 
        response.$metadata.requestId!
      );
    } catch (error) {
      throw this.createError(error);
    }
  }

  async deleteTable(tableName: string): Promise<void> {
    this.logOperation('Delete Table', { tableName });
    
    try {
      const command = new DeleteTableCommand({
        TableName: tableName
      });

      await this.client.send(command);
    } catch (error) {
      throw this.createError(error);
    }
  }

  async describeTable(tableName: string): Promise<AWSResponse<DynamoDBTableData>> {
    this.logOperation('Describe Table', { tableName });
    
    try {
      const command = new DescribeTableCommand({
        TableName: tableName
      });

      const response = await this.client.send(command);
      const table = response.Table!;
      
      const tableData: DynamoDBTableData = {
        TableName: table.TableName!,
        PartitionKey: {
          name: table.KeySchema!.find(k => k.KeyType === 'HASH')!.AttributeName!,
          type: this.reverseMapAttributeType(
            table.AttributeDefinitions!.find(
              a => a.AttributeName === table.KeySchema!.find(k => k.KeyType === 'HASH')!.AttributeName
            )!.AttributeType!
          )
        },
        BillingMode: table.BillingModeSummary?.BillingMode || 'PROVISIONED',
        ProvisionedThroughput: table.ProvisionedThroughput ? {
          ReadCapacityUnits: table.ProvisionedThroughput.ReadCapacityUnits!,
          WriteCapacityUnits: table.ProvisionedThroughput.WriteCapacityUnits!
        } : undefined
      };

      const sortKey = table.KeySchema!.find(k => k.KeyType === 'RANGE');
      if (sortKey) {
        tableData.SortKey = {
          name: sortKey.AttributeName!,
          type: this.reverseMapAttributeType(
            table.AttributeDefinitions!.find(
              a => a.AttributeName === sortKey.AttributeName
            )!.AttributeType!
          )
        };
      }

      return this.createResponse(
        tableData,
        response.$metadata.requestId!
      );
    } catch (error) {
      throw this.createError(error);
    }
  }

  private reverseMapAttributeType(type: ScalarAttributeType): 'String' | 'Number' | 'Binary' {
    switch (type) {
      case 'S': return 'String';
      case 'N': return 'Number';
      case 'B': return 'Binary';
    }
  }

  async getTableItems(tableName: string, limit: number = 20, startKey?: string): Promise<AWSResponse<{
    items: DynamoDBItem[];
    lastEvaluatedKey?: string;
  }>> {
    this.logOperation('Get Table Items', { tableName, limit, startKey });

    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        ...(startKey && { startKey })
      });

      const response = await fetch(`/api/dynamodb/tables/${tableName}/items?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return this.createResponse({
        items: data.items,
        lastEvaluatedKey: data.lastEvaluatedKey
      }, data.requestId);
    } catch (error) {
      throw this.createError(error);
    }
  }

  async createItem(tableName: string, item: DynamoDBItem): Promise<AWSResponse<DynamoDBItem>> {
    this.logOperation('Create Item', { tableName, item });

    try {
      const response = await fetch(`/api/dynamodb/tables/${tableName}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ TableName: tableName, Item: item }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create item');
      }

      const data = await response.json();
      return this.createResponse(data.item, data.requestId);
    } catch (error) {
      throw this.createError(error);
    }
  }

  async updateItem(params: DynamoDBUpdateParams): Promise<AWSResponse<DynamoDBItem>> {
    this.logOperation('Update Item', { 
      tableName: params.TableName,
      key: params.Key,
      updateExpression: params.UpdateExpression
    });

    try {
      const response = await fetch(`/api/dynamodb/tables/${params.TableName}/items/${JSON.stringify(params.Key)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update item');
      }

      const data = await response.json();
      return this.createResponse(data.item, data.requestId);
    } catch (error) {
      throw this.createError(error);
    }
  }

  async deleteItem(tableName: string, key: { [key: string]: any }): Promise<void> {
    this.logOperation('Delete Item', { tableName, key });

    try {
      const response = await fetch(`/api/dynamodb/tables/${tableName}/items/${JSON.stringify(key)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete item');
      }
    } catch (error) {
      throw this.createError(error);
    }
  }
} 