'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { CopyIcon } from 'lucide-react';
import { useToast } from '@/app/components/ui/use-toast';
import { GraphView, GraphViewHandle } from '../../components/GraphView';
import { EventView } from '../../components/EventView';
import { Input } from '@/app/components/ui/input';
import { GraphActions } from '../../components/GraphActions';

interface ExecutionDetails {
  executionArn: string;
  name: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';
  startDate: string;
  stopDate?: string;
  input: string;
  output?: string;
  stateMachineArn: string;
  roleArn: string;
  stateTransitions: number;
}

export default function ExecutionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [details, setDetails] = useState<ExecutionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [definition, setDefinition] = useState<any>(null);
  const executionArn = decodeURIComponent(params?.executionArn as string);
  const graphViewRef = useRef<GraphViewHandle>(null);

  const fetchExecutionDetails = async () => {
    if (!executionArn) return;
    
    try {
      const response = await fetch(`/api/aws/stepfunctions/executions/${executionArn}`);
      if (!response.ok) throw new Error('Failed to fetch execution details');
      const data = await response.json();
      setDetails(data);
    } catch (error) {
      console.error('Error fetching execution details:', error);
      toast({
        variant: "destructive",
        description: "Failed to fetch execution details",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDefinition = async () => {
    if (!executionArn) return;
    
    try {
      const response = await fetch(`/api/aws/stepfunctions/executions/${executionArn}/definition`);
      if (!response.ok) throw new Error('Failed to fetch state machine definition');
      const data = await response.json();
      setDefinition(data.definition);
    } catch (error) {
      console.error('Error fetching state machine definition:', error);
      toast({
        variant: "destructive",
        description: "Failed to fetch state machine definition",
      });
    }
  };

  useEffect(() => {
    if (!executionArn) return;
    
    Promise.all([
      fetchExecutionDetails(),
      fetchDefinition()
    ]);
  }, [executionArn]);

  const handleCopyArn = async () => {
    if (!details) return;
    await navigator.clipboard.writeText(details.executionArn);
    toast({
      description: "Execution ARN copied to clipboard",
    });
  };

  const formatDuration = (startDate: string, stopDate?: string) => {
    if (!stopDate) return '-';
    const start = new Date(startDate).getTime();
    const end = new Date(stopDate).getTime();
    const duration = end - start;
    return new Date(duration).toISOString().substr(11, 8);
  };

  const formatJson = (json: string) => {
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  };

  const handleCopyJson = async (json: string) => {
    try {
      await navigator.clipboard.writeText(json);
      toast({
        description: "Copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        variant: "destructive",
        description: "Failed to copy to clipboard",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!details) {
    return <div>Execution not found</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Execution: {details?.name}</h1>
          <div className="text-sm text-gray-500">
            <CopyIcon className="inline-block w-4 h-4 mr-1" />
            {details?.executionArn}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/aws/stepfunctions')}>
            Edit state machine
          </Button>
          <Button onClick={() => router.push('/aws/stepfunctions')}>
            New execution
          </Button>
          <Button variant="outline">
            Actions
            <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="input-output">Execution input and output</TabsTrigger>
          <TabsTrigger value="definition">Definition</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {/* Details Panel */}
          <div className="bg-white rounded-lg border p-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-sm font-medium mb-1">Execution status</div>
                <Badge
                  variant="outline"
                  className={`
                    ${details.status === 'SUCCEEDED' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                    ${details.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                    ${details.status === 'RUNNING' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                  `}
                >
                  {details.status}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Start time</div>
                <div>{new Date(details.startDate).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Execution type</div>
                <div>Standard</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">End time</div>
                <div>{details.stopDate ? new Date(details.stopDate).toLocaleString() : '-'}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Execution ARN</div>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-gray-50 px-2 py-1 rounded flex-1">
                    {details.executionArn}
                  </code>
                  <Button variant="ghost" size="sm" onClick={handleCopyArn}>
                    <CopyIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Duration</div>
                <div>{formatDuration(details.startDate, details.stopDate)}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">IAM role ARN</div>
                <div className="text-blue-600">{details.roleArn}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Alias</div>
                <div>-</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">State transitions</div>
                <div className="flex items-center gap-2">
                  <span>{details.stateTransitions}</span>
                  <Button variant="link" className="text-blue-600 p-0 h-auto">
                    Learn more
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Version</div>
                <div>-</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Execution Logs</div>
                <div className="text-blue-600">CloudWatch Logs</div>
              </div>
            </div>
          </div>

          {/* Graph Section */}
          <div className="bg-white rounded-lg border">
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" className="bg-blue-50">Graph view</Button>
                  <Button variant="outline">Table view</Button>
                </div>
                <GraphActions 
                  onZoomIn={() => graphViewRef.current?.handleZoomIn()}
                  onZoomOut={() => graphViewRef.current?.handleZoomOut()}
                  onReset={() => graphViewRef.current?.handleReset()}
                  onDownload={() => graphViewRef.current?.handleDownloadSVG()}
                  onAutoLayout={() => graphViewRef.current?.handleAutoLayout()}
                />
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex gap-6">
                <div className="flex-1 h-[400px] border rounded-lg">
                  {definition ? (
                    <GraphView 
                      ref={graphViewRef}
                      definition={definition}
                      executionStatus={details?.status}
                      executionArn={executionArn}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Loading graph...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="input-output" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Input Panel */}
            <div className="space-y-2">
              <div className="text-sm font-medium">State input</div>
              <div className="relative">
                <pre className="p-4 bg-gray-50 rounded-lg border font-mono text-sm overflow-auto max-h-[500px]">
                  {formatJson(details?.input || '{}')}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopyJson(details?.input || '{}')}
                >
                  <CopyIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Output Panel */}
            <div className="space-y-2">
              <div className="text-sm font-medium">State output</div>
              <div className="relative">
                <pre className="p-4 bg-gray-50 rounded-lg border font-mono text-sm overflow-auto max-h-[500px]">
                  {formatJson(details?.output || '{}')}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopyJson(details?.output || '{}')}
                >
                  <CopyIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="definition" className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <pre className="p-4 bg-gray-50 rounded-lg border font-mono text-sm overflow-auto max-h-[500px]">
              {formatJson(JSON.stringify(definition || {}))}
            </pre>
          </div>
        </TabsContent>
      </Tabs>

      {/* Events Section */}
      <div className="mt-4">
        <EventView executionArn={executionArn} />
      </div>
    </div>
  );
} 