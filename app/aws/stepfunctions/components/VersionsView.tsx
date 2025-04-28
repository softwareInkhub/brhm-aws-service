import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ChevronDown, ChevronUp, Settings, RefreshCw, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { PublishVersionModal } from './PublishVersionModal';
import { useToast } from '@/app/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';

interface VersionsViewProps {
  stateMachineArn: string;
}

interface Version {
  version: string;
  usedByAlias: string[];
  creationDate: string;
  lastExecutedDate: string | null;
  description: string;
}

type SortField = 'version' | 'creationDate' | 'lastExecutedDate' | 'description';
type SortDirection = 'asc' | 'desc';

export function VersionsView({ stateMachineArn }: VersionsViewProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [versions, setVersions] = useState<Version[]>([]);
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('version');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [versionDetails, setVersionDetails] = useState<{
    number: string;
    description: string;
  } | null>(null);

  const fetchVersions = async (token?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/aws/stepfunctions/versions?stateMachineArn=${encodeURIComponent(stateMachineArn)}${token ? `&nextToken=${token}` : ''}`
      );
      if (!response.ok) throw new Error('Failed to fetch versions');
      const data = await response.json();
      
      const mappedVersions = data.versions.map((v: any) => ({
        version: v.stateMachineVersionArn ? v.stateMachineVersionArn.split(':').pop() : 'N/A',
        usedByAlias: v.aliases || [],
        creationDate: v.creationDate ? new Date(v.creationDate).toLocaleString() : 'N/A',
        lastExecutedDate: v.lastExecutedDate ? new Date(v.lastExecutedDate).toLocaleString() : null,
        description: v.description || ''
      }));

      setVersions(mappedVersions);
      
      if (mappedVersions.length > 0) {
        const latestVersion = mappedVersions[0];
        setVersionDetails({
          number: latestVersion.version,
          description: latestVersion.description
        });
      }
      
      setNextToken(data.nextToken);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        variant: "destructive",
        description: "Failed to fetch versions"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishVersion = async (description: string) => {
    setIsPublishing(true);
    try {
      const response = await fetch('/api/aws/stepfunctions/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stateMachineArn,
          description
        }),
      });

      if (!response.ok) throw new Error('Failed to publish version');
      const data = await response.json();
      toast({
        description: `Published version ${data.version} successfully`
      });
      await fetchVersions();
    } catch (error) {
      console.error('Error publishing version:', error);
      toast({
        variant: "destructive",
        description: "Failed to publish version"
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteVersion = async () => {
    if (!selectedVersion) return;
    
    try {
      const response = await fetch(
        `/api/aws/stepfunctions/versions?stateMachineArn=${encodeURIComponent(stateMachineArn)}&version=${selectedVersion}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete version');
      }

      toast({
        description: `Version ${selectedVersion} deleted successfully`
      });
      await fetchVersions();
      setSelectedVersion(null);
    } catch (error: any) {
      console.error('Error deleting version:', error);
      toast({
        variant: "destructive",
        title: "Error deleting version",
        description: error.message || "Failed to delete version"
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [stateMachineArn]);

  const handleNextPage = () => {
    if (nextToken) {
      setCurrentPage(currentPage + 1);
      fetchVersions(nextToken);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      fetchVersions();
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedVersions = useMemo(() => {
    let result = [...versions];
    
    if (filterValue) {
      const lowerFilter = filterValue.toLowerCase();
      result = result.filter(v => 
        v.version.toLowerCase().includes(lowerFilter) ||
        v.description.toLowerCase().includes(lowerFilter) ||
        v.usedByAlias.some(alias => alias.toLowerCase().includes(lowerFilter))
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'version':
          comparison = a.version.localeCompare(b.version);
          break;
        case 'creationDate':
          comparison = new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime();
          break;
        case 'lastExecutedDate':
          const aDate = a.lastExecutedDate ? new Date(a.lastExecutedDate).getTime() : 0;
          const bDate = b.lastExecutedDate ? new Date(b.lastExecutedDate).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [versions, filterValue, sortField, sortDirection]);

  const handleStartExecution = () => {
    if (!selectedVersion) return;
    window.open(`/aws/stepfunctions/${encodeURIComponent(stateMachineArn)}:${selectedVersion}/start`, '_blank');
  };

  const handleViewDetails = () => {
    if (!selectedVersion) return;
    window.open(`/aws/stepfunctions/${encodeURIComponent(stateMachineArn)}:${selectedVersion}`, '_blank');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* How versions work section */}
      <div className="border rounded-lg p-4">
        <div 
          className="flex items-center cursor-pointer"
          onClick={toggleExpand}
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 mr-2" />
          ) : (
            <ChevronUp className="w-5 h-5 mr-2" />
          )}
          <h2 className="text-lg font-medium">How versions work</h2>
        </div>
        
        {isExpanded && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              A version is an immutable snapshot of your state machine's workflow definition and settings. 
              By publishing versions of your state machine, you can manage its deployment. When you point your application at a state machine version, 
              it will continue to use that version even after you update the state machine. Point to a version by adding the version number to the end of the state machine ARN. 
              An ARN without a version number points to the most recent update.{' '}
              <a 
                href="https://docs.aws.amazon.com/step-functions/latest/dg/concepts-state-machine-versions.html" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 inline-flex items-center"
              >
                Learn more
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Versions section */}
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Versions ({versions.length})</h3>
                {versionDetails && (
                  <span key="version-details" className="text-sm text-gray-500">
                    Latest version: {versionDetails.number}
                  </span>
                )}
                <a 
                  key="learn-more-link"
                  href="https://docs.aws.amazon.com/step-functions/latest/dg/concepts-state-machine-versions.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 inline-flex items-center text-sm"
                >
                  Learn more
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              {versionDetails?.description && (
                <p key="version-description" className="text-sm text-gray-600">
                  Latest version description: {versionDetails.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                key="refresh-button"
                variant="ghost" 
                size="sm"
                onClick={() => fetchVersions()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                key="view-details-button"
                variant="outline"
                disabled={!selectedVersion}
                onClick={handleViewDetails}
              >
                View details
              </Button>
              <Button 
                key="delete-button"
                variant="outline"
                disabled={!selectedVersion}
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete
              </Button>
              <Button 
                key="start-execution-button"
                variant="outline"
                disabled={!selectedVersion}
                onClick={handleStartExecution}
              >
                Start execution
              </Button>
              <Button 
                key="publish-button"
                variant="default" 
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => setIsPublishModalOpen(true)}
              >
                Publish new version
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <Input
              key="filter-input"
              placeholder="Filter versions by property or value"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="max-w-md"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-4 text-left font-medium w-10"></th>
                {[
                  { field: 'version', label: 'Version' },
                  { field: 'usedByAlias', label: 'Used by alias', sortable: false },
                  { field: 'creationDate', label: 'Creation date' },
                  { field: 'lastExecutedDate', label: 'Last executed date' },
                  { field: 'description', label: 'Description' }
                ].map((column) => (
                  <th key={column.field} className="py-2 px-4 text-left font-medium">
                    <div 
                      className={`flex items-center gap-1 ${column.sortable !== false ? 'cursor-pointer' : ''}`}
                      onClick={() => column.sortable !== false && handleSort(column.field as SortField)}
                    >
                      {column.label}
                      {column.sortable !== false ? (
                        <SortIcon field={column.field as SortField} />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedVersions.length === 0 ? (
                <tr key="no-versions">
                  <td colSpan={6} className="text-center py-8">
                    <div className="text-gray-500">No versions</div>
                    <Button 
                      variant="default" 
                      className="mt-4 bg-blue-600 hover:bg-blue-700"
                      onClick={() => setIsPublishModalOpen(true)}
                    >
                      Publish new version
                    </Button>
                  </td>
                </tr>
              ) : (
                filteredAndSortedVersions.map((version) => (
                  <tr 
                    key={`version-${version.version}`}
                    className={`border-b hover:bg-gray-50 ${
                      selectedVersion === version.version ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="py-2 px-4">
                      <input
                        type="radio"
                        name="version-selection"
                        checked={selectedVersion === version.version}
                        onChange={() => setSelectedVersion(version.version)}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-4 font-medium">{version.version}</td>
                    <td className="py-2 px-4">{version.usedByAlias.join(', ') || '-'}</td>
                    <td className="py-2 px-4">{version.creationDate}</td>
                    <td className="py-2 px-4">{version.lastExecutedDate || '-'}</td>
                    <td className="py-2 px-4">{version.description || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              key="prev-button"
              variant="ghost"
              size="sm"
              disabled={currentPage === 1 || isLoading}
              onClick={handlePreviousPage}
            >
              Previous
            </Button>
            <span key="page-number" className="text-sm">Page {currentPage}</span>
            <Button
              key="next-button"
              variant="ghost"
              size="sm"
              disabled={!nextToken || isLoading}
              onClick={handleNextPage}
            >
              Next
            </Button>
          </div>
          <Button key="settings-button" variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <PublishVersionModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onPublish={handlePublishVersion}
        isPublishing={isPublishing}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete version?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete version {selectedVersion}.
              Make sure this version is not being used by any aliases or applications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVersion} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 