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
    const { definition, roleArn, type, loggingConfiguration } = await stepFunctions.describeStateMachine({
      stateMachineArn
    });

    // Create CloudFormation template
    const template = {
      AWSTemplateFormatVersion: '2010-09-09',
      Description: 'AWS Step Functions state machine',
      Resources: {
        StateMachine: {
          Type: 'AWS::StepFunctions::StateMachine',
          Properties: {
            DefinitionString: definition,
            RoleArn: roleArn,
            StateMachineType: type,
            LoggingConfiguration: loggingConfiguration
          }
        }
      },
      Outputs: {
        StateMachineArn: {
          Description: 'ARN of the state machine',
          Value: { Ref: 'StateMachine' }
        }
      }
    };

    // Convert to YAML format
    const yaml = JSON.stringify(template, null, 2)
      .replace(/"(\w+)":/g, '$1:')
      .replace(/"/g, "'");

    return new NextResponse(yaml, {
      headers: {
        'Content-Type': 'application/x-yaml',
        'Content-Disposition': 'attachment; filename=template.yaml'
      }
    });
  } catch (error) {
    console.error('Error exporting to CloudFormation:', error);
    return NextResponse.json(
      { error: 'Failed to export to CloudFormation' },
      { status: 500 }
    );
  }
} 