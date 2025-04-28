'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Label } from '@/app/components/ui/label';
import { Search, ExternalLink } from 'lucide-react';
import { useToast } from '@/app/components/ui/use-toast';

interface Template {
  id: string;
  name: string;
  description: string;
  definition: string;
  templateType: string;
  category?: string;
  services?: string[];
  documentationLink?: string;
}

interface TemplateDetails {
  name: string;
  description: string;
  definition: string;
  documentationLink?: string;
  services?: string[];
}

interface CreateStateMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { 
    name: string; 
    type: 'STANDARD' | 'EXPRESS';
    definition?: string;
    templateName?: string;
  }) => void;
}

export function CreateStateMachineModal({ isOpen, onClose, onCreate }: CreateStateMachineModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [selectedOption, setSelectedOption] = useState<'blank' | 'template'>('blank');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTemplateDetails, setShowTemplateDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUsage, setSelectedUsage] = useState<'demo' | 'build'>('demo');
  const { toast } = useToast();

  useEffect(() => {
    if (showTemplateModal) {
      fetchTemplates();
    }
  }, [showTemplateModal]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/aws/stepfunctions/templates');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch templates');
      }

      // Transform the API response to match our Template interface
      const transformedTemplates = data.templates.map((template: any) => ({
        id: template.name,
        name: template.name,
        description: template.description || '',
        definition: template.definition || '',
        templateType: template.type || 'Standard',
        category: template.category || 'General',
        services: template.services || [],
        documentationLink: template.documentationUrl
      }));

      setTemplates(transformedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load templates. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplateDetails = async (templateId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/aws/stepfunctions/templates/${templateId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch template details');
      }

      // Transform the API response to match our Template interface
      const template = data.template;
      setSelectedTemplate({
        id: template.name,
        name: template.name,
        description: template.description || '',
        definition: template.definition,
        templateType: template.type || 'Standard',
        category: template.category || 'General',
        services: template.services || [],
        documentationLink: template.documentationUrl
      });
      setShowTemplateDetails(true);
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load template details. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (selectedOption === 'template') {
      setShowTemplateModal(true);
      return;
    }

    if (name.trim()) {
      onCreate({ name, type });
      onClose();
      // Reset state when modal closes
      setSelectedOption('blank');
      setName('');
      setType('STANDARD');
      setShowTemplateModal(false);
      setShowTemplateDetails(false);
      setSelectedTemplate(null);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state when modal closes
    setSelectedOption('blank');
    setName('');
    setType('STANDARD');
    setShowTemplateModal(false);
    setShowTemplateDetails(false);
    setSelectedTemplate(null);
  };

  const handleTemplateSelect = async (template: Template) => {
    await fetchTemplateDetails(template.id);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      if (selectedUsage === 'demo') {
        // For demo, we'll use the template as is
        onCreate({
          name: `${selectedTemplate.name}-demo`,
          type: selectedTemplate.templateType as 'STANDARD' | 'EXPRESS',
          definition: selectedTemplate.definition,
          templateName: selectedTemplate.name
        });
      } else {
        // For build option, we'll use the template as a starting point
        onCreate({
          name: `${selectedTemplate.name}-custom`,
          type: selectedTemplate.templateType as 'STANDARD' | 'EXPRESS',
          definition: selectedTemplate.definition,
          templateName: selectedTemplate.name
        });
      }

      toast({
        title: "Success",
        description: selectedUsage === 'demo' 
          ? "Creating demo workflow from template..." 
          : "Creating custom workflow from template",
      });

      // Close modals
      setShowTemplateDetails(false);
      setShowTemplateModal(false);
      onClose();

      // Reset state
      setSelectedOption('blank');
      setName('');
      setType('STANDARD');
      setSelectedTemplate(null);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      (template?.name || '').toLowerCase().includes(searchTerm) ||
      (template?.description || '').toLowerCase().includes(searchTerm) ||
      (template?.category || '').toLowerCase().includes(searchTerm) ||
      template?.services?.some(service => (service || '').toLowerCase().includes(searchTerm)) ||
      false
    );
  });

  // Group templates by category
  const templatesByCategory = filteredTemplates.reduce((acc, template) => {
    const category = template?.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  const categories = Object.keys(templatesByCategory);
  const totalTemplates = templates.length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Create state machine</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Unsaved Workflow Warning */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="text-sm text-gray-700">Unsaved workflow found</span>
                  <p className="text-sm text-gray-500">We found an unsaved workflow, do you wish to restore it?</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Restore</Button>
                <Button variant="outline" size="sm">Discard</Button>
              </div>
            </div>

            {/* Template Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedOption === 'blank' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedOption('blank')}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Create from blank</h3>
                    <p className="text-sm text-gray-500 mt-1">Create your own workflow from scratch.</p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedOption === 'template' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedOption('template')}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Create from template</h3>
                    <p className="text-sm text-gray-500 mt-1">Choose a workflow template that matches your use case.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Section (shown when blank is selected) */}
            {selectedOption === 'blank' && (
              <div className="space-y-6">
                {/* State Machine Name */}
                <div className="space-y-2">
                  <Label>State machine name</Label>
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="MyStateMachine"
                        className="flex-1"
                      />
                      <Button variant="outline" size="sm">
                        Generate
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Must be 1-80 characters. Can use alphanumeric characters, dashes, and underscores.
                    </p>
                    <p className="text-xs text-gray-500">
                      State machine name can be edited in the Config section of Workflow Studio before creating your state machine. After creation, the name cannot be changed.
                    </p>
                  </div>
                </div>

                {/* State Machine Type */}
                <div className="space-y-2">
                  <Label>State machine type</Label>
                  <p className="text-xs text-gray-500">
                    State machine type can be edited in the Config section of Workflow Studio before creating your state machine. After creation, the type cannot be changed.
                  </p>
                  <RadioGroup value={type} onValueChange={(value: 'STANDARD' | 'EXPRESS') => setType(value)}>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="STANDARD" id="standard" />
                        <div className="space-y-1">
                          <Label htmlFor="standard" className="font-medium">Standard</Label>
                          <p className="text-sm text-gray-500">
                            Durable workflows for ETL, ML, e-commerce and automation. Standard workflows can run for up to 1 year, and history is stored in Step Functions for auditing and playback. Supported by a feature-rich console debugger. Recommended for new users. <a href="#" className="text-blue-600 hover:underline">Learn more</a>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="EXPRESS" id="express" />
                        <div className="space-y-1">
                          <Label htmlFor="express" className="font-medium">Express</Label>
                          <p className="text-sm text-gray-500">
                            Low cost, high scale workflows for streaming data processing and microservice APIs. Express workflows can run for up to 5 minutes, and history can be streamed to CloudWatch Logs. <a href="#" className="text-blue-600 hover:underline">Learn more</a>
                          </p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Template Info (shown when template is selected) */}
            {selectedOption === 'template' && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>With templates, you can choose from a list of workflows based on real-world scenarios.</p>
                  <p className="mt-2">You can deploy a CloudFormation stack with all the required resources for a demo. <a href="#" className="text-blue-600 hover:underline">Learn more</a></p>
                  <p className="mt-2">Alternatively, you can use the template as a starting point to create your own customized workflow.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              Exit
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={selectedOption === 'blank' && !name.trim()}
            >
              {selectedOption === 'template' ? 'Next' : 'Continue'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Selection Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">Choose a template</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
              <Input
                placeholder="Search by keyword"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-4">
              {/* Left Sidebar */}
              <div className="w-48 space-y-2">
                <div className="font-medium">All ({totalTemplates})</div>
                <div className="font-medium text-gray-600">Featured</div>
                <div className="space-y-1 text-sm">
                  <div className="text-blue-600">USE CASE</div>
                  {categories.map(category => (
                    <div key={category} className="cursor-pointer hover:text-blue-600">
                      {category} ({templatesByCategory[category].length})
                    </div>
                  ))}
                </div>
              </div>

              {/* Template Grid */}
              <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto max-h-[500px]">
                {isLoading ? (
                  <div className="col-span-2 flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : !templates || filteredTemplates.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    {templates?.length === 0 ? "No templates available." : "No templates found matching your search."}
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div 
                      key={template?.id || Math.random().toString()} 
                      className="border rounded-lg p-4 space-y-4 hover:border-blue-500 cursor-pointer"
                      onClick={() => template?.id && handleTemplateSelect(template)}
                    >
                      <div>
                        <h3 className="font-medium">{template?.name || 'Untitled Template'}</h3>
                        <p className="text-sm text-gray-500 mt-1">{template?.description || 'No description available'}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {template?.services?.map((service) => (
                          <div key={service} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {service}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
              Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Details Modal */}
      <Dialog open={showTemplateDetails} onOpenChange={setShowTemplateDetails}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Choose how to use this template</DialogTitle>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6">
              {/* Template Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Name</h3>
                  <p>{selectedTemplate.name || 'Untitled Template'}</p>
                </div>

                <div>
                  <h3 className="font-medium">Description</h3>
                  <p className="text-sm text-gray-600">{selectedTemplate.description || 'No description available'}</p>
                </div>

                {selectedTemplate.documentationLink && (
                  <div>
                    <h3 className="font-medium">Documentation</h3>
                    <a 
                      href={selectedTemplate.documentationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View documentation
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}

                {selectedTemplate.services && selectedTemplate.services.length > 0 && (
                  <div>
                    <h3 className="font-medium">AWS Services Used</h3>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {selectedTemplate.services.map((service) => (
                        <div key={service} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {service || 'Unknown Service'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Usage Options */}
              <div className="space-y-4">
                <h3 className="font-medium">Choose how to use this template</h3>
                <RadioGroup value={selectedUsage} onValueChange={(value: 'demo' | 'build') => setSelectedUsage(value)}>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="demo" id="demo" />
                      <div className="space-y-1">
                        <Label htmlFor="demo" className="font-medium">Run a demo</Label>
                        <p className="text-sm text-gray-500">
                          Step Functions will automatically deploy a CloudFormation stack to your account with the state machine and all resources. Once complete, you can run and inspect the demo workflow.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="build" id="build" />
                      <div className="space-y-1">
                        <Label htmlFor="build" className="font-medium">Build on it</Label>
                        <p className="text-sm text-gray-500">
                          Use the template as a starting point to build out a workflow with your own resources.
                        </p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowTemplateDetails(false)}>
              Back
            </Button>
            <Button onClick={handleUseTemplate}>
              Use template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 