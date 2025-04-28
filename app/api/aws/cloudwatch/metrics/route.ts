import { NextResponse } from 'next/server';
import { cloudWatchClient } from '../../../../../aws/client';
import { GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stateMachineArn = searchParams.get('stateMachineArn');
  const period = parseInt(searchParams.get('period') || '3600');
  
  console.log('Fetching CloudWatch metrics for:', { stateMachineArn, period });
  
  if (!stateMachineArn) {
    return NextResponse.json({ error: 'stateMachineArn is required' }, { status: 400 });
  }

  const now = new Date();
  const startTime = new Date(now.getTime() - (period * 1000));

  try {
    const command = new GetMetricDataCommand({
      StartTime: startTime,
      EndTime: now,
      MetricDataQueries: [
        {
          Id: 'executionsStarted',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/States',
              MetricName: 'ExecutionsStarted',
              Dimensions: [
                {
                  Name: 'StateMachineArn',
                  Value: stateMachineArn
                }
              ]
            },
            Period: 60,
            Stat: 'Sum'
          }
        },
        {
          Id: 'executionsSucceeded',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/States',
              MetricName: 'ExecutionsSucceeded',
              Dimensions: [
                {
                  Name: 'StateMachineArn',
                  Value: stateMachineArn
                }
              ]
            },
            Period: 60,
            Stat: 'Sum'
          }
        },
        {
          Id: 'executionsFailed',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/States',
              MetricName: 'ExecutionsFailed',
              Dimensions: [
                {
                  Name: 'StateMachineArn',
                  Value: stateMachineArn
                }
              ]
            },
            Period: 60,
            Stat: 'Sum'
          }
        },
        {
          Id: 'executionsTimedOut',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/States',
              MetricName: 'ExecutionsTimedOut',
              Dimensions: [
                {
                  Name: 'StateMachineArn',
                  Value: stateMachineArn
                }
              ]
            },
            Period: 60,
            Stat: 'Sum'
          }
        },
        {
          Id: 'executionsAborted',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/States',
              MetricName: 'ExecutionsAborted',
              Dimensions: [
                {
                  Name: 'StateMachineArn',
                  Value: stateMachineArn
                }
              ]
            },
            Period: 60,
            Stat: 'Sum'
          }
        },
        {
          Id: 'executionTime',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/States',
              MetricName: 'ExecutionTime',
              Dimensions: [
                {
                  Name: 'StateMachineArn',
                  Value: stateMachineArn
                }
              ]
            },
            Period: 60,
            Stat: 'Average'
          }
        }
      ]
    });

    console.log('Sending CloudWatch metrics request:', command);
    const response = await cloudWatchClient.send(command);
    console.log('Received CloudWatch metrics response:', response);

    // Process and format the metrics data
    const metrics = {
      executionsStarted: response.MetricDataResults?.find(m => m.Id === 'executionsStarted'),
      executionsSucceeded: response.MetricDataResults?.find(m => m.Id === 'executionsSucceeded'),
      executionErrors: {
        failed: response.MetricDataResults?.find(m => m.Id === 'executionsFailed'),
        timedOut: response.MetricDataResults?.find(m => m.Id === 'executionsTimedOut'),
        aborted: response.MetricDataResults?.find(m => m.Id === 'executionsAborted')
      },
      executionDuration: response.MetricDataResults?.find(m => m.Id === 'executionTime')
    };
    console.log('Processed metrics:', metrics);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching CloudWatch metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
} 