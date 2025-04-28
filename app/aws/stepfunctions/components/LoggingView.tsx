import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { ExternalLink, RefreshCw, Maximize2, MoreVertical, ChevronRight, ChevronDown } from 'lucide-react';
import React from 'react';

interface LoggingViewProps {
  stateMachineArn: string;
}

interface LogEntry {
  id: number;
  timestamp: string;
  logStream: string;
  type: string;
  details: string;
  attributes?: Record<string, any>;
}

interface LogGroupInfo {
  name: string;
  arn: string;
  exists: boolean;
  creationTime?: number;
  retentionInDays?: number;
  storedBytes?: number;
}

export function LoggingView({ stateMachineArn }: LoggingViewProps) {
  const [logLevel, setLogLevel] = useState('ALL');
  const [includeExecutionData, setIncludeExecutionData] = useState(true);
  const [timeRange, setTimeRange] = useState('3h');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logGroupInfo, setLogGroupInfo] = useState<LogGroupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timezone, setTimezone] = useState('UTC');
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/aws/stepfunctions/logs?stateMachineArn=${encodeURIComponent(stateMachineArn)}&timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      
      setLogs(data.logs.map((log: LogEntry) => {
        try {
          const parsedDetails = JSON.parse(log.details);
          return {
            ...log,
            details: JSON.stringify(parsedDetails, null, 2),
            attributes: {
              '@entity.KeyAttributes.identifier': parsedDetails?.stateMachineArn || '',
              '@entity.KeyAttributes.ResourceType': 'AWS::StepFunctions::StateMachine',
              '@entity.KeyAttributes.Type': 'AWS::Resource',
              '@ingestionTime': log.timestamp,
              '@log': parsedDetails?.logGroupName || '',
              '@logStream': log.logStream,
              '@message': log.details,
              '@timestamp': log.timestamp,
              'details.output': parsedDetails?.output || '',
              'details.outputDetails.truncated': parsedDetails?.truncated || false,
              'event_timestamp': log.timestamp,
              'execution_arn': parsedDetails?.executionArn || '',
              'id': log.id,
              'previous_event_id': parsedDetails?.previousEventId || '',
              'redrive_count': parsedDetails?.redriveCount || 0,
              'type': log.type
            }
          };
        } catch {
          return log;
        }
      }));
      setLogGroupInfo(data.logGroupInfo);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [stateMachineArn, timeRange]);

  const timeRangeOptions = ['1h', '3h', '12h', '1d', '3d', '1w', 'Custom'];

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const truncateDetails = (details: string) => {
    try {
      const parsed = JSON.parse(details);
      return JSON.stringify(parsed).slice(0, 100) + '...';
    } catch {
      return details.length > 100 ? details.slice(0, 100) + '...' : details;
    }
  };

  const getLogGroupConsoleUrl = () => {
    if (!logGroupInfo) return '#';
    const region = stateMachineArn.split(':')[3];
    return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group=${encodeURIComponent(logGroupInfo.name)}`;
  };

  const getLearnMoreUrl = () => {
    return 'https://docs.aws.amazon.com/step-functions/latest/dg/cloudwatch-logs.html';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Logging Configuration Section */}
      <div className="border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-medium">Logging configuration</h2>
          <button className="text-blue-600 hover:text-blue-800 text-sm">
            info
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Log level</label>
              <Select value={logLevel} onValueChange={setLogLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select log level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="FATAL">FATAL</SelectItem>
                  <SelectItem value="OFF">OFF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Include execution data</label>
              <div className="flex items-center">
                <Switch
                  checked={includeExecutionData}
                  onCheckedChange={setIncludeExecutionData}
                />
                <span className="ml-2">{includeExecutionData ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CloudWatch log group</label>
            <div className="flex items-center gap-2">
              <a
                href={getLearnMoreUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Learn more <ExternalLink className="inline-block w-3 h-3" />
              </a>
            </div>
            <div className="mt-2">
              {logGroupInfo && (
                <div className="space-y-2">
                  <a
                    href={getLogGroupConsoleUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    {logGroupInfo.name}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {!logGroupInfo.exists && (
                    <div className="text-sm text-yellow-600">
                      This log group will be created when logging is enabled and the state machine is executed.
                    </div>
                  )}
                  {logGroupInfo.exists && (
                    <div className="text-sm text-gray-500">
                      Created {new Date(logGroupInfo.creationTime || 0).toLocaleDateString()}
                      {logGroupInfo.retentionInDays && ` • ${logGroupInfo.retentionInDays} days retention`}
                      {logGroupInfo.storedBytes && ` • ${(logGroupInfo.storedBytes / 1024 / 1024).toFixed(2)} MB stored`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CloudWatch Logs Insights Section */}
      <div className="border rounded-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h3 className="font-medium">CloudWatch Logs Insights</h3>
            <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
              Investigate with AI - new
            </button>
          </div>
          <div className="flex items-center gap-2">
            {timeRangeOptions.map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC timezone</SelectItem>
                <SelectItem value="LOCAL">Local timezone</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={fetchLogs}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm">
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-4 text-left font-medium">#</th>
                <th className="py-2 px-4 text-left font-medium">@timestamp</th>
                <th className="py-2 px-4 text-left font-medium">@logStream</th>
                <th className="py-2 px-4 text-left font-medium">type</th>
                <th className="py-2 px-4 text-left font-medium">details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <div className="text-gray-500">Loading logs...</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <div className="text-gray-500">
                      {logGroupInfo?.exists 
                        ? 'No logs found for the selected time range'
                        : 'No logs found. The log group will be created when logging is enabled and the state machine is executed.'}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRowExpansion(log.id)}
                    >
                      <td className="py-2 px-4 flex items-center">
                        {expandedRows.includes(log.id) ? (
                          <ChevronDown className="w-4 h-4 mr-1" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-1" />
                        )}
                        {log.id}
                      </td>
                      <td className="py-2 px-4">{log.timestamp}</td>
                      <td className="py-2 px-4">
                        <a 
                          href={`${getLogGroupConsoleUrl()}/log-events/${encodeURIComponent(log.logStream)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {log.logStream}
                        </a>
                      </td>
                      <td className="py-2 px-4">{log.type}</td>
                      <td className="py-2 px-4 font-mono text-sm">
                        {truncateDetails(log.details)}
                      </td>
                    </tr>
                    {expandedRows.includes(log.id) && log.attributes && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50 p-4">
                          <div className="space-y-2">
                            {Object.entries(log.attributes).map(([key, value]) => (
                              <div key={key} className="grid grid-cols-[200px,1fr] gap-4">
                                <div className="text-sm font-medium text-gray-500">{key}</div>
                                <div className="text-sm font-mono overflow-x-auto">
                                  {typeof value === 'object' 
                                    ? JSON.stringify(value, null, 2)
                                    : String(value)
                                  }
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 