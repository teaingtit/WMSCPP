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
}

interface DraggableComponentProps {
  component: LayoutComponent;
  isSelected: boolean;
  onSelect: () => void;
}

const COMPONENT_COLORS = {
  zone: '#4F46E5',
  aisle: '#10B981',
  bin: '#F59E0B',
  dock: '#EF4444',
  office: '#8B5CF6',
};

export function DraggableComponent({ component, isSelected, onSelect }: DraggableComponentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: component.id,
    data: { component, isExisting: true },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const fillColor = component.color || COMPONENT_COLORS[component.type];
  const strokeColor = isSelected ? '#1E40AF' : fillColor;
  const strokeWidth = isSelected ? 3 : 2;

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
      {/* Component Rectangle */}
      <rect
        x={component.x}
        y={component.y}
        width={component.width}
        height={component.height}
        fill={`${fillColor}20`}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        rx={4}
      />

      {/* Component Label */}
      <text
        x={component.x + component.width / 2}
        y={component.y + component.height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-bold pointer-events-none select-none"
        fill={fillColor}
        fontSize={component.type === 'bin' ? 12 : 14}
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
        {component.type.toUpperCase()}
      </text>

      {/* Resize Handle (if selected) */}
      {isSelected && (
        <>
          <circle
            cx={component.x + component.width}
            cy={component.y + component.height}
            r={6}
            fill="white"
            stroke={strokeColor}
            strokeWidth={2}
            className="cursor-nwse-resize"
          />
        </>
      )}
    </g>
  );
}
