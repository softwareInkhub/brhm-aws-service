'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useState } from 'react';

export interface ExportInfrastructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bucketName: string) => Promise<void>;
  defaultBucketName: string;
}

export function ExportInfrastructureModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  defaultBucketName 
}: ExportInfrastructureModalProps) {
  const [bucketName, setBucketName] = useState(defaultBucketName);
  const [isExporting, setIsExporting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsExporting(true);
      await onConfirm(bucketName);
      onClose();
    } catch (error) {
      console.error('Error exporting to Infrastructure Composer:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Export to Infrastructure Composer</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-700 mb-6">
            Infrastructure Composer is a visual builder that you can use to design serverless 
            applications from multiple AWS services. Lambda creates a new Infrastructure 
            Composer project using the configuration of your function, including its triggers and 
            destinations.
          </p>

          <div className="space-y-4">
            <div>
              <Label>Transfer bucket name</Label>
              <Input
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                className="mt-1"
              />
              <div className="mt-2 text-sm text-gray-500">
                Use the default bucket name or enter a new name that meets{' '}
                <a 
                  href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Amazon S3 bucket naming rules
                </a>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div className="text-sm text-gray-700">
                  <p>
                    To export your function's configuration, Lambda creates an Amazon S3 bucket 
                    in your AWS account. Standard{' '}
                    <a 
                      href="https://aws.amazon.com/s3/pricing/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Amazon S3 pricing
                    </a>
                    {' '}applies. For more information, see{' '}
                    <a 
                      href="https://docs.aws.amazon.com/lambda/latest/dg/lambda-ic.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Using AWS Lambda with Infrastructure Composer
                    </a>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isExporting || !bucketName}
          >
            {isExporting ? 'Creating project...' : 'Confirm and create project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 