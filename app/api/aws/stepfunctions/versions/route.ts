import { NextResponse } from 'next/server';
import { 
  SFNClient, 
  ListStateMachineVersionsCommand,
  PublishStateMachineVersionCommand,
  DeleteStateMachineVersionCommand,
  DescribeStateMachineCommand,
  ListExecutionsCommand
} from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateMachineArn = searchParams.get('stateMachineArn');
    const nextToken = searchParams.get('nextToken');

    if (!stateMachineArn) {
      return NextResponse.json(
        { error: 'stateMachineArn is required' },
        { status: 400 }
      );
    }

    // Get versions
    const versionsCommand = new ListStateMachineVersionsCommand({
      stateMachineArn,
      nextToken: nextToken || undefined,
      maxResults: 10
    });

    const versionsResponse = await sfnClient.send(versionsCommand);
    const versions = versionsResponse.stateMachineVersions || [];

    // For each version, get its last execution
    const versionsWithDetails = await Promise.all(versions.map(async (version) => {
      try {
        // Get version details
        const describeCommand = new DescribeStateMachineCommand({
          stateMachineArn: `${stateMachineArn}:${version.version}`
        });
        const describeResponse = await sfnClient.send(describeCommand);

        // Get last execution
        const executionsCommand = new ListExecutionsCommand({
          stateMachineArn: `${stateMachineArn}:${version.version}`,
          maxResults: 1
        });
        const executionsResponse = await sfnClient.send(executionsCommand);
        const lastExecution = executionsResponse.executions?.[0];

        return {
          ...version,
          description: describeResponse.description || '',
          lastExecutedDate: lastExecution?.startDate?.toISOString() || null
        };
      } catch (error) {
        console.error(`Error getting details for version ${version.version}:`, error);
        return version;
      }
    }));

    return NextResponse.json({
      versions: versionsWithDetails,
      nextToken: versionsResponse.nextToken
    });
  } catch (error) {
    console.error('Error listing state machine versions:', error);
    return NextResponse.json(
      { error: 'Failed to list versions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { stateMachineArn, description } = await request.json();

    if (!stateMachineArn) {
      return NextResponse.json(
        { error: 'stateMachineArn is required' },
        { status: 400 }
      );
    }

    // Get current state machine definition
    const describeCommand = new DescribeStateMachineCommand({
      stateMachineArn
    });
    const currentMachine = await sfnClient.send(describeCommand);

    // Publish new version
    const command = new PublishStateMachineVersionCommand({
      stateMachineArn,
      description: description || undefined
    });

    const response = await sfnClient.send(command);

    return NextResponse.json({
      version: response.version,
      creationDate: response.creationDate,
      stateMachineVersionArn: response.stateMachineVersionArn
    });
  } catch (error) {
    console.error('Error publishing state machine version:', error);
    return NextResponse.json(
      { error: 'Failed to publish version' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateMachineArn = searchParams.get('stateMachineArn');
    const version = searchParams.get('version');

    if (!stateMachineArn || !version) {
      return NextResponse.json(
        { error: 'stateMachineArn and version are required' },
        { status: 400 }
      );
    }

    // Construct the full version ARN
    const stateMachineVersionArn = `${stateMachineArn}:${version}`;
    
    const command = new DeleteStateMachineVersionCommand({
      stateMachineVersionArn
    });

    try {
      await sfnClient.send(command);
      return NextResponse.json({ success: true });
    } catch (awsError: any) {
      console.error('AWS Error deleting state machine version:', awsError);
      
      // Handle specific AWS errors
      if (awsError.name === 'ResourceNotFoundException') {
        return NextResponse.json(
          { error: 'Version not found' },
          { status: 404 }
        );
      } else if (awsError.name === 'ValidationException') {
        return NextResponse.json(
          { error: awsError.message },
          { status: 400 }
        );
      }
      
      throw awsError; // Re-throw for general error handling
    }
  } catch (error: any) {
    console.error('Error deleting state machine version:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete version',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 