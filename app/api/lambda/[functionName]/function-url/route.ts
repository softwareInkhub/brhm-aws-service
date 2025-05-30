import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, CreateFunctionUrlConfigCommand, GetFunctionUrlConfigCommand, DeleteFunctionUrlConfigCommand, UpdateFunctionUrlConfigCommand } from '@aws-sdk/client-lambda';

export async function POST(
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
    // Create the Function URL
    await lambdaClient.send(new CreateFunctionUrlConfigCommand({
      FunctionName: params.functionName,
      AuthType: 'NONE', // Change to 'AWS_IAM' if you want restricted access
    }));

    // Fetch the full config
    const config = await lambdaClient.send(new GetFunctionUrlConfigCommand({
      FunctionName: params.functionName,
    }));

    return NextResponse.json({ functionUrlConfig: config });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create function URL' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    await lambdaClient.send(new DeleteFunctionUrlConfigCommand({
      FunctionName: params.functionName,
    }));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete function URL' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { functionName: string } }
) {
  const { AuthType } = await request.json();
  const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  try {
    const response = await lambdaClient.send(new UpdateFunctionUrlConfigCommand({
      FunctionName: params.functionName,
      AuthType,
    }));
    return NextResponse.json({ functionUrlConfig: response });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update function URL config' },
      { status: 500 }
    );
  }
} 