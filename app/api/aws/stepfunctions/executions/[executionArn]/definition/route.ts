import { NextResponse } from 'next/server';
import { SFNClient, DescribeStateMachineForExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function GET(request: Request, { params }: { params: { executionArn: string } }) {
  try {
    const { executionArn } = await Promise.resolve(params);
    
    const command = new DescribeStateMachineForExecutionCommand({
      executionArn,
    });

    const response = await sfnClient.send(command);
    const definition = JSON.parse(response.definition || '{}');

    return NextResponse.json({ definition });
  } catch (error) {
    console.error('Error fetching state machine definition:', error);
    return NextResponse.json(
      { error: 'Failed to fetch state machine definition' },
      { status: 500 }
    );
  }
} 