'use client';

import { useEffect, useState } from 'react';
import { Trash, Settings, Play, Code, Plus, ChevronRight, Globe, Key, X, Link } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { toast } from '@/app/components/ui2/use-toast';
import {
  APIGateway,
  APIResource,
  APIMethod,
  APIStage,
  listAPIs,
  createAPI,
  createResource,
  createMethod,
  createDeployment,
  deleteAPI,
  CreateAPIParams,
  CreateMethodParams
} from '@/app/services/apigateway';

type EndpointType = 'REGIONAL' | 'EDGE' | 'PRIVATE';

export default function APIGatewayPage() {
  const [apis, setApis] = useState<APIGateway[]>([]);
  const [selectedApi, setSelectedApi] = useState<APIGateway | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [createResourceOpen, setCreateResourceOpen] = useState(false);
  const [createMethodOpen, setCreateMethodOpen] = useState(false);
  const [createDeploymentOpen, setCreateDeploymentOpen] = useState(false);

  const [newApi, setNewApi] = useState<CreateAPIParams>({
    name: '',
    description: '',
    endpointType: 'REGIONAL' as EndpointType,
    protocol: 'REST'
  });

  const [newResource, setNewResource] = useState({
    parentId: '',
    pathPart: ''
  });

  const [newMethod, setNewMethod] = useState<Omit<CreateMethodParams, 'apiId' | 'resourceId'>>({
    httpMethod: 'GET',
    authorizationType: 'NONE',
    apiKeyRequired: false,
    integration: {
      type: 'HTTP',
      uri: '',
      integrationMethod: 'GET'
    }
  });

  const [newDeployment, setNewDeployment] = useState({
    stageName: '',
    description: ''
  });

  useEffect(() => {
    fetchAPIs();
  }, []);

  const fetchAPIs = async () => {
    try {
      const apis = await listAPIs();
      setApis(apis);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch APIs',
        variant: 'destructive',
      });
    }
  };

  const handleCreateAPI = async () => {
    try {
      await createAPI(newApi);
      setCreateDialogOpen(false);
      fetchAPIs();
      toast({
        title: 'Success',
        description: 'API created successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create API',
        variant: 'destructive',
      });
    }
  };

  const handleCreateResource = async () => {
    if (!selectedApi) return;
    try {
      await createResource({
        apiId: selectedApi.id,
        ...newResource
      });
      setCreateResourceOpen(false);
      fetchAPIs();
      toast({
        title: 'Success',
        description: 'Resource created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create resource',
        variant: 'destructive'
      });
    }
  };

  const handleCreateMethod = async () => {
    if (!selectedApi || !newResource.parentId) return;
    try {
      await createMethod({
        apiId: selectedApi.id,
        resourceId: newResource.parentId,
        ...newMethod
      });
      setCreateMethodOpen(false);
      fetchAPIs();
      toast({
        title: 'Success',
        description: 'Method created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create method',
        variant: 'destructive'
      });
    }
  };

  const handleCreateDeployment = async () => {
    if (!selectedApi) return;
    try {
      await createDeployment({
        apiId: selectedApi.id,
        ...newDeployment
      });
      setCreateDeploymentOpen(false);
      fetchAPIs();
      toast({
        title: 'Success',
        description: 'Deployment created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create deployment',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAPI = async (apiId: string) => {
    try {
      await deleteAPI(apiId);
      fetchAPIs();
      toast({
        title: 'Success',
        description: 'API deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete API',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">API Gateway</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create API
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API</DialogTitle>
              <DialogDescription>
                Create a new REST API in API Gateway
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newApi.name}
                  onChange={(e) => setNewApi({ ...newApi, name: e.target.value })}
                  placeholder="Enter API name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newApi.description}
                  onChange={(e) => setNewApi({ ...newApi, description: e.target.value })}
                  placeholder="Enter API description"
                />
              </div>
              <div className="grid gap-2">
                <Label>Endpoint Type</Label>
                <Select
                  value={newApi.endpointType}
                  onValueChange={(value) => setNewApi({ ...newApi, endpointType: value as EndpointType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select endpoint type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGIONAL">Regional</SelectItem>
                    <SelectItem value="EDGE">Edge</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAPI} className="bg-blue-600 hover:bg-blue-700 text-white">
          Create API
        </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apis.map((api) => (
          <div
            key={api.id}
            className="group relative bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200"
            onClick={() => {
              setSelectedApi(api);
              setDetailsDialogOpen(true);
            }}
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button
                variant="destructive"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteAPI(api.id);
                }}
                className="bg-red-500 hover:bg-red-600"
              >
                <Trash className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{api.name}</h3>
                  <p className="text-sm text-gray-500">{api.description || 'No description'}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {api.endpointConfiguration.types[0]}
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  REST
                </Badge>
                {api.resources && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    {api.resources.length} Resources
                  </Badge>
                )}
                {api.stages && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {api.stages.length} Stages
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  <span>{new Date(api.createdDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <Link className="w-4 h-4 mr-2" />
                  <span className="truncate">{api.id}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* API Details Modal */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl mb-1">{selectedApi?.name}</DialogTitle>
                <DialogDescription>{selectedApi?.description || 'No description'}</DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDetailsDialogOpen(false)}
                className="rounded-full hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="mt-6">
            <Tabs defaultValue="resources" className="w-full">
              <TabsList className="w-full grid grid-cols-3 gap-4 bg-gray-50 p-1 rounded-lg">
                <TabsTrigger value="resources" className="data-[state=active]:bg-white data-[state=active]:shadow">
                  Resources
                </TabsTrigger>
                <TabsTrigger value="stages" className="data-[state=active]:bg-white data-[state=active]:shadow">
                  Stages
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:shadow">
                  Settings
                </TabsTrigger>
              </TabsList>

              <div className="mt-6 bg-white rounded-lg p-6">
                <TabsContent value="resources">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">API Resources</h3>
                      <Button
                        onClick={() => {
                          setCreateResourceOpen(true);
                          setDetailsDialogOpen(false);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Resource
                      </Button>
                    </div>
                    <ScrollArea className="h-[400px] border rounded-lg">
                      <div className="divide-y">
                        {selectedApi?.resources?.map((resource) => (
                          <div
                            key={resource.id}
                            className="flex items-center justify-between p-4 hover:bg-gray-50"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{resource.path}</p>
                              <div className="flex gap-2 mt-1">
                                {Object.keys(resource.methods || {}).map((method) => (
                                  <Badge
                                    key={method}
                                    variant="outline"
                                    className={`
                                      ${method === 'GET' && 'border-green-500 text-green-700'}
                                      ${method === 'POST' && 'border-blue-500 text-blue-700'}
                                      ${method === 'PUT' && 'border-yellow-500 text-yellow-700'}
                                      ${method === 'DELETE' && 'border-red-500 text-red-700'}
                                    `}
                                  >
                                    {method}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewResource({ ...newResource, parentId: resource.id });
                                setCreateMethodOpen(true);
                                setDetailsDialogOpen(false);
                              }}
                              className="ml-4"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Method
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="stages">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">API Stages</h3>
                      <Button
                        onClick={() => {
                          setCreateDeploymentOpen(true);
                          setDetailsDialogOpen(false);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Create Deployment
                      </Button>
                    </div>
                    <ScrollArea className="h-[400px] border rounded-lg">
                      <div className="divide-y">
                        {selectedApi?.stages?.map((stage) => (
                          <div
                            key={stage.stageName}
                            className="flex items-center justify-between p-4 hover:bg-gray-50"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{stage.stageName}</p>
                              <p className="text-sm text-gray-500">
                                {stage.description || 'No description'}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant="outline" className="text-gray-600">
                                {new Date(stage.createdDate).toLocaleDateString()}
                              </Badge>
                              <Button variant="ghost" size="icon">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="settings">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-gray-500">API ID</Label>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                            {selectedApi?.id}
                          </code>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Link className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-500">Created Date</Label>
                        <p className="text-sm">
                          {selectedApi?.createdDate && new Date(selectedApi.createdDate).toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-500">Endpoint Type</Label>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {selectedApi?.endpointConfiguration.types[0]}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-500">API Key Required</Label>
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          No
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createResourceOpen} onOpenChange={setCreateResourceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Resource</DialogTitle>
            <DialogDescription>
              Add a new resource to your API
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pathPart">Path Part</Label>
              <Input
                id="pathPart"
                value={newResource.pathPart}
                onChange={(e) =>
                  setNewResource({ ...newResource, pathPart: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateResourceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateResource}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createMethodOpen} onOpenChange={setCreateMethodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Method</DialogTitle>
            <DialogDescription>
              Add a new method to your resource
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="httpMethod">HTTP Method</Label>
              <Select
                value={newMethod.httpMethod}
                onValueChange={(value) =>
                  setNewMethod({ ...newMethod, httpMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="authType">Authorization Type</Label>
              <Select
                value={newMethod.authorizationType}
                onValueChange={(value: 'NONE' | 'AWS_IAM' | 'CUSTOM' | 'COGNITO_USER_POOLS') => 
                  setNewMethod(prev => ({ ...prev, authorizationType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select authorization type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="AWS_IAM">AWS IAM</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                  <SelectItem value="COGNITO_USER_POOLS">Cognito User Pools</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="integrationType">Integration Type</Label>
              <Select
                value={newMethod.integration.type}
                onValueChange={(value) =>
                  setNewMethod({
                    ...newMethod,
                    integration: { ...newMethod.integration, type: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                  <SelectItem value="AWS">AWS Service</SelectItem>
                  <SelectItem value="MOCK">Mock</SelectItem>
                  <SelectItem value="HTTP_PROXY">HTTP Proxy</SelectItem>
                  <SelectItem value="AWS_PROXY">AWS Service Proxy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="integrationUri">Integration URI</Label>
              <Input
                id="integrationUri"
                value={newMethod.integration.uri}
                onChange={(e) =>
                  setNewMethod({
                    ...newMethod,
                    integration: { ...newMethod.integration, uri: e.target.value },
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateMethodOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMethod}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDeploymentOpen} onOpenChange={setCreateDeploymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Deployment</DialogTitle>
            <DialogDescription>
              Deploy your API to a stage
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stageName">Stage Name</Label>
              <Input
                id="stageName"
                value={newDeployment.stageName}
                onChange={(e) =>
                  setNewDeployment({ ...newDeployment, stageName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deploymentDescription">Description</Label>
              <Input
                id="deploymentDescription"
                value={newDeployment.description}
                onChange={(e) =>
                  setNewDeployment({
                    ...newDeployment,
                    description: e.target.value,
                  })
                }
              />
            </div>
      </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDeploymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeployment}>Deploy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 