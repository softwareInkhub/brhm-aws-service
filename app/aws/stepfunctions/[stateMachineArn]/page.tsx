'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { CopyIcon, RefreshCcw } from 'lucide-react';
import { useToast } from '@/app/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { StartExecutionModal } from '@/app/aws/stepfunctions/components/StartExecutionModal';
import { ExecutionsView } from '@/app/aws/stepfunctions/components/ExecutionsView';
import { LoggingView } from '../components/LoggingView';
import { VersionsView } from '../components/VersionsView';
import { TagsView } from '../components/TagsView';

interface Execution {
  executionArn: string;
  name: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';
  startDate: string;
  stopDate?: string;
  input: string;
  output?: string;
}

export default function StateMachineDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const stateMachineArn = decodeURIComponent(params.stateMachineArn as string);
  const stateMachineName = stateMachineArn.split(':').pop() || '';
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStartExecutionModalOpen, setIsStartExecutionModalOpen] = useState(false);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(false);
  const [activeTab, setActiveTab] = useState('executions');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchExecutions = async () => {
    setIsLoadingExecutions(true);
    try {
      const response = await fetch(`/api/aws/stepfunctions/executions/list?stateMachineArn=${encodeURIComponent(stateMachineArn)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch executions');
      }
      const data = await response.json();
      setExecutions(data.executions);
    } catch (error) {
      console.error('Error fetching executions:', error);
      toast({
        variant: "destructive",
        description: "Failed to fetch executions",
      });
    } finally {
      setIsLoadingExecutions(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [stateMachineArn]);

  const handleRefresh = () => {
    fetchExecutions();
  };

  const formatDuration = (startDate: string, stopDate?: string) => {
    if (!stopDate) return '-';
    const start = new Date(startDate).getTime();
    const end = new Date(stopDate).getTime();
    const duration = end - start;
    
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleCopyArn = async () => {
    await navigator.clipboard.writeText(stateMachineArn);
    toast({
      description: "ARN copied to clipboard",
    });
  };

  const handleCopyRoleArn = async () => {
    const roleArn = "arn:aws:iam::715841362541:role/inkhub-lambda-execution-role";
    await navigator.clipboard.writeText(roleArn);
    toast({
      description: "Role ARN copied to clipboard",
    });
  };

  const handleEdit = () => {
    router.push(`/aws/stepfunctions/${encodeURIComponent(stateMachineArn)}/edit`);
  };

  const handleStartExecution = async (name: string, input: string, openInNewTab: boolean) => {
    try {
      const response = await fetch('/api/aws/stepfunctions/executions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          input,
          stateMachineArn,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start execution');
      }

      const data = await response.json();
      
      toast({
        description: "Execution started successfully",
      });
      
      if (openInNewTab) {
        window.open(`/aws/stepfunctions/executions/${data.executionArn}`, '_blank');
      } else {
        router.push(`/aws/stepfunctions/executions/${data.executionArn}`);
      }

      setIsStartExecutionModalOpen(false);
    } catch (error) {
      console.error('Error starting execution:', error);
      toast({
        variant: "destructive",
        description: "Failed to start execution",
      });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/aws/stepfunctions/${encodeURIComponent(stateMachineArn)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete state machine');
      }

      toast({
        title: 'Success',
        description: 'State machine deleted successfully',
        variant: 'default'
      });

      // Redirect to the state machines list page
      router.push('/aws/stepfunctions');
    } catch (error) {
      console.error('Error deleting state machine:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete state machine',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleCopyToNew = async () => {
    try {
      const response = await fetch(`/api/aws/stepfunctions/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceArn: stateMachineArn,
          newName: `${stateMachineName}-copy`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to copy state machine');
      }

      const data = await response.json();
      toast({
        description: "State machine copied successfully",
      });
      router.push(`/aws/stepfunctions/${encodeURIComponent(data.stateMachineArn)}/edit`);
    } catch (error) {
      console.error('Error copying state machine:', error);
      toast({
        variant: "destructive",
        description: "Failed to copy state machine",
      });
    }
  };

  const handleCreateEventBridgeRule = async () => {
    try {
      const response = await fetch(`/api/aws/eventbridge/rules/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stateMachineArn,
          name: `${stateMachineName}-rule`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create EventBridge rule');
      }

      toast({
        description: "EventBridge rule created successfully",
      });
    } catch (error) {
      console.error('Error creating EventBridge rule:', error);
      toast({
        variant: "destructive",
        description: "Failed to create EventBridge rule",
      });
    }
  };

  const handlePublishVersion = async () => {
    
  };

  const handleViewCloudWatchLogs = () => {
    const region = stateMachineArn.split(':')[3];
    const accountId = stateMachineArn.split(':')[4];
    const url = `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group=/aws/vendedlogs/states/${stateMachineName}`;
    window.open(url, '_blank');
  };

  const handleExportCloudFormation = async () => {
    try {
      const response = await fetch(`/api/aws/stepfunctions/${encodeURIComponent(stateMachineArn)}/export/cloudformation`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to export CloudFormation template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stateMachineName}-template.yaml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        description: "CloudFormation template exported successfully",
      });
    } catch (error) {
      console.error('Error exporting CloudFormation template:', error);
      toast({
        variant: "destructive",
        description: "Failed to export CloudFormation template",
      });
    }
  };

  const handleExportInfraComposer = async () => {
    try {
      const response = await fetch(`/api/aws/stepfunctions/${encodeURIComponent(stateMachineArn)}/export/infracomposer`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to export to Infrastructure Composer');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stateMachineName}-infracomposer.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        description: "Infrastructure Composer export completed successfully",
      });
    } catch (error) {
      console.error('Error exporting to Infrastructure Composer:', error);
      toast({
        variant: "destructive",
        description: "Failed to export to Infrastructure Composer",
      });
    }
  };

  const tabs = [
    { id: 'executions', label: 'Executions' },
    { id: 'logging', label: 'Logging' },
    { id: 'versions', label: 'Versions' },
    { id: 'tags', label: 'Tags' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <h1 className="text-2xl font-semibold">{stateMachineName}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleEdit}>Edit</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                Actions
                <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[240px]">
              <DropdownMenuItem onClick={handleCopyToNew}>
                Copy to new
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateEventBridgeRule}>
                Create EventBridge rule
              </DropdownMenuItem>
             
              <DropdownMenuItem onClick={handleViewCloudWatchLogs}>
                View logs in CloudWatch
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCloudFormation}>
                Export to CloudFormation or SAM template
                <CopyIcon className="w-4 h-4 ml-auto" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportInfraComposer}>
                Export to Infrastructure Composer
                <CopyIcon className="w-4 h-4 ml-auto" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-600 focus:text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsStartExecutionModalOpen(true)}>
            Start execution
          </Button>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-lg border m-6">
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4">Details</h2>
          <div className="space-y-6">
            {/* ARN */}
            <div>
              <div className="text-sm font-medium mb-1">ARN</div>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-gray-50 px-2 py-1 rounded flex-1">
                  {stateMachineArn}
                </code>
                <Button variant="ghost" size="sm" onClick={handleCopyArn}>
                  <CopyIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* IAM Role ARN */}
            <div>
              <div className="text-sm font-medium mb-1">IAM role ARN</div>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-gray-50 px-2 py-1 rounded flex-1">
                  arn:aws:iam::715841362541:role/inkhub-lambda-execution-role
                </code>
                <Button variant="ghost" size="sm" onClick={handleCopyRoleArn}>
                  <CopyIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Status Info */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-sm font-medium mb-1">Type</div>
                <div>Standard</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Status</div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Creation date</div>
                <div>Feb 27, 2025, 22:27:21 (UTC+05:30)</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">X-Ray tracing</div>
                <div>Disabled</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs defaultValue="executions" className="flex-1 flex flex-col min-h-0">
          <TabsList className="px-6 border-b">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="executions" className="h-full">
              <ExecutionsView stateMachineArn={stateMachineArn} />
            </TabsContent>

           

            <TabsContent value="logging" className="h-full">
              <LoggingView stateMachineArn={stateMachineArn} />
            </TabsContent>

           

            <TabsContent value="versions" className="h-full">
              <VersionsView stateMachineArn={stateMachineArn} />
            </TabsContent>

            <TabsContent value="tags" className="h-full">
              <TagsView stateMachineArn={stateMachineArn} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete state machine?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the state machine
              "{stateMachineName}" and all of its execution history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StartExecutionModal
        isOpen={isStartExecutionModalOpen}
        onClose={() => setIsStartExecutionModalOpen(false)}
        onStartExecution={handleStartExecution}
      />
    </div>
  );
} 