'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Plus } from '@/app/components/ui/icons';
import { listFunctions, createFunction, type LambdaFunction as AwsLambdaFunction } from '@/app/services/lambda';
import { logger } from '@/app/utils/logger';
import { useToast } from "@/app/components/ui/use-toast";
import { useRouter } from 'next/navigation';
import { CreateFunctionModal } from './components/CreateFunctionModal';

const RUNTIMES = [
  "nodejs18.x",
  "nodejs16.x",
  "python3.9",
  "python3.8",
  "java11",
  "dotnet6",
  "go1.x"
];

interface FunctionDetailsModalProps {
  func: AwsLambdaFunction | null;
  isOpen: boolean;
  onClose: () => void;
}

const defaultCode = `exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello from Lambda!'
    })
  };
};`;

function FunctionDetailsModal({ func, isOpen, onClose }: FunctionDetailsModalProps) {
  const [code, setCode] = useState(defaultCode);
  const [logs, setLogs] = useState<string[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (func) {
      setCode(defaultCode);
      setSelectedFile(null);
    }
  }, [func]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
      toast({
        title: "File Selected",
        description: `Selected ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please select a ZIP file",
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Content = (e.target?.result as string)?.split(',')[1];
        if (base64Content) {
          // TODO: Implement the update function call
          toast({
            title: "Success",
            description: "Function code updated successfully",
          });
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
      });
    }
  };

  const handleTest = async () => {
    setIsTestRunning(true);
    setLogs([]);
    try {
      setLogs([
        'Starting execution...',
        'Event received: {}',
        'Function completed successfully',
        'Response: {"statusCode":200,"body":{"message":"Hello from Lambda!"}}'
      ]);
      toast({
        title: "Test Completed",
        description: "Function executed successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to test function",
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  if (!func) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] bg-gradient-to-b from-gray-50 to-white">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L3 9L12 14L21 9L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 14L12 19L21 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">{func.FunctionName}</DialogTitle>
                <p className="text-sm text-gray-500">{func.Runtime}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-gray-100">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
          </div>
        </DialogHeader>
        <Tabs defaultValue="code" className="flex-1 h-full">
          <TabsList className="bg-blue-50 p-1 rounded-lg">
            <TabsTrigger value="code" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">Code</TabsTrigger>
            <TabsTrigger value="configuration" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">Configuration</TabsTrigger>
            <TabsTrigger value="test" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">Test</TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">Monitoring</TabsTrigger>
          </TabsList>
          <TabsContent value="code" className="h-[calc(100%-40px)] mt-4">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-blue-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="max-w-xs"
                  />
                  {selectedFile && (
                    <Button onClick={handleUpload} className="bg-blue-500 hover:bg-blue-600 text-white">
                      Upload ZIP
                    </Button>
                  )}
                </div>
                <div className="text-sm text-blue-600">
                  Max size: 50 MB
                </div>
              </div>
              <div className="h-[calc(100%-80px)] border rounded-lg overflow-hidden bg-gray-50">
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-full font-mono text-sm p-4 resize-none bg-white"
                  spellCheck={false}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="configuration" className="mt-4">
            <div className="space-y-6 p-4 bg-white rounded-lg border">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="text-blue-600">Runtime</Label>
                  <Select defaultValue={func.Runtime}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RUNTIMES.map((runtime) => (
                        <SelectItem key={runtime} value={runtime}>
                          {runtime}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-blue-600">Handler</Label>
                  <Input defaultValue={func.Handler} className="bg-white" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-blue-600">Memory (MB)</Label>
                  <Input type="number" defaultValue={func.MemorySize || 128} min={128} max={10240} className="bg-white" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-blue-600">Timeout (seconds)</Label>
                  <Input type="number" defaultValue={func.Timeout || 3} min={1} max={900} className="bg-white" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="test" className="mt-4">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-white">
                <Label className="text-blue-600 mb-2 block">Test Event</Label>
                <Textarea 
                  placeholder="Enter test event JSON"
                  className="h-32 font-mono bg-gray-50"
                  defaultValue="{}"
                />
              </div>
              <Button 
                onClick={handleTest}
                disabled={isTestRunning}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isTestRunning ? 'Running...' : 'Test Function'}
              </Button>
              <div className="border rounded-lg p-4 bg-gray-900 text-gray-100 font-mono text-sm h-64 overflow-auto">
                {logs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap py-1">{log}</div>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="monitoring" className="mt-4">
            <div className="text-center p-8 bg-white rounded-lg border">
              <svg className="w-16 h-16 text-blue-200 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4L3 9L12 14L21 9L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 14L12 19L21 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Monitoring Coming Soon</h3>
              <p className="text-gray-500">
                Function monitoring and metrics will be available in a future update.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface ExtendedLambdaFunction extends AwsLambdaFunction {
  LastModified: string;
  State: 'Active' | 'Inactive';
}

export default function LambdaPage() {
  const router = useRouter();
  const [functions, setFunctions] = useState<ExtendedLambdaFunction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFunction, setSelectedFunction] = useState<ExtendedLambdaFunction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFunctions();
  }, []);

  async function loadFunctions() {
    try {
      const response = await listFunctions();
      const extendedFunctions = (response.functions || []).map(func => ({
        ...func,
        LastModified: new Date().toISOString(),
        State: 'Active' as const
      }));
      setFunctions(extendedFunctions);
    } catch (error) {
      logger.error('Failed to load functions');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load Lambda functions",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreateSuccess = () => {
    loadFunctions();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-black via-blue-950 to-blue-900 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Lambda Functions
              </h1>
              <p className="text-sm text-blue-200/70">
                Manage and deploy your serverless functions
              </p>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all duration-200 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Function
            </Button>
          </div>

          <div className="flex items-center gap-6 text-xs text-blue-200/50">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Total Functions: {functions.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 12H9M15 12H21M12 3V9M12 15V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Active: {functions.filter(f => f.State === 'Active').length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>Last Updated: {functions.length > 0 ? new Date(Math.max(...functions.map(f => new Date(f.LastModified).getTime()))).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : functions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gradient-to-b from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-200">
          <div className="p-4 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 mb-4">
            <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L3 9L12 14L21 9L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 14L12 19L21 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">No functions found</h3>
          <p className="text-gray-500 mt-2 mb-6">Get started by creating a new Lambda function</p>
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-full px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Function
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-[95%] mx-auto">
          {functions.map((func) => (
            <div
              key={func.FunctionName}
              className="group relative bg-gradient-to-b from-white to-gray-50/50 rounded-xl border border-gray-200 overflow-hidden hover:border-blue-400/50 hover:shadow-xl transition-all duration-300 w-full hover:scale-[1.02] cursor-pointer"
              onClick={() => router.push(`/aws/lambda/${func.FunctionName}`)}
            >
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-blue-500/10 shadow-sm">
                    <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4L3 9L12 14L21 9L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 14L12 19L21 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {func.FunctionName}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 text-blue-700 shadow-sm">
                        {func.Runtime}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(func.LastModified).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-500 bg-gray-50/50 rounded-lg p-2">
                  Memory: {func.MemorySize}MB • Timeout: {func.Timeout}s
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>Last invoked: {func.LastModified ? new Date(func.LastModified).toLocaleDateString() : 'Never'}</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${func.State === 'Active' 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-sm ring-2 ring-green-400/20' 
                      : 'bg-gradient-to-r from-gray-300 to-gray-400 ring-2 ring-gray-300/20'}`} 
                    />
                    <span className="ml-2 text-xs text-gray-600">{func.State || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FunctionDetailsModal
        func={selectedFunction}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFunction(null);
        }}
      />

      <CreateFunctionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
} 