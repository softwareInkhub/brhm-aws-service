import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { useToast } from '@/app/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';

interface Tag {
  key: string;
  value: string;
}

interface TagsViewProps {
  stateMachineArn: string;
}

export function TagsView({ stateMachineArn }: TagsViewProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newTags, setNewTags] = useState<Tag[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/aws/stepfunctions/${encodeURIComponent(stateMachineArn)}/tags`);
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tags',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [stateMachineArn]);

  const handleOpenManageTags = () => {
    setNewTags([...tags]);
    setIsManageModalOpen(true);
  };

  const handleAddTag = () => {
    setNewTags([...newTags, { key: '', value: '' }]);
  };

  const handleRemoveTag = (index: number) => {
    setNewTags(newTags.filter((_, i) => i !== index));
  };

  const handleTagChange = (index: number, field: 'key' | 'value', value: string) => {
    const updatedTags = [...newTags];
    updatedTags[index][field] = value;
    setNewTags(updatedTags);
  };

  const handleSaveTags = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/aws/stepfunctions/${encodeURIComponent(stateMachineArn)}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });
      
      if (!response.ok) throw new Error('Failed to update tags');
      
      await fetchTags();
      setIsManageModalOpen(false);
      toast({
        title: 'Success',
        description: 'Tags updated successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tags',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">Tags ({tags.length})</h2>
        <Button onClick={handleOpenManageTags}>Manage tags</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : tags.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Key</TableHead>
              <TableHead className="w-1/2">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag, index) => (
              <TableRow key={index}>
                <TableCell>{tag.key}</TableCell>
                <TableCell>{tag.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No tags</p>
          <p className="text-sm mt-2">
            A tag is a label that you assign to an AWS resource. You can use tags to search and filter your resources or track your AWS costs.
          </p>
        </div>
      )}

      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage tags</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            {newTags.map((tag, index) => (
              <div key={index} className="flex gap-4">
                <Input
                  placeholder="Key"
                  value={tag.key}
                  onChange={(e) => handleTagChange(index, 'key', e.target.value)}
                />
                <Input
                  placeholder="Value"
                  value={tag.value}
                  onChange={(e) => handleTagChange(index, 'value', e.target.value)}
                />
                <Button
                  variant="ghost"
                  onClick={() => handleRemoveTag(index)}
                  className="px-3"
                >
                  ×
                </Button>
              </div>
            ))}
            
            <Button
              variant="outline"
              onClick={handleAddTag}
              className="w-full"
            >
              Add new tag
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsManageModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTags}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 