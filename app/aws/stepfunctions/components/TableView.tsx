import { Input } from '@/app/components/ui/input';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

interface TableViewProps {
  definition: any;
  executionStatus?: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';
}

export function TableView({ definition, executionStatus }: TableViewProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Succeeded':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'Running':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'Failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Filter by properties or search by keyword"
            className="w-full"
          />
        </div>
        <div className="flex-1">
          <Input
            placeholder="Filter by a date and time range"
            className="w-full"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Resource</th>
              <th className="px-4 py-2 text-left">Duration</th>
              <th className="px-4 py-2 text-left">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">FirstState</td>
              <td className="px-4 py-2">Pass</td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(executionStatus === 'SUCCEEDED' ? 'Succeeded' : executionStatus === 'RUNNING' ? 'Running' : 'Failed')}
                  <span>{executionStatus === 'SUCCEEDED' ? 'Succeeded' : executionStatus === 'RUNNING' ? 'Running' : 'Failed'}</span>
                </div>
              </td>
              <td className="px-4 py-2">-</td>
              <td className="px-4 py-2">0</td>
              <td className="px-4 py-2">{new Date().toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
} 