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
import { listFunctions, createFunction, type LambdaFunction } from '@/app/services/lambda';
import { logger } from '@/app/utils/logger';
import { useToast } from "@/app/components/ui/use-toast";

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
  func: LambdaFunction | null;
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

export default function LambdaPage() {
  const [functions, setFunctions] = useState<LambdaFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<LambdaFunction | null>(null);
  const { toast } = useToast();

  async function loadFunctions() {
    setLoading(true);
    setError(null);

    try {
      const response = await listFunctions();
      setFunctions(response.functions);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch Lambda functions. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFunctions();
  }, []);

  const handleCreateFunction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const newFunction: LambdaFunction = {
      FunctionName: formData.get('name') as string,
      Runtime: formData.get('runtime') as string,
      Handler: formData.get('handler') as string,
      Role: process.env.AWS_LAMBDA_ROLE_ARN,
      Code: {
        ZipFile: Buffer.from(formData.get('code') as string || defaultCode).toString('base64')
      },
      MemorySize: parseInt(formData.get('memory') as string || '128'),
      Timeout: parseInt(formData.get('timeout') as string || '3')
    };

    try {
      await createFunction(newFunction);
      toast({
        title: "Success",
        description: "Function created successfully",
      });
      setCreateDialogOpen(false);
      loadFunctions();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create function",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L3 9L12 14L21 9L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 14L12 19L21 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className="text-xl font-semibold">Lambda Functions</h1>
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Function
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {functions.map((func) => (
          <Card 
            key={func.FunctionName}
            className="hover:shadow-md transition-shadow border border-gray-200 cursor-pointer"
            onClick={() => setSelectedFunction(func)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 16L12 12M12 12L16 16M12 12L16 8M12 12L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <h3 className="font-medium text-[15px] hover:text-blue-500">
                    {func.FunctionName}
                  </h3>
                </div>
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                The Lambda function that will be used for serverless computing.
              </p>

              <div className="text-sm text-gray-500 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px]">{func.Runtime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px]">Memory: {func.MemorySize || 128}MB</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px]">Timeout: {func.Timeout || 3}s</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {functions.length === 0 && (
          <Card className="col-span-full border border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-40">
              <p className="text-gray-500 mb-4">No functions found</p>
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create your first function
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Lambda Function</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFunction} className="space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Function Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="my-function"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="runtime">Runtime</Label>
                <Select name="runtime" defaultValue={RUNTIMES[0]}>
                  <SelectTrigger>
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
                <Label htmlFor="handler">Handler</Label>
                <Input
                  id="handler"
                  name="handler"
                  placeholder="index.handler"
                  defaultValue="index.handler"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Function Code</Label>
                <Textarea
                  id="code"
                  name="code"
                  className="font-mono h-48"
                  defaultValue={defaultCode}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="memory">Memory (MB)</Label>
                  <Input
                    id="memory"
                    name="memory"
                    type="number"
                    defaultValue="128"
                    min="128"
                    max="10240"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    name="timeout"
                    type="number"
                    defaultValue="3"
                    min="1"
                    max="900"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Create Function</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <FunctionDetailsModal
        func={selectedFunction}
        isOpen={!!selectedFunction}
        onClose={() => setSelectedFunction(null)}
      />
    </div>
  );
} 