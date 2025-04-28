import { NextResponse } from 'next/server';
import { 
  SFNClient, 
  ListStateMachinesCommand,
  DescribeStateMachineCommand,
  ListExecutionsCommand
} from "@aws-sdk/client-sfn";

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function GET() {
  try {
    const command = new ListStateMachinesCommand({});
    const response = await sfnClient.send(command);

    return NextResponse.json({
      stateMachines: response.stateMachines || [],
      nextToken: response.nextToken
    });
  } catch (error: any) {
    console.error('Error fetching state machines:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch state machines' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stateMachineArn } = body;

    // Get state machine details
    const describeCommand = new DescribeStateMachineCommand({
      stateMachineArn
    });
    const stateMachine = await sfnClient.send(describeCommand);

    // Get recent executions
    const executionsCommand = new ListExecutionsCommand({
      stateMachineArn,
      maxResults: 10
    });
    const executions = await sfnClient.send(executionsCommand);

    return NextResponse.json({
      stateMachine,
      executions: executions.executions || []
    });
  } catch (error: any) {
    console.error('Error fetching state machine details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch state machine details' },
      { status: 500 }
    );
  }
} 