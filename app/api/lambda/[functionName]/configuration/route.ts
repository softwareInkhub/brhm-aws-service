import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, GetFunctionConfigurationCommand, GetFunctionUrlConfigCommand } from '@aws-sdk/client-lambda';

export async function GET(
  request: NextRequest,
  { params }: { params: { functionName: string } }
) {
  const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  try {
    // Get the function configuration
    const functionConfig = await lambdaClient.send(new GetFunctionConfigurationCommand({
      FunctionName: params.functionName,
    }));

    // Try to get the function URL config
    let functionUrlConfig = null;
    try {
      functionUrlConfig = await lambdaClient.send(new GetFunctionUrlConfigCommand({
        FunctionName: params.functionName,
      }));
    } catch (err: any) {
      // If not found, leave as null (do not throw)
      if (!err.name || err.name !== 'ResourceNotFoundException') {
        throw err;
      }
    }

    return NextResponse.json({
      configuration: {
        ...functionConfig,
        FunctionUrlConfig: functionUrlConfig || {},
      },
    });
  } catch (error) {
    console.error('Error fetching Lambda configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Lambda configuration' },
      { status: 500 }
    );
  }
} 