import { NextResponse } from 'next/server';
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

export async function POST(request: Request) {
  try {
    const { stateMachineArn, input } = await request.json();

    if (!stateMachineArn) {
      return NextResponse.json(
        { message: 'State machine ARN is required' },
        { status: 400 }
      );
    }

    const command = new StartExecutionCommand({
      stateMachineArn,
      input: input || '{}'
    });

    const response = await sfnClient.send(command);
    
    return NextResponse.json({
      executionArn: response.executionArn,
      startDate: response.startDate
    });
  } catch (error: any) {
    console.error('Error starting execution:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to start execution' },
      { status: 500 }
    );
  }
} 