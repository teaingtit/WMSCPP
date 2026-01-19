'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export interface LayoutComponent {
  id: string;
  type: 'zone' | 'aisle' | 'bin' | 'dock' | 'office';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  parentId?: string;
  levels?: number; // Total levels for Cart (aisle) type
  capacity?: number; // Max capacity for Zone type
}

interface DraggableComponentProps {
  component: LayoutComponent;
  isSelected: boolean;
  onSelect: () => void;
  usage?: number; // Current slots in this zone
  onResize: (id: string, width: number, height: number) => void;
}

const COMPONENT_COLORS = {
  zone: '#4F46E5', // Lot
  aisle: '#F59E0B', // Cart
  bin: '#10B981',
  dock: '#64748b', // Road
  office: '#8B5CF6', // Office
};

export function DraggableComponent({
  component,
  isSelected,
  onSelect,
  usage,
  onResize,
}: DraggableComponentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: component.id,
    data: { component, isExisting: true },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const fillColor = component.color || COMPONENT_COLORS[component.type];

  // Manual Resize Handler
  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop DnD Kit from dragging

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = component.width;
    const startHeight = component.height;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Snap to grid (20px) roughly
      let newWidth = Math.max(40, startWidth + deltaX);
      let newHeight = Math.max(40, startHeight + deltaY);

      // Optional: Snap to 20px grid
      newWidth = Math.round(newWidth / 20) * 20;
      newHeight = Math.round(newHeight / 20) * 20;

      onResize(component.id, newWidth, newHeight);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <g
      ref={setNodeRef as any}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`${
        isDragging ? 'opacity-50' : ''
      } cursor-move hover:opacity-80 transition-opacity`}
    >
      {/* Selection Halo */}
      {isSelected && (
        <rect
          x={component.x - 4}
          y={component.y - 4}
          width={component.width + 8}
          height={component.height + 8}
          fill="none"
          stroke="#4F46E5"
          strokeWidth={2}
          rx={8}
          className="animate-pulse"
          strokeDasharray="4 4"
        />
      )}

      {/* Component Rectangle */}
      <rect
        x={component.x}
        y={component.y}
        width={component.width}
        height={component.height}
        fill={component.color ? `${component.color}20` : `${fillColor}20`}
        stroke={fillColor}
        strokeWidth={isSelected ? 0 : 2}
        rx={6}
        className="filter drop-shadow-sm"
      />

      {/* Component Label */}
      <text
        x={component.x + component.width / 2}
        y={component.y + component.height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-bold pointer-events-none select-none font-sans"
        fill={fillColor}
        fontSize={component.type === 'bin' ? 12 : 14}
        style={{ textShadow: '0px 1px 2px rgba(255,255,255,0.8)' }}
      >
        {component.name}
      </text>

      {/* Type Badge */}
      <text
        x={component.x + 5}
        y={component.y + 15}
        className="text-xs pointer-events-none select-none"
        fill={fillColor}
        fontSize={10}
        opacity={0.7}
      >
        {component.type === 'zone'
          ? `LOT ${component.capacity ? `(${usage || 0}/${component.capacity})` : ''}`
          : component.type === 'aisle'
          ? 'SLOT'
          : component.type === 'dock'
          ? 'ROAD'
          : component.type.toUpperCase()}
      </text>

      {/* Resize Handle (if selected) */}
      {isSelected && (
        <>
          {/* Corner Handles */}
          <circle
            cx={component.x}
            cy={component.y}
            r={4}
            fill="white"
            stroke="#4F46E5"
            strokeWidth={2}
          />
          <circle
            cx={component.x + component.width}
            cy={component.y}
            r={4}
            fill="white"
            stroke="#4F46E5"
            strokeWidth={2}
          />
          <circle
            cx={component.x}
            cy={component.y + component.height}
            r={4}
            fill="white"
            stroke="#4F46E5"
            strokeWidth={2}
          />
          <circle
            cx={component.x + component.width}
            cy={component.y + component.height}
            r={6}
            fill="#4F46E5"
            stroke="white"
            strokeWidth={1}
            className="cursor-nwse-resize hover:scale-125 transition-transform"
            onPointerDown={handleResizePointerDown}
          />
        </>
      )}
    </g>
  );
}
