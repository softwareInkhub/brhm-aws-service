import { useState, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { useToast } from '@/app/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface UploadCodeModalProps {
  functionName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadCodeModal({ functionName, isOpen, onClose, onSuccess }: UploadCodeModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);

    if (file) {
      if (file.name.endsWith('.zip')) {
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
          setError('File size exceeds 50MB limit');
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
        setSelectedFile(file);
        toast({
          title: 'File selected',
          description: `Selected ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        });
      } else {
        setError('Please select a ZIP file');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a ZIP file to upload');
      return;
    }

    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`/api/aws/lambda/${encodeURIComponent(functionName)}/code`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload code');
      }

      toast({
        title: 'Success',
        description: 'Code uploaded successfully',
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error uploading code:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload code');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload code',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload function code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              Upload a ZIP file containing your Lambda function code. The ZIP file should include all necessary dependencies.
              Maximum file size is 50MB.
            </p>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {selectedFile && (
              <p className="text-sm text-gray-500">
                Selected file: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 