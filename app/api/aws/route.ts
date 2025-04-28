import { NextResponse } from 'next/server';
import { SFNClient } from '@aws-sdk/client-sfn';
import { SNSClient, ListTopicsCommand } from "@aws-sdk/client-sns";
import { LambdaClient, ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { SQSClient, ListQueuesCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

// Initialize AWS clients with the same config
const sfnClient = new SFNClient(config);
const snsClient = new SNSClient(config);
const lambdaClient = new LambdaClient(config);
const sqsClient = new SQSClient(config);
const dynamodbClient = new DynamoDBClient(config);
const s3Client = new S3Client(config);

// S3 Routes
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service');

  try {
    let data;
    switch (service) {
      case 'sns':
        const snsResponse = await snsClient.send(new ListTopicsCommand({}));
        data = snsResponse.Topics?.map(topic => topic.TopicArn) || [];
        break;

      case 'lambda':
        const lambdaResponse = await lambdaClient.send(new ListFunctionsCommand({}));
        data = lambdaResponse.Functions?.map(fn => ({
          arn: fn.FunctionArn,
          name: fn.FunctionName
        })) || [];
        break;

      case 'sqs':
        const sqsResponse = await sqsClient.send(new ListQueuesCommand({}));
        data = sqsResponse.QueueUrls || [];
        break;

      case 'dynamodb':
        const dynamoResponse = await dynamodbClient.send(new ListTablesCommand({}));
        data = dynamoResponse.TableNames || [];
        break;

      case 's3':
        const s3Response = await s3Client.send(new ListBucketsCommand({}));
        data = s3Response.Buckets?.map(bucket => bucket.Name) || [];
        break;

      default:
        return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error(`Error fetching ${service} resources:`, error);
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname.split('/').filter(Boolean);
  const body = await request.json();

  try {
    switch (path[1]) {
      case 's3':
        const { name, region, versioning, encryption } = body;
        const createBucketParams = {
          Bucket: name,
          CreateBucketConfiguration: {
            LocationConstraint: region,
          },
        };

        await s3Client.createBucket(createBucketParams);

        if (versioning) {
          await s3Client.putBucketVersioning({
            Bucket: name,
            VersioningConfiguration: { Status: 'Enabled' },
          });
        }

        if (encryption) {
          await s3Client.putBucketEncryption({
            Bucket: name,
            ServerSideEncryptionConfiguration: {
              Rules: [{
                ApplyServerSideEncryptionByDefault: { SSEAlgorithm: encryption },
              }],
            },
          });
        }
        return NextResponse.json({ message: 'Bucket created successfully' }, { status: 201 });

      case 'dynamodb':
        const { tableName, partitionKey, sortKey, billingMode, readCapacity, writeCapacity } = body;
        const createTableParams = {
          TableName: tableName,
          KeySchema: [
            { AttributeName: partitionKey, KeyType: KeyType.HASH },
            ...(sortKey ? [{ AttributeName: sortKey, KeyType: KeyType.RANGE }] : []),
          ],
          AttributeDefinitions: [
            { AttributeName: partitionKey, AttributeType: ScalarAttributeType.S },
            ...(sortKey ? [{ AttributeName: sortKey, AttributeType: ScalarAttributeType.S }] : []),
          ],
          BillingMode: billingMode,
          ...(billingMode === 'PROVISIONED' && {
            ProvisionedThroughput: {
              ReadCapacityUnits: readCapacity,
              WriteCapacityUnits: writeCapacity,
            },
          }),
        };

        await dynamoClient.createTable(createTableParams);
        return NextResponse.json({ message: 'Table created successfully' }, { status: 201 });

      case 'lambda':
        const { functionName, runtime, handler, timeout, memorySize, environment } = body;
        const createFunctionParams = {
          FunctionName: functionName,
          Runtime: runtime,
          Handler: handler,
          Timeout: timeout,
          MemorySize: memorySize,
          Environment: { Variables: environment },
          Role: process.env.AWS_LAMBDA_ROLE_ARN,
          Code: {
            ZipFile: Buffer.from('exports.handler = async (event) => { return { statusCode: 200, body: "Hello from Lambda!" }; };'),
          },
        };

        await lambdaClient.createFunction(createFunctionParams);
        return NextResponse.json({ message: 'Function created successfully' }, { status: 201 });

      case 'apigateway':
        const { name: apiName, description, endpointType, protocol } = body;
        const createApiParams = {
          name: apiName,
          description,
          endpointConfiguration: { types: [endpointType] },
          protocol,
        };

        const { id } = await apiGatewayClient.createRestApi(createApiParams);
        return NextResponse.json({ id, message: 'API Gateway created successfully' }, { status: 201 });

      case 'iam':
        const { roleName, assumeRolePolicy, managedPolicies, inlinePolicies } = body;
        const createRoleParams = {
          RoleName: roleName,
          AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
        };

        const { Role } = await iamClient.createRole(createRoleParams);

        if (managedPolicies?.length) {
          await Promise.all(
            managedPolicies.map((policyArn: string) =>
              iamClient.attachRolePolicy({
                RoleName: roleName,
                PolicyArn: policyArn,
              })
            )
          );
        }

        if (inlinePolicies) {
          await Promise.all(
            Object.entries(inlinePolicies).map(([policyName, policyDocument]) =>
              iamClient.putRolePolicy({
                RoleName: roleName,
                PolicyName: policyName,
                PolicyDocument: JSON.stringify(policyDocument),
              })
            )
          );
        }

        return NextResponse.json({ Role, message: 'Role created successfully' }, { status: 201 });

      default:
        return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to create ${path[1]} resource` },
      { status: 500 }
    );
  }
} 