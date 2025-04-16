'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Users, Key, Shield, Plus, Trash2, Settings, Info, FileText, Clock, Tag, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { log } from 'console';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import { QRCodeSVG } from 'qrcode.react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/components/ui/pagination"
import { cn } from "@/lib/utils"

interface Policy {
  PolicyName: string;
  Arn: string;
  PolicyId?: string;
  Description?: string;
  Path?: string;
  DefaultVersionId?: string;
}

interface UserDetails {
  UserName: string;
  Arn: string;
  CreateDate: string;
  AttachedPolicies: Array<{
    PolicyName: string;
    PolicyArn: string;
  }>;
  Groups: Array<{
    GroupName: string;
    GroupArn: string;
  }>;
}

interface Group {
  GroupName: string;
  GroupId: string;
  Arn: string;
  CreateDate: Date;
}

interface AccessKey {
  AccessKeyId: string;
  CreateDate: string;
  Status: string;
}

interface MFADevice {
  SerialNumber: string;
  EnableDate: string;
}

interface Tag {
  Key: string;
  Value: string;
}

interface ServiceLastAccessed {
  ServiceName: string;
  LastAccessed?: string;
  ServiceNamespace: string;
  LastAuthenticated?: string;
  TotalAuthenticatedEntities?: number;
}

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [policySearch, setPolicySearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPolicies, setSelectedPolicies] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [attachingPolicy, setAttachingPolicy] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isSavingGroups, setIsSavingGroups] = useState(false);
  const [consoleAccess, setConsoleAccess] = useState<{ hasConsoleAccess: boolean }>({ hasConsoleAccess: false });
  const [isLoadingConsoleAccess, setIsLoadingConsoleAccess] = useState(false);
  const [isUpdatingConsoleAccess, setIsUpdatingConsoleAccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [accessKeys, setAccessKeys] = useState<AccessKey[]>([]);
  const [isLoadingAccessKeys, setIsLoadingAccessKeys] = useState(false);
  const [isCreatingAccessKey, setIsCreatingAccessKey] = useState(false);
  const [newAccessKey, setNewAccessKey] = useState<any>(null);
  const [showAccessKeyDialog, setShowAccessKeyDialog] = useState(false);
  const [mfaDevices, setMfaDevices] = useState<MFADevice[]>([]);
  const [isLoadingMFA, setIsLoadingMFA] = useState(false);
  const [isConfiguringMFA, setIsConfiguringMFA] = useState(false);
  const [mfaQRCode, setMfaQRCode] = useState<string | null>(null);
  const [mfaSerialNumber, setMfaSerialNumber] = useState<string | null>(null);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [authCode1, setAuthCode1] = useState('');
  const [authCode2, setAuthCode2] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [lastAccessedServices, setLastAccessedServices] = useState<ServiceLastAccessed[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedService, setSelectedService] = useState<ServiceLastAccessed | null>(null);
  const [showServiceDetails, setShowServiceDetails] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await fetch(`/api/iam/users/${username}`);
        if (!response.ok) throw new Error('Failed to fetch user details');
        const data = await response.json();
        setUserDetails(data);
      } catch (error) {
        toast.error('Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [username]);

  const fetchPolicies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'listPolicies' }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch policies');
      const data = await response.json();
      setPolicies(data);
    } catch (error) {
      toast.error('Failed to load policies');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePolicySelection = (policyArn: string) => {
    if (!policyArn) {
      console.error('Invalid policy ARN');
      return;
    }
    
    console.log('Toggling policy selection for ARN:', policyArn);
    
    setSelectedPolicies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(policyArn)) {
        console.log('Removing policy from selection:', policyArn);
        newSet.delete(policyArn);
      } else {
        console.log('Adding policy to selection:', policyArn);
        newSet.add(policyArn);
      }
      const selectedArray = Array.from(newSet);
      console.log('Current selected policies:', selectedArray);
      console.log('Selected policies count:', newSet.size);
      return newSet;
    });
  };

  const handleSaveSelectedPolicies = async () => {
    if (selectedPolicies.size === 0) {
      toast.error('No policies selected');
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      console.log('Starting to attach selected policies...');
      const selectedArray = Array.from(selectedPolicies);
      console.log('Selected policies to attach:', selectedArray);

      for (const policyArn of selectedArray) {
        if (!policyArn) {
          console.error('Invalid policy ARN encountered');
          errorCount++;
          continue;
        }

        try {
          console.log('Attaching policy:', policyArn);
          const response = await fetch(`/api/iam/users/${username}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'attachPolicy',
              policyArn,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to attach policy');
          }

          successCount++;
          console.log('Successfully attached policy:', policyArn);
        } catch (error: any) {
          console.error('Error attaching policy:', policyArn, error);
          errorCount++;
          toast.error(`Failed to attach policy: ${error.message || 'Unknown error'}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully attached ${successCount} policies`);
        
        // Refresh user details
        const updatedResponse = await fetch(`/api/iam/users/${username}`);
        if (!updatedResponse.ok) throw new Error('Failed to refresh user details');
        
        const updatedData = await updatedResponse.json();
        setUserDetails(updatedData);
        setIsModalOpen(false);
        setSelectedPolicies(new Set());
      }

      if (errorCount > 0) {
        toast.error(`Failed to attach ${errorCount} policies`);
      }
    } catch (error: any) {
      console.error('Error in save operation:', error);
      toast.error(error.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetachPolicy = async (policy: { PolicyName: string, PolicyArn: string }) => {
    try {
      console.log('Attempting to detach policy:', {
        policyName: policy.PolicyName,
        policyArn: policy.PolicyArn
      });

      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'detachPolicy',
          policyArn: policy.PolicyArn
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Detach policy error response:', data);
        throw new Error(data.error || 'Failed to detach policy');
      }
      
      toast.success(`Successfully detached policy: ${policy.PolicyName}`);
      
      // Refresh user details
      const updatedResponse = await fetch(`/api/iam/users/${username}`);
      if (!updatedResponse.ok) {
        const errorData = await updatedResponse.json();
        throw new Error(errorData.error || 'Failed to refresh user details');
      }
      
      const updatedData = await updatedResponse.json();
      setUserDetails(updatedData);
    } catch (error: any) {
      console.error('Error detaching policy:', error);
      toast.error(`Failed to detach policy: ${error.message}`);
    }
  };

  const handleRemoveFromGroup = async (groupName: string) => {
    try {
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'removeFromGroup',
          groupName,
        }),
      });

      if (!response.ok) throw new Error('Failed to remove from group');
      
      toast.success('Removed from group successfully');
      // Refresh user details
      const updatedResponse = await fetch(`/api/iam/users/${username}`);
      const updatedData = await updatedResponse.json();
      setUserDetails(updatedData);
    } catch (error) {
      toast.error('Failed to remove from group');
    }
  };

  const handleBack = () => {
    router.push('/aws/iam');
  };

  const filteredPolicies = policies.filter(policy =>
    policy.PolicyName.toLowerCase().includes(policySearch.toLowerCase())
  );

  const handleAttachPolicy = async (policyArn: string) => {
    console.log('Attach button clicked for policy:', policyArn);
    
    if (!policyArn) {
      console.log('No policy ARN provided');
      return;
    }
    
    try {
      console.log('Starting policy attachment...');
      setAttachingPolicy(policyArn);
      
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'attachPolicy',
          policyArn,
        }),
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to attach policy');
      }
      
      toast.success('Policy attached successfully');
      console.log('Policy attached successfully');
      
      // Refresh user details
      console.log('Refreshing user details...');
      const updatedResponse = await fetch(`/api/iam/users/${username}`);
      if (!updatedResponse.ok) throw new Error('Failed to refresh user details');
      
      const updatedData = await updatedResponse.json();
      setUserDetails(updatedData);
      console.log('User details updated successfully');
    } catch (error: any) {
      console.error('Error attaching policy:', error);
      toast.error(error.message || 'Failed to attach policy');
    } finally {
      setAttachingPolicy(null);
    }
  };

  const fetchGroups = async () => {
    try {
      setIsLoadingGroups(true);
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'listGroups' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      setIsCreatingGroup(true);
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createGroup',
          groupName: newGroupName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create group');
      }

      const newGroup = await response.json();
      setGroups(prev => [...prev, newGroup]);
      setNewGroupName('');
      toast.success('Group created successfully');
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error(error.message || 'Failed to create group');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleAddUserToGroups = async () => {
    if (selectedGroups.size === 0) {
      toast.error('No groups selected');
      return;
    }

    setIsSavingGroups(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const groupName of selectedGroups) {
        try {
          const response = await fetch(`/api/iam/users/${username}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'addUserToGroup',
              groupName,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add user to group');
          }

          successCount++;
        } catch (error: any) {
          console.error('Error adding user to group:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully added user to ${successCount} group${successCount > 1 ? 's' : ''}`);
        
        // Refresh user details
        const updatedResponse = await fetch(`/api/iam/users/${username}`);
        if (!updatedResponse.ok) throw new Error('Failed to refresh user details');
        
        const updatedData = await updatedResponse.json();
        setUserDetails(updatedData);
        setIsGroupModalOpen(false);
        setSelectedGroups(new Set());
      }

      if (errorCount > 0) {
        toast.error(`Failed to add user to ${errorCount} group${errorCount > 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      console.error('Error in save operation:', error);
      toast.error(error.message || 'Failed to save changes');
    } finally {
      setIsSavingGroups(false);
    }
  };

  useEffect(() => {
    const fetchSecurityDetails = async () => {
      try {
        setIsLoadingConsoleAccess(true);
        setIsLoadingAccessKeys(true);
        setIsLoadingMFA(true);

        // Fetch console access status
        const consoleResponse = await fetch(`/api/iam/users/${username}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getLoginProfile' }),
        });
        const consoleData = await consoleResponse.json();
        setConsoleAccess(consoleData);

        // Fetch access keys
        const keysResponse = await fetch(`/api/iam/users/${username}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'listAccessKeys' }),
        });
        const keysData = await keysResponse.json();
        setAccessKeys(keysData);

        // Fetch MFA devices
        const mfaResponse = await fetch(`/api/iam/users/${username}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'listMFADevices' }),
        });
        const mfaData = await mfaResponse.json();
        setMfaDevices(mfaData);
      } catch (error) {
        console.error('Error fetching security details:', error);
        toast.error('Failed to load security details');
      } finally {
        setIsLoadingConsoleAccess(false);
        setIsLoadingAccessKeys(false);
        setIsLoadingMFA(false);
      }
    };

    fetchSecurityDetails();
  }, [username]);

  const handleConsoleAccess = async (enable: boolean) => {
    if (enable) {
      setShowPasswordDialog(true);
    } else {
      try {
        setIsUpdatingConsoleAccess(true);
        const response = await fetch(`/api/iam/users/${username}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteLoginProfile' }),
        });

        if (!response.ok) throw new Error('Failed to disable console access');
        
        setConsoleAccess({ hasConsoleAccess: false });
        toast.success('Console access disabled successfully');
      } catch (error) {
        toast.error('Failed to disable console access');
      } finally {
        setIsUpdatingConsoleAccess(false);
      }
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      setIsUpdatingConsoleAccess(true);
      const action = consoleAccess.hasConsoleAccess ? 'updateLoginProfile' : 'createLoginProfile';
      
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          password: newPassword,
        }),
      });

      if (!response.ok) throw new Error('Failed to update console access');
      
      setConsoleAccess({ hasConsoleAccess: true });
      setShowPasswordDialog(false);
      setNewPassword('');
      toast.success('Console access updated successfully');
    } catch (error) {
      toast.error('Failed to update console access');
    } finally {
      setIsUpdatingConsoleAccess(false);
    }
  };

  const handleCreateAccessKey = async () => {
    try {
      setIsCreatingAccessKey(true);
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createAccessKey' }),
      });

      if (!response.ok) throw new Error('Failed to create access key');
      
      const newKey = await response.json();
      setNewAccessKey(newKey);
      setShowAccessKeyDialog(true);
      
      // Update the list of access keys
      const updatedKeysResponse = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listAccessKeys' }),
      });
      const updatedKeys = await updatedKeysResponse.json();
      setAccessKeys(updatedKeys);
    } catch (error) {
      toast.error('Failed to create access key');
    } finally {
      setIsCreatingAccessKey(false);
    }
  };

  const handleDeleteAccessKey = async (accessKeyId: string) => {
    try {
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'deleteAccessKey',
          accessKeyId,
        }),
      });

      if (!response.ok) throw new Error('Failed to delete access key');
      
      setAccessKeys(prev => prev.filter(key => key.AccessKeyId !== accessKeyId));
      toast.success('Access key deleted successfully');
    } catch (error) {
      toast.error('Failed to delete access key');
    }
  };

  const handleStartMFASetup = async () => {
    try {
      setIsConfiguringMFA(true);
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createMFA' }),
      });

      if (!response.ok) throw new Error('Failed to start MFA setup');
      
      const data = await response.json();
      setMfaQRCode(data.QRCodePNG);
      setMfaSerialNumber(data.SerialNumber);
      setShowMFADialog(true);
    } catch (error) {
      toast.error('Failed to start MFA setup');
    } finally {
      setIsConfiguringMFA(false);
    }
  };

  const handleCompleteMFASetup = async () => {
    if (!authCode1 || !authCode2 || !mfaSerialNumber) {
      toast.error('Please provide both authentication codes');
      return;
    }

    try {
      setIsConfiguringMFA(true);
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'enableMFA',
          serialNumber: mfaSerialNumber,
          authenticationCode1: authCode1,
          authenticationCode2: authCode2,
        }),
      });

      if (!response.ok) throw new Error('Failed to enable MFA');
      
      // Update MFA devices list
      const mfaResponse = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listMFADevices' }),
      });
      const mfaData = await mfaResponse.json();
      setMfaDevices(mfaData);
      
      setShowMFADialog(false);
      setAuthCode1('');
      setAuthCode2('');
      setMfaQRCode(null);
      setMfaSerialNumber(null);
      toast.success('MFA enabled successfully');
    } catch (error) {
      toast.error('Failed to enable MFA');
    } finally {
      setIsConfiguringMFA(false);
    }
  };

  const handleRemoveMFA = async (serialNumber: string) => {
    try {
      setIsConfiguringMFA(true);
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'deactivateMFA',
          serialNumber,
        }),
      });

      if (!response.ok) throw new Error('Failed to remove MFA');
      
      setMfaDevices(prev => prev.filter(device => device.SerialNumber !== serialNumber));
      toast.success('MFA device removed successfully');
    } catch (error) {
      toast.error('Failed to remove MFA device');
    } finally {
      setIsConfiguringMFA(false);
    }
  };

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setIsLoadingTags(true);
        const response = await fetch(`/api/iam/users/${username}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'listTags' }),
        });
        
        if (!response.ok) throw new Error('Failed to fetch tags');
        
        const data = await response.json();
        setTags(data);
      } catch (error) {
        console.error('Error fetching tags:', error);
        toast.error('Failed to load tags');
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchTags();
  }, [username]);

  const handleAddTag = async () => {
    if (!newTagKey.trim()) {
      toast.error('Tag key is required');
      return;
    }

    try {
      setIsAddingTag(true);
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addTags',
          tags: [{
            Key: newTagKey.trim(),
            Value: newTagValue.trim(),
          }],
        }),
      });

      if (!response.ok) throw new Error('Failed to add tag');
      
      // Refresh tags
      const updatedResponse = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listTags' }),
      });
      
      if (!updatedResponse.ok) throw new Error('Failed to refresh tags');
      
      const updatedTags = await updatedResponse.json();
      setTags(updatedTags);
      setShowTagDialog(false);
      setNewTagKey('');
      setNewTagValue('');
      toast.success('Tag added successfully');
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Failed to add tag');
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (key: string) => {
    try {
      const response = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeTags',
          tagKeys: [key],
        }),
      });

      if (!response.ok) throw new Error('Failed to remove tag');
      
      setTags(prev => prev.filter(tag => tag.Key !== key));
      toast.success('Tag removed successfully');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag');
    }
  };

  const fetchLastAccessedServices = async () => {
    try {
      setIsLoadingServices(true);
      console.log('Fetching service access report...');
      
      // Generate report
      const generateResponse = await fetch(`/api/iam/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateAccessReport' }),
      });
      
      if (!generateResponse.ok) {
        const error = await generateResponse.json();
        throw new Error(error.error || 'Failed to generate access report');
      }

      const { jobId } = await generateResponse.json();
      console.log('Got job ID:', jobId);
      
      // Poll for results
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 2000; // 2 seconds
      
      const pollForResults = async () => {
        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for access report');
        }
        
        console.log(`Polling attempt ${attempts + 1}...`);
        const reportResponse = await fetch(`/api/iam/users/${username}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'getAccessReport', 
            jobId 
          }),
        });
        
        if (!reportResponse.ok) {
          const error = await reportResponse.json();
          throw new Error(error.error || 'Failed to get access report');
        }

        const data = await reportResponse.json();
        console.log('Poll response:', data);
        
        if (data.jobStatus === 'COMPLETED') {
          console.log('Job completed, setting services:', data.services);
          setLastAccessedServices(data.services);
          return;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        await pollForResults();
      };
      
      await pollForResults();
    } catch (error: any) {
      console.error('Error fetching last accessed services:', error);
      toast.error(error.message || 'Failed to load service access history');
      setLastAccessedServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  };

  // Add this pagination logic before the return statement
  const paginatedServices = lastAccessedServices
    .filter(service => 
      service.ServiceName.toLowerCase().includes(serviceSearch.toLowerCase())
    )
    .slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalPages = Math.ceil(
    lastAccessedServices.filter(service => 
      service.ServiceName.toLowerCase().includes(serviceSearch.toLowerCase())
    ).length / pageSize
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewDetails = (service: ServiceLastAccessed) => {
    setSelectedService(service);
    setShowServiceDetails(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userDetails) {
    return <div>User not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Back button */}
      <Button
        variant="link"
        onClick={handleBack}
        className="p-0 h-auto text-blue-600 hover:text-blue-700 hover:no-underline"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Users
      </Button>

      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-lg p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-white/10">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-white">{userDetails.UserName}</h1>
            <p className="text-sm text-slate-300 font-mono">{userDetails.Arn}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-white/10 border-0 text-white">
                Created: {new Date(userDetails.CreateDate).toLocaleDateString()}
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/20 border-0 text-blue-100">
                IAM User
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="permissions" className="space-y-6">
        <TabsList className="bg-gradient-to-r from-slate-100 to-blue-50 p-1 rounded-xl grid w-full grid-cols-5 h-14">
          <TabsTrigger 
            value="permissions" 
            className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
          >
            <Shield className="w-4 h-4 mr-2" />
            Permissions
          </TabsTrigger>
          <TabsTrigger 
            value="groups" 
            className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all"
          >
            <Users className="w-4 h-4 mr-2" />
            Groups
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm transition-all"
          >
            <Key className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger 
            value="tags" 
            className="data-[state=active]:bg-white data-[state=active]:text-slate-600 data-[state=active]:shadow-sm transition-all"
          >
            <Tag className="w-4 h-4 mr-2" />
            Tags
          </TabsTrigger>
          <TabsTrigger 
            value="lastAccessed" 
            className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
          >
            <Clock className="w-4 h-4 mr-2" />
            Last Accessed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Attached Policies
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage the policies attached to this IAM user
              </p>
            </div>
            <Button 
              onClick={() => {
                setIsModalOpen(true);
                fetchPolicies();
              }}
              className="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Attach Policy
            </Button>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search policies"
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
                className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px] border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Policy type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="aws">AWS managed</SelectItem>
                <SelectItem value="customer">Customer managed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border-gray-200/50 shadow-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
                <TableRow>
                  <TableHead>Policy name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.AttachedPolicies?.map((policy) => (
                  <TableRow key={`policy-${policy.PolicyArn}`} className="group hover:bg-blue-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-gray-900">{policy.PolicyName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                        AWS managed
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">Policy description here</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDetachPolicy(policy)}
                        className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-300"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!userDetails.AttachedPolicies?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 text-gray-400" />
                        <p>No policies attached</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
                Group Memberships
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage user group memberships
              </p>
            </div>
            <Button 
              onClick={() => {
                setIsGroupModalOpen(true);
                fetchGroups();
              }}
              className="bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg hover:shadow-xl hover:from-orange-700 hover:to-orange-600 transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User to Groups
            </Button>
          </div>

          <Card className="border-gray-200/50 shadow-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gradient-to-r from-gray-50 to-orange-50">
                <TableRow>
                  <TableHead>Group name</TableHead>
                  <TableHead>Group ARN</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.Groups?.map((group) => (
                  <TableRow key={`group-${group.GroupArn}`} className="group hover:bg-orange-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-gray-900">{group.GroupName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">{group.GroupArn}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromGroup(group.GroupName)}
                        className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-300"
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
                Security Credentials
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage access keys, password, and MFA devices
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            <Card className="border-gray-200/50 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle>Console password</CardTitle>
                      <CardDescription>Sign-in credentials for the AWS Management Console</CardDescription>
                    </div>
                  </div>
                  {!isLoadingConsoleAccess && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConsoleAccess(!consoleAccess.hasConsoleAccess)}
                      disabled={isUpdatingConsoleAccess}
                      className={`border-green-200 ${consoleAccess.hasConsoleAccess ? 'text-red-700 hover:bg-red-50' : 'text-green-700 hover:bg-green-50'}`}
                    >
                      {isUpdatingConsoleAccess ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-current"></div>
                          <span>Updating...</span>
                        </div>
                      ) : (
                        <>
                          {consoleAccess.hasConsoleAccess ? (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Settings className="w-4 h-4 mr-2" />
                              Enable
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg border ${consoleAccess.hasConsoleAccess ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                  {isLoadingConsoleAccess ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-b-transparent border-green-600"></div>
                    </div>
                  ) : (
                    <Badge className={consoleAccess.hasConsoleAccess ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {consoleAccess.hasConsoleAccess ? 'Enabled' : 'Disabled'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200/50 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle>Multi-factor authentication (MFA)</CardTitle>
                      <CardDescription>Add an extra layer of security to your account</CardDescription>
                    </div>
                  </div>
                  {!isLoadingMFA && mfaDevices.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartMFASetup}
                      disabled={isConfiguringMFA}
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      {isConfiguringMFA ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-current"></div>
                          <span>Setting up...</span>
                        </div>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Assign MFA device
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingMFA ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-b-transparent border-orange-600"></div>
                  </div>
                ) : mfaDevices.length > 0 ? (
                  <div className="space-y-4">
                    {mfaDevices.map((device) => (
                      <div
                        key={device.SerialNumber}
                        className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100"
                      >
                        <div>
                          <Badge className="bg-orange-100 text-orange-700">Enabled</Badge>
                          <p className="mt-1 text-xs text-gray-500">
                            Enabled on: {new Date(device.EnableDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMFA(device.SerialNumber)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <Badge className="bg-orange-100 text-orange-700">Not configured</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-gray-200/50 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle>Access keys</CardTitle>
                      <CardDescription>Programmatic access to AWS services</CardDescription>
                    </div>
                  </div>
                  {!isLoadingAccessKeys && accessKeys.length < 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateAccessKey}
                      disabled={isCreatingAccessKey}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      {isCreatingAccessKey ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-current"></div>
                          <span>Creating...</span>
                        </div>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create access key
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAccessKeys ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-b-transparent border-blue-600"></div>
                  </div>
                ) : accessKeys.length > 0 ? (
                  <div className="space-y-4">
                    {accessKeys.map((key) => (
                      <div
                        key={key.AccessKeyId}
                        className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100"
                      >
                        <div>
                          <p className="font-mono text-sm">{key.AccessKeyId}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Created: {new Date(key.CreateDate).toLocaleDateString()}
                          </p>
                          <Badge className={`mt-2 ${key.Status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {key.Status}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAccessKey(key.AccessKeyId)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">No access keys have been created</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tags" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Tags
              </h2>
              <p className="text-sm text-muted-foreground">
                Add tags to organize and identify this user
              </p>
            </div>
            <Button
              onClick={() => setShowTagDialog(true)}
              className="bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg hover:shadow-xl hover:from-slate-900 hover:to-slate-800 transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add new tag
            </Button>
          </div>

          <Card className="border-gray-200/50 shadow-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTags ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : tags.length > 0 ? (
                  tags.map((tag) => (
                    <TableRow key={tag.Key} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-100">
                            <Tag className="w-4 h-4 text-slate-600" />
                          </div>
                          <span className="font-medium text-gray-900">{tag.Key}</span>
                        </div>
                      </TableCell>
                      <TableCell>{tag.Value}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTag(tag.Key)}
                          className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-300"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Tag className="w-8 h-8 text-gray-400" />
                        <p>No tags added</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="lastAccessed" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Service Access History
              </h2>
              <p className="text-sm text-muted-foreground">
                View when AWS services were last accessed by this user
              </p>
            </div>
            <Button
              onClick={fetchLastAccessedServices}
              disabled={isLoadingServices}
              className="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-300"
            >
              {isLoadingServices ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search services"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <Card className="border-gray-200/50 shadow-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Last Accessed</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingServices ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-sm text-gray-500">Loading service access history...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedServices.length > 0 ? (
                  <>
                    {paginatedServices.map((service) => (
                      <TableRow key={service.ServiceNamespace} className="hover:bg-blue-50/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-blue-100">
                              <Clock className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-900">{service.ServiceName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {service.LastAccessed ? (
                            <div className="text-sm">
                              {new Date(service.LastAccessed).toLocaleString()}
                            </div>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              Never accessed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-700">
                            {service.ServiceNamespace}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(service)}
                            className="opacity-0 hover:opacity-100 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-300"
                          >
                            <Info className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 px-4 border-t border-gray-100">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">Rows per page:</span>
                              <Select
                                value={pageSize.toString()}
                                onValueChange={(value) => {
                                  setPageSize(Number(value));
                                  setCurrentPage(1);
                                }}
                              >
                                <SelectTrigger className="w-[70px] h-8 border-gray-200 focus:ring-blue-500">
                                  <SelectValue placeholder="10" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="5">5</SelectItem>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="20">20</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="h-4 w-px bg-gray-200" />
                            <span className="text-sm text-gray-600">
                              {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, lastAccessedServices.length)} of {lastAccessedServices.length}
                            </span>
                          </div>

                          <div className="flex items-center gap-6">
                            <Pagination>
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious 
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    className={cn(
                                      "border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-colors",
                                      currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                                    )}
                                  />
                                </PaginationItem>

                                {[...Array(totalPages)].map((_, i) => {
                                  const page = i + 1;
                                  if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                  ) {
                                    return (
                                      <PaginationItem key={page}>
                                        <PaginationLink
                                          onClick={() => handlePageChange(page)}
                                          isActive={currentPage === page}
                                          className={cn(
                                            "min-w-[40px] h-9",
                                            currentPage === page
                                              ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                                              : "hover:bg-gray-50 hover:text-gray-900"
                                          )}
                                        >
                                          {page}
                                        </PaginationLink>
                                      </PaginationItem>
                                    );
                                  }
                                  if (page === currentPage - 2 || page === currentPage + 2) {
                                    return (
                                      <PaginationItem key={page}>
                                        <PaginationEllipsis className="text-gray-400" />
                                      </PaginationItem>
                                    );
                                  }
                                  return null;
                                })}

                                <PaginationItem>
                                  <PaginationNext 
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    className={cn(
                                      "border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-colors",
                                      currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                                    )}
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Clock className="w-8 h-8 text-gray-400" />
                        <p>No service access history available</p>
                        <p className="text-sm text-gray-400">Click refresh to check for new data</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl bg-white p-0 gap-0">
          <div className="p-4 space-y-3">
            <DialogHeader className="space-y-2 flex items-start gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Attach Policy</DialogTitle>
                <DialogDescription>
                  Search and select a policy to attach to this user
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search policies..."
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
                className="pl-10 border-gray-200"
              />
            </div>
          </div>

          <ScrollArea className="max-h-[400px] overflow-auto border-y border-gray-100">
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                filteredPolicies.map((policy: Policy) => {
                  if (!policy.Arn) {
                    console.error('Policy missing ARN:', policy);
                    return null;
                  }

                  const isSelected = selectedPolicies.has(policy.Arn);
                  
                  return (
                    <div
                      key={policy.Arn}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50 group"
                    >
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {policy.PolicyName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {policy.Description || 'No description available'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          console.log('Button clicked for policy:', policy.PolicyName);
                          console.log('Policy ARN:', policy.Arn);
                          togglePolicySelection(policy.Arn);
                        }}
                        className={`
                          min-w-[80px] transition-all duration-200
                          ${isSelected
                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                            : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                          }
                          group-hover:shadow-md
                        `}
                      >
                        {isSelected ? 'Selected' : 'Attach'}
                      </Button>
                    </div>
                  );
                }).filter(Boolean)
              )}
              {!isLoading && filteredPolicies.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <div className="p-3 rounded-full bg-gray-100">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="mt-2 text-sm font-medium">No policies found</p>
                  <p className="text-xs text-gray-400">Try adjusting your search</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 flex items-center justify-between border-t border-gray-100 bg-gray-50">
            <div className="text-sm text-gray-600">
              {selectedPolicies.size} {selectedPolicies.size === 1 ? 'policy' : 'policies'} selected
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedPolicies(new Set());
                }}
                className="border-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSelectedPolicies}
                disabled={selectedPolicies.size === 0 || isSaving}
                className={`
                  min-w-[100px] transition-all duration-200
                  ${selectedPolicies.size === 0
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {isSaving ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="max-w-3xl bg-white p-0 gap-0">
          <div className="p-4 space-y-3">
            <DialogHeader className="space-y-2 flex items-start gap-3">
              <div className="p-2 bg-orange-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Add User to Groups</DialogTitle>
                <DialogDescription>
                  Add user to existing groups or create a new group
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search groups..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="pl-10 border-gray-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter new group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="border-gray-200"
                />
                <Button
                  onClick={handleCreateGroup}
                  disabled={isCreatingGroup || !newGroupName.trim()}
                  className="bg-orange-600 text-white hover:bg-orange-700"
                >
                  {isCreatingGroup ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Group
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="max-h-[400px] overflow-auto border-y border-gray-100">
            <div className="divide-y divide-gray-100">
              {isLoadingGroups ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : (
                groups
                  .filter(group => 
                    group.GroupName.toLowerCase().includes(groupSearch.toLowerCase())
                  )
                  .map((group) => {
                    const isSelected = selectedGroups.has(group.GroupName);
                    const isCurrentMember = userDetails?.Groups?.some(
                      g => g.GroupName === group.GroupName
                    );

                    return (
                      <div
                        key={group.GroupName}
                        className="flex items-center gap-3 p-4 hover:bg-gray-50 group"
                      >
                        <div className="p-1.5 bg-orange-100 rounded-lg">
                          <Users className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {group.GroupName}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Created: {new Date(group.CreateDate).toLocaleDateString()}
                          </p>
                        </div>
                        {isCurrentMember ? (
                          <Badge className="bg-green-100 text-green-700">
                            Member
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedGroups(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(group.GroupName)) {
                                  newSet.delete(group.GroupName);
                                } else {
                                  newSet.add(group.GroupName);
                                }
                                return newSet;
                              });
                            }}
                            className={`
                              min-w-[80px] transition-all duration-200
                              ${isSelected
                                ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                : 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700'
                              }
                              group-hover:shadow-md
                            `}
                          >
                            {isSelected ? 'Selected' : 'Add'}
                          </Button>
                        )}
                      </div>
                    );
                  })
              )}
              {!isLoadingGroups && groups.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <div className="p-3 rounded-full bg-gray-100">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="mt-2 text-sm font-medium">No groups found</p>
                  <p className="text-xs text-gray-400">Create a new group to get started</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 flex items-center justify-between border-t border-gray-100 bg-gray-50">
            <div className="text-sm text-gray-600">
              {selectedGroups.size} {selectedGroups.size === 1 ? 'group' : 'groups'} selected
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsGroupModalOpen(false);
                  setSelectedGroups(new Set());
                }}
                className="border-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUserToGroups}
                disabled={selectedGroups.size === 0 || isSavingGroups}
                className={`
                  min-w-[100px] transition-all duration-200
                  ${selectedGroups.size === 0
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                  }
                `}
              >
                {isSavingGroups ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{consoleAccess.hasConsoleAccess ? 'Update Password' : 'Enable Console Access'}</AlertDialogTitle>
            <AlertDialogDescription>
              {consoleAccess.hasConsoleAccess
                ? 'Enter a new password for console access.'
                : 'Set a password to enable console access for this user.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2"
              placeholder="Enter a strong password"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowPasswordDialog(false);
              setNewPassword('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePasswordSubmit}
              disabled={!newPassword || isUpdatingConsoleAccess}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isUpdatingConsoleAccess ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Access Key Dialog */}
      <AlertDialog open={showAccessKeyDialog} onOpenChange={setShowAccessKeyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Access Key Created</AlertDialogTitle>
            <AlertDialogDescription>
              This is the only time you will be able to view the secret access key. Make sure to save it securely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Access Key ID</Label>
              <Input
                readOnly
                value={newAccessKey?.AccessKeyId || ''}
                className="mt-2 font-mono"
              />
            </div>
            <div>
              <Label>Secret Access Key</Label>
              <Input
                readOnly
                value={newAccessKey?.SecretAccessKey || ''}
                className="mt-2 font-mono"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowAccessKeyDialog(false);
                setNewAccessKey(null);
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MFA Dialog */}
      <AlertDialog open={showMFADialog} onOpenChange={setShowMFADialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set up MFA Device</AlertDialogTitle>
            <AlertDialogDescription>
              Scan the QR code with your authenticator app and enter two consecutive MFA codes to complete setup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            {mfaQRCode && (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${mfaQRCode}`}
                  alt="MFA QR Code"
                  className="w-48 h-48"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code1">First Code</Label>
                <Input
                  id="code1"
                  value={authCode1}
                  onChange={(e) => setAuthCode1(e.target.value)}
                  className="mt-2"
                  placeholder="Enter first code"
                />
              </div>
              <div>
                <Label htmlFor="code2">Second Code</Label>
                <Input
                  id="code2"
                  value={authCode2}
                  onChange={(e) => setAuthCode2(e.target.value)}
                  className="mt-2"
                  placeholder="Enter second code"
                />
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowMFADialog(false);
              setAuthCode1('');
              setAuthCode2('');
              setMfaQRCode(null);
              setMfaSerialNumber(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompleteMFASetup}
              disabled={!authCode1 || !authCode2 || isConfiguringMFA}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {isConfiguringMFA ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white"></div>
                  <span>Enabling...</span>
                </div>
              ) : (
                'Enable MFA'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tag Dialog */}
      <AlertDialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a key and value for the new tag.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="tagKey">Key</Label>
              <Input
                id="tagKey"
                value={newTagKey}
                onChange={(e) => setNewTagKey(e.target.value)}
                className="mt-2"
                placeholder="Enter tag key"
              />
            </div>
            <div>
              <Label htmlFor="tagValue">Value</Label>
              <Input
                id="tagValue"
                value={newTagValue}
                onChange={(e) => setNewTagValue(e.target.value)}
                className="mt-2"
                placeholder="Enter tag value"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowTagDialog(false);
              setNewTagKey('');
              setNewTagValue('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddTag}
              disabled={!newTagKey.trim() || isAddingTag}
              className="bg-slate-800 text-white hover:bg-slate-900"
            >
              {isAddingTag ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white"></div>
                  <span>Adding...</span>
                </div>
              ) : (
                'Add Tag'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showServiceDetails} onOpenChange={setShowServiceDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {selectedService?.ServiceName}
                </DialogTitle>
                <DialogDescription>
                  Service access details and permissions
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-medium text-sm text-gray-900">Service Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Service Namespace</p>
                    <p className="text-sm font-medium text-gray-900">{selectedService?.ServiceNamespace}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Accessed</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedService?.LastAccessed 
                        ? new Date(selectedService.LastAccessed).toLocaleString()
                        : 'Never accessed'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-medium text-sm text-gray-900">Authentication Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Last Authenticated</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedService?.LastAuthenticated 
                        ? new Date(selectedService.LastAuthenticated).toLocaleString()
                        : 'Never authenticated'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Authenticated Entities</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedService?.TotalAuthenticatedEntities ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Info className="w-4 h-4" />
                  <p>
                    This information shows the last time this IAM user accessed this service
                    through AWS CloudTrail logs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowServiceDetails(false)}
              className="border-gray-200"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 