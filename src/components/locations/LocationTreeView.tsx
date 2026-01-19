'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, MapPin, Grid3x3, Layers, Package } from 'lucide-react';
import { Location } from '@/types/inventory';

interface LocationTreeViewProps {
  locations: Location[];
  onSelectLocation?: (location: Location) => void;
  selectedLocationId?: string;
}

interface TreeNode {
  location: Location;
  children: TreeNode[];
}

/**
 * Build tree structure from flat location array
 */
function buildTree(locations: Location[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes
  locations.forEach((loc) => {
    nodeMap.set(loc.id, { location: loc, children: [] });
  });

  // Build tree
  locations.forEach((loc) => {
    const node = nodeMap.get(loc.id)!;
    if (loc.parent_id && nodeMap.has(loc.parent_id)) {
      nodeMap.get(loc.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by code
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => a.location.code.localeCompare(b.location.code));
    node.children.forEach(sortChildren);
  };
  roots.forEach(sortChildren);

  return roots;
}

/**
 * Get icon based on depth
 */
function getLocationIcon(depth: number) {
  switch (depth) {
    case 0:
      return Grid3x3;
    case 1:
      return Layers;
    case 2:
      return Package;
    default:
      return MapPin;
  }
}

/**
 * Get color based on depth
 */
function getLocationColor(depth: number) {
  switch (depth) {
    case 0:
      return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    case 1:
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 2:
      return 'text-amber-600 bg-amber-50 border-amber-200';
    default:
      return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

/**
 * Tree node component
 */
function TreeNodeComponent({
  node,
  level = 0,
  onSelect,
  selectedId,
}: {
  node: TreeNode;
  level?: number;
  onSelect?: ((location: Location) => void) | undefined;
  selectedId?: string | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand zones and aisles
  const hasChildren = node.children.length > 0;
  const Icon = getLocationIcon(node.location.depth);
  const colorClass = getLocationColor(node.location.depth);
  const isSelected = selectedId === node.location.id;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all hover:bg-slate-100 ${
          isSelected ? 'bg-indigo-100 ring-2 ring-indigo-500' : ''
        }`}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        onClick={() => {
          if (hasChildren) setIsExpanded(!isExpanded);
          if (onSelect) onSelect(node.location);
        }}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-slate-200 rounded"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Location Icon */}
        <div className={`p-1.5 rounded border ${colorClass}`}>
          <Icon size={14} />
        </div>

        {/* Location Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-800">{node.location.code}</span>
            {node.location.depth === 0 && node.location.zone && (
              <span className="text-xs text-slate-500">โซนจัดเก็บ {node.location.zone}</span>
            )}
            {node.location.depth === 1 && node.location.aisle && (
              <span className="text-xs text-slate-500">LOT {node.location.aisle}</span>
            )}
            {node.location.depth === 2 && node.location.bin_code && (
              <span className="text-xs text-slate-500">พื้นที่เก็บ {node.location.bin_code}</span>
            )}
          </div>
          {node.location.description && (
            <p className="text-xs text-slate-500 truncate">{node.location.description}</p>
          )}
        </div>

        {/* Children Count */}
        {hasChildren && (
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {node.children.length}
          </span>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-1">
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.location.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Main LocationTreeView component
 */
export function LocationTreeView({
  locations,
  onSelectLocation,
  selectedLocationId,
}: LocationTreeViewProps) {
  const tree = buildTree(locations);

  if (locations.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="inline-block p-6 bg-indigo-50 rounded-full mb-4">
          <MapPin size={64} className="text-indigo-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">ยังไม่มีโลเคชั่น</h3>
        <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto">
          เริ่มจัดระเบียบคลังสินค้าของคุณด้วยการสร้างโลเคชั่นแรก
        </p>
        <div className="text-xs text-slate-500 space-y-1 mb-4">
          <p>💡 คุณสามารถสร้างได้:</p>
          <p>• โซนจัดเก็บ - พื้นที่จัดเก็บหลัก</p>
          <p>• LOT - ภายในพื้นที่</p>
          <p>• พื้นที่เก็บ(มุมมองบน) - ภายใน LOT</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map((node) => (
        <TreeNodeComponent
          key={node.location.id}
          node={node}
          onSelect={onSelectLocation}
          selectedId={selectedLocationId}
        />
      ))}
    </div>
  );
}
