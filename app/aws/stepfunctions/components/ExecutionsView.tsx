import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { RefreshCw } from 'lucide-react';

interface ExecutionsViewProps {
  stateMachineArn: string;
}

interface Execution {
  executionArn: string;
  name: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';
  startDate: string;
  stopDate?: string;
  input: string;
  output?: string;
}

type TimeRange = 'all' | '15months' | '30days' | '7days' | '24hours';
type TimezoneOption = 'local' | 'utc';
type StatusFilter = 'all' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';

export function ExecutionsView({ stateMachineArn }: ExecutionsViewProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [filteredExecutions, setFilteredExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [timezone, setTimezone] = useState<TimezoneOption>('local');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchExecutions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/aws/stepfunctions/executions/list?stateMachineArn=${encodeURIComponent(stateMachineArn)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch executions');
      }
      const data = await response.json();
      setExecutions(data.executions);
      applyFilters(data.executions, searchQuery, timeRange, statusFilter);
    } catch (error) {
      console.error('Error fetching executions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (
    executions: Execution[],
    query: string,
    range: TimeRange,
    status: StatusFilter
  ) => {
    let filtered = [...executions];

    // Apply search query filter
    if (query) {
      filtered = filtered.filter(execution => 
        execution.name.toLowerCase().includes(query.toLowerCase()) ||
        execution.status.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply time range filter
    const now = new Date();
    if (range !== 'all') {
      const ranges = {
        '15months': new Date(now.setMonth(now.getMonth() - 15)),
        '30days': new Date(now.setDate(now.getDate() - 30)),
        '7days': new Date(now.setDate(now.getDate() - 7)),
        '24hours': new Date(now.setHours(now.getHours() - 24))
      };
      filtered = filtered.filter(execution => 
        new Date(execution.startDate) >= ranges[range]
      );
    }

    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(execution => execution.status === status);
    }

    setFilteredExecutions(filtered);
  };

  useEffect(() => {
    fetchExecutions();
  }, [stateMachineArn]);

  useEffect(() => {
    applyFilters(executions, searchQuery, timeRange, statusFilter);
  }, [searchQuery, timeRange, statusFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return timezone === 'local' 
      ? date.toLocaleString()
      : date.toUTCString();
  };

  const formatDuration = (startDate: string, stopDate?: string) => {
    if (!stopDate) return '-';
    
    const start = new Date(startDate);
    const end = new Date(stopDate);
    const durationMs = end.getTime() - start.getTime();
    
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    }
    
    const totalSeconds = durationMs / 1000;
    const seconds = Math.floor(totalSeconds);
    const ms = Math.floor((totalSeconds - seconds) * 1000);
    
    if (seconds < 60) {
      return ms > 0 ? `${seconds}.${ms.toString().padStart(3, '0')}s` : `${seconds}s`;
    }
    
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const formattedSeconds = ms > 0 
        ? `${remainingSeconds}.${ms.toString().padStart(3, '0')}`
        : remainingSeconds;
      return `${minutes}m ${formattedSeconds}s`;
    }
    
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    let duration = `${hours}h`;
    if (remainingMinutes > 0) duration += ` ${remainingMinutes}m`;
    if (remainingSeconds > 0 || ms > 0) {
      const formattedSeconds = ms > 0 
        ? `${remainingSeconds}.${ms.toString().padStart(3, '0')}`
        : remainingSeconds;
      duration += ` ${formattedSeconds}s`;
    }
    
    return duration;
  };

  const timeRangeOptions = [
    { value: 'all', label: 'All' },
    { value: '15months', label: 'Last 15 months' },
    { value: '30days', label: 'Last 30 days' },
    { value: '7days', label: 'Last 7 days' },
    { value: '24hours', label: 'Last 24 hours' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'RUNNING', label: 'Running' },
    { value: 'SUCCEEDED', label: 'Succeeded' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'TIMED_OUT', label: 'Timed Out' },
    { value: 'ABORTED', label: 'Aborted' }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Executions ({filteredExecutions.length}/{executions.length})</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchExecutions} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm">Stop execution</Button>
          <Button variant="outline" size="sm">Redrive</Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <Input 
            placeholder="Filter executions by property or value"
            className="max-w-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="relative">
            <Button variant="outline" onClick={() => setStatusFilter(statusFilter === 'all' ? 'RUNNING' : 'all')}>
              {statusOptions.find(opt => opt.value === statusFilter)?.label}
              <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </div>
          <div className="relative">
            <Button variant="outline" onClick={() => {
              const currentIndex = timeRangeOptions.findIndex(opt => opt.value === timeRange);
              const nextIndex = (currentIndex + 1) % timeRangeOptions.length;
              setTimeRange(timeRangeOptions[nextIndex].value as TimeRange);
            }}>
              {timeRangeOptions.find(opt => opt.value === timeRange)?.label}
            </Button>
          </div>
          <Button 
            variant="outline"
            onClick={() => setTimezone(timezone === 'local' ? 'utc' : 'local')}
          >
            {timezone === 'local' ? 'Local timezone' : 'UTC'}
            <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </div>

        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4 font-medium">Name</th>
                <th className="text-left py-2 px-4 font-medium">Status</th>
                <th className="text-left py-2 px-4 font-medium">Start Time ({timezone})</th>
                <th className="text-left py-2 px-4 font-medium">End Time ({timezone})</th>
                <th className="text-left py-2 px-4 font-medium">Duration</th>
                <th className="text-left py-2 px-4 font-medium">Version</th>
                <th className="text-left py-2 px-4 font-medium">Alias</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="text-gray-500">Loading executions...</div>
                  </td>
                </tr>
              ) : filteredExecutions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="text-gray-500">No executions match the current filters</div>
                  </td>
                </tr>
              ) : (
                filteredExecutions.map((execution) => (
                  <tr key={execution.executionArn} className="hover:bg-gray-50">
                    <td className="py-2 px-4">
                      <Link
                        href={`/aws/stepfunctions/executions/${execution.executionArn}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {execution.name}
                      </Link>
                    </td>
                    <td className="py-2 px-4">
                      <Badge
                        variant="outline"
                        className={`
                          ${execution.status === 'SUCCEEDED' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                          ${execution.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                          ${execution.status === 'RUNNING' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                          ${execution.status === 'TIMED_OUT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                          ${execution.status === 'ABORTED' ? 'bg-gray-50 text-gray-700 border-gray-200' : ''}
                        `}
                      >
                        {execution.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-4">{formatDate(execution.startDate)}</td>
                    <td className="py-2 px-4">{execution.stopDate ? formatDate(execution.stopDate) : '-'}</td>
                    <td className="py-2 px-4">{formatDuration(execution.startDate, execution.stopDate)}</td>
                    <td className="py-2 px-4">-</td>
                    <td className="py-2 px-4">-</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 
 
 
 
 