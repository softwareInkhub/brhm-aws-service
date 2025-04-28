import { useState, useEffect } from 'react';
import { Input } from '@/app/components/ui/input';

interface Event {
  id: number;
  type: string;
  timestamp: string;
  step?: string;
  resource?: string;
  startedAfter?: string;
}

interface EventViewProps {
  executionArn: string;
}

export function EventView({ executionArn }: EventViewProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchEvents() {
      if (!executionArn) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/aws/stepfunctions/executions/${encodeURIComponent(executionArn)}/events`);
        if (!response.ok) throw new Error('Failed to fetch events');
        
        const data = await response.json();
        setEvents(data.events.map((event: any) => ({
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          step: event.stateEnteredEventDetails?.name || event.stateExitedEventDetails?.name,
          startedAfter: event.id === 1 ? '0' : `00:00:00.${(event.id - 1) * 36}`,
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [executionArn]);

  const filteredEvents = events.filter(event => {
    const matchesProperty = !propertyFilter || 
      event.type.toLowerCase().includes(propertyFilter.toLowerCase()) ||
      (event.step?.toLowerCase() || '').includes(propertyFilter.toLowerCase());
    
    const matchesDate = !dateFilter || event.timestamp.includes(dateFilter);
    
    return matchesProperty && matchesDate;
  });

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Events ({events.length})</h2>
      </div>

      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Filter by properties or search by keyword"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="Filter by a date and time range"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="flex-1"
        />
      </div>

      {loading ? (
        <div className="text-center py-4">Loading events...</div>
      ) : error ? (
        <div className="text-red-500 py-4">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">ID</th>
                <th className="text-left p-2 font-medium">Type</th>
                <th className="text-left p-2 font-medium">Step</th>
                <th className="text-left p-2 font-medium">Resource</th>
                <th className="text-left p-2 font-medium">Started After</th>
                <th className="text-left p-2 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{event.id}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {event.type === 'ExecutionStarted' && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                      {event.type === 'ExecutionSucceeded' && <span className="w-2 h-2 rounded-full bg-green-400" />}
                      {event.type === 'ExecutionFailed' && <span className="w-2 h-2 rounded-full bg-red-400" />}
                      {event.type}
                    </div>
                  </td>
                  <td className="p-2">{event.step || '-'}</td>
                  <td className="p-2">{event.resource || '-'}</td>
                  <td className="p-2">{event.startedAfter}</td>
                  <td className="p-2">{new Date(event.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-500">
          Showing {filteredEvents.length} of {events.length} events
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            ←
          </button>
          <span className="px-2 py-1">{currentPage}</span>
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage * 10 >= filteredEvents.length}
            className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
} 