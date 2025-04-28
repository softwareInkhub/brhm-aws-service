'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui2/button';
import { Input } from '@/app/components/ui2/input';
import { Label } from '@/app/components/ui2/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui2/dialog';
import { useToast } from '@/app/components/ui2/use-toast';
import { Loader2, Upload, Trash2, FolderPlus, FileText, Image as ImageIcon, Video, FileSpreadsheet, FileCode, File, FolderOpen, ChevronRight, Download, Edit, Save, X } from 'lucide-react';
import { Textarea } from '@/app/components/ui/textarea';

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
  const [selectedFile, setSelectedFile] = useState<S3Object | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

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

  const isTextFile = (fileName: string) => {
    const textExtensions = ['.txt', '.json', '.yaml', '.yml', '.xml', '.md', '.csv', '.html', '.css', '.js', '.ts', '.jsx', '.tsx'];
    return textExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const handleFileClick = async (obj: S3Object) => {
    setSelectedFile(obj);
    setShowFilePreview(true);
    setPreviewError(false);
    setIsPreviewLoading(true);

    if (isTextFile(obj.Key)) {
      try {
        const response = await fetch(`/api/s3/buckets/${selectedBucket}/download?key=${encodeURIComponent(obj.Key)}`);
        if (!response.ok) throw new Error('Failed to load file content');
        const text = await response.text();
        setFileContent(text);
        setEditedContent(text);
      } catch (error) {
        setPreviewError(true);
        toast({
          title: 'Error',
          description: 'Failed to load file content',
          variant: 'destructive',
        });
      }
    }
    setIsPreviewLoading(false);
  };

  const handleDownload = async () => {
    if (!selectedFile || !selectedBucket) return;
    
    try {
      const response = await fetch(`/api/s3/buckets/${selectedBucket}/download?key=${encodeURIComponent(selectedFile.Key)}`);
      if (!response.ok) throw new Error('Failed to download file');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.Key.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !selectedBucket) return;
    
    try {
      setIsSaving(true);
      const formData = new FormData();
      const blob = new Blob([editedContent], { type: 'text/plain' });
      formData.append('file', blob, selectedFile.Key.split('/').pop());
      formData.append('key', selectedFile.Key);

      const response = await fetch(`/api/s3/buckets/${selectedBucket}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to save file');

      setFileContent(editedContent);
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'File saved successfully',
      });
      fetchObjects(selectedBucket, currentPrefix);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save file',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
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
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
          {selectedBucket ? (
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setSelectedBucket(null)}
                variant="ghost"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                Back
              </Button>
              <span>{selectedBucket}</span>
            </div>
          ) : (
            'S3 Management'
          )}
        </h1>
        {!selectedBucket ? (
          <Dialog open={showCreateBucket} onOpenChange={setShowCreateBucket}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
                    <p>Bucket will be created in {process.env.AWS_REGION || 'us-east-1'} region</p>
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
        ) : (
          <div className="flex items-center space-x-3">
            <Input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
              </Button>
            </Label>
          </div>
        )}
      </div>

      {!selectedBucket ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {buckets.map((bucket) => (
            <div
              key={bucket.Name}
              onClick={() => setSelectedBucket(bucket.Name)}
              className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <FolderOpen className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 truncate max-w-[200px]">{bucket.Name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Created: {new Date(bucket.CreationDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBucket(bucket.Name);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {currentPrefix && (
            <div className="flex items-center space-x-2 py-2">
              <Button
                variant="ghost"
                onClick={() => {
                  const parentPrefix = currentPrefix.split('/').slice(0, -1).join('/');
                  fetchObjects(selectedBucket, parentPrefix);
                }}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                Back
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Current path: {currentPrefix || 'Root'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {commonPrefixes.map((prefix) => (
              <div
                key={prefix.Prefix}
                onClick={() => fetchObjects(selectedBucket, prefix.Prefix)}
                className="group bg-white dark:bg-gray-800 rounded-xl p-4 cursor-pointer hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-blue-100 dark:hover:border-blue-900"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-500 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <FolderOpen className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {prefix.Prefix.split('/').slice(-2)[0]}
                  </span>
                </div>
              </div>
            ))}

            {objects.map((obj) => (
              <div
                key={obj.Key}
                onClick={() => handleFileClick(obj)}
                className="group bg-white dark:bg-gray-800 rounded-xl p-4 relative hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-blue-100 dark:hover:border-blue-900"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-100/20 dark:from-blue-900/0 dark:to-blue-800/20 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl" />
                
                <div className="flex items-center space-x-3 relative">
                  <div className="p-2 bg-blue-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                      {obj.Key.split('/').pop()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(obj.Size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteObject(obj.Key);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300 absolute right-0 top-1/2 -translate-y-1/2 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Modified: {new Date(obj.LastModified).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showFilePreview} onOpenChange={setShowFilePreview}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate">{selectedFile?.Key.split('/').pop()}</span>
              <div className="flex items-center space-x-2">
                {isTextFile(selectedFile?.Key || '') && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilePreview(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedFile && (
              <div className="h-full overflow-auto">
                {isPreviewLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : previewError ? (
                  <div className="h-full flex items-center justify-center text-red-500">
                    Failed to load preview. You can try downloading the file instead.
                  </div>
                ) : isTextFile(selectedFile.Key) ? (
                  isEditing ? (
                    <Textarea
                      value={editedContent}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedContent(e.target.value)}
                      className="w-full h-full font-mono text-sm"
                    />
                  ) : (
                    <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-auto h-full font-mono text-sm">
                      {fileContent}
                    </pre>
                  )
                ) : selectedFile.Key.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                  <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <img
                      src={`/api/s3/buckets/${selectedBucket}/download?key=${encodeURIComponent(selectedFile.Key)}`}
                      alt={selectedFile.Key}
                      className="max-h-full max-w-full object-contain"
                      onError={() => setPreviewError(true)}
                      onLoad={() => setIsPreviewLoading(false)}
                    />
                  </div>
                ) : selectedFile.Key.toLowerCase().match(/\.(mp4|webm|ogg)$/) ? (
                  <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <video
                      controls
                      className="max-h-full max-w-full"
                      src={`/api/s3/buckets/${selectedBucket}/download?key=${encodeURIComponent(selectedFile.Key)}`}
                      onError={() => setPreviewError(true)}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                    <FileText className="h-16 w-16 text-gray-400" />
                    <p>Preview not available for this file type</p>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 