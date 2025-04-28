import { NextResponse } from 'next/server';
import { StepFunctions } from '@aws-sdk/client-stepfunctions';

const stepFunctions = new StepFunctions({});

export async function POST(
  request: Request,
  { params }: { params: { stateMachineArn: string } }
) {
  try {
    const stateMachineArn = decodeURIComponent(params.stateMachineArn);

    // Publish a new version of the state machine
    const response = await stepFunctions.publishStateVersion({
      stateMachineArn
    });

    return NextResponse.json({
      version: response.version
    });
  } catch (error) {
    console.error('Error publishing state machine version:', error);
    return NextResponse.json(
      { error: 'Failed to publish state machine version' },
      { status: 500 }
    );
  }
} 