import { NextResponse } from 'next/server';
import { SFNClient, ListExecutionsCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateMachineArn = searchParams.get('stateMachineArn');
    const stateMachineName = searchParams.get('stateMachineName');

    let arn = stateMachineArn;
    
    // If stateMachineArn is not provided but stateMachineName is, construct the ARN
    if (!arn && stateMachineName) {
      arn = `arn:aws:states:us-east-1:715841362541:stateMachine:${stateMachineName}`;
    }

    if (!arn) {
      return NextResponse.json(
        { error: 'Either stateMachineArn or stateMachineName is required' },
        { status: 400 }
      );
    }

    const command = new ListExecutionsCommand({
      stateMachineArn: arn,
      maxResults: 100,
    });

    const response = await sfnClient.send(command);

    return NextResponse.json({
      executions: response.executions || [],
    });
  } catch (error) {
    console.error('Error listing executions:', error);
    return NextResponse.json(
      { error: 'Failed to list executions' },
      { status: 500 }
    );
  }
} 