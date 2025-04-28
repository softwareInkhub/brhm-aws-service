import { NextResponse } from 'next/server';
import { sfnClient } from '../../../../../aws/client';
import { DescribeExecutionCommand } from '@aws-sdk/client-sfn';

export async function GET(request: Request, { params }: { params: { executionArn: string } }) {
  try {
    // Await the params to fix the Next.js dynamic route parameter issue
    const { executionArn } = await Promise.resolve(params);
    
    const command = new DescribeExecutionCommand({
      executionArn,
    });

    const response = await sfnClient.send(command);

    // Format input and output JSON if they exist
    let formattedInput = response.input;
    let formattedOutput = response.output;

    try {
      if (response.input) {
        formattedInput = JSON.stringify(JSON.parse(response.input), null, 2);
      }
    } catch (e) {
      console.error('Error parsing input JSON:', e);
    }

    try {
      if (response.output) {
        formattedOutput = JSON.stringify(JSON.parse(response.output), null, 2);
      }
    } catch (e) {
      console.error('Error parsing output JSON:', e);
    }

    return NextResponse.json({
      ...response,
      formattedInput,
      formattedOutput,
    });
  } catch (error) {
    console.error('Error fetching execution details:', error);
    return NextResponse.json({ error: 'Failed to fetch execution details' }, { status: 500 });
  }
} 