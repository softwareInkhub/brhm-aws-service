'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Search } from 'lucide-react';
import { useState, useMemo } from 'react';

interface TriggerOption {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
  tags: string[];
  category: string;
}

const triggerOptions: TriggerOption[] = [
  {
    id: 'alexa',
    name: 'Alexa',
    description: 'alexa iot voice',
    icon: (
      <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    tags: ['alexa', 'iot', 'voice'],
    category: 'APIs/interactive/web'
  },
  {
    id: 'api-gateway',
    name: 'API Gateway',
    description: 'aws api application-services backend HTTP REST serverless',
    icon: (
      <svg className="w-8 h-8 text-purple-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12H3M3 12L9 6M3 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tags: ['aws', 'api', 'application-services', 'backend', 'HTTP', 'REST', 'serverless'],
    category: 'APIs/interactive/web'
  },
  {
    id: 'alb',
    name: 'Application Load Balancer',
    description: 'aws HTTP load-balancing server web',
    icon: (
      <svg className="w-8 h-8 text-indigo-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    tags: ['aws', 'HTTP', 'load-balancing', 'server', 'web'],
    category: 'APIs/interactive/web'
  },
  {
    id: 'dynamodb',
    name: 'DynamoDB',
    description: 'aws database nosql document key-value',
    icon: (
      <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 7v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2z" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 5v14M4 11h16M4 15h16" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    tags: ['aws', 'database', 'nosql', 'document', 'key-value'],
    category: 'Database'
  },
  {
    id: 's3',
    name: 'Amazon S3',
    description: 'aws storage object file bucket',
    icon: (
      <svg className="w-8 h-8 text-yellow-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 8v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18 0a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2m18 0-8.5 5.5a2 2 0 0 1-2 0L3 8" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    tags: ['aws', 'storage', 'object', 'file', 'bucket'],
    category: 'Storage'
  },
  {
    id: 'sqs',
    name: 'Amazon SQS',
    description: 'aws messaging queue pub/sub',
    icon: (
      <svg className="w-8 h-8 text-orange-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    tags: ['aws', 'messaging', 'queue', 'pub/sub'],
    category: 'Messaging'
  },
  {
    id: 'kinesis',
    name: 'Amazon Kinesis',
    description: 'aws streaming data real-time analytics',
    icon: (
      <svg className="w-8 h-8 text-purple-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12s1.6-5 8-5 8 5 8 5-1.6 5-8 5-8-5-8-5z" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    tags: ['aws', 'streaming', 'data', 'real-time', 'analytics'],
    category: 'Analytics'
  },
  {
    id: 'function-url',
    name: 'Function URL',
    description: 'aws lambda function url endpoint',
    icon: (
      <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 13C10.4295 13.5741 10.9774 14.0492 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9404 15.7513 14.6898C16.423 14.4392 17.0331 14.0471 17.54 13.54L20.54 10.54C21.4508 9.59699 21.9548 8.33397 21.9434 7.02299C21.932 5.71201 21.4061 4.45794 20.4791 3.5309C19.5521 2.60386 18.298 2.07802 16.987 2.06663C15.676 2.05523 14.413 2.55921 13.47 3.47L11.75 5.18M14 11C13.5705 10.4259 13.0226 9.95083 12.3934 9.60707C11.7642 9.26331 11.0684 9.05889 10.3533 9.00768C9.63816 8.95646 8.92037 9.05964 8.24871 9.31023C7.57704 9.56082 6.96691 9.95294 6.46 10.46L3.46 13.46C2.54921 14.403 2.04524 15.666 2.05663 16.977C2.06802 18.288 2.59387 19.5421 3.52091 20.4691C4.44795 21.3961 5.70201 21.922 7.013 21.9334C8.32398 21.9448 9.58699 21.4408 10.53 20.53L12.24 18.82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tags: ['aws', 'lambda', 'function', 'url', 'endpoint'],
    category: 'APIs/interactive/web'
  }
];

export interface AddTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrigger: (triggerType: string, source: string) => Promise<void>;
}

export function AddTriggerModal({ isOpen, onClose, onAddTrigger }: AddTriggerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return triggerOptions.filter(option => 
      option.name.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query) ||
      option.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const groupedOptions = useMemo(() => {
    return groupByCategory(filteredOptions);
  }, [filteredOptions]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add trigger</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-base font-medium mb-2 flex items-center gap-2">
              Trigger configuration
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search triggers..." 
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 h-[400px] p-4">
            {Object.entries(groupedOptions).map(([category, options]) => (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">{category}</h3>
                <div className="space-y-2">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onAddTrigger(option.id, option.name)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                    >
                      <div className="flex-shrink-0">{option.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 group-hover:text-blue-600">
                          {option.name}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(groupedOptions).length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Search className="w-8 h-8 mb-2" />
                <p>No triggers found matching your search</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function groupByCategory(options: TriggerOption[]): Record<string, TriggerOption[]> {
  return options.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, TriggerOption[]>);
} 