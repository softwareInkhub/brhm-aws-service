import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, ListVersionsByFunctionCommand } from '@aws-sdk/client-lambda';

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
    const command = new ListVersionsByFunctionCommand({
      FunctionName: params.functionName,
      MaxItems: 50,
    });
    const response = await lambdaClient.send(command);
    return NextResponse.json({ versions: response.Versions?.map(v => v.Version) || [] });
  } catch (error) {
    console.error('Error fetching Lambda versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Lambda versions' },
      { status: 500 }
    );
  }
} 