'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { useToast } from "@/app/components/ui/use-toast";
import { Card } from '@/app/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { Activity, Clock, Play, Plus } from 'lucide-react';
import { CreateStateMachineModal } from './components/CreateStateMachineModal';
import { useRouter } from 'next/navigation';
import { Badge } from '@/app/components/ui/badge';

interface StateMachine {
  name: string;
  stateMachineArn: string;
  type: string;
  creationDate: Date;
  status: 'Active' | 'Inactive';
}

export default function StepFunctionsPage() {
  const router = useRouter();
  const [stateMachines, setStateMachines] = useState<StateMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStateMachines();
  }, []);

  const fetchStateMachines = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/stepfunctions');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch state machines');
      }

      setStateMachines(data.stateMachines);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStateMachine = async (data: { 
    name: string; 
    type: 'STANDARD' | 'EXPRESS';
    definition?: string;
    templateName?: string;
  }) => {
    try {
      const response = await fetch('/api/aws/stepfunctions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create state machine');
      }

      const responseData = await response.json();
      await fetchStateMachines();

      // Show success message
      toast({
        title: "Success",
        description: `State machine "${data.name}" created successfully`,
      });

      // If this was created from a template and it's a demo
      if (data.templateName && data.name.endsWith('-demo')) {
        // Redirect to the state machine details page
        router.push(`/aws/stepfunctions/${encodeURIComponent(responseData.stateMachineArn)}`);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (stateMachine: StateMachine) => {
    router.push(`/aws/stepfunctions/${encodeURIComponent(stateMachine.stateMachineArn)}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Step Functions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Build distributed applications using visual workflows
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create state machine
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total State Machines</p>
              <p className="text-2xl font-semibold">
                {isLoading ? "..." : stateMachines.length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-100">
              <Play className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Running Executions</p>
              <p className="text-2xl font-semibold">
                {isLoading ? "..." : "0"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-100">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Duration</p>
              <p className="text-2xl font-semibold">
                {isLoading ? "..." : "-"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* State Machines Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : stateMachines.length > 0 ? (
              stateMachines.map((machine) => (
                <TableRow key={machine.stateMachineArn}>
                  <TableCell className="font-medium">{machine.name}</TableCell>
                  <TableCell>{machine.type}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(machine.creationDate))} ago</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {machine.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      onClick={() => handleViewDetails(machine)}
                    >
                      View details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="w-8 h-8 text-gray-400" />
                    <p className="text-gray-500">No state machines found</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-2"
                    >
                      Create your first state machine
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <CreateStateMachineModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateStateMachine}
      />
    </div>
  );
} 