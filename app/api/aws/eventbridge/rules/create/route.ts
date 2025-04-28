import { NextResponse } from 'next/server';
import { EventBridge } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridge({});

export async function POST(request: Request) {
  try {
    const { stateMachineArn, name } = await request.json();

    // Create an EventBridge rule that triggers the state machine
    const response = await eventBridge.putRule({
      Name: name,
      Description: `Rule to trigger state machine: ${stateMachineArn}`,
      ScheduleExpression: 'rate(1 day)', // Default to daily schedule
      State: 'ENABLED',
      Tags: [
        {
          Key: 'CreatedBy',
          Value: 'StepFunctionsConsole'
        }
      ]
    });

    // Add target to the rule
    await eventBridge.putTargets({
      Rule: name,
      Targets: [
        {
          Id: `${name}-target`,
          Arn: stateMachineArn,
          RoleArn: `arn:aws:iam::${stateMachineArn.split(':')[4]}:role/service-role/StepFunctions-EventBridge-role`
        }
      ]
    });

    return NextResponse.json({
      ruleArn: response.RuleArn
    });
  } catch (error) {
    console.error('Error creating EventBridge rule:', error);
    return NextResponse.json(
      { error: 'Failed to create EventBridge rule' },
      { status: 500 }
    );
  }
} 