'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Trash2, FolderPlus, FileText } from 'lucide-react';

interface Bucket {
  Name: string;
  CreationDate: string;
}

interface S3Object {
  Key: string;
  LastModified: string;
  Size: number;
  ETag: string;
}

interface CommonPrefix {
  Prefix: string;
}

export default function S3Page() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [commonPrefixes, setCommonPrefixes] = useState<CommonPrefix[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const { toast } = useToast();
  const [isValidBucketName, setIsValidBucketName] = useState(true);
  const [bucketNameError, setBucketNameError] = useState('');

  // Fetch buckets
  const fetchBuckets = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/s3');
      const data = await response.json();
      if (data.error) throw new Error(data.message);
      setBuckets(data.data.buckets);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch buckets',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch objects in bucket
  const fetchObjects = async (bucketName: string, prefix: string = '') => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/s3/buckets/${bucketName}?prefix=${prefix}`);
      const data = await response.json();
      if (data.error) throw new Error(data.message);
      setObjects(data.data.objects);
      setCommonPrefixes(data.data.commonPrefixes);
      setCurrentPrefix(prefix);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch objects',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validate bucket name
  const validateBucketName = (name: string) => {
    if (!name) {
      setIsValidBucketName(false);
      setBucketNameError('Bucket name is required');
      return false;
    }

    if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(name)) {
      setIsValidBucketName(false);
      setBucketNameError('Bucket names must contain only lowercase letters, numbers, dots (.), and hyphens (-)');
      return false;
    }

    if (name.length < 3 || name.length > 63) {
      setIsValidBucketName(false);
      setBucketNameError('Bucket names must be between 3 and 63 characters long');
      return false;
    }

    setIsValidBucketName(true);
    setBucketNameError('');
    return true;
  };

  // Handle bucket name change
  const handleBucketNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewBucketName(name);
    validateBucketName(name);
  };

  // Create new bucket
  const handleCreateBucket = async () => {
    if (!validateBucketName(newBucketName)) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/s3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ BucketName: newBucketName }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create bucket');
      }

      toast({
        title: 'Success',
        description: 'Bucket created successfully',
      });
      setShowCreateBucket(false);
      setNewBucketName('');
      fetchBuckets();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create bucket',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete bucket
  const handleDeleteBucket = async (bucketName: string) => {
    if (!confirm(`Are you sure you want to delete bucket "${bucketName}"?`)) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/s3', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ BucketName: bucketName }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      toast({
        title: 'Success',
        description: 'Bucket deleted successfully',
      });
      if (selectedBucket === bucketName) {
        setSelectedBucket(null);
        setObjects([]);
        setCommonPrefixes([]);
      }
      fetchBuckets();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete bucket',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Upload file
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBucket || !event.target.files?.length) return;

    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', `${currentPrefix}${file.name}`);

    try {
      setIsUploading(true);
      const response = await fetch(`/api/s3/buckets/${selectedBucket}`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.error) throw new Error(data.message);

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
      fetchObjects(selectedBucket, currentPrefix);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Delete object
  const handleDeleteObject = async (key: string) => {
    if (!selectedBucket || !confirm(`Are you sure you want to delete "${key}"?`)) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/s3/buckets/${selectedBucket}?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      toast({
        title: 'Success',
        description: 'Object deleted successfully',
      });
      fetchObjects(selectedBucket, currentPrefix);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete object',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    fetchBuckets();
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      fetchObjects(selectedBucket);
    }
  }, [selectedBucket]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">S3 Management</h1>
        <Dialog open={showCreateBucket} onOpenChange={setShowCreateBucket}>
          <DialogTrigger asChild>
            <Button>
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Bucket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bucket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bucketName">Bucket Name</Label>
                <Input
                  id="bucketName"
                  value={newBucketName}
                  onChange={handleBucketNameChange}
                  placeholder="Enter bucket name"
                  className={!isValidBucketName ? 'border-red-500' : ''}
                />
                {bucketNameError && (
                  <p className="text-sm text-red-500">{bucketNameError}</p>
                )}
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Bucket will be created in {process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'} region</p>
                  <p>Note: S3 bucket names must be:</p>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    <li>Globally unique across all AWS accounts</li>
                    <li>Between 3 and 63 characters long</li>
                    <li>Contain only lowercase letters, numbers, dots (.), and hyphens (-)</li>
                    <li>Begin and end with a letter or number</li>
                  </ul>
                </div>
              </div>
              <Button 
                onClick={handleCreateBucket} 
                disabled={isLoading || !isValidBucketName || !newBucketName}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Bucket'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Buckets List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Buckets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {buckets.map((bucket) => (
                <div
                  key={bucket.Name}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                    selectedBucket === bucket.Name
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div
                    className="flex-1"
                    onClick={() => setSelectedBucket(bucket.Name)}
                  >
                    <FileText className="inline-block mr-2 h-4 w-4" />
                    {bucket.Name}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBucket(bucket.Name)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Objects List */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>
              {selectedBucket ? `Objects in ${selectedBucket}` : 'Select a bucket'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedBucket ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    {currentPrefix && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const parentPrefix = currentPrefix.split('/').slice(0, -1).join('/');
                          fetchObjects(selectedBucket, parentPrefix);
                        }}
                      >
                        ..
                      </Button>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {currentPrefix || 'Root'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer"
                    >
                      <Button asChild>
                        <span>
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload File
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commonPrefixes.map((prefix) => (
                      <TableRow key={prefix.Prefix}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            className="p-0 h-auto"
                            onClick={() => fetchObjects(selectedBucket, prefix.Prefix)}
                          >
                            <FolderPlus className="mr-2 h-4 w-4" />
                            {prefix.Prefix.split('/').slice(-2)[0]}
                          </Button>
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    ))}
                    {objects.map((obj) => (
                      <TableRow key={obj.Key}>
                        <TableCell>{obj.Key.split('/').pop()}</TableCell>
                        <TableCell>
                          {new Date(obj.LastModified).toLocaleString()}
                        </TableCell>
                        <TableCell>{formatFileSize(obj.Size)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteObject(obj.Key)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : (
              <div className="text-center text-muted-foreground">
                Select a bucket to view its contents
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 