import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useToast } from '@/app/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface CreateFunctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateFunctionModal({ isOpen, onClose, onSuccess }: CreateFunctionModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [functionName, setFunctionName] = useState('');
  const [runtime, setRuntime] = useState('nodejs22.x');
  const [handler, setHandler] = useState('index.handler');
  const [memory, setMemory] = useState('128');
  const [timeout, setTimeout] = useState('3');
  const { toast } = useToast();

  const runtimes = [
    { value: 'nodejs22.x', label: 'Node.js 22.x' },
    { value: 'nodejs20.x', label: 'Node.js 20.x' },
    { value: 'nodejs18.x', label: 'Node.js 18.x' },
    { value: 'python3.12', label: 'Python 3.12' },
    { value: 'python3.11', label: 'Python 3.11' },
    { value: 'python3.10', label: 'Python 3.10' },
    { value: 'java21', label: 'Java 21' },
    { value: 'java17', label: 'Java 17' },
    { value: 'java11', label: 'Java 11' },
    { value: 'dotnet8', label: '.NET 8' },
    { value: 'dotnet6', label: '.NET 6' },
  ];

  const handleCreate = async () => {
    if (!functionName.trim()) {
      toast({
        title: 'Error',
        description: 'Function name is required',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/aws/lambda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName,
          runtime,
          handler,
          memorySize: parseInt(memory),
          timeout: parseInt(timeout),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create function');
      }

      toast({
        title: 'Success',
        description: 'Function created successfully',
        variant: 'default'
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating function:', error);
      toast({
        title: 'Error',
        description: 'Failed to create function',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRuntimeChange = (value: string) => {
    setRuntime(value);
    // Update default handler based on runtime
    if (value.startsWith('python')) {
      setHandler('lambda_function.lambda_handler');
    } else if (value.startsWith('java')) {
      setHandler('com.example.Handler::handleRequest');
    } else if (value.startsWith('dotnet')) {
      setHandler('Assembly::Namespace.Class::Method');
    } else {
      setHandler('index.handler');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create function</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Function name</Label>
            <Input
              value={functionName}
              onChange={(e) => setFunctionName(e.target.value)}
              placeholder="my-function"
            />
          </div>

          <div className="space-y-2">
            <Label>Runtime</Label>
            <Select value={runtime} onValueChange={handleRuntimeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {runtimes.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Handler</Label>
            <Input
              value={handler}
              onChange={(e) => setHandler(e.target.value)}
              placeholder="index.handler"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Memory (MB)</Label>
              <Select value={memory} onValueChange={setMemory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[128, 256, 512, 1024, 2048, 4096, 8192, 10240].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size} MB
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Timeout (seconds)</Label>
              <Select value={timeout} onValueChange={setTimeout}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 10, 30, 60, 300, 900].map((t) => (
                    <SelectItem key={t} value={t.toString()}>
                      {t} seconds
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Creating...
              </>
            ) : (
              'Create function'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 