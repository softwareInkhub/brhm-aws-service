import { NextResponse } from 'next/server';
import { 
  SFNClient,
  UpdateStateMachineCommand,
  DescribeStateMachineCommand
} from "@aws-sdk/client-sfn";

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function PUT(
  request: Request,
  context: { params: { stateMachineArn: string } }
) {
  try {
    const { definition } = await request.json();
    const params = await context.params;
    const stateMachineArn = decodeURIComponent(params.stateMachineArn);

    // Validate definition before sending
    if (!definition || !definition.States || !definition.StartAt) {
      return NextResponse.json(
        { error: 'Invalid state machine definition' },
        { status: 400 }
      );
    }

    // Update the state machine
    const updateCommand = new UpdateStateMachineCommand({
      stateMachineArn,
      definition: JSON.stringify(definition),
    });

    await sfnClient.send(updateCommand);

    // Get updated state machine details
    const describeCommand = new DescribeStateMachineCommand({
      stateMachineArn
    });

    const response = await sfnClient.send(describeCommand);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error updating state machine:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update state machine' },
      { status: 500 }
    );
  }
} 