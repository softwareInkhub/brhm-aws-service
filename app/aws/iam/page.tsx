'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Plus, Shield, Users, Trash2, RefreshCcw, Key, Settings, ChevronRight, Group, FileText, Search, Filter, Info, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { toast } from "@/app/components/ui/use-toast";
import { Separator } from "@/app/components/ui/separator";
import { cn } from "@/app/lib/utils";
import { listRoles, type IAMRole, createRole, listPolicies, attachRolePolicy, detachRolePolicy } from '@/app/services/iam';
import { logger } from '@/app/utils/logger';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

interface IAMUser {
  UserName: string;
  Arn: string;
  CreateDate: Date;
}

interface IAMGroup {
  GroupName: string;
  Arn: string;
  CreateDate: Date;
  UserCount: number;
}

interface ExtendedIAMPolicy {
  PolicyName: string;
  PolicyArn: string;
  Description?: string;
  CreateDate: Date;
  UpdateDate?: Date;
}

export default function IAMPage() {
  const [roles, setRoles] = useState<IAMRole[]>([]);
  const [users, setUsers] = useState<IAMUser[]>([]);
  const [groups, setGroups] = useState<IAMGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<IAMRole | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    RoleName: '',
    Description: '',
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'lambda.amazonaws.com'
          },
          Action: 'sts:AssumeRole'
        }
      ]
    }
  });
  const [policies, setPolicies] = useState<ExtendedIAMPolicy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<ExtendedIAMPolicy[]>([]);
  const [policySearch, setPolicySearch] = useState('');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<'user' | 'role' | 'group' | 'policy'>('user');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  async function loadRoles() {
    logger.info('IAMPage: Starting to load roles', {
      component: 'IAMPage'
    });
    setLoading(true);
    setError(null);

    try {
      logger.debug('IAMPage: Calling listRoles service', {
        component: 'IAMPage'
      });
      const startTime = Date.now();
      
      const response = await listRoles();
      
      setRoles(response.roles);
      
      const duration = Date.now() - startTime;
      logger.debug(`IAMPage: listRoles completed in ${duration}ms`, {
        component: 'IAMPage'
      });
      
      logger.info('IAMPage: Successfully loaded roles', {
        component: 'IAMPage',
        data: {
          count: response.roles.length,
          requestId: response.requestId
        }
      });
    } catch (error) {
      logger.error('IAMPage: Error loading roles', {
        component: 'IAMPage',
        data: {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error'
        }
      });
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/iam/users");
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch IAM users",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    try {
      switch (createType) {
        case 'user':
          // Implement user creation
          break;
        case 'role':
          // Existing role creation logic
          break;
        case 'group':
          // Implement group creation
          break;
        case 'policy':
          // Implement policy creation
          break;
      }
      setCreateDialogOpen(false);
      setNewName('');
      setNewDescription('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to create ${createType}: ${error?.message || 'Unknown error occurred'}`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (type: "user" | "role" | "group" | "policy", name: string) => {
    try {
      const endpoint = type === "user" 
        ? `/api/iam/users?userName=${encodeURIComponent(name)}`
        : type === "group"
        ? `/api/iam/groups?groupName=${encodeURIComponent(name)}`
        : type === "role"
        ? `/api/iam/roles?roleName=${encodeURIComponent(name)}`
        : `/api/iam/policies?policyName=${encodeURIComponent(name)}`;
      
      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error();

      toast({
        title: "Success",
        description: `${type === "user" ? "User" : type === "group" ? "Group" : type === "role" ? "Role" : "Policy"} deleted successfully`,
      });

      if (type === "user") {
        fetchUsers();
      } else if (type === "group") {
        // Implement group deletion logic
      } else if (type === "role") {
        loadRoles();
      } else if (type === "policy") {
        // Implement policy deletion logic
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${type}`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    logger.info('IAMPage: Component mounted', {
      component: 'IAMPage'
    });
    loadRoles();
    fetchUsers();
    loadPolicies();
  }, []);

  useEffect(() => {
    if (isPolicyModalOpen) {
      loadPolicies();
    }
  }, [isPolicyModalOpen]);

  useEffect(() => {
    const filtered = policies.filter(policy => 
      policy.PolicyName.toLowerCase().includes(policySearch.toLowerCase()) ||
      policy.PolicyArn.toLowerCase().includes(policySearch.toLowerCase())
    );
    setFilteredPolicies(filtered);
  }, [policySearch, policies]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/iam/policies");
      if (!response.ok) {
        throw new Error('Failed to fetch policies');
      }
      const data = await response.json();
      const extendedPolicies: ExtendedIAMPolicy[] = (data.policies || []).map((policy: any) => ({
        PolicyName: policy.PolicyName,
        PolicyArn: policy.PolicyArn || policy.Arn,
        Description: policy.Description,
        CreateDate: new Date(),
        UpdateDate: policy.UpdateDate ? new Date(policy.UpdateDate) : undefined
      }));
      setPolicies(extendedPolicies);
      setFilteredPolicies(extendedPolicies);
    } catch (error: any) {
      logger.error('Failed to load policies:', error);
      toast({
        title: "Error",
        description: "Failed to load IAM policies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      logger.info('Creating new IAM role', {
        component: 'IAMPage',
        data: { roleName: newRole.RoleName }
      });

      const createdRole = await createRole(newRole);
      setRoles([...roles, createdRole]);
      setIsCreateModalOpen(false);
      setNewRole({
        RoleName: '',
        Description: '',
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      });
    } catch (error) {
      logger.error('Failed to create IAM role', {
        component: 'IAMPage',
        data: {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error'
        }
      });
      setError(error instanceof Error ? error.message : 'Failed to create IAM role');
    }
  };

  const handleRoleClick = (role: IAMRole) => {
    setSelectedRole(role);
    setIsDetailsModalOpen(true);
  };

  const handleAttachPolicy = async (policyArn: string) => {
    if (!selectedRole) return;
    
    setIsAttaching(true);
    try {
      await attachRolePolicy(selectedRole.RoleName, policyArn);
      // Refresh role data
      const updatedRoles = await listRoles();
      setRoles(updatedRoles.roles);
      // Update selected role
      const updatedRole = updatedRoles.roles.find(r => r.RoleId === selectedRole.RoleId);
      if (updatedRole) {
        setSelectedRole(updatedRole);
      }
      setIsPolicyModalOpen(false);
    } catch (error) {
      logger.error('Failed to attach policy', {
        component: 'IAMPage',
        data: {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error'
        }
      });
    } finally {
      setIsAttaching(false);
    }
  };

  const handleDetachPolicy = async (policyArn: string) => {
    if (!selectedRole) return;
    
    try {
      await detachRolePolicy(selectedRole.RoleName, policyArn);
      // Refresh role data
      const updatedRoles = await listRoles();
      setRoles(updatedRoles.roles);
      // Update selected role
      const updatedRole = updatedRoles.roles.find(r => r.RoleId === selectedRole.RoleId);
      if (updatedRole) {
        setSelectedRole(updatedRole);
      }
    } catch (error) {
      logger.error('Failed to detach policy', {
        component: 'IAMPage',
        data: {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error'
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-4">
            <p>Loading IAM roles...</p>
          </CardContent>
        </Card>
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
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
            IAM Management
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Manage your AWS Identity and Access Management (IAM) users, roles, groups, and policies with enhanced security and control.
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="users" className="space-y-8">
        <TabsList className="grid w-full grid-cols-4 p-1 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl">
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:data-[state=active]:bg-gray-900">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-purple-600 dark:data-[state=active]:bg-gray-900">
            <Group className="w-4 h-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-navy-600 dark:data-[state=active]:bg-gray-900">
            <Shield className="w-4 h-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-orange-600 dark:data-[state=active]:bg-gray-900">
            <FileText className="w-4 h-4" />
            Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Users</h2>
                <Badge variant="secondary" className="rounded-full px-3 bg-blue-100 text-blue-700">
                  {users.length}
                </Badge>
                <Button variant="ghost" size="icon" className="ml-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Info className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Create and manage IAM users.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                className="gap-2 hover:border-blue-500 hover:text-blue-500 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </Button>
              <Button 
                size="sm" 
                onClick={() => {
                  setCreateType("user");
                  setCreateDialogOpen(true);
                }}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:shadow-blue-300"
              >
                <Plus className="w-4 h-4" />
                Create user
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse flex items-center gap-2">
                <div className="h-4 w-4 bg-blue-200 rounded-full animate-bounce"></div>
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-gradient-to-b from-blue-50 to-transparent rounded-lg border-2 border-dashed border-blue-200">
              <Users className="w-12 h-12 text-blue-300" />
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No IAM users found.</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setCreateType("user");
                    setCreateDialogOpen(true);
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Create your first user
                </Button>
              </div>
            </div>
          ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <Card 
                  key={user.UserName} 
                  className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-100 hover:border-blue-200 hover:-translate-y-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                        <Users className="w-4 h-4" />
                      </div>
                      <CardTitle className="text-sm font-medium">
                        {user.UserName}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete("user", user.UserName)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
          </CardHeader>
                  <CardContent className="relative">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 p-2 rounded-md">
                        <Key className="w-3 h-3 text-blue-500" />
                        <span className="truncate font-mono">{user.Arn}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700">
                          Created: {new Date(user.CreateDate).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">Groups</h2>
                  <Badge variant="secondary" className="rounded-full px-3 bg-purple-100 text-purple-700">
                    {groups.length}
                  </Badge>
                  <Button variant="ghost" size="icon" className="ml-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                    <Info className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Create and manage IAM groups.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {/* implement groups refresh */}}
                  className="gap-2 hover:border-purple-500 hover:text-purple-500 transition-colors"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Refresh
                </Button>
                <Button 
                  size="sm"
                  onClick={() => {
                    setCreateType("group");
                    setCreateDialogOpen(true);
                  }}
                  className="gap-2 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-700 hover:to-purple-500 text-white shadow-lg shadow-purple-200 transition-all hover:shadow-xl hover:shadow-purple-300"
                >
                  <Plus className="w-4 h-4" />
                  Create group
                </Button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse flex items-center gap-2">
                <div className="h-4 w-4 bg-purple-200 rounded-full animate-bounce"></div>
                <p className="text-muted-foreground">Loading groups...</p>
              </div>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-gradient-to-b from-purple-50 to-transparent rounded-lg border-2 border-dashed border-purple-200">
              <Group className="w-12 h-12 text-purple-300" />
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No IAM groups found.</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setCreateType("group");
                    setCreateDialogOpen(true);
                  }}
                  className="text-purple-600 hover:text-purple-700"
                >
                  Create your first group
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card 
                  key={group.GroupName} 
                  className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-100 hover:border-purple-200 hover:-translate-y-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                        <Group className="w-4 h-4" />
                      </div>
                      <CardTitle className="text-sm font-medium">
                        {group.GroupName}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete("group", group.GroupName)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 p-2 rounded-md">
                        <Key className="w-3 h-3 text-purple-500" />
                        <span className="truncate font-mono">{group.Arn}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700">
                          Created: {new Date(group.CreateDate).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-blue-900 p-4 rounded-lg">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Roles</h2>
                <p className="text-sm text-slate-300">Manage IAM roles and permissions</p>
              </div>
              <Badge variant="secondary" className="bg-white/10 text-white border-0">
                {roles.length} roles
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadRoles}
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
              >
                <RefreshCcw className="w-4 h-4" />
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  setCreateType("role");
                  setCreateDialogOpen(true);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create role
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Find roles by name"
                className="pl-10 pr-4"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="All types" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="service">AWS service roles</SelectItem>
                <SelectItem value="custom">Custom roles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">Loading roles...</p>
              </div>
            </div>
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 rounded-lg bg-gradient-to-b from-gray-50 to-white border-2 border-dashed border-gray-200">
              <div className="p-4 rounded-full bg-blue-50">
                <Shield className="w-12 h-12 text-blue-400" />
              </div>
              <p className="mt-6 text-lg font-medium text-gray-900">No IAM roles found</p>
              <p className="mt-2 text-sm text-gray-500 max-w-sm text-center">
                Create your first role to start managing permissions for AWS services and users
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateType("role");
                  setCreateDialogOpen(true);
                }}
                className="mt-6 gap-2 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="w-4 h-4" />
                Create your first role
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200/50 overflow-hidden bg-white/50 backdrop-blur-sm shadow-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                    <TableHead className="w-[30px] py-4">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableHead>
                    <TableHead className="font-medium text-gray-700">Role name</TableHead>
                    <TableHead className="font-medium text-gray-700">Description</TableHead>
                    <TableHead className="font-medium text-gray-700">Last used</TableHead>
                    <TableHead className="font-medium text-gray-700">Created</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow 
                      key={role.RoleName}
                      className="group hover:bg-blue-50/50 transition-all duration-300"
                    >
                      <TableCell className="py-4">
                        <input type="checkbox" className="rounded border-gray-300" />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
                              <Shield className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer transition-colors">
                              {role.RoleName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-mono truncate max-w-[300px] bg-gray-50 px-2 py-1 rounded">
                              {role.Arn}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 line-clamp-2">
                          {role.Description || 'No description'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Not used
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span className="text-sm text-gray-600">
                            {new Date(role.CreateDate).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600"
                            onClick={() => handleRoleClick(role)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                            onClick={() => handleDelete("role", role.RoleName)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-gray-500">
              Showing {roles.length} roles
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled
                className="border-gray-200/50"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="font-medium bg-blue-50 border-blue-200 text-blue-700"
                >
                  1
                </Button>
                <span className="text-sm text-gray-500">of {Math.ceil(roles.length / 10)}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="border-gray-200/50 hover:border-blue-500 hover:text-blue-500"
              >
                Next
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Policies</h2>
                <Badge variant="secondary" className="rounded-full px-3 bg-orange-100 text-orange-700">
                  {policies.length}
                </Badge>
                <Button variant="ghost" size="icon" className="ml-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                  <Info className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">A policy is an object in AWS that defines permissions.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadPolicies}
                className="gap-2 hover:border-orange-500 hover:text-orange-500 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </Button>
              <Button 
                size="sm"
                className="gap-2 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white shadow-lg shadow-orange-200 transition-all hover:shadow-xl hover:shadow-orange-300"
                onClick={() => {
                  setCreateType("policy");
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Create policy
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for policies"
                className="pl-10 border-orange-200 focus:border-orange-500 focus:ring-orange-500 transition-colors"
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px] border-orange-200 focus:border-orange-500 focus:ring-orange-500">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-orange-500" />
                  <SelectValue placeholder="Filter by Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="aws">AWS managed</SelectItem>
                <SelectItem value="customer">Customer managed</SelectItem>
                <SelectItem value="job">AWS managed - job function</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse flex items-center gap-2">
                <div className="h-4 w-4 bg-orange-200 rounded-full animate-bounce"></div>
                <p className="text-muted-foreground">Loading policies...</p>
              </div>
            </div>
          ) : policies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-gradient-to-b from-orange-50 to-transparent rounded-lg border-2 border-dashed border-orange-200">
              <FileText className="w-12 h-12 text-orange-300" />
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No IAM policies found.</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setCreateType("policy");
                    setCreateDialogOpen(true);
                  }}
                  className="text-orange-600 hover:text-orange-700"
                >
                  Create your first policy
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-orange-200 overflow-hidden bg-white shadow-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-orange-50 to-orange-100/50">
                    <TableHead className="w-[30px]">
                      <input type="checkbox" className="rounded border-orange-300" />
                    </TableHead>
                    <TableHead className="min-w-[200px] font-semibold">
                      <div className="flex items-center gap-1 text-orange-700">
                        Policy name
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-orange-700">Type</TableHead>
                    <TableHead className="font-semibold text-orange-700">Used as</TableHead>
                    <TableHead className="font-semibold text-orange-700">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(policySearch ? filteredPolicies : policies).map((policy) => (
                    <TableRow 
                      key={policy.PolicyArn}
                      className="group hover:bg-orange-50/50 transition-colors"
                    >
                      <TableCell>
                        <input type="checkbox" className="rounded border-orange-300" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-orange-100 text-orange-600 group-hover:bg-orange-200 transition-colors">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-orange-600 hover:text-orange-700 cursor-pointer">
                            {policy.PolicyName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                          AWS managed
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">None</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm line-clamp-1 text-gray-600">{policy.Description || '-'}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {policies.length} policies</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled
                className="border-orange-200"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="font-medium bg-orange-50 border-orange-200 text-orange-700"
                >
                  1
                </Button>
                <span className="text-sm text-muted-foreground">of 68</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="border-orange-200 hover:border-orange-500 hover:text-orange-500"
              >
                Next
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gradient-to-br from-white to-gray-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create New {createType.charAt(0).toUpperCase() + createType.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={createType === "user" ? "default" : "outline"}
                onClick={() => setCreateType("user")}
                className={cn(
                  "gap-2 transition-all",
                  createType === "user" && "bg-gradient-to-r from-blue-600 to-blue-400 text-white"
                )}
              >
                <Users className="w-4 h-4" />
                User
              </Button>
              <Button
                variant={createType === "role" ? "default" : "outline"}
                onClick={() => setCreateType("role")}
                className={cn(
                  "gap-2 transition-all",
                  createType === "role" && "bg-gradient-to-r from-navy-600 to-brown-600 text-white"
                )}
              >
                <Shield className="w-4 h-4" />
                Role
              </Button>
              <Button
                variant={createType === "group" ? "default" : "outline"}
                onClick={() => setCreateType("group")}
                className={cn(
                  "gap-2 transition-all",
                  createType === "group" && "bg-gradient-to-r from-purple-600 to-purple-400 text-white"
                )}
              >
                <Group className="w-4 h-4" />
                Group
              </Button>
              <Button
                variant={createType === "policy" ? "default" : "outline"}
                onClick={() => setCreateType("policy")}
                className={cn(
                  "gap-2 transition-all",
                  createType === "policy" && "bg-gradient-to-r from-orange-500 to-orange-400 text-white"
                )}
              >
                <FileText className="w-4 h-4" />
                Policy
              </Button>
            </div>
            <Separator className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                {createType.charAt(0).toUpperCase() + createType.slice(1)} Name
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`Enter ${createType} name`}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            {(createType === 'role' || createType === 'policy') && (
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={`Enter ${createType} description`}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 min-h-[100px]"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={handleCreate} 
              disabled={!newName}
              className={cn(
                "gap-2 transition-all",
                createType === "user" && "bg-gradient-to-r from-blue-600 to-blue-400",
                createType === "role" && "bg-gradient-to-r from-navy-600 to-brown-600",
                createType === "group" && "bg-gradient-to-r from-purple-600 to-purple-400",
                createType === "policy" && "bg-gradient-to-r from-orange-500 to-orange-400",
                "text-white shadow-lg hover:shadow-xl",
                !newName && "opacity-50 cursor-not-allowed"
              )}
            >
              <Plus className="w-4 h-4" />
              Create {createType.charAt(0).toUpperCase() + createType.slice(1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b p-4 bg-gradient-to-r from-slate-900 to-blue-900">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    {selectedRole?.RoleName}
                  </h2>
                  <p className="text-sm text-slate-300 font-mono">
                    {selectedRole?.Arn}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                    onClick={() => handleDelete("role", selectedRole?.RoleName || '')}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete role
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="summary" className="h-full flex flex-col">
                <div className="border-b px-4 bg-gray-50">
                  <TabsList className="bg-transparent border-b-0 h-12">
                    <TabsTrigger value="summary" className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                      Summary
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                      Permissions
                    </TabsTrigger>
                    <TabsTrigger value="trust" className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                      Trust relationships
                    </TabsTrigger>
                    <TabsTrigger value="tags" className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                      Tags
                    </TabsTrigger>
                    <TabsTrigger value="access" className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                      Access Advisor
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="summary" className="p-6 h-full">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-500">Role details</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-xs text-gray-500">Role name</Label>
                              <p className="text-sm font-medium">{selectedRole?.RoleName}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Role ARN</Label>
                              <p className="text-sm font-mono bg-gray-50 p-2 rounded">{selectedRole?.Arn}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Creation date</Label>
                              <p className="text-sm">{selectedRole?.CreateDate.toLocaleString()}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Role ID</Label>
                              <p className="text-sm font-mono">{selectedRole?.RoleId}</p>
                            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-500">Permissions boundary</CardTitle>
          </CardHeader>
          <CardContent>
                            <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg">
                              <p className="text-sm text-gray-500">No permissions boundary</p>
                              <Button variant="link" size="sm" className="mt-2">
                                Set boundary
                              </Button>
                            </div>
          </CardContent>
        </Card>
                      </div>
        
        <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="text-sm font-medium text-gray-500">Permissions policies</CardTitle>
                          <Button variant="outline" size="sm" onClick={() => setIsPolicyModalOpen(true)}>
                            Add permissions
                          </Button>
          </CardHeader>
          <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Policy name</TableHead>
                                <TableHead>Policy type</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedRole?.AttachedPolicies?.map((policy) => (
                                <TableRow key={policy.PolicyArn}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-blue-600" />
                                      <span className="font-medium">{policy.PolicyName}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>AWS managed</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDetachPolicy(policy.PolicyArn)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      Remove
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
          </CardContent>
        </Card>
      </div>
                  </TabsContent>

                  <TabsContent value="permissions" className="p-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Permissions</CardTitle>
                        <CardDescription>
                          View and edit the permissions policies attached to this role.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <Input placeholder="Find policy" className="max-w-sm" />
                            <Select defaultValue="all">
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Policy type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                <SelectItem value="aws">AWS managed</SelectItem>
                                <SelectItem value="customer">Customer managed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Policy name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedRole?.AttachedPolicies?.map((policy) => (
                                <TableRow key={policy.PolicyArn}>
                                  <TableCell className="font-medium">{policy.PolicyName}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">AWS managed</Badge>
                                  </TableCell>
                                  <TableCell>Policy description here</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="sm">View policy</Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="trust" className="p-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg font-semibold">Trust relationships</CardTitle>
                            <CardDescription className="text-sm text-gray-500 mt-1">
                              Edit the trust relationship policy document to control which entities can assume this role.
                            </CardDescription>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                          >
                            <Settings className="w-4 h-4" />
                            Edit trust policy
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-lg border border-gray-200">
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">Trust policy</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <div className="bg-white p-4 max-h-[200px] overflow-y-auto">
                            <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
                              {JSON.stringify({
                                "Version": "2012-10-17",
                                "Statement": [
                                  {
                                    "Effect": "Allow",
                                    "Principal": {
                                      "Service": "amplify.amazonaws.com"
                                    },
                                    "Action": "sts:AssumeRole"
                                  }
                                ]
                              }, null, 2)}
                            </pre>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-gray-900">Trusted entities</h3>
                          <div className="rounded-lg border border-gray-200">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50">
                                  <TableHead className="py-2 font-medium text-gray-700">Type</TableHead>
                                  <TableHead className="py-2 font-medium text-gray-700">Service</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell className="py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 rounded-md bg-blue-50">
                                        <Shield className="w-4 h-4 text-blue-600" />
                                      </div>
                                      <span className="text-sm">AWS Service</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <span className="text-sm">amplify.amazonaws.com</span>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex gap-2">
                            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-700">
                              <p className="font-medium">About trust relationships</p>
                              <p className="mt-1 text-blue-600">A trust relationship defines which entities can assume this role. When an entity assumes this role, it receives temporary security credentials for accessing AWS resources.</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="tags" className="p-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Tags</CardTitle>
                        <CardDescription>
                          Add or remove tags to help you organize and identify this role.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <Button variant="outline">Add new tag</Button>
                          <div className="border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Key</TableHead>
                                  <TableHead>Value</TableHead>
                                  <TableHead></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center text-gray-500">
                                    No tags added
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="access" className="p-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Access Advisor</CardTitle>
                        <CardDescription>
                          Review when IAM entities last accessed services to help you remove unused permissions.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Service</TableHead>
                                <TableHead>Last accessed</TableHead>
                                <TableHead>Actions used</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Shield className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span>IAM</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">
                                    Not accessed
                                  </Badge>
                                </TableCell>
                                <TableCell>-</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 