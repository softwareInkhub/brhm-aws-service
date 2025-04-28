import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';

interface PublishVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (description: string) => Promise<void>;
  isPublishing: boolean;
}

export function PublishVersionModal({ isOpen, onClose, onPublish, isPublishing }: PublishVersionModalProps) {
  const [description, setDescription] = useState('');

  const handlePublish = async () => {
    await onPublish(description);
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish new version</DialogTitle>
          <DialogDescription>
            Create an immutable snapshot of your state machine's current workflow definition and settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              id="description"
              placeholder="Enter a description for this version"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button 
            variant="default"
            onClick={handlePublish}
            disabled={isPublishing}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isPublishing ? 'Publishing...' : 'Publish version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 