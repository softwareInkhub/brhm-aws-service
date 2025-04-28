import { NextResponse } from 'next/server';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

export async function POST(request: Request) {
  try {
    const { name, input, stateMachineArn } = await request.json();
    const region = process.env.AWS_REGION || 'us-east-1';

    const client = new SFNClient({ region });

    const command = new StartExecutionCommand({
      stateMachineArn,
      name,
      input: input || '{}',
    });

    const response = await client.send(command);

    return NextResponse.json({
      executionArn: response.executionArn,
      message: 'Execution started successfully'
    });
  } catch (error: any) {
    console.error('Error starting execution:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start execution' },
      { status: 500 }
    );
  }
} 