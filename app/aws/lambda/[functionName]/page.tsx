'use client';

import React, { use, useState, useEffect, ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useToast } from "@/app/components/ui/use-toast";
import { ChevronDown } from 'lucide-react';
import { AddTriggerModal } from "../components/AddTriggerModal";
import { Database, Table, MessageSquare, Bell, Globe, Zap, Activity, Link } from 'lucide-react';
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { ExportInfrastructureModal } from "../components/ExportInfrastructureModal";
import { UploadCodeModal } from '../components/UploadCodeModal';

interface Trigger {
  // For event source mappings (SQS, etc.)
  type: string;
  arn?: string;
  uuid?: string;
  state?: string;
  batchSize?: number;
  // For API Gateway
  name?: string;
  apiId?: string;
  endpoint?: string;
  protocolType?: string;
  // For UI compatibility
  status?: 'Active' | 'Inactive';
  details?: string;
  icon?: React.ReactNode;
}

interface PageProps {
  params: Promise<{
    functionName: string;
  }>;
}

export default function Page({ params }: PageProps) {
  const { functionName } = use(params);
  const { toast } = useToast();
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [functionDetails, setFunctionDetails] = useState({
    runtime: '',
    handler: '',
    description: '-',
    lastModified: '',
    arn: '',
    memorySize: 128,
    timeout: 3,
    state: 'Active',
    functionUrl: null as string | null
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isThrottleDialogOpen, setIsThrottleDialogOpen] = useState(false);
  const [concurrencyValue, setConcurrencyValue] = useState(10);
  const [isThrottling, setIsThrottling] = useState(false);
  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);
  const [isDestinationModalOpen, setIsDestinationModalOpen] = useState(false);
  const [aliasName, setAliasName] = useState('');
  const [aliasDescription, setAliasDescription] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('$LATEST');
  const [isCreatingAlias, setIsCreatingAlias] = useState(false);
  const [versions, setVersions] = useState(['$LATEST']);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileStructure, setFileStructure] = useState<any>(null);
  const [files, setFiles] = useState<{ [key: string]: string }>({});
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [isLoadingCode, setIsLoadingCode] = useState(true);

  const fetchTriggers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch triggers from backend API
      const response = await fetch(`/api/lambda/${functionName}/triggers`);
      if (!response.ok) throw new Error('Failed to fetch triggers');
      const data = await response.json();
      setTriggers(data.triggers || []);
    } catch (error) {
      console.error('Error fetching triggers:', error);
      setError('Failed to fetch triggers');
      toast({
        title: "Error",
        description: "Failed to fetch triggers",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/lambda/${functionName}/versions`);
      if (!response.ok) throw new Error('Failed to fetch versions');
      const data = await response.json();
      setVersions(data.versions || ['$LATEST']);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch function versions",
        variant: "destructive"
      });
    }
  };

  const fetchFunctionDetails = async () => {
    try {
      const response = await fetch(`/api/lambda/functions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName }),
      });
      if (!response.ok) throw new Error('Failed to fetch function details');
      const data = await response.json();
      setFunctionDetails({
        runtime: data.data.function.Runtime || '',
        handler: data.data.function.Handler || '',
        description: data.data.function.Description || '-',
        lastModified: data.data.function.LastModified || '',
        arn: data.data.function.FunctionArn || '',
        memorySize: data.data.function.MemorySize || 128,
        timeout: data.data.function.Timeout || 3,
        state: data.data.function.State || 'Active',
        functionUrl: data.data.function.FunctionUrl || null
      });
    } catch (error) {
      console.error('Error fetching function details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch function details",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchFunctionDetails(),
          fetchTriggers(),
          fetchVersions()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [functionName]);

  useEffect(() => {
    const fetchCodeAndStructure = async () => {
      setIsLoadingCode(true);
      try {
        const response = await fetch(`/api/aws/lambda/${encodeURIComponent(functionName)}/code`);
        if (!response.ok) {
          throw new Error('Failed to fetch function code');
        }
        const data = await response.json();
        setFileStructure(data.fileStructure);
        setFiles(data.files);
        
        // Set the initial file to the handler file
        const handlerPath = data.functionDetails.handler?.split('.')[0] + '.js';
        setSelectedFile(handlerPath);
        
        // Update function details if needed
        if (data.functionDetails) {
          setFunctionDetails(prev => ({
            ...prev,
            runtime: data.functionDetails.runtime || prev.runtime,
            handler: data.functionDetails.handler || prev.handler,
            description: data.functionDetails.description || prev.description,
            lastModified: data.functionDetails.lastModified || prev.lastModified
          }));
        }
      } catch (error) {
        console.error('Error fetching code:', error);
        toast({
          title: "Error",
          description: "Failed to fetch function code",
          variant: "destructive"
        });
      } finally {
        setIsLoadingCode(false);
      }
    };

    if (functionName) {
      fetchCodeAndStructure();
    }
  }, [functionName]);

  const handleAddTrigger = async (triggerType: string, source: string) => {
    try {
      const newTrigger: Trigger = {
        type: triggerType,
        status: 'Active',
        name: `${triggerType} Trigger`,
        details: `Trigger from ${source}`,
        icon: getSourceTypeIcon(triggerType)
      };

      setTriggers(prevTriggers => [...prevTriggers, newTrigger]);
      setIsTriggerModalOpen(false);
      
      toast({
        title: "Success",
        description: `Added new ${triggerType} trigger`,
        duration: 3000
      });
    } catch (error) {
      console.error('Error adding trigger:', error);
      toast({
        title: "Error",
        description: "Failed to add trigger",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Success",
        description: successMessage,
        duration: 3000
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleThrottle = async () => {
    try {
      setIsThrottling(true);
      const response = await fetch(`/api/lambda/${functionName}/throttle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservedConcurrentExecutions: 0 }),
      });
      if (!response.ok) throw new Error('Failed to throttle function');
      toast({
        title: "Success",
        description: "Function throttled successfully",
        duration: 3000
      });
      setIsThrottleDialogOpen(false);
    } catch (error) {
      console.error('Error updating throttle:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to throttle function",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsThrottling(false);
    }
  };

  const handlePublishVersion = async () => {
    try {
      setIsPublishing(true);
      const response = await fetch(`/api/lambda/${functionName}/publish-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: `Published from UI on ${new Date().toISOString()}` }),
      });
      if (!response.ok) throw new Error('Failed to publish new version');
      const data = await response.json();
      toast({
        title: "Success",
        description: `Published version ${data.version}`,
        duration: 3000
      });
    } catch (error) {
      console.error('Error publishing version:', error);
      toast({
        title: "Error",
        description: "Failed to publish new version",
        variant: "destructive"
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCreateAlias = async () => {
    try {
      setIsCreatingAlias(true);
      const response = await fetch(`/api/lambda/${functionName}/aliases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: aliasName,
          functionVersion: selectedVersion,
          description: aliasDescription
        }),
      });
      if (!response.ok) throw new Error('Failed to create alias');
      toast({
        title: "Success",
        description: `Created alias ${aliasName}`,
        duration: 3000
      });
      setIsAliasModalOpen(false);
      setAliasName('');
      setAliasDescription('');
      setSelectedVersion('$LATEST');
    } catch (error) {
      console.error('Error creating alias:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create alias",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAlias(false);
    }
  };

  const handleDeleteFunction = async () => {
    if (!window.confirm('Are you sure you want to delete this function? This action cannot be undone.')) {
      return;
    }
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/lambda/functions?functionName=${encodeURIComponent(functionName)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete function');
      toast({
        title: "Success",
        description: "Function deleted successfully",
        duration: 3000
      });
      window.location.href = '/aws/lambda';
    } catch (error) {
      console.error('Error deleting function:', error);
      toast({
        title: "Error",
        description: "Failed to delete function",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadFunctionCode = async () => {
    try {
      const response = await fetch(`/api/lambda/${functionName}/code`);
      if (!response.ok) throw new Error('Failed to get function code');
      const data = await response.json();
      if (data.codeUrl) {
        const link = document.createElement('a');
        link.href = data.codeUrl;
        link.download = `${functionName}-code.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: "Success",
          description: "Function code download started",
          duration: 3000
        });
      } else {
        throw new Error("Function code URL not available");
      }
    } catch (error) {
      console.error('Error downloading function code:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download function code",
        variant: "destructive"
      });
    }
  };

  const generateSAMTemplate = () => {
    const template = {
      AWSTemplateFormatVersion: '2010-09-09',
      Transform: 'AWS::Serverless-2016-10-31',
      Resources: {
        [functionName]: {
          Type: 'AWS::Serverless::Function',
          Properties: {
            Handler: functionDetails.handler,
            Runtime: functionDetails.runtime,
            CodeUri: './code',
            Description: functionDetails.description,
            MemorySize: functionDetails.memorySize,
            Timeout: functionDetails.timeout,
            Role: 'FUNCTION_EXECUTION_ROLE_ARN' // Placeholder
          }
        }
      }
    };

    return JSON.stringify(template, null, 2);
  };

  const handleDownloadSAMTemplate = () => {
    try {
      const template = generateSAMTemplate();
      const blob = new Blob([template], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${functionName}-template.yaml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "SAM template downloaded successfully",
        duration: 3000
      });
    } catch (error: any) {
      console.error('Error downloading SAM template:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download SAM template",
        variant: "destructive"
      });
    }
  };

  const handleDownloadBoth = async () => {
    try {
      await handleDownloadFunctionCode();
      handleDownloadSAMTemplate();
    } catch (error: any) {
      console.error('Error downloading both files:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download files",
        variant: "destructive"
      });
    }
  };

  const handleExportToInfrastructure = async (bucketName: string) => {
    try {
      // Here you would implement the actual export logic
      // This is a placeholder for the AWS SDK call
      toast({
        title: "Success",
        description: "Successfully exported to Infrastructure Composer",
        duration: 3000
      });
    } catch (error: any) {
      console.error('Error exporting to Infrastructure Composer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to export to Infrastructure Composer",
        variant: "destructive"
      });
    }
  };

  const handleUploadSuccess = () => {
    fetchFunctionDetails();
  };

  const renderFileTree = (structure: any, basePath: string = '') => {
    return Object.entries(structure).map(([name, value]) => {
      const fullPath = basePath ? `${basePath}/${name}` : name;
      if (value === 'file') {
        return (
          <div
            key={fullPath}
            className={`flex items-center gap-1 p-1 cursor-pointer ${
              selectedFile === fullPath ? 'bg-[#37373D]' : 'hover:bg-[#2A2A2A]'
            }`}
            onClick={() => setSelectedFile(fullPath)}
          >
            <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className="text-sm">{name}</span>
          </div>
        );
      }
      return (
        <div key={fullPath}>
          <div className="flex items-center gap-1 p-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 4h14l3 4v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className="text-sm">{name}</span>
          </div>
          <div className="ml-4">
            {renderFileTree(value, fullPath)}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      {/* Header with gradient text */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-black mb-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-blue-200 font-medium">Lambda</span>
          <span className="text-blue-300">/</span>
          <span className="text-blue-200 font-medium">Functions</span>
          <span className="text-blue-300">/</span>
          <span className="text-lg font-semibold text-white">{functionName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsThrottleDialogOpen(true)}
            className="border-[#1E2B3C] bg-[#1E2B3C] text-white hover:bg-[#2A3B4F] transition-all duration-200"
          >
            Throttle
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1.5 border-[#1E2B3C] bg-[#1E2B3C] text-white hover:bg-[#2A3B4F] transition-all duration-200"
            onClick={() => copyToClipboard(functionDetails.arn, "Function ARN copied to clipboard")}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V7C20 5.89543 19.1046 5 18 5H16M8 5V3C8 2.44772 8.44772 2 9 2H15C15.5523 2 16 2.44772 16 3V5M8 5H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Copy ARN
          </Button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1.5 border-[#1E2B3C] bg-[#1E2B3C] text-white hover:bg-[#2A3B4F] transition-all duration-200">
                Actions
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="w-56 rounded-md border bg-white shadow-md" align="end">
                <DropdownMenu.Item 
                  className="flex cursor-default select-none items-center px-3 py-2 text-sm outline-none focus:bg-gray-100"
                  onClick={handlePublishVersion}
                  disabled={isPublishing}
                >
                  {isPublishing ? 'Publishing...' : 'Publish new version'}
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  className="flex cursor-default select-none items-center px-3 py-2 text-sm outline-none focus:bg-gray-100"
                  onClick={() => setIsAliasModalOpen(true)}
                >
                  Create alias
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-gray-200" />
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Capabilities
                </div>
                <DropdownMenu.Item className="flex cursor-default select-none items-center px-3 py-2 text-sm outline-none focus:bg-gray-100">
                  Deploy to Lambda@Edge
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-gray-200" />
                <DropdownMenu.Item 
                  className="flex cursor-default select-none items-center px-3 py-2 text-sm outline-none focus:bg-gray-100 text-red-600"
                  onClick={handleDeleteFunction}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete function'}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Function Overview Card with enhanced styling */}
      <div className="border rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-300">
        <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Function overview</h2>
              <div className="p-1.5 rounded-full bg-blue-100">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsExportModalOpen(true)}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
              >
                Export to Infrastructure Composer
              </Button>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1.5 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-pink-100 transition-all duration-200">
                    Download
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="w-56 rounded-md border bg-white shadow-md" align="end">
                    <DropdownMenu.Item 
                      className="flex cursor-default select-none items-center px-3 py-2 text-sm outline-none focus:bg-gray-100"
                      onClick={handleDownloadFunctionCode}
                    >
                      Download function code .zip
                    </DropdownMenu.Item>
                    <DropdownMenu.Item 
                      className="flex cursor-default select-none items-center px-3 py-2 text-sm outline-none focus:bg-gray-100"
                      onClick={handleDownloadSAMTemplate}
                    >
                      Download AWS SAM file
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="h-px bg-gray-200" />
                    <DropdownMenu.Item 
                      className="flex cursor-default select-none items-center px-3 py-2 text-sm outline-none focus:bg-gray-100"
                      onClick={handleDownloadBoth}
                    >
                      Download both
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-8">
            {/* Left side - Diagram with enhanced styling */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Button variant="outline" size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 hover:from-blue-600 hover:to-indigo-600">
                  Diagram
                </Button>
                <Button variant="outline" size="sm" className="border-gray-200 text-gray-700 hover:bg-gray-50">
                  Template
                </Button>
              </div>

              <div className="border rounded-xl p-8 bg-white shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30"></div>
                <div className="relative z-10 w-full max-w-[500px] mx-auto">
                  {/* Function Card */}
                  <div className="border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-orange-100 to-red-100">
                        <svg className="w-6 h-6 text-orange-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 4L3 9L12 14L21 9L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3 14L12 19L21 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-gray-900">{functionName}</div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                          <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                            {functionDetails.runtime}
                          </span>
                          <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                            {functionDetails.state}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Layers</span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">(0)</span>
                      </div>
                    </div>
                  </div>

                  {/* Remove Function URL section and only show triggers */}
                  {isLoading ? (
                    <div className="mt-6 flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                  ) : triggers.length > 0 ? (
                    <div className="mt-6 space-y-3">
                      {triggers.map((trigger) => (
                        <div
                          key={trigger.uuid || trigger.apiId || trigger.type}
                          className="flex items-center gap-4 p-4 border rounded-xl bg-white hover:shadow-md transition-all duration-300"
                        >
                          <div className="p-2.5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
                            {/* Icon logic can be improved based on type */}
                            {trigger.type === 'API Gateway' ? <Globe className="w-6 h-6 text-blue-600" /> : <Database className="w-6 h-6 text-green-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{trigger.type}</div>
                            {trigger.type === 'API Gateway' ? (
                              <div className="text-sm text-gray-500">
                                <div><strong>Name:</strong> {trigger.name}</div>
                                <div><strong>Endpoint:</strong> {trigger.endpoint}</div>
                                <div><strong>Protocol:</strong> {trigger.protocolType}</div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                <div><strong>ARN:</strong> {trigger.arn}</div>
                                <div><strong>State:</strong> {trigger.state}</div>
                                <div><strong>Batch size:</strong> {trigger.batchSize}</div>
                              </div>
                            )}
                          </div>
                          <div>
                            {trigger.state && (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                trigger.state === 'Enabled' || trigger.state === 'Active'
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700'
                                  : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'
                              }`}>
                                {trigger.state || 'Active'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6 text-center p-8 border rounded-xl border-dashed border-gray-300 bg-gray-50">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4L3 9L12 14L21 9L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3 14L12 19L21 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="text-gray-600 mb-4">No triggers configured for this function</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsTriggerModalOpen(true)}
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 hover:from-blue-600 hover:to-indigo-600"
                      >
                        Add your first trigger
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-4 justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
                  onClick={() => setIsTriggerModalOpen(true)}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Add trigger
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 hover:from-purple-100 hover:to-pink-100 transition-all duration-200"
                  onClick={() => setIsDestinationModalOpen(true)}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Add destination
                </Button>
              </div>
            </div>

            {/* Right side - Function details with enhanced styling */}
            <div className="w-[400px] space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-sm text-gray-600">{functionDetails.description}</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Last modified</h3>
                <p className="text-sm text-gray-600">{functionDetails.lastModified}</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Function ARN</h3>
                <div className="flex items-center gap-2 text-sm">
                  <code className="flex-1 px-3 py-1.5 rounded-lg bg-white/80 text-gray-600 font-mono text-xs">
                    {functionDetails.arn}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 hover:bg-white/50"
                    onClick={() => copyToClipboard(functionDetails.arn, "Function ARN copied to clipboard")}
                  >
                    <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V7C20 5.89543 19.1046 5 18 5H16M8 5V3C8 2.44772 8.44772 2 9 2H15C15.5523 2 16 2.44772 16 3V5M8 5H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900">Triggers</h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                    {triggers.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {triggers.length > 0 ? (
                    triggers.map((trigger) => (
                      <div key={trigger.type} className="flex items-center gap-2 p-2 rounded-lg bg-white/80 hover:bg-white transition-all duration-200">
                        <div className="p-1.5 rounded-md bg-gradient-to-br from-gray-50 to-gray-100">
                          {trigger.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{trigger.type}</div>
                          <div className="text-xs text-gray-500 truncate">{trigger.details}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          trigger.status === 'Active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {trigger.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-4 border rounded-lg border-dashed border-gray-300">
                      <p className="text-sm text-gray-500">No triggers configured</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsTriggerModalOpen(true)}
                        className="mt-2 text-indigo-600 hover:text-indigo-700"
                      >
                        Add trigger
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs with enhanced styling */}
      <Tabs defaultValue="code" className="w-full">
        <TabsList className="w-full justify-start border-b pb-px">
          {["code", "test", "monitor", "configuration", "aliases", "versions"].map((tab) => (
            <TabsTrigger 
              key={tab}
              value={tab} 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 capitalize"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="code" className="p-6 space-y-6">
          <div className="border rounded-lg bg-white overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium">Code source</h3>
                <div className="text-sm text-blue-600 cursor-pointer">Info</div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setIsUploadModalOpen(true)} variant="outline" className="bg-white">
                  Upload from
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* VS Code-like Editor Interface */}
            <div className="border-t">
              <div className="flex">
                {/* Left Sidebar */}
                <div className="w-64 border-r bg-[#252526] text-gray-300">
                  <div className="p-2">
                    <div className="flex items-center gap-2 p-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span className="text-xs uppercase">Explorer</span>
                    </div>
                  </div>
                  <div className="px-2">
                    {fileStructure && renderFileTree(fileStructure)}
                  </div>
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 bg-[#1E1E1E] min-h-[400px]">
                  <div className="flex items-center px-4 py-1 bg-[#2D2D2D] text-gray-400 text-sm">
                    <div className="flex items-center">
                      <div className="flex items-center px-3 py-1 text-white bg-[#1E1E1E]">
                        <svg className="w-4 h-4 mr-2 text-blue-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {selectedFile}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    {isLoadingCode ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-500 border-t-white"></div>
                      </div>
                    ) : (
                      <pre className="text-white font-mono text-sm leading-6">
                        <code>{files[selectedFile] || '// No file content available'}</code>
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Test event</h3>
            <div className="space-y-4">
              <Input placeholder="Event name" />
              <div className="bg-gray-50 rounded-lg p-4 h-64">
                <pre className="font-mono text-sm">
                  {JSON.stringify({ test: "event" }, null, 2)}
                </pre>
              </div>
              <Button>Test</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AddTriggerModal 
        isOpen={isTriggerModalOpen}
        onClose={() => setIsTriggerModalOpen(false)}
        onAddTrigger={handleAddTrigger}
      />

      {/* Throttle Dialog */}
      <Dialog open={isThrottleDialogOpen} onOpenChange={setIsThrottleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Throttle your function</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">
              This action will set the reserved concurrency for <span className="font-semibold">{functionName}</span> to zero,
              which will throttle all future invocations of this function. Please only use this in case of
              emergencies. For more information on what to do after you use this safeguard, read the{' '}
              <a 
                href="https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline"
              >
                Managing Concurrency
              </a>
              {' '}documentation. If you would like to proceed, click Confirm, else click Cancel.
            </p>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsThrottleDialogOpen(false)}
              disabled={isThrottling}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleThrottle}
              disabled={isThrottling}
              className="min-w-[80px] bg-orange-500 hover:bg-orange-600"
            >
              {isThrottling ? 'Throttling...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Alias Modal */}
      <Dialog open={isAliasModalOpen} onOpenChange={setIsAliasModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Create alias</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={aliasName}
                  onChange={(e) => setAliasName(e.target.value)}
                  placeholder="Enter alias name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description <span className="text-gray-500 text-sm">- optional</span></Label>
                <Input
                  value={aliasDescription}
                  onChange={(e) => setAliasDescription(e.target.value)}
                  placeholder="Enter description"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Version</Label>
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {versions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  Weighted alias
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600"
                    onClick={() => {/* Add weighted alias logic */}}
                  >
                    Add additional version
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAliasModalOpen(false)}
              disabled={isCreatingAlias}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAlias}
              disabled={isCreatingAlias || !aliasName}
              className="min-w-[80px]"
            >
              {isCreatingAlias ? 'Creating...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Destination Modal */}
      <Dialog open={isDestinationModalOpen} onOpenChange={setIsDestinationModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Add destination</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div>
              <h3 className="text-base font-medium mb-1">Destination configuration</h3>
              <p className="text-sm text-gray-600 mb-4">Configure a destination to receive invocation records. Lambda can send records when your function is invoked asynchronously, or when your function processes records from an event source mapping.</p>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Source</Label>
                  <p className="text-sm text-gray-500 mb-2">Choose the invocation type that Lambda sends records for.</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="radio" id="async" name="source" value="async" defaultChecked className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="async" className="text-sm">Asynchronous invocation</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="radio" id="event-source" name="source" value="event-source" className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="event-source" className="text-sm">Event source mapping invocation</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Condition</Label>
                  <p className="text-sm text-gray-500 mb-2">Choose whether to send invocation records for event processing failures or for successful invocations.</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="radio" id="on-failure" name="condition" value="on-failure" defaultChecked className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="on-failure" className="text-sm">On failure</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="radio" id="on-success" name="condition" value="on-success" className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="on-success" className="text-sm">On success</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Destination type</Label>
                  <p className="text-sm text-gray-500 mb-2">Choose the destination type that Lambda sends invocation records to.</p>
                  <select className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="sns">SNS topic</option>
                    <option value="sqs">SQS queue</option>
                    <option value="lambda">Lambda function</option>
                    <option value="eventbridge">EventBridge event bus</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Destination</Label>
                  <p className="text-sm text-gray-500 mb-2">Choose the ARN of the destination, or enter the ARN manually.</p>
                  <div className="flex gap-2">
                    <Input placeholder="Destination ARN" className="flex-1" />
                    <Button variant="outline" size="sm" className="shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDestinationModalOpen(false)}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              className="min-w-[80px]"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Infrastructure Modal */}
      <ExportInfrastructureModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleExportToInfrastructure}
        defaultBucketName={`lambdasam-${functionName.toLowerCase()}-${process.env.AWS_REGION || 'us-east-1'}`}
      />

      <UploadCodeModal
        functionName={functionName}
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}

function getSourceTypeName(sourceType: string): string {
  const sourceTypes: Record<string, string> = {
    'dynamodb': 'DynamoDB',
    'kinesis': 'Kinesis',
    'sqs': 'SQS',
    's3': 'S3',
    'events': 'EventBridge',
    'apigateway': 'API Gateway',
    'function-url': 'Function URL'
  };
  return sourceTypes[sourceType] || sourceType;
}

function getSourceTypeIcon(type: string): ReactNode {
  switch (type) {
    case 's3':
      return <Database className="h-5 w-5" />;
    case 'dynamodb':
      return <Table className="h-5 w-5" />;
    case 'sqs':
      return <MessageSquare className="h-5 w-5" />;
    case 'sns':
      return <Bell className="h-5 w-5" />;
    case 'api-gateway':
      return <Globe className="h-5 w-5" />;
    case 'eventbridge':
      return <Zap className="h-5 w-5" />;
    case 'cloudwatch':
      return <Activity className="h-5 w-5" />;
    default:
      return <Link className="h-5 w-5" />;
  }
} 