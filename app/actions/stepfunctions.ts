import { SFNClient, DescribeStateMachineCommand } from '@aws-sdk/client-sfn';

const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

const sfnClient = new SFNClient(config);

export async function getStateMachineDefinition(stateMachineArn: string) {
  try {
    const command = new DescribeStateMachineCommand({
      stateMachineArn
    });
    const response = await sfnClient.send(command);

    return {
      name: response.name || '',
      definition: response.definition || '{}'
    };
  } catch (error) {
    console.error('Error fetching state machine definition:', error);
    throw error;
  }
}

export async function listSNSTopics() {
  try {
    const response = await fetch('/api/aws?service=sns');
    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error listing SNS topics:', error);
    return [];
  }
}

export async function listLambdaFunctions() {
  try {
    const response = await fetch('/api/aws?service=lambda');
    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error listing Lambda functions:', error);
    return [];
  }
}

export async function listSQSQueues() {
  try {
    const response = await fetch('/api/aws?service=sqs');
    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error listing SQS queues:', error);
    return [];
  }
}

export async function listDynamoDBTables() {
  try {
    const response = await fetch('/api/aws?service=dynamodb');
    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error listing DynamoDB tables:', error);
    return [];
  }
}

export async function listS3Buckets() {
  try {
    const response = await fetch('/api/aws?service=s3');
    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error listing S3 buckets:', error);
    return [];
  }
} 