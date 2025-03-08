import { NextResponse } from 'next/server';
import { S3 } from '@aws-sdk/client-s3';
import { DynamoDB, ScalarAttributeType, KeyType } from '@aws-sdk/client-dynamodb';
import { Lambda } from '@aws-sdk/client-lambda';
import { APIGateway } from '@aws-sdk/client-api-gateway';
import { IAM } from '@aws-sdk/client-iam';

// Initialize AWS clients
const s3Client = new S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const dynamoClient = new DynamoDB({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const lambdaClient = new Lambda({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const apiGatewayClient = new APIGateway({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const iamClient = new IAM({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// S3 Routes
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname.split('/').filter(Boolean);

  try {
    switch (path[1]) {
      case 's3':
        const { Buckets } = await s3Client.listBuckets({});
        return NextResponse.json(Buckets);

      case 'dynamodb':
        const { TableNames } = await dynamoClient.listTables({});
        return NextResponse.json(TableNames);

      case 'lambda':
        const { Functions } = await lambdaClient.listFunctions({});
        return NextResponse.json(Functions);

      case 'apigateway':
        const { items } = await apiGatewayClient.getRestApis({});
        return NextResponse.json(items);

      case 'iam':
        const { Roles } = await iamClient.listRoles({});
        return NextResponse.json(Roles);

      default:
        return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to list ${path[1]} resources` },
      { status: 500 }
    );
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