import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';

interface StartExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExecution: (name: string, input: string, openInNewTab: boolean) => void;
}

export function StartExecutionModal({ isOpen, onClose, onStartExecution }: StartExecutionModalProps) {
  const [name, setName] = useState('');
  const [input, setInput] = useState('{\n  \n}');
  const [openInNewTab, setOpenInNewTab] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartExecution(name, input, openInNewTab);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Start execution</DialogTitle>
            <DialogDescription>
              Configure and start a new execution of this state machine.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a unique name for this execution"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="input">Input - optional (must be valid JSON)</Label>
              <textarea
                id="input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="open-new-tab"
                checked={openInNewTab}
                onCheckedChange={(checked: boolean) => setOpenInNewTab(checked)}
              />
              <Label htmlFor="open-new-tab">Open execution in new browser tab</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Start execution</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 