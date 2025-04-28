import { NextResponse } from 'next/server';
import { SFNClient, CreateStateMachineCommand } from '@aws-sdk/client-sfn';
import { CloudWatchLogsClient, CreateLogGroupCommand } from '@aws-sdk/client-cloudwatch-logs';

export async function POST(request: Request) {
  try {
    const { name, type, definition } = await request.json();
    const roleArn = process.env.STEP_FUNCTIONS_ROLE_ARN;
    const region = process.env.AWS_REGION || 'us-east-1';
    const accountId = process.env.AWS_ACCOUNT_ID;

    if (!roleArn) {
      throw new Error('STEP_FUNCTIONS_ROLE_ARN environment variable is not set');
    }

    if (!accountId) {
      throw new Error('AWS_ACCOUNT_ID environment variable is not set');
    }

    // Verify the role ARN matches the current account
    const roleAccountId = roleArn.split(':')[4];
    if (roleAccountId !== accountId) {
      throw new Error(`Role ARN account ID (${roleAccountId}) does not match current account ID (${accountId})`);
    }

    // Default definition for blank state machines
    const defaultDefinition = JSON.stringify({
      Comment: 'A simple state machine',
      StartAt: 'FirstState',
      States: {
        FirstState: {
          Type: 'Pass',
          End: true,
          Parameters: {
            message: 'Hello from Step Functions!'
          }
        }
      }
    });

    // Use provided definition or default if creating from blank
    const stateDefinition = definition || defaultDefinition;

    // Create CloudWatch Logs client
    const logsClient = new CloudWatchLogsClient({ region });

    // Create Log Group
    const logGroupName = `/aws/states/${name}`;
    try {
      await logsClient.send(
        new CreateLogGroupCommand({
          logGroupName: logGroupName
        })
      );
    } catch (error: any) {
      // Ignore if log group already exists
      if (error.name !== 'ResourceAlreadyExistsException') {
        throw error;
      }
    }

    // Create Step Functions client
    const stepFunctionsClient = new SFNClient({ region });

    // Create state machine
    const stateMachine = await stepFunctionsClient.send(
      new CreateStateMachineCommand({
        name: name,
        definition: stateDefinition,
        roleArn: roleArn,
        type: type,
        loggingConfiguration: {
          level: 'ALL',
          includeExecutionData: true,
          destinations: [
            {
              cloudWatchLogsLogGroup: {
                logGroupArn: `arn:aws:logs:${region}:${accountId}:log-group:${logGroupName}:*`
              }
            }
          ]
        }
      })
    );

    return NextResponse.json({
      stateMachineArn: stateMachine.stateMachineArn,
      message: 'State machine created successfully'
    });
  } catch (error: any) {
    console.error('Error creating state machine:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to create state machine';
    
    if (errorMessage.includes('Cross-account pass role is not allowed')) {
      errorMessage = 'The IAM role does not have the correct trust relationship. Please ensure the role trusts Step Functions to assume it.';
    } else if (errorMessage.includes('AccessDeniedException')) {
      errorMessage = 'Access denied. Please check your AWS credentials and permissions.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 