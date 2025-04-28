import { NextResponse } from 'next/server';
import { StepFunctions } from '@aws-sdk/client-stepfunctions';

const stepFunctions = new StepFunctions({});

export async function GET(
  request: Request,
  { params }: { params: { stateMachineArn: string } }
) {
  try {
    const stateMachineArn = decodeURIComponent(params.stateMachineArn);

    // Get the state machine definition
    const { definition, roleArn, type, loggingConfiguration, name } = await stepFunctions.describeStateMachine({
      stateMachineArn
    });

    // Create Infrastructure Composer format
    const infraComposerDefinition = {
      version: '2021-11-01',
      metadata: {
        name,
        description: 'Exported from AWS Step Functions'
      },
      resources: {
        stepFunctions: {
          [name]: {
            type: 'AWS::StepFunctions::StateMachine',
            properties: {
              definition: JSON.parse(definition),
              roleArn,
              type,
              loggingConfiguration
            }
          }
        }
      },
      dependencies: {}
    };

    return new NextResponse(JSON.stringify(infraComposerDefinition, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename=infracomposer.json'
      }
    });
  } catch (error) {
    console.error('Error exporting to Infrastructure Composer:', error);
    return NextResponse.json(
      { error: 'Failed to export to Infrastructure Composer' },
      { status: 500 }
    );
  }
} 