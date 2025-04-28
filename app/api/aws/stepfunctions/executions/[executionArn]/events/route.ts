import { NextResponse } from 'next/server';
import { sfnClient } from '../../../../../../aws/client';
import { GetExecutionHistoryCommand } from '@aws-sdk/client-sfn';

export async function GET(request: Request, { params }: { params: { executionArn: string } }) {
  try {
    const { executionArn } = await Promise.resolve(params);
    
    const command = new GetExecutionHistoryCommand({
      executionArn,
      maxResults: 100,
    });

    const response = await sfnClient.send(command);

    return NextResponse.json({
      events: response.events?.map(event => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp?.toISOString(),
        stateEnteredEventDetails: event.stateEnteredEventDetails,
        stateExitedEventDetails: event.stateExitedEventDetails,
        executionStartedEventDetails: event.executionStartedEventDetails,
        executionSucceededEventDetails: event.executionSucceededEventDetails,
        executionFailedEventDetails: event.executionFailedEventDetails,
        executionAbortedEventDetails: event.executionAbortedEventDetails,
      })) || [],
    });
  } catch (error) {
    console.error('Error fetching execution history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution history' },
      { status: 500 }
    );
  }
} 