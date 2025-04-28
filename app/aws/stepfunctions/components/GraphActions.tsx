import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Button } from '@/app/components/ui/button';
import { ChevronDown, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface GraphActionsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onDownload: () => void;
  onAutoLayout: () => void;
}

export const GraphActions: React.FC<GraphActionsProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onDownload,
  onAutoLayout,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Actions
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onZoomIn}>
          <ZoomIn className="mr-2 h-4 w-4" />
          Zoom in
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onZoomOut}>
          <ZoomOut className="mr-2 h-4 w-4" />
          Zoom out
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onReset}>
          <RotateCw className="mr-2 h-4 w-4" />
          Reset view
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAutoLayout}>
          <RotateCw className="mr-2 h-4 w-4" />
          Auto-layout
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download SVG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 