import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useToast } from '@/app/components/ui/use-toast';
import { Button } from '@/app/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';

interface GraphViewProps {
  definition: any;
  executionStatus?: string;
  executionArn?: string;
}

export interface GraphViewHandle {
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleReset: () => void;
  handleDownloadSVG: () => void;
  handleAutoLayout: () => void;
}

export const GraphView = forwardRef<GraphViewHandle, GraphViewProps>(({ 
  definition, 
  executionStatus,
  executionArn 
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { toast } = useToast();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    handleZoomIn: () => {
      setZoom(prev => Math.min(prev * 1.2, 3));
    },
    handleZoomOut: () => {
      setZoom(prev => Math.max(prev / 1.2, 0.3));
    },
    handleReset: () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    },
    handleDownloadSVG: () => {
      if (!svgRef.current) return;
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'state-machine.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    handleAutoLayout: () => {
      // Re-render the graph with auto-layout
      renderGraph();
    }
  }));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const renderGraph = () => {
    if (!containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    try {
      const states = definition.States || {};
      const startAt = definition.StartAt;
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgRef.current = svg;
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.overflow = 'visible';
      
      const nodeWidth = 180;
      const nodeHeight = 60;
      const verticalSpacing = 100;
      const horizontalSpacing = 250;
      
      const nodes: { [key: string]: { x: number, y: number } } = {};
      let currentX = nodeWidth;
      let currentY = 100;
      let maxX = nodeWidth * 2;
      
      // Calculate total height needed
      const totalStates = Object.keys(states).length;
      const totalHeight = (totalStates + 2) * (nodeHeight + verticalSpacing);
      
      // Center the start node
      const startNodeX = currentX;
      const startNodeY = 20;
      
      // Position nodes vertically with better spacing
      Object.keys(states).forEach((stateName, index) => {
        const state = states[stateName];
        const yPos = startNodeY + (index + 1) * (nodeHeight + verticalSpacing);
        
        // For choice states, create branching layout
        if (state.Type === 'Choice') {
          nodes[stateName] = { x: currentX, y: yPos };
          currentX += horizontalSpacing;
          maxX = Math.max(maxX, currentX + nodeWidth);
        } else {
          nodes[stateName] = { x: startNodeX, y: yPos };
        }
      });
      
      // Add start node
      const startNode = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      startNode.setAttribute('x', startNodeX.toString());
      startNode.setAttribute('y', startNodeY.toString());
      startNode.setAttribute('width', nodeWidth.toString());
      startNode.setAttribute('height', nodeHeight.toString());
      startNode.setAttribute('rx', '5');
      startNode.setAttribute('fill', '#f0f9ff');
      startNode.setAttribute('stroke', '#0ea5e9');
      startNode.setAttribute('stroke-width', '2');
      svg.appendChild(startNode);
      
      const startText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      startText.setAttribute('x', (startNodeX + nodeWidth/2).toString());
      startText.setAttribute('y', (startNodeY + nodeHeight/2).toString());
      startText.setAttribute('text-anchor', 'middle');
      startText.setAttribute('dominant-baseline', 'middle');
      startText.setAttribute('fill', '#0ea5e9');
      startText.textContent = 'Start';
      svg.appendChild(startText);
      
      // Add end node at the bottom
      const endNodeY = startNodeY + (totalStates + 1) * (nodeHeight + verticalSpacing);
      const endNode = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      endNode.setAttribute('x', startNodeX.toString());
      endNode.setAttribute('y', endNodeY.toString());
      endNode.setAttribute('width', nodeWidth.toString());
      endNode.setAttribute('height', nodeHeight.toString());
      endNode.setAttribute('rx', '5');
      endNode.setAttribute('fill', '#f0f9ff');
      endNode.setAttribute('stroke', '#0ea5e9');
      endNode.setAttribute('stroke-width', '2');
      svg.appendChild(endNode);
      
      const endText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      endText.setAttribute('x', (startNodeX + nodeWidth/2).toString());
      endText.setAttribute('y', (endNodeY + nodeHeight/2).toString());
      endText.setAttribute('text-anchor', 'middle');
      endText.setAttribute('dominant-baseline', 'middle');
      endText.setAttribute('fill', '#0ea5e9');
      endText.textContent = 'End';
      svg.appendChild(endText);
      
      // Add state nodes with improved styling
      Object.entries(states).forEach(([stateName, state]: [string, any]) => {
        const node = nodes[stateName];
        if (!node) return;
        
        // Node container group
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'state-node');
        
        // Background rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', node.x.toString());
        rect.setAttribute('y', node.y.toString());
        rect.setAttribute('width', nodeWidth.toString());
        rect.setAttribute('height', nodeHeight.toString());
        rect.setAttribute('rx', '5');
        
        // Set color based on state type and execution status
        let fillColor = '#f0f9ff';
        let strokeColor = '#0ea5e9';
        
        if (state.Type === 'Task') {
          fillColor = '#f0fdf4';
          strokeColor = '#22c55e';
        } else if (state.Type === 'Choice') {
          fillColor = '#fff7ed';
          strokeColor = '#f97316';
        } else if (state.Type === 'Wait') {
          fillColor = '#f5f3ff';
          strokeColor = '#8b5cf6';
        } else if (state.Type === 'Pass') {
          fillColor = '#eff6ff';
          strokeColor = '#3b82f6';
        }
        
        // Highlight current state if execution status is available
        if (executionStatus && executionArn) {
          // Add highlight effect for current state
          rect.setAttribute('filter', 'url(#glow)');
        }
        
        rect.setAttribute('fill', fillColor);
        rect.setAttribute('stroke', strokeColor);
        rect.setAttribute('stroke-width', '2');
        g.appendChild(rect);
        
        // State name
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (node.x + nodeWidth/2).toString());
        text.setAttribute('y', (node.y + nodeHeight/2 - 5).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', strokeColor);
        text.setAttribute('font-weight', 'bold');
        text.textContent = stateName;
        g.appendChild(text);
        
        // State type
        const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        typeText.setAttribute('x', (node.x + nodeWidth/2).toString());
        typeText.setAttribute('y', (node.y + nodeHeight - 15).toString());
        typeText.setAttribute('text-anchor', 'middle');
        typeText.setAttribute('fill', '#64748b');
        typeText.setAttribute('font-size', '12');
        typeText.textContent = state.Type;
        g.appendChild(typeText);
        
        svg.appendChild(g);
      });
      
      // Add connections with improved curves
      if (startAt && nodes[startAt]) {
        const startConn = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const startX = startNodeX + nodeWidth/2;
        const startY = startNodeY + nodeHeight;
        const endX = nodes[startAt].x + nodeWidth/2;
        const endY = nodes[startAt].y;
        
        startConn.setAttribute('d', `M ${startX} ${startY} C ${startX} ${startY + 20}, ${endX} ${endY - 20}, ${endX} ${endY}`);
        startConn.setAttribute('fill', 'none');
        startConn.setAttribute('stroke', '#0ea5e9');
        startConn.setAttribute('stroke-width', '2');
        startConn.setAttribute('marker-end', 'url(#arrowhead)');
        svg.appendChild(startConn);
      }
      
      // State to state connections
      Object.entries(states).forEach(([stateName, state]: [string, any]) => {
        if (state.Next) {
          const fromNode = nodes[stateName];
          const toNode = nodes[state.Next];
          
          if (fromNode && toNode) {
            const conn = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const startX = fromNode.x + nodeWidth/2;
            const startY = fromNode.y + nodeHeight;
            const endX = toNode.x + nodeWidth/2;
            const endY = toNode.y;
            
            // Calculate control points for smoother curves
            const midY = (startY + endY) / 2;
            conn.setAttribute('d', `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`);
            conn.setAttribute('fill', 'none');
            conn.setAttribute('stroke', '#0ea5e9');
            conn.setAttribute('stroke-width', '2');
            conn.setAttribute('marker-end', 'url(#arrowhead)');
            svg.appendChild(conn);
          }
        } else if (state.End) {
          const fromNode = nodes[stateName];
          if (fromNode) {
            const conn = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const startX = fromNode.x + nodeWidth/2;
            const startY = fromNode.y + nodeHeight;
            const endX = startNodeX + nodeWidth/2;
            const endY = endNodeY;
            
            const midY = (startY + endY) / 2;
            conn.setAttribute('d', `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`);
            conn.setAttribute('fill', 'none');
            conn.setAttribute('stroke', '#0ea5e9');
            conn.setAttribute('stroke-width', '2');
            conn.setAttribute('marker-end', 'url(#arrowhead)');
            svg.appendChild(conn);
          }
        }
      });
      
      // Add filters for glow effect
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      
      // Glow filter
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', 'glow');
      filter.setAttribute('x', '-50%');
      filter.setAttribute('y', '-50%');
      filter.setAttribute('width', '200%');
      filter.setAttribute('height', '200%');
      
      const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
      feGaussianBlur.setAttribute('stdDeviation', '3');
      feGaussianBlur.setAttribute('result', 'coloredBlur');
      filter.appendChild(feGaussianBlur);
      
      const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
      const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
      feMergeNode1.setAttribute('in', 'coloredBlur');
      const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
      feMergeNode2.setAttribute('in', 'SourceGraphic');
      feMerge.appendChild(feMergeNode1);
      feMerge.appendChild(feMergeNode2);
      filter.appendChild(feMerge);
      
      // Arrowhead marker
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', 'arrowhead');
      marker.setAttribute('markerWidth', '10');
      marker.setAttribute('markerHeight', '7');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '3.5');
      marker.setAttribute('orient', 'auto');
      
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
      polygon.setAttribute('fill', '#0ea5e9');
      
      marker.appendChild(polygon);
      defs.appendChild(filter);
      defs.appendChild(marker);
      svg.appendChild(defs);
      
      // Set SVG viewBox to fit all content
      const viewBoxWidth = Math.max(maxX + nodeWidth, startNodeX + nodeWidth * 2);
      const viewBoxHeight = endNodeY + nodeHeight + 50;
      svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
      
      containerRef.current.appendChild(svg);
    } catch (error) {
      console.error('Error rendering graph:', error);
      toast({
        variant: "destructive",
        description: "Failed to render state machine graph",
      });
    }
  };

  useEffect(() => {
    renderGraph();
  }, [definition, executionStatus, executionArn]);

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={() => ref?.current?.handleZoomIn()}
          className="bg-white"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => ref?.current?.handleZoomOut()}
          className="bg-white"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => ref?.current?.handleReset()}
          className="bg-white"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => ref?.current?.handleDownloadSVG()}
          className="bg-white"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Graph container with pan and zoom */}
      <div 
        className="w-full h-full overflow-hidden cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          ref={containerRef}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '50% 50%',
            transition: isDragging ? 'none' : 'transform 0.1s'
          }}
        />
      </div>
    </div>
  );
}); 