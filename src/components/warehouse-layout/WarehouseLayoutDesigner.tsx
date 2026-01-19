'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import { Save, Download, Undo, Redo, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import { ComponentPalette, ComponentType } from './ComponentPalette';
import { LayoutCanvas } from './LayoutCanvas';
import { DraggableComponent, LayoutComponent } from './DraggableComponent';
import { PropertyPanel } from './PropertyPanel';

const COMPONENT_DEFAULTS = {
  zone: { width: 300, height: 200, color: '#4F46E5' }, // Lot
  aisle: { width: 60, height: 100, color: '#F59E0B' }, // Cart
  bin: { width: 50, height: 50, color: '#10B981' }, // Unused direct bin
  dock: { width: 200, height: 60, color: '#64748b' }, // Road
  office: { width: 150, height: 120, color: '#8B5CF6' }, // Office
};

interface WarehouseLayoutDesignerProps {
  warehouseId: string;
  initialLayout?: LayoutComponent[];
  onSave?: (components: LayoutComponent[]) => Promise<void>;
}

export function WarehouseLayoutDesigner({
  warehouseId,
  initialLayout = [],
  onSave,
}: WarehouseLayoutDesignerProps) {
  const [components, setComponents] = useState<LayoutComponent[]>(initialLayout);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<LayoutComponent[][]>([initialLayout]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const selectedComponent = components.find((c) => c.id === selectedId) || null;

  const addToHistory = useCallback(
    (newComponents: LayoutComponent[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newComponents);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex],
  );

  // Grid Snapping Helper (20px)
  const snapToGrid = (value: number) => Math.round(value / 20) * 20;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;

    if (!over) return;

    const activeData = active.data.current as any;
    const isNew = activeData?.isNew;
    const component = activeData?.component;

    const newX = isNew
      ? Math.max(0, snapToGrid(delta.x))
      : Math.max(0, snapToGrid(component.x + delta.x));
    const newY = isNew
      ? Math.max(0, snapToGrid(delta.y))
      : Math.max(0, snapToGrid(component.y + delta.y));

    const width = component?.width || COMPONENT_DEFAULTS.aisle.width;
    const height = component?.height || COMPONENT_DEFAULTS.aisle.height;

    // 1. Constraint Check: Zone Capacity (Only for Slots)
    if (activeData?.type === 'aisle' || component?.type === 'aisle') {
      // Find target zone
      const targetZone = components.find(
        (z) =>
          z.type === 'zone' &&
          newX >= z.x &&
          newY >= z.y &&
          newX + width <= z.x + z.width &&
          newY + height <= z.y + z.height,
      );

      if (targetZone) {
        // Count existing slots in this zone
        const existingCount = components.filter((c) => {
          if (c.id === component?.id) return false; // Exclude self
          if (c.type !== 'aisle') return false;
          return (
            c.x >= targetZone.x &&
            c.y >= targetZone.y &&
            c.x + c.width <= targetZone.x + targetZone.width &&
            c.y + c.height <= targetZone.y + targetZone.height
          );
        }).length;

        const limit = targetZone.capacity || 10;
        if (existingCount >= limit) {
          toast.error(
            `Cannot place Slot in Lot ${targetZone.name}: Capacity Full (${existingCount}/${limit})`,
          );
          return;
        }
      }

      // 2. Constraint Check: Slot Collision (Prevent overlap with other slots)
      const hasCollision = components.some((c) => {
        if (c.id === component?.id) return false; // Exclude self
        if (c.type !== 'aisle') return false; // Only check against other slots

        // Check intersection
        return (
          newX < c.x + c.width && newX + width > c.x && newY < c.y + c.height && newY + height > c.y
        );
      });

      if (hasCollision) {
        toast.error('Cannot place here: Overlaps with another Storage Slot!');
        return;
      }
    }

    // Apply Changes
    if (isNew) {
      const type = activeData.type as ComponentType;
      const defaults = COMPONENT_DEFAULTS[type];

      const newComponent: LayoutComponent = {
        id: `${type}-${Date.now()}`,
        type,
        name: `${type.toUpperCase()}-${components.filter((c) => c.type === type).length + 1}`,
        x: newX,
        y: newY,
        width: defaults.width,
        height: defaults.height,
        color: defaults.color,
      };

      const newComponents = [...components, newComponent];
      setComponents(newComponents);
      addToHistory(newComponents);
      setSelectedId(newComponent.id);
    }
    // Moving existing component
    else if (activeData?.isExisting) {
      const newComponents = components.map((c) =>
        c.id === component.id ? { ...c, x: newX, y: newY } : c,
      );
      setComponents(newComponents);
      addToHistory(newComponents);
    }
  };

  const handleUpdateComponent = (id: string, updates: Partial<LayoutComponent>) => {
    const newComponents = components.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setComponents(newComponents);
    addToHistory(newComponents);
  };

  const handleDeleteComponent = (id: string) => {
    const newComponents = components.filter((c) => c.id !== id);
    setComponents(newComponents);
    addToHistory(newComponents);
    setSelectedId(null);
  };

  const handleRotate = () => {
    if (!selectedId) return;
    const component = components.find((c) => c.id === selectedId);
    if (!component) return;

    // Swap width and height
    const newWidth = component.height;
    const newHeight = component.width;

    // Optional: Check collision with rotation
    // For now, let's allow overlapping on rotate, or user can fix it.
    // Or we can try to shift it? Let's just swap.

    const newComponent = { ...component, width: newWidth, height: newHeight };
    const newComponents = components.map((c) => (c.id === selectedId ? newComponent : c));

    setComponents(newComponents);
    addToHistory(newComponents);
  };

  const handleResize = (id: string, width: number, height: number) => {
    const newComponents = components.map((c) => (c.id === id ? { ...c, width, height } : c));
    setComponents(newComponents);
    addToHistory(newComponents);
  };

  const handleAddItem = (type: ComponentType) => {
    const defaults = COMPONENT_DEFAULTS[type];
    const newComponent: LayoutComponent = {
      id: `${type}-${Date.now()}`,
      type,
      name: `${type.toUpperCase()}-${components.filter((c) => c.type === type).length + 1}`,
      x: 100 + components.length * 10, // Simple stagger
      y: 100 + components.length * 10,
      width: defaults.width,
      height: defaults.height,
      color: defaults.color,
    };

    const newComponents = [...components, newComponent];
    setComponents(newComponents);
    addToHistory(newComponents);
    setSelectedId(newComponent.id);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      if (prevState) {
        setHistoryIndex(historyIndex - 1);
        setComponents(prevState);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      if (nextState) {
        setHistoryIndex(historyIndex + 1);
        setComponents(nextState);
      }
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(components);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddChild = (type: 'aisle') => {
    if (!selectedId) return;
    const parent = components.find((c) => c.id === selectedId);
    if (!parent || parent.type !== 'zone') return;

    // Defaults
    const width = COMPONENT_DEFAULTS.aisle.width;
    const height = COMPONENT_DEFAULTS.aisle.height;
    const padding = 20;

    // Capacity Check
    const existingSlots = components.filter((c) => {
      if (c.type !== 'aisle') return false;
      return (
        c.x >= parent.x &&
        c.y >= parent.y &&
        c.x + c.width <= parent.x + parent.width &&
        c.y + c.height <= parent.y + parent.height
      );
    });

    if (parent.capacity && existingSlots.length >= parent.capacity) {
      toast.error(`Cannot add Slot: Lot Capacity Full (${parent.capacity})`);
      return;
    }

    // Find free space (Grid Scan)
    let foundX = -1;
    let foundY = -1;

    // Start scanning from top-left of zone + padding
    // Step by 20px (Grid)
    for (let y = parent.y + 40; y <= parent.y + parent.height - height - padding; y += 20) {
      for (let x = parent.x + padding; x <= parent.x + parent.width - width - padding; x += 20) {
        // Check collision with existing slots
        const hasCollision = existingSlots.some((slot) => {
          return (
            x < slot.x + slot.width &&
            x + width > slot.x &&
            y < slot.y + slot.height &&
            y + height > slot.y
          );
        });

        if (!hasCollision) {
          foundX = x;
          foundY = y;
          break;
        }
      }
      if (foundX !== -1) break;
    }

    if (foundX === -1) {
      toast.error('Cannot add Slot: No space available in this Lot!');
      return;
    }

    // Create Component
    const newComponent: LayoutComponent = {
      id: `${type}-${Date.now()}`,
      type,
      name: `${type.toUpperCase()}-${components.filter((c) => c.type === type).length + 1}`,
      x: foundX,
      y: foundY,
      width,
      height,
      color: COMPONENT_DEFAULTS.aisle.color,
      parentId: parent.id, // Track parent relationship if needed
    };

    const newComponents = [...components, newComponent];
    setComponents(newComponents);
    addToHistory(newComponents);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify({ warehouseId, components }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `warehouse-layout-${warehouseId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate usage for each zone
  const zoneCounts = components.reduce((acc, comp) => {
    if (comp.type === 'aisle') {
      const parentZone = components.find(
        (z) =>
          z.type === 'zone' &&
          comp.x >= z.x &&
          comp.y >= z.y &&
          comp.x + comp.width <= z.x + z.width &&
          comp.y + comp.height <= z.y + z.height,
      );
      if (parentZone) {
        acc[parentZone.id] = (acc[parentZone.id] || 0) + 1;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">ออกแบบผังคลัง</h1>
          <span className="text-sm text-slate-500">({components.length} ส่วนประกอบ)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative"
            title="ย้อนกลับ"
            aria-label="Undo"
          >
            <Undo size={20} />
            {historyIndex > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {historyIndex}
              </span>
            )}
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative"
            title="ทำซ้ำ"
            aria-label="Redo"
          >
            <Redo size={20} />
            {historyIndex < history.length - 1 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {history.length - 1 - historyIndex}
              </span>
            )}
          </button>

          <div className="w-px h-6 bg-slate-300 mx-2" />

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm"
          >
            <Download size={16} />
            Export JSON
          </button>

          {onSave && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {/* Left Palette */}
          <ComponentPalette onAdd={handleAddItem} />

          {/* Center Canvas */}
          <div className="flex-1 p-4 overflow-hidden relative">
            {/* Keyboard Shortcuts Panel */}
            <div className="absolute top-8 left-8 z-10 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 text-xs border border-slate-200">
              <div className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Keyboard size={14} /> คีย์ลัด
              </div>
              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between gap-4">
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded border border-slate-300 font-mono">
                    Alt
                  </kbd>
                  <span>+ ลาก = เลื่อนมุมมอง</span>
                </div>
                <div className="flex justify-between gap-4">
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded border border-slate-300 font-mono">
                    Ctrl+Z
                  </kbd>
                  <span>ย้อนกลับ</span>
                </div>
                <div className="flex justify-between gap-4">
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded border border-slate-300 font-mono">
                    Del
                  </kbd>
                  <span>ลบที่เลือก</span>
                </div>
              </div>
            </div>

            <LayoutCanvas onCanvasClick={() => setSelectedId(null)}>
              {components.map((component) => (
                <DraggableComponent
                  key={component.id}
                  component={component}
                  isSelected={component.id === selectedId}
                  onSelect={() => setSelectedId(component.id)}
                  usage={component.type === 'zone' ? zoneCounts[component.id] || 0 : 0}
                  onResize={handleResize}
                />
              ))}
            </LayoutCanvas>
          </div>

          {/* Right Property Panel */}
          <PropertyPanel
            component={selectedComponent}
            onUpdate={(updates) => selectedId && handleUpdateComponent(selectedId, updates)}
            onDelete={() => selectedId && handleDeleteComponent(selectedId)}
            {...(selectedComponent?.type === 'zone' ? { onAddChild: handleAddChild } : {})}
            {...(selectedId ? { onRotate: handleRotate } : {})}
          />

          <DragOverlay>{/* Drag preview can be added here if needed */}</DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
