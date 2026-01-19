'use client';
import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Grid3x3, Maximize2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';

interface LayoutCanvasProps {
  children: React.ReactNode;
  gridSize?: number;
  onCanvasClick?: (x: number, y: number) => void;
}

export function LayoutCanvas({ children, gridSize = 10, onCanvasClick }: LayoutCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const { setNodeRef } = useDroppable({
    id: 'canvas',
  });

  const canvasWidth = 1200;
  const canvasHeight = 800;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.3));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle mouse or Alt+Left
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning || !onCanvasClick) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    onCanvasClick(x, y);
  };

  return (
    <div
      ref={setNodeRef}
      className="relative w-full h-full bg-slate-100 rounded-lg overflow-hidden"
    >
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white rounded-lg shadow-lg p-2">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-slate-100 rounded transition-colors"
          title="ขยาย"
          aria-label="Zoom in"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-slate-100 rounded transition-colors"
          title="ย่อ"
          aria-label="Zoom out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 hover:bg-slate-100 rounded transition-colors"
          title="รีเซ็ตมุมมอง"
          aria-label="Reset view"
        >
          <Maximize2 size={20} />
        </button>
        <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded transition-colors ${
            showGrid ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100'
          }`}
          title="แสดง/ซ่อนกริด"
          aria-label={showGrid ? 'Hide grid' : 'Show grid'}
        >
          <Grid3x3 size={20} />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 z-10 bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium">
        {Math.round(zoom * 100)}%
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className={`${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transformOrigin: 'center center',
          }}
        >
          {/* Grid Pattern */}
          {showGrid && (
            <defs>
              <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
          )}

          {/* Grid Background */}
          {showGrid && <rect width={canvasWidth} height={canvasHeight} fill="url(#grid)" />}

          {/* Canvas Background */}
          <rect
            width={canvasWidth}
            height={canvasHeight}
            fill={showGrid ? 'transparent' : 'white'}
            stroke="#cbd5e1"
            strokeWidth="2"
          />

          {/* User Content */}
          {children}
        </g>
      </svg>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg px-3 py-2 text-xs text-slate-600">
        <div>Alt + ลากซ้าย หรือ ลากกลาง = เลื่อนมุมมอง</div>
        <div>Scroll = ซูม (เร็วๆนี้)</div>
      </div>
    </div>
  );
}
