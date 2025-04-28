import { NextResponse } from 'next/server';
import { StepFunctions } from '@aws-sdk/client-stepfunctions';

const stepFunctions = new StepFunctions({});

export async function POST(request: Request) {
  try {
    const { sourceArn, newName } = await request.json();

    // Get the original state machine's definition
    const describeResponse = await stepFunctions.describeStateMachine({
      stateMachineArn: sourceArn
    });

    // Create a new state machine with the same definition
    const createResponse = await stepFunctions.createStateMachine({
      name: newName,
      definition: describeResponse.definition,
      roleArn: describeResponse.roleArn,
      type: describeResponse.type,
      loggingConfiguration: describeResponse.loggingConfiguration,
      tags: describeResponse.tags
    });

    return NextResponse.json({
      stateMachineArn: createResponse.stateMachineArn
    });
  } catch (error) {
    console.error('Error copying state machine:', error);
    return NextResponse.json(
      { error: 'Failed to copy state machine' },
      { status: 500 }
    );
  }
} 