import { 
  LambdaClient, 
  CreateEventSourceMappingCommand,
  CreateFunctionUrlConfigCommand
} from "@aws-sdk/client-lambda";
import { 
  ApiGatewayV2Client, 
  CreateIntegrationCommand
} from "@aws-sdk/client-apigatewayv2";
import {
  DynamoDBIcon,
  KinesisIcon,
  SQSIcon,
  S3Icon,
  EventsIcon,
  ApiGatewayIcon,
  AlexaIcon,
  ALBIcon,
  FunctionUrlIcon
} from './TriggerIcons';

// Initialize AWS clients
const lambdaClient = new LambdaClient({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const apiGatewayClient = new ApiGatewayV2Client({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Interface for trigger creation options
export interface CreateTriggerOptions {
  functionName: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
}

// Function to create a trigger
export async function createTrigger(options: CreateTriggerOptions) {
  const { functionName, triggerType, triggerConfig } = options;
  
  try {
    switch (triggerType) {
      case 'api-gateway':
        return await createApiGatewayTrigger(functionName, triggerConfig);
      case 'alexa':
        return await createAlexaTrigger(functionName, triggerConfig);
      case 'alb':
        return await createAlbTrigger(functionName, triggerConfig);
      case 'dynamodb':
        return await createDynamoDBTrigger(functionName, triggerConfig);
      case 's3':
        return await createS3Trigger(functionName, triggerConfig);
      case 'sqs':
        return await createSQSTrigger(functionName, triggerConfig);
      case 'kinesis':
        return await createKinesisTrigger(functionName, triggerConfig);
      case 'function-url':
        return await createFunctionUrlTrigger(functionName, triggerConfig);
      default:
        throw new Error(`Unsupported trigger type: ${triggerType}`);
    }
  } catch (error) {
    console.error(`Error creating ${triggerType} trigger:`, error);
    throw error;
  }
}

// Helper functions for creating specific trigger types
async function createApiGatewayTrigger(functionName: string, config: Record<string, any>) {
  // In a real implementation, this would create an API Gateway integration
  // For now, we'll return a mock response
  return {
    id: `api-gateway-${Date.now()}`,
    type: 'API Gateway',
    source: config.apiName || 'Mock API Gateway',
    status: 'Active',
    name: 'API Gateway',
    details: `${config.apiName || 'Mock API'} - ${config.method || 'ANY'} ${config.path || '/'}`,
    icon: ApiGatewayIcon
  };
}

async function createAlexaTrigger(functionName: string, config: Record<string, any>) {
  // In a real implementation, this would create an Alexa skill integration
  // For now, we'll return a mock response
  return {
    id: `alexa-${Date.now()}`,
    type: 'Alexa',
    source: config.skillName || 'Mock Alexa Skill',
    status: 'Active',
    name: 'Alexa',
    details: config.skillName || 'Mock Alexa Skill',
    icon: AlexaIcon
  };
}

async function createAlbTrigger(functionName: string, config: Record<string, any>) {
  // In a real implementation, this would create an ALB target group
  // For now, we'll return a mock response
  return {
    id: `alb-${Date.now()}`,
    type: 'Application Load Balancer',
    source: config.targetGroupName || 'Mock ALB Target Group',
    status: 'Active',
    name: 'Application Load Balancer',
    details: config.targetGroupName || 'Mock ALB Target Group',
    icon: ALBIcon
  };
}

async function createDynamoDBTrigger(functionName: string, config: Record<string, any>) {
  // In a real implementation, this would create a DynamoDB event source mapping
  // For now, we'll return a mock response
  return {
    id: `dynamodb-${Date.now()}`,
    type: 'DynamoDB',
    source: config.tableName || 'Mock DynamoDB Table',
    status: 'Active',
    name: 'DynamoDB',
    details: config.tableName || 'Mock DynamoDB Table',
    icon: DynamoDBIcon
  };
}

async function createS3Trigger(functionName: string, config: Record<string, any>) {
  // In a real implementation, this would create an S3 event notification
  // For now, we'll return a mock response
  return {
    id: `s3-${Date.now()}`,
    type: 'S3',
    source: config.bucketName || 'Mock S3 Bucket',
    status: 'Active',
    name: 'S3',
    details: config.bucketName || 'Mock S3 Bucket',
    icon: S3Icon
  };
}

async function createSQSTrigger(functionName: string, config: Record<string, any>) {
  // In a real implementation, this would create an SQS event source mapping
  // For now, we'll return a mock response
  return {
    id: `sqs-${Date.now()}`,
    type: 'SQS',
    source: config.queueName || 'Mock SQS Queue',
    status: 'Active',
    name: 'SQS',
    details: config.queueName || 'Mock SQS Queue',
    icon: SQSIcon
  };
}

async function createKinesisTrigger(functionName: string, config: Record<string, any>) {
  // In a real implementation, this would create a Kinesis event source mapping
  // For now, we'll return a mock response
  return {
    id: `kinesis-${Date.now()}`,
    type: 'Kinesis',
    source: config.streamName || 'Mock Kinesis Stream',
    status: 'Active',
    name: 'Kinesis',
    details: config.streamName || 'Mock Kinesis Stream',
    icon: KinesisIcon
  };
}

async function createFunctionUrlTrigger(functionName: string, config: Record<string, any>) {
  // In a real implementation, this would create a function URL
  // For now, we'll return a mock response
  return {
    id: `function-url-${Date.now()}`,
    type: 'Function URL',
    source: 'Function URL',
    status: 'Active',
    name: 'Function URL',
    details: `https://${functionName}.lambda-url.${process.env.AWS_REGION}.on.aws/`,
    icon: FunctionUrlIcon
  };
} 