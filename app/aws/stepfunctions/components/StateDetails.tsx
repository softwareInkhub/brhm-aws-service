import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { CopyIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useToast } from '@/app/components/ui/use-toast';
import { Switch } from '@/app/components/ui/switch';

interface StateDetailsProps {
  stateName: string;
  stateData: any;
  executionStatus?: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';
  executionArn?: string;
}

interface ExecutionData {
  input: string;
  output: string;
  formattedInput: string;
  formattedOutput: string;
}

export function StateDetails({ stateName, stateData, executionStatus, executionArn }: StateDetailsProps) {
  const [executionData, setExecutionData] = useState<ExecutionData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [showUsedVariables, setShowUsedVariables] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);

  useEffect(() => {
    async function fetchExecutionData() {
      if (!executionArn) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/aws/stepfunctions/executions/${encodeURIComponent(executionArn)}`);
        if (!response.ok) throw new Error('Failed to fetch execution data');
        
        const data = await response.json();
        setExecutionData({
          input: data.input || '{}',
          output: data.output || '{}',
          formattedInput: data.formattedInput || '{}',
          formattedOutput: data.formattedOutput || '{}'
        });
      } catch (err) {
        console.error('Error fetching execution data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchExecutionData();
  }, [executionArn]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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

  if (!stateName) {
    return (
      <div className="p-6 text-gray-500">
        Choose a step to view its details.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <h3 className="text-lg font-medium p-6 pb-4 flex-none">{stateName}</h3>
      
      <Tabs defaultValue="input-output" className="flex-1 flex flex-col min-h-0">
        <TabsList className="px-6 flex-none">
          <TabsTrigger value="input-output" className="flex-1">Input/Output</TabsTrigger>
          <TabsTrigger value="variables" className="flex-1">Variables</TabsTrigger>
          <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
          <TabsTrigger value="definition" className="flex-1">Definition</TabsTrigger>
          <TabsTrigger value="events" className="flex-1">Events</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto min-h-0">
          <TabsContent value="input-output" className="space-y-6 mt-4">
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-2">Input</h4>
                  <div className="relative">
                    <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-auto max-h-[200px] whitespace-pre-wrap break-all">
                      {executionData?.formattedInput}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(executionData?.input || '{}')}
                    >
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Output</h4>
                  <div className="relative">
                    <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-auto max-h-[200px] whitespace-pre-wrap break-all">
                      {executionData?.formattedOutput}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(executionData?.output || '{}')}
                    >
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="variables" className="h-full">
            <div className="p-6 space-y-6">
              {/* Available Variables Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold">Available variables</h4>
                    <p className="text-sm text-gray-500">Variables that are available to reference or have been referenced in this state.</p>
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <CopyIcon className="h-4 w-4" />
                    Copy JSON
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-used"
                    checked={showUsedVariables}
                    onCheckedChange={setShowUsedVariables}
                  />
                  <label htmlFor="show-used" className="text-sm">Only show used variables</label>
                </div>

                <div className="border rounded-lg">
                  <div className="grid grid-cols-3 gap-4 p-3 border-b bg-gray-50">
                    <div className="text-sm font-medium">Variable</div>
                    <div className="text-sm font-medium">Value</div>
                    <div className="text-sm font-medium">History</div>
                  </div>
                  <div className="p-6 text-sm text-gray-500 text-center">
                    No available variables
                  </div>
                </div>
              </div>

              {/* Assigned Variables Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold">Assigned variables</h4>
                    <p className="text-sm text-gray-500">Variables that have been assigned or reassigned in this state.</p>
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <CopyIcon className="h-4 w-4" />
                    Copy JSON
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-assignments"
                    checked={showAssignments}
                    onCheckedChange={setShowAssignments}
                  />
                  <label htmlFor="show-assignments" className="text-sm">Show assignment</label>
                </div>

                <div className="border rounded-lg">
                  <div className="grid grid-cols-3 gap-4 p-3 border-b bg-gray-50">
                    <div className="text-sm font-medium">Variable</div>
                    <div className="text-sm font-medium">Assignment</div>
                    <div className="text-sm font-medium">Value</div>
                  </div>
                  <div className="p-6 text-sm text-gray-500 text-center">
                    No assigned variables
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <div className="grid grid-cols-2 gap-6 p-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Type</h4>
                <p className="text-sm bg-gray-50 p-2 rounded">{stateData?.type || 'Pass'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                <p className="text-sm bg-gray-50 p-2 rounded">{executionStatus || '-'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Resource</h4>
                <p className="text-sm bg-gray-50 p-2 rounded break-all">{stateData?.resource || '-'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Next State</h4>
                <p className="text-sm bg-gray-50 p-2 rounded">{stateData?.next || 'End'}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="definition" className="mt-4">
            <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-auto max-h-[400px] whitespace-pre-wrap break-all">
              {JSON.stringify(stateData || {}, null, 2)}
            </pre>
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <div className="text-sm text-gray-500 p-4">No events available.</div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
} 