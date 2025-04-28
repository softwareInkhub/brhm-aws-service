import { NextResponse } from 'next/server';
import { 
  CloudWatchLogsClient, 
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommandInput,
  GetLogEventsCommandInput,
  LogStream
} from '@aws-sdk/client-cloudwatch-logs';

const cloudWatchLogs = new CloudWatchLogsClient({
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
    const timeRange = searchParams.get('timeRange') || '3h';

    if (!stateMachineArn) {
      return NextResponse.json(
        { error: 'stateMachineArn is required' },
        { status: 400 }
      );
    }

    // Extract state machine name and account info from ARN
    const arnParts = stateMachineArn.split(':');
    const region = arnParts[3];
    const accountId = arnParts[4];
    const stateMachineName = arnParts[6] || arnParts.pop() || '';
    
    // Find the log group for this state machine
    const describeLogGroupsCommand = new DescribeLogGroupsCommand({
      logGroupNamePrefix: `/aws/states/${stateMachineName}`,
      limit: 1
    });

    const logGroupResponse = await cloudWatchLogs.send(describeLogGroupsCommand);
    const logGroup = logGroupResponse.logGroups?.[0];

    if (!logGroup) {
      return NextResponse.json({ 
        logs: [],
        logGroupInfo: {
          name: `/aws/states/${stateMachineName}`,
          arn: `arn:aws:logs:${region}:${accountId}:log-group:/aws/states/${stateMachineName}:*`,
          exists: false
        }
      });
    }

    // Calculate start time based on time range
    const now = Date.now();
    const timeRanges: { [key: string]: number } = {
      '1h': 60 * 60 * 1000,
      '3h': 3 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };

    const startTime = now - (timeRanges[timeRange] || timeRanges['3h']);

    // Get log streams
    const describeStreamsInput: DescribeLogStreamsCommandInput = {
      logGroupName: logGroup.logGroupName,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 5
    };

    const streamsCommand = new DescribeLogStreamsCommand(describeStreamsInput);
    const streamsResponse = await cloudWatchLogs.send(streamsCommand);
    
    if (!streamsResponse.logStreams || streamsResponse.logStreams.length === 0) {
      return NextResponse.json({ 
        logs: [],
        logGroupInfo: {
          name: logGroup.logGroupName,
          arn: logGroup.arn,
          exists: true,
          creationTime: logGroup.creationTime,
          retentionInDays: logGroup.retentionInDays,
          storedBytes: logGroup.storedBytes
        }
      });
    }

    // Fetch events from each stream in parallel
    const logPromises = streamsResponse.logStreams.map(async (stream) => {
      const getEventsInput: GetLogEventsCommandInput = {
        logGroupName: logGroup.logGroupName,
        logStreamName: stream.logStreamName,
        startTime,
        endTime: now,
        startFromHead: false,
        limit: 100
      };

      const eventsCommand = new GetLogEventsCommand(getEventsInput);
      const eventsResponse = await cloudWatchLogs.send(eventsCommand);

      return eventsResponse.events || [];
    });

    const allEventsArrays = await Promise.all(logPromises);
    
    // Flatten and sort all events by timestamp
    const allEvents = allEventsArrays
      .flat()
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Format the logs
    const logs = allEvents.map((event, index) => {
      const message = event.message || '';
      let type = 'Unknown';
      let details = message;

      try {
        const parsedMessage = JSON.parse(message);
        type = parsedMessage.type || message.split(' ')[0] || 'Unknown';
        details = JSON.stringify(parsedMessage, null, 2);
      } catch {
        const parts = message.split(' ');
        type = parts[0];
        details = message;
      }

      return {
        id: index + 1,
        timestamp: new Date(event.timestamp || 0).toISOString(),
        logStream: event.logStreamName || '',
        type,
        details
      };
    });

    return NextResponse.json({
      logs,
      logGroupInfo: {
        name: logGroup.logGroupName,
        arn: logGroup.arn,
        exists: true,
        creationTime: logGroup.creationTime,
        retentionInDays: logGroup.retentionInDays,
        storedBytes: logGroup.storedBytes
      }
    });
  } catch (error) {
    console.error('Error fetching CloudWatch logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
} 