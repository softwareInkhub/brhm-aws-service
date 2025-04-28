import { NextResponse } from 'next/server';
import { SFNClient, TestStateCommand } from "@aws-sdk/client-sfn";

interface StateDefinition {
  Comment?: string;
  Type: string;
  Resource?: string;
  Parameters?: Record<string, any>;
  ResultPath?: string;
  OutputPath?: string;
  InputPath?: string;
  End?: boolean;
}

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Default role ARN for testing states
const DEFAULT_ROLE_ARN = 'arn:aws:iam::715841362541:role/monty-step-function';

export async function POST(request: Request) {
  try {
    const { definition, input, stateName } = await request.json();

    // Ensure we have a valid state definition
    if (!definition?.States || !definition.States[stateName]) {
      throw new Error('Invalid state definition');
    }

    // Get the specific state definition
    const stateDefinition = definition.States[stateName];

    // Ensure the Type field exists
    if (!stateDefinition.Type) {
      throw new Error('State definition is missing the required "Type" field.');
    }

    // Validate and parse input
    let parsedInput = {};
    if (input && input.trim()) {
      try {
        parsedInput = JSON.parse(input);
      } catch (e) {
        throw new Error('Invalid JSON input');
      }
    }

    const command = new TestStateCommand({
      definition: JSON.stringify(stateDefinition),
      roleArn: process.env.STEP_FUNCTION_ROLE_ARN || DEFAULT_ROLE_ARN,
      input: JSON.stringify(parsedInput || {})
    });

    const response = await sfnClient.send(command);

    return NextResponse.json({
      output: response.output ? JSON.parse(response.output) : null
    });
  } catch (error: any) {
    console.error('Error testing state:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to test state' },
      { status: 500 }
    );
  }
}
