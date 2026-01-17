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
import { Save, Download, Undo, Redo } from 'lucide-react';
import { ComponentPalette, ComponentType } from './ComponentPalette';
import { LayoutCanvas } from './LayoutCanvas';
import { DraggableComponent, LayoutComponent } from './DraggableComponent';
import { PropertyPanel } from './PropertyPanel';

const COMPONENT_DEFAULTS = {
  zone: { width: 200, height: 150, color: '#4F46E5' },
  aisle: { width: 150, height: 80, color: '#10B981' },
  bin: { width: 60, height: 60, color: '#F59E0B' },
  dock: { width: 100, height: 80, color: '#EF4444' },
  office: { width: 120, height: 100, color: '#8B5CF6' },
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;

    if (!over) return;

    const activeData = active.data.current as any;

    // Creating new component from palette
    if (activeData?.isNew) {
      const type = activeData.type as ComponentType;
      const defaults = COMPONENT_DEFAULTS[type];

      const newComponent: LayoutComponent = {
        id: `${type}-${Date.now()}`,
        type,
        name: `${type.toUpperCase()}-${components.filter((c) => c.type === type).length + 1}`,
        x: Math.max(0, delta.x),
        y: Math.max(0, delta.y),
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
      const component = activeData.component as LayoutComponent;
      const newComponents = components.map((c) =>
        c.id === component.id ? { ...c, x: c.x + delta.x, y: c.y + delta.y } : c,
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

  const handleDuplicateComponent = (id: string) => {
    const component = components.find((c) => c.id === id);
    if (!component) return;

    const newComponent: LayoutComponent = {
      ...component,
      id: `${component.type}-${Date.now()}`,
      name: `${component.name}-Copy`,
      x: component.x + 20,
      y: component.y + 20,
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
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="ย้อนกลับ"
          >
            <Undo size={20} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="ทำซ้ำ"
          >
            <Redo size={20} />
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
          <ComponentPalette />

          {/* Center Canvas */}
          <div className="flex-1 p-4">
            <LayoutCanvas onCanvasClick={() => setSelectedId(null)}>
              {components.map((component) => (
                <DraggableComponent
                  key={component.id}
                  component={component}
                  isSelected={component.id === selectedId}
                  onSelect={() => setSelectedId(component.id)}
                />
              ))}
            </LayoutCanvas>
          </div>

          {/* Right Property Panel */}
          <PropertyPanel
            component={selectedComponent}
            onUpdate={(updates) => selectedId && handleUpdateComponent(selectedId, updates)}
            onDelete={() => selectedId && handleDeleteComponent(selectedId)}
            onDuplicate={() => selectedId && handleDuplicateComponent(selectedId)}
          />

          <DragOverlay>{/* Drag preview can be added here if needed */}</DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
