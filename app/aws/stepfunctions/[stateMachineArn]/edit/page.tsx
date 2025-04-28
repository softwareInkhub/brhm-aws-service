'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useState, useEffect, useRef } from 'react';
import { getStateMachineDefinition, listSNSTopics, listLambdaFunctions, listSQSQueues, listDynamoDBTables, listS3Buckets } from '@/app/actions/stepfunctions';
import { MinusIcon, PlusIcon, XMarkIcon, DocumentDuplicateIcon, TrashIcon } from '@heroicons/react/24/outline';
import { LambdaIcon, SNSIcon } from '../../../../components/icons';
import { useToast } from "@/app/components/ui/use-toast"

interface Position {
  x: number;
  y: number;
}

interface NodeConfiguration {
  // Common fields
  comment?: string;
  resultPath?: string;
  inputPath?: string;
  outputPath?: string;
  
  // Pass state
  result?: any;
  
  // Task state (Lambda, SNS, etc.)
  resourceArn?: string;
  parameters?: Record<string, any>;
  timeoutSeconds?: number;
  heartbeatSeconds?: number;
  retry?: Array<{
    errorEquals: string[];
    intervalSeconds?: number;
    maxAttempts?: number;
    backoffRate?: number;
  }>;
  catch?: Array<{
    errorEquals: string[];
    next: string;
  }>;
  
  // Wait state
  seconds?: number;
  timestamp?: string;
  timestampPath?: string;
  secondsPath?: string;
  
  // Choice state
  choices?: Array<{
    Variable: string;  // Changed to match AWS Step Functions schema
    StringEquals?: string;
    StringLessThan?: string;
    StringGreaterThan?: string;
    StringLessThanEquals?: string;
    StringGreaterThanEquals?: string;
    NumericEquals?: number;
    NumericLessThan?: number;
    NumericGreaterThan?: number;
    BooleanEquals?: boolean;
    TimestampEquals?: string;
    TimestampLessThan?: string;
    TimestampGreaterThan?: string;
    Next: string;
  }>;
  default?: string;
  
  // Map state
  itemsPath?: string;
  maxConcurrency?: number;
  iterator?: StateMachineDefinition;
  
  // Parallel state
  branches?: StateMachineDefinition[];
  
  // Service-specific
  topicArn?: string;
  message?: string;
  messageType?: 'json' | 'string';
  queueUrl?: string;
  tableName?: string;
  bucketName?: string;
  key?: string;

  // Fail state
  error?: string;
  cause?: string;

  // Glacier-specific
  vaultName?: string;
  archiveId?: string;
  description?: string;
  jobParameters?: {
    Type?: 'archive-retrieval' | 'inventory-retrieval';
    Tier?: 'Expedited' | 'Standard' | 'Bulk';
    Description?: string;
    ArchiveId?: string;
    SNSTopic?: string;
    RetrievalByteRange?: string;
  };
  uploadId?: string;
  range?: string;
  limit?: number;
  marker?: string;
  policy?: Record<string, any>;
  lockId?: string;
  payloadType?: 'state_input' | 'custom' | 'no_payload';
  customPayload?: string;
  url?: string;
  method?: string;
  headers?: string;
  body?: string;
  query?: string;
  connectionArn?: string;
  namespaceId?: string; // custom field for later config

  // Namespace-specific
  methodId?: string;
  accountId?: string;
}

interface WorkflowNode {
  id: string;
  type: string;
  position: Position;
  title: string;
  description: string;
  nextNodeId?: string;
  configuration: NodeConfiguration;
  input: string;
  variables: { [key: string]: string };
}

interface Connection {
  from: string;
  to: string;
  isHovered?: boolean;
  isDefault?: boolean;
}

interface DropZone {
  id: string;
  position: Position;
  beforeNodeId: string;
  afterNodeId: string;
}

interface BaseState {
  Type: string;
  Next?: string;
  End?: boolean;
  Comment?: string;
  ResultPath?: string;
  InputPath?: string;
  OutputPath?: string;
}

interface TaskState extends BaseState {
  Type: 'Task';
  Resource: string;
  Parameters?: any;
  ResultPath?: string;
  InputPath?: string;
  OutputPath?: string;
}

interface ParallelState extends BaseState {
  Type: 'Parallel';
  Branches: StateMachineDefinition[];
}

interface ChoiceRule {
  Variable: string;  // Changed from 'variable' to 'Variable' to match AWS Step Functions schema
  StringEquals?: string;
  StringLessThan?: string;
  StringGreaterThan?: string;
  StringLessThanEquals?: string;
  StringGreaterThanEquals?: string;
  NumericEquals?: number;
  NumericLessThan?: number;
  NumericGreaterThan?: number;
  BooleanEquals?: boolean;
  TimestampEquals?: string;
  TimestampLessThan?: string;
  TimestampGreaterThan?: string;
  Next: string;
}

interface ChoiceState extends BaseState {
  Type: 'Choice';
  Choices: ChoiceRule[];
  Default?: string;
}

interface WaitState extends BaseState {
  Type: 'Wait';
  Seconds?: number;
  Timestamp?: string;
  SecondsPath?: string;
  TimestampPath?: string;
}

interface SucceedState extends BaseState {
  Type: 'Succeed';
}

interface FailState extends BaseState {
  Type: 'Fail';
  Error?: string;
  Cause?: string;
}

interface PassState extends BaseState {
  Type: 'Pass';
  Result?: any;
  ResultPath?: string;
}

interface MapState extends BaseState {
  Type: 'Map';
  ItemsPath?: string;
  MaxConcurrency?: number;
  Iterator: StateMachineDefinition;
}

type State = TaskState | ParallelState | ChoiceState | WaitState | SucceedState | FailState | PassState | MapState;

interface StateMachineDefinition {
  Comment?: string;
  StartAt: string;
  States: {
    [key: string]: State;
  };
}

interface ServiceAction {
  id: string;
  title: string;
  description: string;
  actions?: ServiceAction[];
}

interface Service {
  type: string;
  title: string;
  description: string;
  icon: React.ReactElement;
  bgColor: string;
  textColor: string;
  category: string;
  actions?: ServiceAction[];
}

// Add this interface before SERVICE_STYLES
interface ServiceStyle {
  bgColor: string;
  iconColor: string;
  icon: React.ReactElement;
}

interface ServiceStyles {
  [key: string]: ServiceStyle;
}

const services: Service[] = [
  {
    type: 'namespace',
    title: 'Namespace',
    description: 'Manage API namespaces',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="7" width="18" height="10" rx="2" fill="currentColor" className="text-teal-200" />
        <path d="M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-700',
    category: 'namespace',
    actions: [
      {
        id: 'namespace',
        title: 'Namespace',
        description: 'Drag to manage a namespace',
        actions: []
      }
    ]
  },
  {
    type: 'storage',
    title: 'Storage',
    description: 'AWS Storage Services',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zm-3-3H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V6h8v2z"/>
      </svg>
    ),
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    category: 'storage',
    actions: [
      {
        id: 's3',
        title: 'Amazon S3',
        description: 'Object storage service',
        actions: [
          { id: 's3-putobject', title: 'PutObject', description: 'Upload an object to S3' },
          { id: 's3-getobject', title: 'GetObject', description: 'Retrieve an object from S3' },
          { id: 's3-deleteobject', title: 'DeleteObject', description: 'Delete an object from S3' },
          { id: 's3-listobjects', title: 'ListObjects', description: 'List objects in a bucket' },
          { id: 's3-copyobject', title: 'CopyObject', description: 'Copy an object in S3' },
          { id: 's3-createbucket', title: 'CreateBucket', description: 'Create a new S3 bucket' },
          { id: 's3-deletebucket', title: 'DeleteBucket', description: 'Delete an S3 bucket' },
          { id: 's3-headobject', title: 'HeadObject', description: 'Retrieve object metadata' },
          { id: 's3-multipartupload', title: 'CreateMultipartUpload', description: 'Initiate multipart upload' },
          { id: 's3-presignedurl', title: 'GetPresignedUrl', description: 'Generate pre-signed URL' }
        ]
      },
      {
        id: 's3-glacier',
        title: 'Amazon S3 Glacier',
        description: 'Long-term archival storage',
        actions: [
          { id: 'glacier-vault', title: 'CreateVault', description: 'Create a new vault' },
          { id: 'glacier-delete-vault', title: 'DeleteVault', description: 'Delete a vault' },
          { id: 'glacier-upload', title: 'UploadArchive', description: 'Upload an archive to a vault' },
          { id: 'glacier-delete-archive', title: 'DeleteArchive', description: 'Delete an archive from a vault' },
          { id: 'glacier-initiate-job', title: 'InitiateJob', description: 'Start a job like archive retrieval' },
          { id: 'glacier-describe-job', title: 'DescribeJob', description: 'Get information about a job' },
          { id: 'glacier-get-job-output', title: 'GetJobOutput', description: 'Get the output of a job' },
          { id: 'glacier-set-vault-notifications', title: 'SetVaultNotifications', description: 'Configure vault notifications' },
          { id: 'glacier-get-vault-notifications', title: 'GetVaultNotifications', description: 'Get vault notification configuration' },
          { id: 'glacier-delete-vault-notifications', title: 'DeleteVaultNotifications', description: 'Delete vault notifications' },
          { id: 'glacier-add-tags', title: 'AddTagsToVault', description: 'Add tags to a vault' },
          { id: 'glacier-remove-tags', title: 'RemoveTagsFromVault', description: 'Remove tags from a vault' },
          { id: 'glacier-list-tags', title: 'ListTagsForVault', description: 'List tags for a vault' },
          { id: 'glacier-list-vaults', title: 'ListVaults', description: 'List all vaults' },
          { id: 'glacier-list-parts', title: 'ListParts', description: 'List parts of a multipart upload' },
          { id: 'glacier-list-multipart', title: 'ListMultipartUploads', description: 'List all multipart uploads' },
          { id: 'glacier-initiate-multipart', title: 'InitiateMultipartUpload', description: 'Start a multipart upload' },
          { id: 'glacier-upload-part', title: 'UploadMultipartPart', description: 'Upload a part of multipart upload' },
          { id: 'glacier-complete-multipart', title: 'CompleteMultipartUpload', description: 'Complete a multipart upload' },
          { id: 'glacier-abort-multipart', title: 'AbortMultipartUpload', description: 'Abort a multipart upload' },
          { id: 'glacier-get-vault-access', title: 'GetVaultAccessPolicy', description: 'Get vault access policy' },
          { id: 'glacier-set-vault-access', title: 'SetVaultAccessPolicy', description: 'Set vault access policy' },
          { id: 'glacier-delete-vault-access', title: 'DeleteVaultAccessPolicy', description: 'Delete vault access policy' },
          { id: 'glacier-get-vault-lock', title: 'GetVaultLock', description: 'Get vault lock policy' },
          { id: 'glacier-initiate-vault-lock', title: 'InitiateVaultLock', description: 'Start vault lock process' },
          { id: 'glacier-complete-vault-lock', title: 'CompleteVaultLock', description: 'Complete vault lock process' },
          { id: 'glacier-abort-vault-lock', title: 'AbortVaultLock', description: 'Abort vault lock process' }
        ]
      }
    ]
  },
  {
    type: 'compute',
    title: 'Compute',
    description: 'AWS Compute Services',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 13v8H3v-8h18zm0-2H3V3h18v8zm-2 4H5v4h14v-4zm0-10H5v4h14V5z"/>
      </svg>
    ),
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    category: 'compute',
    actions: [
      {
        id: 'lambda',
        title: 'AWS Lambda',
        description: 'Serverless compute',
        actions: [
          { id: 'lambda-invoke', title: 'Invoke', description: 'Invoke a Lambda function' },
          { id: 'lambda-async', title: 'InvokeAsync', description: 'Asynchronous invocation' },
          { id: 'lambda-create', title: 'CreateFunction', description: 'Create Lambda function' },
          { id: 'lambda-update', title: 'UpdateFunctionCode', description: 'Update function code' },
          { id: 'lambda-config', title: 'UpdateFunctionConfiguration', description: 'Update configuration' },
          { id: 'lambda-delete', title: 'DeleteFunction', description: 'Delete Lambda function' },
          { id: 'lambda-layer', title: 'PublishLayerVersion', description: 'Publish Lambda layer' },
          { id: 'lambda-alias', title: 'CreateAlias', description: 'Create function alias' },
          { id: 'lambda-permission', title: 'AddPermission', description: 'Add invoke permission' }
        ]
      }
    ]
  },
  {
    type: 'database',
    title: 'Database',
    description: 'AWS Database Services',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 4.48 2 7.5v9C2 19.52 6.48 22 12 22s10-2.48 10-5.5v-9C22 4.48 17.52 2 12 2zm0 18c-4.42 0-8-1.79-8-4v-1.17c1.39 1.29 4.27 2.17 8 2.17s6.61-.88 8-2.17V16c0 2.21-3.58 4-8 4zm0-6c-4.42 0-8-1.79-8-4v-1.17c1.39 1.29 4.27 2.17 8 2.17s6.61-.88 8-2.17V10c0 2.21-3.58 4-8 4zm0-6c-4.42 0-8-1.79-8-4s3.58-4 8-4 8 1.79 8 4-3.58 4-8 4z"/>
      </svg>
    ),
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    category: 'database',
    actions: [
      {
        id: 'dynamodb',
        title: 'Amazon DynamoDB',
        description: 'NoSQL database service',
        actions: [
          { id: 'dynamodb-putitem', title: 'PutItem', description: 'Add an item to a table' },
          { id: 'dynamodb-getitem', title: 'GetItem', description: 'Get an item from a table' },
          { id: 'dynamodb-query', title: 'Query', description: 'Query items in a table' },
          { id: 'dynamodb-scan', title: 'Scan', description: 'Scan items in a table' },
          { id: 'dynamodb-updateitem', title: 'UpdateItem', description: 'Update an item' },
          { id: 'dynamodb-deleteitem', title: 'DeleteItem', description: 'Delete an item' },
          { id: 'dynamodb-batchwrite', title: 'BatchWriteItem', description: 'Write multiple items' },
          { id: 'dynamodb-batchget', title: 'BatchGetItem', description: 'Get multiple items' }
        ]
      }
    ]
  },
  {
    type: 'messaging',
    title: 'Messaging',
    description: 'AWS Messaging Services',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
      </svg>
    ),
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    category: 'messaging',
    actions: [
      {
        id: 'sns',
        title: 'Amazon SNS',
        description: 'Pub/sub messaging',
        actions: [
          { id: 'sns-publish', title: 'Publish', description: 'Publish a message' },
          { id: 'sns-createtopic', title: 'CreateTopic', description: 'Create new topic' },
          { id: 'sns-deletetopic', title: 'DeleteTopic', description: 'Delete a topic' },
          { id: 'sns-subscribe', title: 'Subscribe', description: 'Subscribe to a topic' },
          { id: 'sns-unsubscribe', title: 'Unsubscribe', description: 'Unsubscribe from topic' },
          { id: 'sns-setattributes', title: 'SetTopicAttributes', description: 'Set topic attributes' }
        ]
      },
      {
        id: 'sqs',
        title: 'Amazon SQS',
        description: 'Message queuing',
        actions: [
          { id: 'sqs-sendmessage', title: 'SendMessage', description: 'Send a message' },
          { id: 'sqs-receivemessage', title: 'ReceiveMessage', description: 'Receive messages' },
          { id: 'sqs-deletemessage', title: 'DeleteMessage', description: 'Delete a message' },
          { id: 'sqs-purgequeue', title: 'PurgeQueue', description: 'Purge queue messages' },
          { id: 'sqs-createqueue', title: 'CreateQueue', description: 'Create new queue' },
          { id: 'sqs-deletequeue', title: 'DeleteQueue', description: 'Delete a queue' }
        ]
      }
    ]
  },
  {
    type: 'ai',
    title: 'AI/ML',
    description: 'AWS AI and Machine Learning',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm1-11h-2v3H8v2h3v3h2v-3h3v-2h-3V8z"/>
      </svg>
    ),
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    category: 'ai',
    actions: [
      {
        id: 'comprehend',
        title: 'Amazon Comprehend',
        description: 'Natural language processing',
        actions: [
          { id: 'comprehend-detect', title: 'DetectSentiment', description: 'Analyze sentiment' },
          { id: 'comprehend-entities', title: 'DetectEntities', description: 'Extract entities' },
          { id: 'comprehend-keyphrase', title: 'DetectKeyPhrases', description: 'Find key phrases' },
          { id: 'comprehend-syntax', title: 'DetectSyntax', description: 'Analyze syntax' }
        ]
      },
      {
        id: 'rekognition',
        title: 'Amazon Rekognition',
        description: 'Image and video analysis',
        actions: [
          { id: 'rekognition-labels', title: 'DetectLabels', description: 'Detect image labels' },
          { id: 'rekognition-faces', title: 'DetectFaces', description: 'Detect faces' },
          { id: 'rekognition-text', title: 'DetectText', description: 'Extract text from images' },
          { id: 'rekognition-celebs', title: 'RecognizeCelebrities', description: 'Identify celebrities' }
        ]
      }
    ]
  },
  {
    type: 'http',
    title: 'HTTP',
    description: 'Call HTTP/HTTPS endpoints',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="7" width="18" height="10" rx="2" fill="currentColor" className="text-blue-200" />
        <rect x="7" y="11" width="10" height="2" rx="1" fill="currentColor" className="text-blue-600" />
      </svg>
    ),
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    category: 'http',
    actions: [
      {
        id: 'http',
        title: 'HTTP Request',
        description: 'Call any HTTP/HTTPS endpoint',
        actions: [
          { id: 'http-get', title: 'GET', description: 'HTTP GET request' },
          { id: 'http-post', title: 'POST', description: 'HTTP POST request' },
          { id: 'http-put', title: 'PUT', description: 'HTTP PUT request' },
          { id: 'http-delete', title: 'DELETE', description: 'HTTP DELETE request' }
        ]
      }
    ]
  }
];

const GRID_SIZE = 20;
const NODE_HEIGHT = 60;
const NODE_WIDTH = 200;
const VERTICAL_SPACING = 100;
const INITIAL_X = 400;
const INITIAL_Y = 100;
const HORIZONTAL_SPACING = 250;
const CHOICE_EXTRA_SPACING = 100; // Extra space needed for choice paths

interface NodePosition {
  x: number;
  y: number;
  level: number;
}

function calculateNodePositions(definition: StateMachineDefinition): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  let currentY = INITIAL_Y;

  // Start node
  positions.set('start', {
    x: INITIAL_X,
    y: currentY,
    level: 0
  });
  currentY += VERTICAL_SPACING;

  // Process states in sequence
  let currentState = definition.StartAt;
  let level = 1;
  const processedStates = new Set<string>();

  while (currentState && !processedStates.has(currentState)) {
    const state = definition.States[currentState];
    processedStates.add(currentState);

    positions.set(currentState, {
      x: INITIAL_X,
      y: currentY,
      level
    });

    currentY += VERTICAL_SPACING;
    level += 1;

    if (state.End) {
      break;
    }
    currentState = state.Next || '';
  }

  // End node
  positions.set('end', {
    x: INITIAL_X,
    y: currentY,
    level
  });

  return positions;
}

const generateUniqueId = (type: string, existingNodes: WorkflowNode[]): string => {
  const baseId = `${type}-${Date.now()}`;
  let counter = 1;
  let uniqueId = baseId;

  while (existingNodes.some(node => node.id === uniqueId)) {
    uniqueId = `${baseId}-${counter}`;
    counter++;
  }

  return uniqueId;
};

function isValidState(state: any): state is State {
  return state && typeof state.Type === 'string';
}

function isValidDefinition(def: any): def is StateMachineDefinition {
  return def && 
    typeof def.StartAt === 'string' && 
    def.StartAt !== '' && 
    typeof def.States === 'object' &&
    Object.keys(def.States).length > 0;
}

function ensureString(value: string | undefined): string {
  if (typeof value !== 'string' || value === '') {
    throw new Error('Invalid string value');
  }
  return value;
}

interface ResourceOptions {
  snsTopics: string[];
  lambdaFunctions: { 
    arn: string; 
    name: string;
    runtime?: string;  // Added runtime as optional property
  }[];
  sqsQueues: string[];
  dynamodbTables: string[];
  s3Buckets: string[];
}

// Update the SERVICE_STYLES constant
const SERVICE_STYLES: ServiceStyles = {
  lambda: {
    bgColor: 'bg-orange-500',
    iconColor: 'text-white',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6l-8 4.5v6l8 4.5 8-4.5v-6L12 6zm0 9l-4-2.25v-3l4 2.25 4-2.25v3l-4 2.25z" />
      </svg>
    )
  },
  pass: {
    bgColor: 'bg-blue-500',
    iconColor: 'text-white',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  }
};

// Add these flow state definitions at the top of the file
const flowStates = [
  {
    id: 'choice',
    title: 'Choice',
    description: 'Adds if-then-else logic.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
    ),
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'parallel',
    title: 'Parallel',
    description: 'Adds separate branches.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4-4m-4 4l4 4" />
      </svg>
    ),
    color: 'bg-purple-100 text-purple-600'
  },
  {
    id: 'map',
    title: 'Map',
    description: 'Runs parallel workflows for each item in a dataset.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
      </svg>
    ),
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 'pass',
    title: 'Pass',
    description: 'Transforms data or acts as placeholder.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'wait',
    title: 'Wait',
    description: 'Delays for a specified time.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-yellow-100 text-yellow-600'
  },
  {
    id: 'success',
    title: 'Success',
    description: 'Stops and marks as success.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 'fail',
    title: 'Fail',
    description: 'Stops and marks as failure.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    color: 'bg-red-100 text-red-600'
  }
];

const patterns = [
  {
    id: 'retry',
    title: 'Retry',
    description: 'Retry a state on error',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    color: 'bg-orange-100 text-orange-600'
  },
  {
    id: 'catch',
    title: 'Catch',
    description: 'Handle errors in a state',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: 'bg-yellow-100 text-yellow-600'
  },
  {
    id: 'wait-for-callback',
    title: 'Wait for Callback',
    description: 'Pause workflow execution',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    color: 'bg-purple-100 text-purple-600'
  }
];

// Add this interface for Choice state drop zones
interface ChoiceDropZone {
  id: string;
  position: Position;
  choiceNodeId: string;
  type: 'rule' | 'default';
}

// Namespace API fetch
interface Namespace {
  'namespace-name': string;
  'namespace-url': string;
  tags: string[];
}

// Add this type for the flattened namespace
interface FlatNamespace {
  id: string;
  name: string;
  url: string;
  tags: string[];
  raw: any;
}

// Add these interfaces at the top of the file, after the existing interfaces
interface Account {
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-account-header': Array<{ key: string; value: string }>;
  'namespace-account-url-override'?: string;
  'variables': Array<{ key: string; value: string }>;
  'tags': string[];
}

interface Method {
  'namespace-method-id': string;
  'namespace-method-name': string;
  'namespace-method-type': string;
  'namespace-method-url-override'?: string;
  'namespace-method-queryParams': Array<{ key: string; value: string }>;
  'namespace-method-header': Array<{ key: string; value: string }>;
  'save-data': boolean;
  'isInitialized': boolean;
  'tags': string[];
}

export default function WorkflowDesignerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const stateMachineArn = decodeURIComponent(params.stateMachineArn as string);
  const [stateMachineName, setStateMachineName] = useState('');
  const [comment, setComment] = useState('');
  const [machineType, setMachineType] = useState('standard');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dropZones, setDropZones] = useState<DropZone[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [activeDropZone, setActiveDropZone] = useState<DropZone | null>(null);
  const [dragPosition, setDragPosition] = useState<Position | null>(null);
  const [definition, setDefinition] = useState<StateMachineDefinition | null>({
    Comment: "A simple state machine",
    StartAt: "AddLayerVersionPermission",
    States: {
      "AddLayerVersionPermission": {
        Type: "Task",
        Parameters: {
          Action: "MyData",
          LayerName: "MyData",
          Principal: "MyData",
          StatementId: "MyData",
          VersionNumber: 1234
        },
        Resource: "arn:aws:states::aws-sdk:lambda:addLayerVersionPermission",
        Next: "FirstState"
      },
      "FirstState": {
        Type: "Pass",
        Result: {
          message: "Hello from Step Functions!"
        },
        Next: "AddPermission"
      },
      "AddPermission": {
        Type: "Task",
        Parameters: {
          Action: "MyData",
          FunctionName: "MyData",
          Principal: "MyData",
          StatementId: "MyData"
        },
        Resource: "arn:aws:states::aws-sdk:lambda:addPermission",
        Next: "CreateAccessGrant"
      },
      "CreateAccessGrant": {
        Type: "Task",
        Resource: "arn:aws:states::aws-sdk:s3:createAccessGrant",
        End: true
      }
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [resourceOptions, setResourceOptions] = useState<ResourceOptions>({
    snsTopics: [],
    lambdaFunctions: [],
    sqsQueues: [],
    dynamodbTables: [],
    s3Buckets: []
  });
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [isCodeView, setIsCodeView] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Add state for active tab
  const [activeTab, setActiveTab] = useState<'design' | 'code'>('design');

  // Add to the component state
  const [choiceDropZones, setChoiceDropZones] = useState<ChoiceDropZone[]>([]);

  // Add zoom state management
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const graphRef = useRef<HTMLDivElement>(null);
  const ZOOM_STEP = 0.1;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;

  const [isTestStateModalOpen, setIsTestStateModalOpen] = useState(false);
  const [testStateInput, setTestStateInput] = useState('{\n  "key": "value"\n}');
  const [testStateOutput, setTestStateOutput] = useState('');
  const [testStateError, setTestStateError] = useState('');

  const [executionRole, setExecutionRole] = useState('monty-step-function');
  const [inspectionLevel, setInspectionLevel] = useState('INFO');

  // Namespace state
  const [namespaceList, setNamespaceList] = useState<FlatNamespace[]>([]);
  const [isNamespaceLoading, setIsNamespaceLoading] = useState(false);

  // Add these state declarations at the top level of the component
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);

  // Add this effect at the top level
  useEffect(() => {
    if (selectedNode?.type === 'namespace' && selectedNode.configuration.namespaceId) {
      fetch(`http://34.199.78.49:5000/api/namespaces/${selectedNode.configuration.namespaceId}/accounts`)
        .then(res => res.json())
        .then(data => {
          setAccounts(data);
          if (data.length > 0) {
            setSelectedAccount(data[0]);
            selectedNode.configuration.accountId = data[0]['namespace-account-id'];
          }
        });

      fetch(`http://34.199.78.49:5000/api/namespaces/${selectedNode.configuration.namespaceId}/methods`)
        .then(res => res.json())
        .then(data => {
          setMethods(data);
          if (data.length > 0) {
            setSelectedMethod(data[0]);
            selectedNode.configuration.methodId = data[0]['namespace-method-id'];
            selectedNode.configuration.method = data[0]['namespace-method-type']; // Set HTTP method (GET, POST, etc.)
          }
        });
    }
  }, [selectedNode?.configuration.namespaceId]);

  // Fetch namespaces when Namespace service is expanded
  useEffect(() => {
    if (expandedServices.has('namespace') && namespaceList.length === 0 && !isNamespaceLoading) {
      setIsNamespaceLoading(true);
      fetch('http://34.199.78.49:5000/api/namespaces')
        .then(res => res.json())
        .then(data => {
          console.log('Fetched namespaces response:', data);
          // Transform DynamoDB-style objects to flat JSON
          const flatNamespaces = (Array.isArray(data) ? data : []).map(ns => {
            const d = ns.data || {};
            return {
              id: ns.id,
              name: d['namespace-name']?.S || '',
              url: d['namespace-url']?.S || '',
              tags: Array.isArray(d.tags?.L) ? d.tags.L.map((t: any) => t.S) : [],
              raw: ns
            };
          });
          console.log('Transformed flat namespaces:', flatNamespaces);
          setNamespaceList(flatNamespaces);
        })
        .catch((err) => {
          console.error('Error fetching namespaces:', err);
          setNamespaceList([]);
        })
        .finally(() => setIsNamespaceLoading(false));
    }
  }, [expandedServices, namespaceList.length, isNamespaceLoading]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleCenter = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Function to render the code view
  const renderCodeView = () => {
    const currentDefinition = generateStateMachineDefinition();
    return (
      <div className="flex h-full w-full">
        {/* Left side - JSON code */}
        <div className="w-full border-r">
          <div className="h-full flex flex-col">
            <div className="border-b p-2 flex items-center gap-2">
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Format
              </Button>
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="bg-gray-50 p-4 rounded-lg h-full">
                <code className="text-sm">
                  {JSON.stringify(currentDefinition, null, 2)}
                </code>
              </pre>
            </div>
          </div>
        </div>

        {/* Right side - Graph visualization */}
      
      </div>
    );
  };

  // Function to render the design view
  const renderDesignView = () => {
    if (isLoading) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    return (
      <div 
        className="flex-1 bg-gray-50 relative overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
        }}
      >
        <div className="absolute top-4 left-4 flex gap-2 z-50">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleZoomIn}
            className="bg-white"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Zoom in
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleZoomOut}
            className="bg-white"
          >
            <MinusIcon className="w-4 h-4 mr-2" />
            Zoom out
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCenter}
            className="bg-white"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 3v18" />
            </svg>
            Center
          </Button>
        </div>

        <div 
          ref={graphRef}
          className="h-full w-full relative"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: 'center',
            transition: 'transform 0.2s ease-out'
          }}
        >
          {/* Keep existing SVG definitions */}
          <svg width="0" height="0">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#d1d5db" />
              </marker>
              <marker
                id="arrowhead-highlighted"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
              </marker>
            </defs>
          </svg>

          {nodes.map((node) => {
            if (node.type === 'start' || node.type === 'end') {
              return (
                <div
                  key={node.id}
                  className="absolute flex items-center justify-center w-20 h-20"
                  style={{
                    left: `${node.position.x}px`,
                    top: `${node.position.y}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-medium text-gray-700">
                    {node.title}
                  </div>
                </div>
              );
            }

            const serviceStyle = SERVICE_STYLES[node.type.toLowerCase()] || {
              bgColor: 'bg-gray-100',
              iconColor: 'text-gray-600',
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )
            };

            const isSelected = selectedNode?.id === node.id;

            return (
              <div
                key={node.id}
                className={`absolute transition-all duration-150 cursor-pointer ${
                  isSelected ? 'ring-2 ring-blue-500' : hoveredNode === node.id ? 'ring-1 ring-blue-300' : ''
                }`}
                style={{
                  left: `${node.position.x}px`,
                  top: `${node.position.y}px`,
                  width: `${NODE_WIDTH}px`,
                  height: `${NODE_HEIGHT}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="flex h-full bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className={`flex items-center justify-center ${serviceStyle.bgColor} w-14 ${serviceStyle.iconColor}`}>
                    {serviceStyle.icon}
                  </div>
                  <div className="flex-1 flex items-center p-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{node.title}</div>
                      <div className="text-sm text-gray-500 truncate">
                        {node.type === 'lambda' ? 'Lambda: ' : ''}{node.description}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {renderConnections()}

          {/* Keep existing choice drop zones */}
          {choiceDropZones.map((zone) => (
            <div
              key={zone.id}
              className={`absolute w-48 h-12 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed 
                ${isDragging ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}
                rounded-lg flex items-center justify-center`}
              style={{
                left: zone.position.x,
                top: zone.position.y
              }}
            >
              <span className="text-sm text-gray-500">
                Drop state here
              </span>
            </div>
          ))}

          {nodes.length === 0 && !isDragging && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p>No state machine definition found</p>
                <p className="text-sm">Start by dragging actions from the left panel</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const fetchStateMachine = async () => {
      try {
        setIsLoading(true);
        const response = await getStateMachineDefinition(stateMachineArn);
        const parsedDefinition = JSON.parse(response.definition);
        
        if (!isValidDefinition(parsedDefinition)) {
          throw new Error('Invalid state machine definition');
        }

        const definition = parsedDefinition;
        setDefinition(definition);
        setStateMachineName(response.name);
        setComment(definition.Comment || '');
        
        // Calculate node positions
        const nodePositions = calculateNodePositions(definition);
        
        // Convert state machine definition to nodes and connections
        const newNodes: WorkflowNode[] = [];
        const newConnections: Connection[] = [];

        // Add start node
        const startPosition = nodePositions.get('start');
        newNodes.push({
          id: 'start',
          type: 'start',
          position: {
            x: startPosition?.x ?? INITIAL_X,
            y: startPosition?.y ?? INITIAL_Y
          },
          title: 'Start',
          description: '',
          configuration: {
            resultPath: '',
            inputPath: '',
            outputPath: ''
          },
          input: '',
          variables: {}
        });

        // Add connection from start to first state
        const firstState = ensureString(definition.StartAt);
        newConnections.push({
          from: 'start',
          to: firstState
        });

        // Process all states in sequence
        let currentState = firstState;
        const processedStates = new Set<string>();

        while (currentState && !processedStates.has(currentState)) {
          const state = definition.States[currentState];
          if (!isValidState(state)) continue;
          
          processedStates.add(currentState);

          const position = nodePositions.get(currentState);
          if (!position) continue;

          const stateType = state.Type.toLowerCase();
          let serviceType = stateType;
          let configuration: NodeConfiguration = {
            resultPath: state.ResultPath || '',
            inputPath: state.InputPath || '',
            outputPath: state.OutputPath || '',
            comment: state.Comment || ''
          };

          // Determine service type and configuration based on state type
          if (state.Type === 'Task') {
            const taskState = state as TaskState;
            const resource = taskState.Resource || '';
            
            // HTTP integration fix
            if (resource === 'arn:aws:states:::http:invoke') {
              serviceType = 'http';
              configuration.url = taskState.Parameters?.ApiEndpoint || '';
              configuration.method = taskState.Parameters?.Method || 'GET';
              configuration.headers = taskState.Parameters?.Headers ? JSON.stringify(taskState.Parameters.Headers) : '';
              configuration.body = taskState.Parameters?.RequestBody ? JSON.stringify(taskState.Parameters.RequestBody) : '';
              configuration.query = taskState.Parameters?.QueryParameters ? JSON.stringify(taskState.Parameters.QueryParameters) : '';
              configuration.connectionArn = taskState.Parameters?.InvocationConfig?.ConnectionArn || '';
            } else if (resource.includes('lambda')) {
              serviceType = 'lambda';
              configuration.resourceArn = taskState.Parameters?.FunctionName || '';
            } else if (resource.includes('sns')) {
              serviceType = 'sns';
              configuration.topicArn = taskState.Parameters?.TopicArn || '';
              configuration.message = taskState.Parameters?.Message || '';
            } else if (resource.includes('sqs')) {
              serviceType = 'sqs';
              configuration.queueUrl = taskState.Parameters?.QueueUrl || '';
            } else if (resource.includes('dynamodb')) {
              serviceType = 'dynamodb';
              configuration.tableName = taskState.Parameters?.TableName || '';
              configuration.parameters = taskState.Parameters?.Item || {};
            } else if (resource.includes('s3')) {
              serviceType = 's3';
              configuration.bucketName = taskState.Parameters?.Bucket || '';
              configuration.key = taskState.Parameters?.Key || '';
              configuration.parameters = {
                Body: taskState.Parameters?.Body || {}
              };
            }
          } else if (state.Type === 'Choice') {
            configuration.choices = (state as ChoiceState).Choices?.map(choice => ({
              Variable: choice.Variable,
              StringEquals: choice.StringEquals,
              StringLessThan: choice.StringLessThan,
              StringGreaterThan: choice.StringGreaterThan,
              Next: choice.Next
            })) || [];
            configuration.default = (state as ChoiceState).Default;
          } else if (state.Type === 'Wait') {
            configuration.seconds = (state as WaitState).Seconds || 0;
          } else if (state.Type === 'Pass') {
            configuration.result = (state as PassState).Result;
          } else if (state.Type === 'Fail') {
            configuration.error = (state as FailState).Error;
            configuration.cause = (state as FailState).Cause;
          }

          newNodes.push({
            id: currentState,
            type: serviceType,
            position: {
              x: INITIAL_X,
              y: position.y
            },
            title: currentState,
            description: state.Type,
            configuration,
            input: '',
            variables: {}
          });

          // Add connection to next state
          if (state.Next) {
            newConnections.push({
              from: currentState,
              to: ensureString(state.Next)
            });
          } else if (state.End) {
            newConnections.push({
              from: currentState,
              to: 'end'
            });
          }

          if (state.End) {
            break;
          }
          currentState = state.Next ? ensureString(state.Next) : '';
        }

        // Add end node
        const lastState = Array.from(processedStates).pop() || '';
        const lastPosition = lastState ? nodePositions.get(lastState) : null;
        const endY = lastPosition ? lastPosition.y + VERTICAL_SPACING : INITIAL_Y + VERTICAL_SPACING;
        
        newNodes.push({
          id: 'end',
          type: 'end',
          position: {
            x: INITIAL_X,
            y: endY
          },
          title: 'End',
          description: '',
          configuration: {
            resultPath: '',
            inputPath: '',
            outputPath: ''
          },
          input: '',
          variables: {}
        });

        setNodes(newNodes);
        setConnections(newConnections);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading state machine:', error);
        setIsLoading(false);
      }
    };

    if (stateMachineArn) {
    fetchStateMachine();
    }
  }, [stateMachineArn]);

  // Add this function to calculate choice drop zones
  const calculateChoiceDropZones = (nodes: WorkflowNode[]) => {
    const choiceNodes = nodes.filter(node => node.type === 'choice');
    const dropZones: ChoiceDropZone[] = [];

    choiceNodes.forEach(node => {
      // Left rule drop zone (positioned to the left and below)
      dropZones.push({
        id: `${node.id}-rule`,
        position: {
          x: node.position.x - 150, // Position to the left
          y: node.position.y + 100  // Position below
        },
        choiceNodeId: node.id,
        type: 'rule'
      });

      // Right default drop zone (positioned to the right and below)
      dropZones.push({
        id: `${node.id}-default`,
        position: {
          x: node.position.x + 150, // Position to the right
          y: node.position.y + 100  // Position below
        },
        choiceNodeId: node.id,
        type: 'default'
      });
    });

    return dropZones;
  };

  // Update useEffect for nodes to include choice drop zones
  useEffect(() => {
    const newDropZones: DropZone[] = [];
    const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);

    for (let i = 0; i < sortedNodes.length - 1; i++) {
      const currentNode = sortedNodes[i];
      const nextNode = sortedNodes[i + 1];
      
      if (currentNode.type !== 'end' && nextNode.type !== 'start') {
        newDropZones.push({
          id: `${currentNode.id}-${nextNode.id}`,
          position: {
            x: INITIAL_X,
            y: currentNode.position.y + VERTICAL_SPACING / 2
          },
          beforeNodeId: currentNode.id,
          afterNodeId: nextNode.id
        });
      }
    }
    setDropZones(newDropZones);
    
    // Calculate choice drop zones
    const newChoiceDropZones = calculateChoiceDropZones(nodes);
    setChoiceDropZones(newChoiceDropZones);
  }, [nodes]);

  // Add this useEffect to fetch resources
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const [
          topics,
          functions,
          queues,
          tables,
          buckets
        ] = await Promise.all([
          listSNSTopics(),
          listLambdaFunctions(),
          listSQSQueues(),
          listDynamoDBTables(),
          listS3Buckets()
        ]);

        setResourceOptions({
          snsTopics: topics,
          lambdaFunctions: functions,
          sqsQueues: queues,
          dynamodbTables: tables,
          s3Buckets: buckets
        });
      } catch (error) {
        console.error('Error fetching resources:', error);
      }
    };

    fetchResources();
  }, []);

  const snapToGrid = (position: Position): Position => {
    return {
      x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(position.y / GRID_SIZE) * GRID_SIZE
    };
  };

  const repositionNodes = (newNode: WorkflowNode, currentNodes: WorkflowNode[]): WorkflowNode[] => {
    const sortedNodes = [...currentNodes].sort((a, b) => a.position.y - b.position.y);
    
    return sortedNodes.map((node, index) => ({
          ...node, 
          position: { 
        x: node.position.x,
        y: 100 + (index * 150) // Fixed 150px spacing between nodes
      }
    }));
  };

  const handleDragStart = (e: React.DragEvent, actionId: string) => {
    e.dataTransfer.setData('actionId', actionId);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const findClosestDropZone = (y: number): DropZone | null => {
    if (dropZones.length === 0) return null;

    return dropZones.reduce((closest, zone) => {
      const currentDistance = Math.abs(zone.position.y - y);
      const closestDistance = closest ? Math.abs(closest.position.y - y) : Infinity;
      return currentDistance < closestDistance ? zone : closest;
    }, null as DropZone | null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const canvasRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dragY = e.clientY - canvasRect.top;
    
    setDragPosition({ x: e.clientX - canvasRect.left, y: dragY });
    
    if (isDragging) {
      const closestZone = findClosestDropZone(dragY);
      if (closestZone && Math.abs(closestZone.position.y - dragY) < VERTICAL_SPACING / 2) {
        setActiveDropZone(closestZone);
        setIsDraggingOver(true);
      } else {
        setActiveDropZone(null);
        setIsDraggingOver(false);
      }
    }
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
    setActiveDropZone(null);
    setDragPosition(null);
  };

  const insertNodeAtPosition = (newNode: WorkflowNode, position: number) => {
    // Create a copy of nodes and sort them by vertical position
    const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
    
    // Find the insertion index based on position
    let insertIndex = sortedNodes.findIndex(node => node.position.y > position);
    if (insertIndex === -1) {
      // If no node is found with greater y position, insert before the end node
      insertIndex = sortedNodes.length - 1;
    }

    // Insert the new node at the correct position
    const nodesBeforeInsert = sortedNodes.slice(0, insertIndex);
    const nodesAfterInsert = sortedNodes.slice(insertIndex);
    const updatedNodes = [...nodesBeforeInsert, newNode, ...nodesAfterInsert];

    // Calculate positions with extra spacing for choice nodes
    return updatedNodes.map((node, index) => {
      if (node.type === 'start') {
        return { ...node, position: { x: INITIAL_X, y: INITIAL_Y } };
      }
      
      // Calculate base Y position
      let yPos = INITIAL_Y + index * VERTICAL_SPACING;
      
      // Add extra spacing after choice nodes
      const choiceNodesBeforeCurrent = updatedNodes
        .slice(0, index)
        .filter(n => n.type === 'choice').length;
      yPos += choiceNodesBeforeCurrent * CHOICE_EXTRA_SPACING;

      if (node.type === 'end') {
        // Ensure end node is properly spaced after the last choice node
        const totalChoiceNodes = updatedNodes.filter(n => n.type === 'choice').length;
        return {
          ...node,
          position: {
            x: INITIAL_X,
            y: INITIAL_Y + (updatedNodes.length - 1) * VERTICAL_SPACING + totalChoiceNodes * CHOICE_EXTRA_SPACING
          }
        };
      }

      return {
        ...node,
        position: {
          x: INITIAL_X,
          y: yPos
        }
      };
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const actionId = e.dataTransfer.getData('actionId');
    
    // Find the closest choice drop zone
    const canvasRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dropX = e.clientX - canvasRect.left;
    const dropY = e.clientY - canvasRect.top;
    
    const closestChoiceZone = choiceDropZones.find(zone => {
      const distance = Math.sqrt(
        Math.pow(zone.position.x - dropX, 2) + 
        Math.pow(zone.position.y - dropY, 2)
      );
      return distance < 50;
    });

    if (closestChoiceZone) {
        const choiceNode = nodes.find(n => n.id === closestChoiceZone.choiceNodeId);
        if (!choiceNode) return;

        // Create the new node
        const newNode: WorkflowNode = {
          id: generateUniqueId(actionId, nodes),
          type: actionId,
          position: {
            x: closestChoiceZone.position.x,
            y: closestChoiceZone.position.y
          },
          title: actionId,
          description: '',
          configuration: getInitialConfigForType(actionId),
          input: '{}',
          variables: {}
        };

        // Remove any existing connections from this choice path
        let newConnections = connections.filter(conn => 
          !(conn.from === choiceNode.id && conn.isDefault === (closestChoiceZone.type === 'default'))
        );

        // Add new connection from choice to the new node
        newConnections.push({
          from: choiceNode.id,
          to: newNode.id,
          isDefault: closestChoiceZone.type === 'default'
        });

        // Handle connections based on drop zone type
        if (closestChoiceZone.type === 'default') {
          // Right drop zone - connect to the next sequential node
          const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
          const choiceIndex = sortedNodes.findIndex(n => n.id === choiceNode.id);
          const nextNode = sortedNodes[choiceIndex + 1];
          
          if (nextNode && nextNode.type !== 'end') {
            newConnections.push({
              from: newNode.id,
              to: nextNode.id
            });
          } else {
            // If no next node or next node is end, connect to end
            const endNode = nodes.find(n => n.type === 'end');
            if (endNode) {
              newConnections.push({
                from: newNode.id,
                to: endNode.id
              });
            }
          }
        } else {
          // Left drop zone - always connect to end
          const endNode = nodes.find(n => n.type === 'end');
          if (endNode) {
            newConnections.push({
              from: newNode.id,
              to: endNode.id
            });
          }
        }

        setNodes([...nodes, newNode]);
        setConnections(newConnections);
    } else {
        // Handle regular drop zone
        const dropY = e.clientY - canvasRect.top;
        
        // Find service/action configuration
        let nodeConfig: Partial<WorkflowNode> | null = null;
        
        // Check if it's a namespace service
        if (actionId.startsWith('namespace:')) {
          const namespaceId = actionId.split(':')[1];
          const namespace = namespaceList.find(ns => ns.id === namespaceId);
          
          if (namespace) {
            nodeConfig = {
              type: 'namespace',
              title: namespace.name,
              description: `Namespace: ${namespace.url}`,
              configuration: {
                namespaceId: namespace.id,
                url: namespace.url,
                method: 'GET', // Default method
                headers: '{}',
                body: '{}',
                query: '{}',
                accountId: '', // Will be selected in configuration
                methodId: '' // Will be selected in configuration
              }
            };
          }
        }
        // Check if it's a flow state
        else if (flowStates.find(state => state.id === actionId)) {
          const flowState = flowStates.find(state => state.id === actionId);
          if (flowState) {
            nodeConfig = {
              type: flowState.id,
              title: `New ${flowState.title}`,
              description: flowState.description,
              configuration: getInitialConfigForType(flowState.id)
            };
          }
        } else {
          // Handle service actions
          let selectedService: Service | undefined;
          let selectedAction: ServiceAction | undefined;
          
          for (const service of services) {
            if (service.actions) {
              for (const action of service.actions) {
                if (action.actions) {
                  const foundAction = action.actions.find(subAction => subAction.id === actionId);
                  if (foundAction) {
                    selectedService = service;
                    selectedAction = foundAction;
                    break;
                  }
                }
              }
            }
            if (selectedAction) break;
          }

          if (selectedService && selectedAction) {
            nodeConfig = {
              type: actionId.split('-')[0],
              title: selectedAction.title,
              description: selectedAction.description,
              configuration: getInitialConfigForService(selectedService.type, resourceOptions)
            };
          }
        }
        
        if (nodeConfig) {
          const insertPosition = findInsertPosition(dropY);

          const newNode: WorkflowNode = {
            id: generateUniqueId(nodeConfig.type || 'node', nodes),
            type: nodeConfig.type || 'task',
            position: {
              x: INITIAL_X,
              y: insertPosition
            },
            title: nodeConfig.title || 'New Node',
            description: nodeConfig.description || '',
            configuration: nodeConfig.configuration || {},
            input: '{}',
            variables: {}
          };

          const updatedNodes = insertNodeAtPosition(newNode, insertPosition);
          if (updatedNodes) {
            // Update connections to maintain workflow sequence
            const newConnections: Connection[] = [];
            for (let i = 0; i < updatedNodes.length - 1; i++) {
              const currentNode = updatedNodes[i];
              const nextNode = updatedNodes[i + 1];
              
              newConnections.push({
                from: currentNode.id,
                to: nextNode.id,
                ...(currentNode.type === 'choice' ? { isDefault: true } : {})
              });
              
              // For choice nodes, add the Rule #1 connection to end
              if (currentNode.type === 'choice') {
                const endNode = updatedNodes.find(n => n.type === 'end');
                if (endNode) {
                  newConnections.push({
                    from: currentNode.id,
                    to: endNode.id,
                    isDefault: false
                  });
                }
              }
            }

            setNodes(updatedNodes);
            setConnections(newConnections);
          }
        }
    }

    setIsDragging(false);
    setIsDraggingOver(false);
    setActiveDropZone(null);
    setDragPosition(null);
  };

  // Helper function to find the best insertion position
  const findInsertPosition = (dropY: number): number => {
    const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
    
    // Find nodes before and after the drop position
    const nodeBefore = sortedNodes.reduce((prev, curr) => {
      return curr.position.y < dropY && curr.position.y > (prev?.position.y ?? -Infinity)
        ? curr
        : prev;
    }, null as WorkflowNode | null);
    
    const nodeAfter = sortedNodes.find(node => node.position.y > dropY);
    
    if (!nodeBefore) {
      // Dropping at the start
      return INITIAL_Y + VERTICAL_SPACING;
    }
    
    if (!nodeAfter) {
      // Dropping at the end
      return nodeBefore.position.y + VERTICAL_SPACING;
    }
    
    // Calculate middle position between nodes
    return nodeBefore.position.y + VERTICAL_SPACING;
  };

  // Helper function to get initial configuration based on flow state type
  const getInitialConfigForType = (type: string): NodeConfiguration => {
    switch (type) {
      case 'choice':
        return {
          choices: [],
          default: '',
          comment: ''
        };
      case 'parallel':
        return {
          branches: [],
          comment: ''
        };
      case 'map':
        return {
          itemsPath: '$.items',
          maxConcurrency: 0,
          comment: ''
        };
      case 'wait':
        return {
          seconds: 1,
          comment: ''
        };
      case 'pass':
        return {
          result: { data: 'Example data' },
          resultPath: '$.result',
          comment: ''
        };
      case 'success':
        return {
          comment: 'Execution succeeded'
        };
      case 'fail':
        return {
          error: 'CustomError',
          cause: 'Custom error cause',
          comment: ''
        };
      default:
        return {};
    }
  };

  // Helper function to get initial configuration for service types
  const getInitialConfigForService = (serviceType: string, resources: ResourceOptions): NodeConfiguration => {
    switch (serviceType) {
      case 'sns':
        return {
          topicArn: resources.snsTopics[0] || '',
          messageType: 'json',
          comment: ''
        };
      case 'lambda':
        return {
          resourceArn: resources.lambdaFunctions[0]?.arn || '',
          timeoutSeconds: 30,
          comment: ''
        };
      case 'sqs':
        return {
          queueUrl: resources.sqsQueues[0] || '',
          comment: ''
        };
      case 'dynamodb':
        return {
          tableName: resources.dynamodbTables[0] || '',
          comment: ''
        };
      case 's3':
        return {
          resourceArn: 'arn:aws:states:::aws-sdk:s3:putObject',
          parameters: {
            Bucket: resources.s3Buckets[0] || '',
            Key: '',
            Body: ''
          }
        };
      default:
        return {};
    }
  };

  // Update the connection handling to fix Choice state arrows
  const renderConnections = () => {
    return (
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#d1d5db" />
          </marker>
          <marker
            id="arrowhead-highlighted"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
        </defs>
        
        {connections.map((connection, index) => {
      const fromNode = nodes.find(n => n.id === connection.from);
      const toNode = nodes.find(n => n.id === connection.to);

      if (!fromNode || !toNode) return null;

          const isHighlighted = hoveredNode === connection.from || hoveredNode === connection.to;

          if (fromNode.type === 'choice') {
            const centerX = fromNode.position.x;
            const centerY = fromNode.position.y + (NODE_HEIGHT / 2);
            const dropZoneY = fromNode.position.y + 100; // Vertical offset for drop zones
            const leftDropZoneX = centerX - 150; // Left drop zone X position
            const rightDropZoneX = centerX + 150; // Right drop zone X position

            // Generate unique key for choice connections
            const choiceKey = `${connection.from}-${connection.to}-${connection.isDefault ? 'default' : 'rule'}-${index}`;

            return (
              <g key={choiceKey}>
                {/* Path from choice node to drop zones */}
                <path
                  d={`M ${centerX} ${centerY} 
                      C ${centerX} ${centerY + 30},
                        ${connection.isDefault ? rightDropZoneX : leftDropZoneX} ${dropZoneY - 30},
                        ${connection.isDefault ? rightDropZoneX : leftDropZoneX} ${dropZoneY}`}
                  stroke={isHighlighted ? "#3b82f6" : "#d1d5db"}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={isHighlighted ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
                />

                {/* Path from drop zones to next nodes */}
                <path
                  d={`M ${connection.isDefault ? rightDropZoneX : leftDropZoneX} ${dropZoneY}
                      C ${connection.isDefault ? rightDropZoneX : leftDropZoneX} ${dropZoneY + 50},
                        ${toNode.position.x} ${toNode.position.y - 30},
                        ${toNode.position.x} ${toNode.position.y - NODE_HEIGHT/2}`}
                  stroke={isHighlighted ? "#3b82f6" : "#d1d5db"}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={isHighlighted ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
                />
              </g>
            );
          } else {
            // Normal connection for non-choice nodes
      const startX = fromNode.position.x;
      const startY = fromNode.position.y + (fromNode.type === 'start' ? 40 : NODE_HEIGHT / 2);
      const endX = toNode.position.x;
      const endY = toNode.position.y - (toNode.type === 'end' ? 40 : NODE_HEIGHT / 2);

            // Create a curved path that looks more natural
      const path = `M ${startX} ${startY} 
                         C ${startX} ${startY + 50},
                           ${endX} ${endY - 50},
                      ${endX} ${endY}`;

      return (
              <g key={`${connection.from}-${connection.to}-${index}`}>
                {/* White background stroke for better visibility */}
          <path
            d={path}
            stroke="white"
            strokeWidth="4"
            fill="none"
          />
                {/* Actual connection line */}
          <path
            d={path}
            stroke={isHighlighted ? "#3b82f6" : "#d1d5db"}
            strokeWidth="2"
            fill="none"
            markerEnd={isHighlighted ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
          />
              </g>
            );
          }
        })}
        </svg>
      );
  };

  const renderDropZones = () => {
    return choiceDropZones.map((zone) => (
      <div
        key={zone.id}
        className={`absolute w-48 h-12 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed 
          ${isDragging ? (
            isDraggingOver && hoveredDropZone?.id === zone.id
              ? 'border-blue-500 bg-blue-100'
              : 'border-blue-300 bg-blue-50'
          ) : 'border-gray-300'}
          rounded-lg flex items-center justify-center transition-colors duration-200`}
        style={{
          left: zone.position.x,
          top: zone.position.y,
          transform: 'translate(-50%, -50%)'
        }}
        onMouseEnter={() => setHoveredDropZone(zone)}
        onMouseLeave={() => setHoveredDropZone(null)}
      >
        <div className="text-center">
          <div className="text-xs font-medium text-gray-600 mb-1">
            {zone.type === 'rule' ? 'Rule' : 'Default'}
          </div>
          <div className="text-sm text-gray-500">
            Drop state here
          </div>
        </div>
      </div>
    ));
  };

  // Add this to your state declarations at the top of the component
  const [hoveredDropZone, setHoveredDropZone] = useState<ChoiceDropZone | null>(null);

  const toggleService = (serviceId: string) => {
    const newExpanded = new Set(expandedServices);
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId);
    } else {
      newExpanded.add(serviceId);
    }
    setExpandedServices(newExpanded);
  };

  const toggleAction = (actionId: string) => {
    const newExpanded = new Set(expandedActions);
    if (newExpanded.has(actionId)) {
      newExpanded.delete(actionId);
    } else {
      newExpanded.add(actionId);
    }
    setExpandedActions(newExpanded);
  };

  // Update the search functionality to search across all levels
  const filterServices = (query: string) => {
    if (!query) return services;

    const searchTerm = query.toLowerCase();
    return services.map(service => {
      // Check if service matches
      const serviceMatches = 
        service.title.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm);

      if (serviceMatches) return service;

      // Filter matching actions
      const filteredActions = service.actions?.map(category => {
        const categoryMatches =
          category.title.toLowerCase().includes(searchTerm) ||
          category.description.toLowerCase().includes(searchTerm);

        if (categoryMatches) return category;

        // Filter matching subactions
        const filteredSubActions = category.actions?.filter(action =>
          action.title.toLowerCase().includes(searchTerm) ||
          action.description.toLowerCase().includes(searchTerm)
        );

        if (filteredSubActions?.length) {
          return { ...category, actions: filteredSubActions };
        }

        return null;
      }).filter(Boolean);

      if (filteredActions?.length) {
        return { ...service, actions: filteredActions };
      }

      return null;
    }).filter(Boolean);
  };

  // Update the renderServices function to use the new filtering
  const renderServices = () => {
    const filteredServices = filterServices(searchQuery);

    return filteredServices.map((service) => {
      if (!service) return null;
      
      return (
        <div key={service.type} className="space-y-2">
          <div
            className={`flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded-md ${
              expandedServices.has(service.type) ? service.bgColor : ''
            }`}
            onClick={() => toggleService(service.type)}
          >
            <svg
              className={`w-4 h-4 transition-transform ${service.textColor} ${
                expandedServices.has(service.type) ? 'transform rotate-90' : ''
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className={`p-2 ${service.bgColor} rounded-md`}>
              {service.icon}
            </div>
            <div>
              <div className={`font-medium ${service.textColor}`}>{service.title}</div>
              <div className="text-sm text-gray-500">{service.description}</div>
            </div>
          </div>

          {expandedServices.has(service.type) && service.type === 'namespace' && (
            <div className="ml-6 space-y-2">
              {isNamespaceLoading && (
                <div className="text-gray-400 text-sm p-2">Loading namespaces...</div>
              )}
              {!isNamespaceLoading && namespaceList.length === 0 && (
                <div className="text-red-500 text-sm p-2">No namespaces found or failed to fetch. Check console for details.</div>
              )}
              {namespaceList.map(ns => (
                <div
                  key={ns.id}
                  draggable
                  onDragStart={e => handleDragStart(e, `namespace:${ns.id}`)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 p-2 hover:${service.bgColor} cursor-move active:cursor-grabbing rounded-md`}
                >
                  <div className={`p-2 ${service.bgColor} rounded-md`}>{service.icon}</div>
                  <div>
                    <div className={`font-medium ${service.textColor}`}>{ns.name}</div>
                    <div className="text-sm text-gray-500">{ns.url}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {expandedServices.has(service.type) && service.type !== 'namespace' && service.actions && (
            <div className="ml-6 space-y-2">
              {service.actions.map((category) => {
                if (!category) return null;
                
                return (
                  <div key={category.id}>
                    <div
                      className={`flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded-md ${
                        expandedActions.has(category.id) ? service.bgColor : ''
                      }`}
                      onClick={() => toggleAction(category.id)}
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${service.textColor} ${
                          expandedActions.has(category.id) ? 'transform rotate-90' : ''
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className={`p-2 ${service.bgColor} rounded-md`}>
                        {service.icon}
                      </div>
                      <div>
                        <div className={`font-medium ${service.textColor}`}>{category.title}</div>
                        <div className="text-sm text-gray-500">{category.description}</div>
                      </div>
                    </div>

                    {expandedActions.has(category.id) && category.actions && (
                      <div className="ml-6 space-y-2">
                        {category.actions.map((action) => (
                          <div
                            key={action.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, action.id)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-2 p-2 hover:${service.bgColor} cursor-move active:cursor-grabbing rounded-md`}
                          >
                            <div className={`p-2 ${service.bgColor} rounded-md`}>
                              {service.icon}
                            </div>
                            <div>
                              <div className={`font-medium ${service.textColor}`}>{action.title}</div>
                              <div className="text-sm text-gray-500">{action.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }).filter(Boolean);
  };

  const handleNodeClick = (node: WorkflowNode) => {
    setSelectedNode(node);
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;

    // Find all connections involving the node to be deleted
    const nodeConnections = connections.filter(
      conn => conn.from === selectedNode.id || conn.to === selectedNode.id
    );

    // Create new connections array without the deleted node's connections
    let newConnections = connections.filter(
      conn => conn.from !== selectedNode.id && conn.to !== selectedNode.id
    );

    // Get the new nodes array without the deleted node
    const newNodes = nodes.filter(node => node.id !== selectedNode.id);
    
    // Sort nodes by vertical position
    const sortedNodes = [...newNodes].sort((a, b) => a.position.y - b.position.y);

    // Handle reconnections based on node type
    if (selectedNode.type === 'choice') {
      // For choice nodes, connect the previous node to the next node
      const prevConnection = connections.find(conn => conn.to === selectedNode.id);
      const nextConnections = connections.filter(conn => conn.from === selectedNode.id);
      
      if (prevConnection) {
        nextConnections.forEach(nextConn => {
      newConnections.push({
            from: prevConnection.from,
            to: nextConn.to,
            isDefault: nextConn.isDefault
          });
        });
      }
    } else {
      // For non-choice nodes, connect previous node to next node
      const prevConnection = connections.find(conn => conn.to === selectedNode.id);
      const nextConnection = connections.find(conn => conn.from === selectedNode.id);
      
      if (prevConnection && nextConnection) {
        newConnections.push({
          from: prevConnection.from,
          to: nextConnection.to
        });
      }
    }

    // Ensure the last workflow node connects to the end node
    const workflowNodes = sortedNodes.filter(n => n.type !== 'start' && n.type !== 'end');
    const lastNode = workflowNodes[workflowNodes.length - 1];
    const endNode = nodes.find(n => n.type === 'end');
    
    if (lastNode && endNode) {
      // Remove any existing connections from the last node
      newConnections = newConnections.filter(conn => conn.from !== lastNode.id);
      
      // Add connection from last node to end
      newConnections.push({
        from: lastNode.id,
        to: endNode.id
      });
    }

    // Reposition remaining nodes to maintain spacing
    const repositionedNodes = sortedNodes.map((node, index) => ({
        ...node,
        position: {
        x: node.position.x,
        y: 100 + (index * 150) // Fixed 150px spacing between nodes
        }
    }));

    setNodes(repositionedNodes);
    setConnections(newConnections);
    setSelectedNode(null);
  };

  const handleDuplicateNode = () => {
    if (!selectedNode) return;
    const newId = generateUniqueId(selectedNode.type, nodes);
    const newNode: WorkflowNode = {
      ...selectedNode,
      id: newId,
      position: {
        x: selectedNode.position.x + NODE_WIDTH + 20,
        y: selectedNode.position.y + 20
      }
    };
    setNodes([...nodes, newNode]);
  };

  const handleConfigurationChange = (key: keyof NodeConfiguration, value: string | number | any) => {
    if (!selectedNode) return;
    const updatedNode = {
      ...selectedNode,
      configuration: {
        ...selectedNode.configuration,
        [key]: value
      }
    };
    setNodes(nodes.map(node => node.id === selectedNode.id ? updatedNode : node));
    setSelectedNode(updatedNode);
  };

  const handleInputChange = (input: string) => {
    if (!selectedNode) return;
    
    const updatedNode = {
      ...selectedNode,
      input
    };
    
    setNodes(nodes.map(node => 
      node.id === selectedNode.id ? updatedNode : node
    ));
    setSelectedNode(updatedNode);
  };

  const handleVariableChange = (key: string, value: string) => {
    if (!selectedNode) return;
    
    const updatedNode = {
      ...selectedNode,
      variables: {
        ...selectedNode.variables,
        [key]: value
      }
    };
    
    setNodes(nodes.map(node => 
      node.id === selectedNode.id ? updatedNode : node
    ));
    setSelectedNode(updatedNode);
  };

  // Update the service-specific configuration section in the right sidebar
  const renderServiceConfiguration = (tab: 'configuration' | 'arguments' | 'variables' | 'error') => {
    if (!selectedNode) return null;

    if (selectedNode.type === 'namespace') {
      return renderNamespaceConfiguration(selectedNode);
    }

    const renderValidationError = (message: string) => (
      <p className="mt-1 text-sm text-red-600">{message}</p>
    );

    switch (selectedNode.type) {
      case 'sns':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Topic ARN</label>
              <select
                value={selectedNode.configuration?.topicArn || ''}
                onChange={(e) => handleConfigurationChange('topicArn', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  !selectedNode.configuration?.topicArn 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="">Select a topic</option>
                {resourceOptions.snsTopics.map((topic) => {
                  const parts = topic.split(':');
                  const region = parts[3];
                  const accountId = parts[4];
                  const name = parts[parts.length - 1];
                  return (
                    <option key={topic} value={topic}>
                      {name} ({region} - {accountId})
                    </option>
                  );
                })}
              </select>
              {!selectedNode.configuration?.topicArn && renderValidationError('Topic ARN is required')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Message Type</label>
              <select
                value={selectedNode.configuration?.messageType || 'json'}
                onChange={(e) => handleConfigurationChange('messageType', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="json">JSON</option>
                <option value="string">String</option>
              </select>
            </div>
            {selectedNode.configuration?.messageType === 'string' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={selectedNode.configuration?.message || ''}
                  onChange={(e) => handleConfigurationChange('message', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  rows={4}
                />
              </div>
            )}
          </>
        );

      case 'lambda':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Function</label>
              <select
                value={selectedNode.configuration?.resourceArn || ''}
                onChange={(e) => handleConfigurationChange('resourceArn', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  !selectedNode.configuration?.resourceArn 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="">Select a function</option>
                {resourceOptions.lambdaFunctions.map((fn) => {
                  const parts = fn.arn.split(':');
                  const region = parts[3];
                  const runtime = fn.runtime || 'N/A';
                  return (
                    <option key={fn.arn} value={fn.arn}>
                      {fn.name} ({region} - {runtime})
                    </option>
                  );
                })}
              </select>
              {!selectedNode.configuration?.resourceArn && renderValidationError('Function ARN is required')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payload</label>
              <p className="text-xs text-gray-500 mb-2">The JSON that you want to provide to your Lambda function.</p>
              <select
                value={selectedNode.configuration?.payloadType || 'no_payload'}
                onChange={(e) => handleConfigurationChange('payloadType', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="no_payload">No payload</option>
                <option value="state_input">Use state input as payload</option>
                <option value="custom">Enter payload</option>
              </select>
            </div>
            {selectedNode.configuration?.payloadType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Custom Payload (JSON)</label>
                <textarea
                  value={selectedNode.configuration?.customPayload || '{}'}
                  onChange={(e) => handleConfigurationChange('customPayload', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
                  rows={4}
                  placeholder="{}"
              />
            </div>
            )}
          </>
        );

      case 'sqs':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Queue</label>
            <select
              value={selectedNode.configuration?.queueUrl || ''}
              onChange={(e) => handleConfigurationChange('queueUrl', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                !selectedNode.configuration?.queueUrl 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            >
              <option value="">Select a queue</option>
              {resourceOptions.sqsQueues.map((queue) => {
                const parts = queue.split('/');
                const name = parts[parts.length - 1];
                const region = queue.split('.')[1];
                return (
                  <option key={queue} value={queue}>
                    {name} ({region})
                  </option>
                );
              })}
            </select>
            {!selectedNode.configuration?.queueUrl && renderValidationError('Queue URL is required')}
          </div>
        );

      case 'dynamodb':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Table</label>
            <select
              value={selectedNode.configuration?.tableName || ''}
              onChange={(e) => handleConfigurationChange('tableName', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                !selectedNode.configuration?.tableName 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            >
              <option value="">Select a table</option>
              {resourceOptions.dynamodbTables.map((table) => (
                <option key={table} value={table}>
                  {table}
                </option>
              ))}
            </select>
            {!selectedNode.configuration?.tableName && renderValidationError('Table name is required')}
          </div>
        );

      case 's3':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Bucket</label>
              <select
                value={selectedNode.configuration?.bucketName || ''}
                onChange={(e) => handleConfigurationChange('bucketName', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  !selectedNode.configuration?.bucketName 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="">Select a bucket</option>
                {resourceOptions.s3Buckets.map((bucket) => (
                  <option key={bucket} value={bucket}>
                    {bucket}
                  </option>
                ))}
              </select>
              {!selectedNode.configuration?.bucketName && renderValidationError('Bucket name is required')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Key</label>
              <input
                type="text"
                value={selectedNode.configuration?.key || ''}
                onChange={(e) => handleConfigurationChange('key', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  !selectedNode.configuration?.key 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="path/to/object.txt"
              />
              {!selectedNode.configuration?.key && renderValidationError('Object key is required')}
            </div>
          </>
        );

      case 'http':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Connection ARN</label>
              <input
                type="text"
                value={selectedNode.configuration?.connectionArn || ''}
                onChange={e => handleConfigurationChange('connectionArn', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="arn:aws:apigateway:...:connection/abc123"
              />
              {!selectedNode.configuration?.connectionArn && (
                <span className="text-xs text-red-600">Connection ARN is required</span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">URL</label>
              <input
                type="text"
                value={selectedNode.configuration?.url || ''}
                onChange={e => handleConfigurationChange('url', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="https://api.example.com/resource"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Method</label>
              <select
                value={selectedNode.configuration?.method || 'GET'}
                onChange={e => handleConfigurationChange('method', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Headers (JSON)</label>
              <textarea
                value={selectedNode.configuration?.headers || ''}
                onChange={e => handleConfigurationChange('headers', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
                rows={2}
                placeholder='{"Authorization": "Bearer ..."}'
              />
            </div>
            {(selectedNode.configuration?.method === 'POST' || selectedNode.configuration?.method === 'PUT') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Body (JSON)</label>
                <textarea
                  value={selectedNode.configuration?.body || ''}
                  onChange={e => handleConfigurationChange('body', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
                  rows={4}
                  placeholder='{"key": "value"}'
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Query Parameters (JSON)</label>
              <textarea
                value={selectedNode.configuration?.query || ''}
                onChange={e => handleConfigurationChange('query', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
                rows={2}
                placeholder='{"param1": "value1"}'
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this state machine?')) {
      // TODO: Implement delete functionality
      console.log('Delete state machine:', stateMachineArn);
    }
  };

  const handleTestState = () => {
    if (!selectedNode) return;
    
    // Set default input based on state type
    let defaultInput = '{\n  "key": "value"\n}';
    if (selectedNode.type === 'lambda' && selectedNode.configuration.payloadType === 'custom') {
      defaultInput = selectedNode.configuration.customPayload || defaultInput;
    }
    
    setTestStateInput(defaultInput);
    setTestStateOutput('');
    setTestStateError('');
    setIsTestStateModalOpen(true);
  };

  const handleTestStateExecution = async () => {
    if (!selectedNode) return;
    
    try {
      // Get the current state machine definition
      const definition = generateStateMachineDefinition();
      
      // Call AWS Step Functions TestState API
      const response = await fetch('/api/stepfunctions/test-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stateMachineArn: params.stateMachineArn,
          definition: definition,
          input: testStateInput,
          stateName: selectedNode.id
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTestStateOutput(JSON.stringify(data.output, null, 2));
        setTestStateError('');
      } else {
        setTestStateError(data.message || 'Failed to test state');
        setTestStateOutput('');
      }
    } catch (error: any) {
      setTestStateError('Failed to test state: ' + (error as Error).message);
      setTestStateOutput('');
    }
  };

  // Add the modal component
  const renderTestStateModal = () => {
    if (!isTestStateModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-[800px] max-h-[90vh] overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Test state</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Test a state in isolation using the TestState API to ensure that it works correctly.
                  <a href="#" className="text-blue-500 ml-1">Learn more</a>
                </p>
              </div>
              <button onClick={() => setIsTestStateModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex h-[600px]">
            <div className="w-1/2 border-r p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Test input</h3>
                  <div className="bg-white border rounded-md">
                    <div className="flex border-b">
                      <button className="px-4 py-2 text-sm text-blue-600 border-b-2 border-blue-600">Test input</button>
                      <button className="px-4 py-2 text-sm text-gray-500">State definition</button>
                    </div>
                    <div className="p-4">
                      <div className="mb-4">
                        <label className="block text-sm mb-2">Execution role</label>
                        <select
                          value={executionRole}
                          onChange={(e) => setExecutionRole(e.target.value)}
                          className="w-full border rounded-md p-2 text-sm"
                        >
                          <option value="monty-step-function">monty-step-function</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center mb-2">
                          <label className="text-sm">State input - </label>
                          <span className="text-sm text-gray-500 ml-1">optional</span>
                        </div>
                        <textarea
                          value={testStateInput}
                          onChange={(e) => setTestStateInput(e.target.value)}
                          className="w-full h-32 p-2 border rounded-md font-mono text-sm"
                          placeholder="Enter JSON input"
                        />
                        <p className="text-xs text-gray-500 mt-1">Must be in valid JSON format.</p>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center mb-2">
                          <label className="text-sm">Variables - </label>
                          <span className="text-sm text-gray-500 ml-1">optional</span>
                        </div>
                        <p className="text-xs text-gray-500">Enter values for any variables referenced.</p>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm mb-2">Inspection level</label>
                        <select 
                          value={inspectionLevel}
                          onChange={(e) => setInspectionLevel(e.target.value)}
                          className="w-full border rounded-md p-2 text-sm"
                        >
                          <option value="INFO">INFO</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Return state output, status, error(s), and expected next step</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleTestStateExecution}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm"
                >
                  Start test
                </Button>
              </div>
            </div>

            <div className="w-1/2 p-4">
              <div>
                <h3 className="text-sm font-medium mb-2">State output</h3>
                <div className="bg-white border rounded-md">
                  <div className="flex border-b">
                    <button className="px-4 py-2 text-sm text-blue-600 border-b-2 border-blue-600">State output</button>
                    <button className="px-4 py-2 text-sm text-gray-500">I/O processing & variables</button>
                  </div>
                  <div className="p-4">
                    {!testStateOutput && !testStateError && (
                      <p className="text-sm text-gray-500">Start a test to view the output.</p>
                    )}
                    {testStateError && (
                      <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">
                        {testStateError}
                      </div>
                    )}
                    {testStateOutput && (
                      <div className="relative">
                        <pre className="overflow-auto max-h-[400px] text-sm font-mono p-4 bg-gray-50 rounded-md whitespace-pre-wrap break-words">
                          {testStateOutput}
                        </pre>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(testStateOutput);
                            toast({
                              description: "Output copied to clipboard",
                            });
                          }}
                          className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t flex justify-end space-x-3">
            <button className="text-sm text-gray-600 border rounded-md px-3 py-1">
              Copy TestState API response
            </button>
            <Button
              onClick={() => setIsTestStateModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Apply changes and close
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const handleExecute = async () => {
    const stateMachineArn = params.stateMachineArn as string;
    if (!stateMachineArn) {
      toast({
        variant: "destructive",
        description: "State machine ARN is required",
      });
      return;
    }

    try {
      const response = await fetch('/api/stepfunctions/start-execution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stateMachineArn: decodeURIComponent(stateMachineArn),
          input: JSON.stringify({})
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to start execution');
      }

      toast({
        description: "State machine execution started successfully",
      });

      // Navigate to the executions page for this state machine
      router.push(`/aws/stepfunctions/${stateMachineArn}/executions/${data.executionArn}`);
    } catch (error: any) {
      console.error('Error starting execution:', error);
      toast({
        variant: "destructive",
        description: error.message || 'Failed to start execution',
      });
    }
  };

  const handleSave = async () => {
    try {
      const definition = generateStateMachineDefinition();
      
      const response = await fetch(`/api/stepfunctions/${stateMachineArn}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ definition }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save state machine');
      }

      toast({
        title: "Success",
        description: "State machine saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving state machine:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save state machine",
      });
    }
  };

  const handleExit = () => {
    router.push(`/aws/stepfunctions/${encodeURIComponent(stateMachineArn)}`);
  };

  // Function to convert nodes and connections to state machine definition
  const generateStateMachineDefinition = (): StateMachineDefinition => {
    console.log('Generating state machine definition...');
    console.log('Nodes:', nodes);
    console.log('Connections:', connections);

    // Helper function to validate and format JSONPath
    const formatJSONPath = (path: string | undefined): string | undefined => {
      if (!path) return undefined;
      return path.startsWith('$') ? path : `$.${path}`;
    };

    // Create a map of node connections
    const nodeConnections = new Map<string, string>();
    connections.forEach(conn => {
      if (conn.from !== 'start' && conn.to !== 'end') {
        nodeConnections.set(conn.from, conn.to);
      }
    });

    // Find the start node's connection
    const startConnection = connections.find(conn => conn.from === 'start');
    if (!startConnection) {
      throw new Error('No start connection found');
    }

    const workflowNodes = nodes.filter(node => node.type !== 'start' && node.type !== 'end');
    if (workflowNodes.length === 0) {
      throw new Error('No workflow nodes found');
    }

    // Initialize the state machine definition
    const definition: StateMachineDefinition = {
      StartAt: workflowNodes[0].title,
      States: {}
    };

    // Track visited states for reachability check
    const visitedStates = new Set<string>();

    // Process each workflow node
    workflowNodes.forEach(node => {
      let state: any = {
        Comment: node.configuration.comment
      };

      // Add paths only if they are valid
      if (node.configuration.resultPath) {
        state.ResultPath = formatJSONPath(node.configuration.resultPath);
      }
      if (node.configuration.inputPath) {
        state.InputPath = formatJSONPath(node.configuration.inputPath);
      }
      if (node.configuration.outputPath) {
        state.OutputPath = formatJSONPath(node.configuration.outputPath);
      }

      // Remove undefined fields
      Object.keys(state).forEach(key => {
        if (state[key] === undefined) {
          delete state[key];
        }
      });

      // Handle different node types
      switch (node.type) {
        case 'lambda':
          state.Type = 'Task';
          // For Lambda invoke, we only need the basic Resource ARN when no payload is selected
          if (node.configuration.payloadType === 'no_payload') {
            state.Resource = node.configuration.resourceArn || '';
          } else {
            state.Resource = `arn:aws:states:::lambda:invoke`;
            state.Parameters = {
              "FunctionName": node.configuration.resourceArn || '',
              ...(node.configuration.payloadType === 'custom' && node.configuration.customPayload
                ? { "Payload": JSON.parse(node.configuration.customPayload || '{}') }
                : { "Payload.$": "$" })
            };
          }
          break;
        case 'namespace':
          state.Type = 'Task';
          state.Resource = 'arn:aws:states:::http:invoke';
          state.Parameters = {
            ApiEndpoint: node.configuration.url || '',
            Method: node.configuration.method || 'GET',
            ...(node.configuration.headers ? (() => {
              try {
                const arr = JSON.parse(node.configuration.headers);
                if (Array.isArray(arr)) {
                  const obj: Record<string, string> = {};
                  arr.forEach((h: any) => { if (h.key && h.value !== undefined) obj[h.key] = h.value; });
                  return { Headers: obj };
                }
                return { Headers: arr };
              } catch { return {}; }
            })() : {}),
            ...(node.configuration.body && (node.configuration.method === 'POST' || node.configuration.method === 'PUT') ? (() => { try { return { RequestBody: JSON.parse(node.configuration.body) }; } catch { return {}; } })() : {}),
            ...(node.configuration.query ? (() => { try { return { QueryParameters: JSON.parse(node.configuration.query) }; } catch { return {}; } })() : {})
            // No InvocationConfig/ConnectionArn here
          };
          break;
        case 'sns':
          state.Type = 'Task';
          state.Resource = `arn:aws:states:::sns:publish.waitForTaskToken`;
          state.Parameters = {
            "TopicArn": node.configuration.topicArn,
            "Message": {
              "Input.$": "$",
              "TaskToken.$": "$$.Task.Token"
            }
          };
          break;
        case 'sqs':
          state.Type = 'Task';
          state.Resource = `arn:aws:states:::sqs:sendMessage.waitForTaskToken`;
          state.Parameters = {
            "QueueUrl": node.configuration.queueUrl,
            "MessageBody": {
              "Input.$": "$",
              "TaskToken.$": "$$.Task.Token"
            }
          };
          break;
        case 'dynamodb':
          state.Type = 'Task';
          state.Resource = `arn:aws:states:::dynamodb:putItem`;
          state.Parameters = {
            "TableName": node.configuration.tableName,
            "Item": {
              "TaskToken": {
                "S.$": "$$.Task.Token"
              },
              "Input": {
                "S.$": "States.JsonToString($)"
              },
              ...node.configuration.parameters
            }
          };
          break;
        case 's3':
          state.Type = 'Task';
          state.Resource = `arn:aws:states:::aws-sdk:s3:putObject`;
          state.Parameters = {
            "Bucket": node.configuration.bucketName || '',
            "Key": node.configuration.key || '',
            "Body.$": "$.input"
          };
          break;
        case 'choice':
          state.Type = 'Choice';
          state.Choices = (node.configuration.choices || []).map(choice => ({
            Variable: choice.Variable,
            StringEquals: choice.StringEquals,
            StringLessThan: choice.StringLessThan,
            StringGreaterThan: choice.StringGreaterThan,
            Next: choice.Next
          }));
          if (node.configuration.default) {
            state.Default = node.configuration.default;
          }
          break;
        case 'wait':
          state.Type = 'Wait';
          state.Seconds = node.configuration.seconds || 1;
          break;
        case 'pass':
          state.Type = 'Pass';
          if (node.configuration.result !== undefined) {
            state.Result = node.configuration.result;
          }
          break;
        case 'succeed':
          state = {
            Type: 'Succeed'
          };
          break;
        case 'fail':
          state = {
            Type: 'Fail',
            Error: node.configuration.error || 'DefaultError',
            Cause: node.configuration.cause || 'Default error cause'
          };
          break;
        case 'http':
          state.Type = 'Task';
          state.Resource = 'arn:aws:states:::http:invoke';
          state.Parameters = {
            ApiEndpoint: node.configuration.url || '',
            Method: node.configuration.method || 'GET',
            ...(node.configuration.headers ? (() => {
              try {
                const arr = JSON.parse(node.configuration.headers);
                if (Array.isArray(arr)) {
                  const obj: Record<string, string> = {};
                  arr.forEach((h: any) => { if (h.key && h.value !== undefined) obj[h.key] = h.value; });
                  return { Headers: obj };
                }
                return { Headers: arr };
              } catch { return {}; }
            })() : {}),
            ...(node.configuration.body && (node.configuration.method === 'POST' || node.configuration.method === 'PUT') ? (() => { try { return { RequestBody: JSON.parse(node.configuration.body) }; } catch { return {}; } })() : {}),
            ...(node.configuration.query ? (() => { try { return { QueryParameters: JSON.parse(node.configuration.query) }; } catch { return {}; } })() : {}),
            InvocationConfig: {
              ConnectionArn: node.configuration.connectionArn || '',
            }
          };
          break;
        default:
          state.Type = 'Pass';
          break;
      }

      // Add Next field if not an end state
      const nextConn = connections.find(conn => conn.from === node.id && conn.to !== 'end');
      if (nextConn) {
        const nextNode = nodes.find(n => n.id === nextConn.to);
        if (nextNode && state.Type !== 'Succeed' && state.Type !== 'Fail') {
          state.Next = nextNode.title;
        }
      } else if (state.Type !== 'Succeed' && state.Type !== 'Fail' && state.Type !== 'Choice') {
        state.End = true;
      }

      definition.States[node.title] = state;
    });

    // Check reachability
    const checkReachability = (stateId: string): void => {
      if (visitedStates.has(stateId)) return;
      visitedStates.add(stateId);

      const state = definition.States[stateId];
      if (!state) return;

      if (state.Next) {
        checkReachability(state.Next);
      } else if (state.Type === 'Choice') {
        state.Choices?.forEach(choice => {
          if (choice.Next) checkReachability(choice.Next);
        });
        if (state.Default) checkReachability(state.Default);
      }
    };

    // Start reachability check from the start state
    checkReachability(definition.StartAt);

    // Check if all states are reachable
    const unreachableStates = Object.keys(definition.States).filter(
      stateId => !visitedStates.has(stateId)
    );
    if (unreachableStates.length > 0) {
      throw new Error(`States not reachable: ${unreachableStates.join(', ')}`);
    }

    console.log('Generated definition:', definition);
    return definition;
  };

  // Update the left sidebar content in the main component
  const renderLeftSidebar = () => {
    const [activeTab, setActiveTab] = useState('actions');

    return (
      <div className="w-[300px] border-r">
        <div className="flex border-b">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'actions' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('actions')}
          >
            Actions
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'flow' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('flow')}
          >
            Flow
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'patterns' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('patterns')}
          >
            Patterns
          </button>
        </div>

        <div className="p-4 overflow-auto h-[calc(100vh-10rem)]">
          {activeTab === 'actions' && (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 pl-9 border rounded-md"
                />
                <svg 
                  className="w-4 h-4 absolute left-3 top-3 text-gray-400" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                  />
                </svg>
              </div>
              {renderServices()}
            </div>
          )}

          {activeTab === 'flow' && (
            <div className="space-y-2">
              {flowStates.map((state) => (
                <div
                  key={state.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, state.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-move hover:bg-gray-50 ${state.color}`}
                >
                  <div className="flex-shrink-0">
                    {state.icon}
                  </div>
                  <div>
                    <h3 className="font-medium">{state.title}</h3>
                    <p className="text-sm text-gray-500">{state.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'patterns' && (
            <div className="space-y-2">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, pattern.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-move hover:bg-gray-50 ${pattern.color}`}
                >
                  <div className="flex-shrink-0">
                    {pattern.icon}
                  </div>
                  <div>
                    <h3 className="font-medium">{pattern.title}</h3>
                    <p className="text-sm text-gray-500">{pattern.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add this function to render the namespace configuration
  const renderNamespaceConfiguration = (node: WorkflowNode) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
          <select
            value={node.configuration.accountId}
            onChange={(e) => {
              const account = accounts.find(a => a['namespace-account-id'] === e.target.value);
              if (account) {
                setSelectedAccount(account);
                node.configuration.accountId = account['namespace-account-id'];
                node.configuration.headers = JSON.stringify(account['namespace-account-header'] || {});
                // Use selectedAccount and selectedMethod from state for URL
                const accountUrl = account['namespace-account-url-override'] || '';
                const methodUrl = selectedMethod?.['namespace-method-url-override'] || '';
                let finalUrl = accountUrl;
                if (methodUrl) {
                  if (accountUrl.endsWith('/') && methodUrl.startsWith('/')) {
                    finalUrl = accountUrl + methodUrl.slice(1);
                  } else if (!accountUrl.endsWith('/') && !methodUrl.startsWith('/')) {
                    finalUrl = accountUrl + '/' + methodUrl;
                  } else {
                    finalUrl = accountUrl + methodUrl;
                  }
                }
                node.configuration.url = finalUrl;
                setNodes(nodes.map(n => n.id === node.id ? { ...n, configuration: { ...node.configuration } } : n));
                setSelectedNode({ ...node, configuration: { ...node.configuration } });
              }
            }}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {accounts.map(account => (
              <option key={account['namespace-account-id']} value={account['namespace-account-id']}>
                {account['namespace-account-name']}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
          <select
            value={node.configuration.methodId}
            onChange={(e) => {
              const method = methods.find(m => m['namespace-method-id'] === e.target.value);
              if (method) {
                setSelectedMethod(method);
                node.configuration.methodId = method['namespace-method-id'];
                node.configuration.method = method['namespace-method-type'];
                node.configuration.query = JSON.stringify(method['namespace-method-queryParams'] || {});
                node.configuration.headers = JSON.stringify(method['namespace-method-header'] || {});
                // Use selectedAccount and selectedMethod from state for URL
                const accountUrl = selectedAccount?.['namespace-account-url-override'] || '';
                const methodUrl = method['namespace-method-url-override'] || '';
                let finalUrl = accountUrl;
                if (methodUrl) {
                  if (accountUrl.endsWith('/') && methodUrl.startsWith('/')) {
                    finalUrl = accountUrl + methodUrl.slice(1);
                  } else if (!accountUrl.endsWith('/') && !methodUrl.startsWith('/')) {
                    finalUrl = accountUrl + '/' + methodUrl;
                  } else {
                    finalUrl = accountUrl + methodUrl;
                  }
                }
                node.configuration.url = finalUrl;
                setNodes(nodes.map(n => n.id === node.id ? { ...n, configuration: { ...node.configuration } } : n));
                setSelectedNode({ ...node, configuration: { ...node.configuration } });
              }
            }}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {methods.map(method => (
              <option key={method['namespace-method-id']} value={method['namespace-method-id']}>
                {method['namespace-method-name']} ({method['namespace-method-type']})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input
            type="text"
            value={node.configuration.url}
            onChange={(e) => {
              node.configuration.url = e.target.value;
            }}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Headers</label>
          <textarea
            value={node.configuration.headers}
            onChange={(e) => {
              node.configuration.headers = e.target.value;
            }}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Query Parameters</label>
          <textarea
            value={node.configuration.query}
            onChange={(e) => {
              node.configuration.query = e.target.value;
            }}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Request Body</label>
          <textarea
            value={node.configuration.body}
            onChange={(e) => {
              node.configuration.body = e.target.value;
            }}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            rows={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Connection ARN</label>
          <input
            type="text"
            value={node.configuration.connectionArn || ''}
            onChange={e => {
              node.configuration.connectionArn = e.target.value;
              setNodes(nodes.map(n => n.id === node.id ? { ...n, configuration: { ...n.configuration, connectionArn: e.target.value } } : n));
              setSelectedNode({ ...node, configuration: { ...node.configuration, connectionArn: e.target.value } });
            }}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="arn:aws:apigateway:...:connection/abc123"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Edit: {stateMachineName}</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleTestState}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              Test state
            </Button>
            <div className="flex items-center bg-gray-100 rounded-md p-1">
              <button
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  activeTab === 'design' ? 'bg-white shadow-sm' : 'text-gray-600'
                }`}
                onClick={() => setActiveTab('design')}
              >
                Design
              </button>
              <button
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  activeTab === 'code' ? 'bg-white shadow-sm' : 'text-gray-600'
                }`}
                onClick={() => setActiveTab('code')}
              >
                Code
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleExit}
          >
            Exit
          </Button>
          <Button 
            variant="outline"
            onClick={handleExecute}
          >
            Execute
          </Button>
          <div className="relative">
            <Button 
              variant="outline"
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="inline-flex items-center"
            >
              Save
              <svg 
                className={`w-4 h-4 ml-2 transition-transform ${showActionMenu ? 'rotate-180' : ''}`} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            
            {showActionMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
                <div className="py-1">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleSave();
                      setShowActionMenu(false);
                    }}
                  >
                    Save
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      // TODO: Implement save as new version
                      console.log('Save as new version');
                      setShowActionMenu(false);
                    }}
                  >
                    Save as new version
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-full">
        {/* Left Sidebar */}
        {renderLeftSidebar()}

        {/* Main Canvas - Conditionally render based on active tab */}
        {activeTab === 'design' ? renderDesignView() : renderCodeView()}

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          {selectedNode && selectedNode.type !== 'start' && selectedNode.type !== 'end' ? (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium truncate" title={selectedNode.title}>{selectedNode.title}</h3>
              <div className="space-x-2 flex items-center">
                <Button
                  onClick={handleDuplicateNode}
                  size="icon"
                  variant="outline"
                  title="Duplicate"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                </Button>
                <Button
                  onClick={handleDeleteNode}
                  size="icon"
                  variant="destructive"
                  title="Delete"
                  className="text-red-500 hover:text-red-700"
                >
                  <TrashIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ) : null}
          {selectedNode ? (
            <Tabs defaultValue="configuration">
              <TabsList>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="arguments">Arguments & Output</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="error">Error Handling</TabsTrigger>
              </TabsList>

              {/* Configuration Tab */}
              <TabsContent value="configuration">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State name</label>
                    <input
                      type="text"
                      value={selectedNode.title}
                      onChange={(e) => {
                        const updatedNode = {
                          ...selectedNode,
                          title: e.target.value
                        };
                        setNodes(nodes.map(n => n.id === selectedNode.id ? updatedNode : n));
                        setSelectedNode(updatedNode);
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Comment (optional)</label>
                    <textarea
                      value={selectedNode.configuration?.comment || ''}
                      onChange={(e) => handleConfigurationChange('comment', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      rows={2}
                    />
                  </div>
                  {/* Service-specific configuration fields (API, Integration type, etc.) */}
                  {renderServiceConfiguration('configuration')}
                </div>
              </TabsContent>

              {/* Arguments & Output Tab */}
              <TabsContent value="arguments">
                <div className="space-y-4">
                  {/* Service-specific arguments (function name, bucket, etc.) */}
                  {renderServiceConfiguration('arguments')}
                  {/* Input/Output/Result Path */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Input Path</label>
                    <input
                      type="text"
                      value={selectedNode.configuration?.inputPath || ''}
                      onChange={(e) => handleConfigurationChange('inputPath', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="$"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Output Path</label>
                    <input
                      type="text"
                      value={selectedNode.configuration?.outputPath || ''}
                      onChange={(e) => handleConfigurationChange('outputPath', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="$"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Result Path</label>
                    <input
                      type="text"
                      value={selectedNode.configuration?.resultPath || ''}
                      onChange={(e) => handleConfigurationChange('resultPath', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="$.result"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Variables Tab */}
              <TabsContent value="variables">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Variables</h4>
                    <Button size="sm" onClick={() => {
                      const newKey = `var${Object.keys(selectedNode.variables).length + 1}`;
                      handleVariableChange(newKey, '');
                    }}>Add</Button>
                  </div>
                  {Object.entries(selectedNode.variables).map(([key, value]) => (
                    <div key={key} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          const newVars = { ...selectedNode.variables };
                          delete newVars[key];
                          newVars[newKey] = value;
                          setSelectedNode({ ...selectedNode, variables: newVars });
                          setNodes(nodes.map(node => node.id === selectedNode.id ? { ...node, variables: newVars } : node));
                        }}
                        className="w-1/2 rounded border px-2 py-1"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleVariableChange(key, e.target.value)}
                        className="w-1/2 rounded border px-2 py-1"
                      />
                      <Button size="icon" variant="destructive" onClick={() => {
                        const newVars = { ...selectedNode.variables };
                        delete newVars[key];
                        setSelectedNode({ ...selectedNode, variables: newVars });
                        setNodes(nodes.map(node => node.id === selectedNode.id ? { ...node, variables: newVars } : node));
                      }}>x</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Error Handling Tab */}
              <TabsContent value="error">
                <div className="space-y-4">
                  <h4 className="font-medium">Retry Policy</h4>
                  {(selectedNode.configuration.retry || []).map((retry, idx) => (
                    <div key={idx} className="border p-2 rounded space-y-2">
                      <input
                        type="text"
                        value={retry.errorEquals.join(',')}
                        onChange={e => {
                          const newRetry = [...(selectedNode.configuration.retry || [])];
                          newRetry[idx].errorEquals = e.target.value.split(',').map(s => s.trim());
                          handleConfigurationChange('retry', newRetry);
                        }}
                        className="w-full rounded border px-2 py-1"
                        placeholder="Error types (comma separated)"
                      />
                      <input
                        type="number"
                        value={retry.intervalSeconds || ''}
                        onChange={e => {
                          const newRetry = [...(selectedNode.configuration.retry || [])];
                          newRetry[idx].intervalSeconds = Number(e.target.value);
                          handleConfigurationChange('retry', newRetry);
                        }}
                        className="w-full rounded border px-2 py-1"
                        placeholder="Interval Seconds"
                      />
                      <input
                        type="number"
                        value={retry.maxAttempts || ''}
                        onChange={e => {
                          const newRetry = [...(selectedNode.configuration.retry || [])];
                          newRetry[idx].maxAttempts = Number(e.target.value);
                          handleConfigurationChange('retry', newRetry);
                        }}
                        className="w-full rounded border px-2 py-1"
                        placeholder="Max Attempts"
                      />
                      <input
                        type="number"
                        value={retry.backoffRate || ''}
                        onChange={e => {
                          const newRetry = [...(selectedNode.configuration.retry || [])];
                          newRetry[idx].backoffRate = Number(e.target.value);
                          handleConfigurationChange('retry', newRetry);
                        }}
                        className="w-full rounded border px-2 py-1"
                        placeholder="Backoff Rate"
                      />
                      <Button size="sm" variant="destructive" onClick={() => {
                        const newRetry = [...(selectedNode.configuration.retry || [])];
                        newRetry.splice(idx, 1);
                        handleConfigurationChange('retry', newRetry);
                      }}>Remove</Button>
                    </div>
                  ))}
                  <Button size="sm" onClick={() => {
                    const newRetry = [...(selectedNode.configuration.retry || []), { errorEquals: ['States.ALL'] }];
                    handleConfigurationChange('retry', newRetry);
                  }}>Add Retry</Button>
                  <h4 className="font-medium mt-4">Catch</h4>
                  {(selectedNode.configuration.catch || []).map((c, idx) => (
                    <div key={idx} className="border p-2 rounded space-y-2">
                      <input
                        type="text"
                        value={c.errorEquals.join(',')}
                        onChange={e => {
                          const newCatch = [...(selectedNode.configuration.catch || [])];
                          newCatch[idx].errorEquals = e.target.value.split(',').map(s => s.trim());
                          handleConfigurationChange('catch', newCatch);
                        }}
                        className="w-full rounded border px-2 py-1"
                        placeholder="Error types (comma separated)"
                      />
                      <input
                        type="text"
                        value={c.next}
                        onChange={e => {
                          const newCatch = [...(selectedNode.configuration.catch || [])];
                          newCatch[idx].next = e.target.value;
                          handleConfigurationChange('catch', newCatch);
                        }}
                        className="w-full rounded border px-2 py-1"
                        placeholder="Next state"
                      />
                      <Button size="sm" variant="destructive" onClick={() => {
                        const newCatch = [...(selectedNode.configuration.catch || [])];
                        newCatch.splice(idx, 1);
                        handleConfigurationChange('catch', newCatch);
                      }}>Remove</Button>
                    </div>
                  ))}
                  <Button size="sm" onClick={() => {
                    const newCatch = [...(selectedNode.configuration.catch || []), { errorEquals: ['States.ALL'], next: '' }];
                    handleConfigurationChange('catch', newCatch);
                  }}>Add Catch</Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center text-gray-500">
              Select a node to view and edit its configuration
            </div>
          )}
        </div>
      </div>
      {renderTestStateModal()}
    </div>
  );
} 