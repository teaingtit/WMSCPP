'use client';

import React from 'react';
import { Trash2, Copy } from 'lucide-react';
import { LayoutComponent } from './DraggableComponent';

interface PropertyPanelProps {
  component: LayoutComponent | null;
  onUpdate: (updates: Partial<LayoutComponent>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function PropertyPanel({ component, onUpdate, onDelete, onDuplicate }: PropertyPanelProps) {
  if (!component) {
    return (
      <div className="w-64 bg-white border-l border-slate-200 p-4">
        <div className="text-center text-slate-400 text-sm mt-8">
          <p>คลิกที่ส่วนประกอบ</p>
          <p>เพื่อแก้ไขคุณสมบัติ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-l border-slate-200 p-4 overflow-y-auto">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800">คุณสมบัติ</h3>
        <p className="text-xs text-slate-500 capitalize">{component.type}</p>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="comp-name" className="block text-sm font-medium text-slate-700 mb-1">
            ชื่อ
          </label>
          <input
            id="comp-name"
            type="text"
            value={component.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            placeholder="ชื่อส่วนประกอบ"
            title="ชื่อส่วนประกอบ"
          />
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="comp-x" className="block text-sm font-medium text-slate-700 mb-1">
              X
            </label>
            <input
              id="comp-x"
              type="number"
              value={Math.round(component.x)}
              onChange={(e) => onUpdate({ x: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              placeholder="X"
              title="พิกัด X"
            />
          </div>
          <div>
            <label htmlFor="comp-y" className="block text-sm font-medium text-slate-700 mb-1">
              Y
            </label>
            <input
              id="comp-y"
              type="number"
              value={Math.round(component.y)}
              onChange={(e) => onUpdate({ y: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              placeholder="Y"
              title="พิกัด Y"
            />
          </div>
        </div>

        {/* Size */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="comp-width" className="block text-sm font-medium text-slate-700 mb-1">
              ความกว้าง
            </label>
            <input
              id="comp-width"
              type="number"
              value={Math.round(component.width)}
              onChange={(e) => onUpdate({ width: Math.max(20, Number(e.target.value)) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              placeholder="กว้าง"
              title="ความกว้าง"
            />
          </div>
          <div>
            <label htmlFor="comp-height" className="block text-sm font-medium text-slate-700 mb-1">
              ความสูง
            </label>
            <input
              id="comp-height"
              type="number"
              value={Math.round(component.height)}
              onChange={(e) => onUpdate({ height: Math.max(20, Number(e.target.value)) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              placeholder="สูง"
              title="ความสูง"
            />
          </div>
        </div>

        {/* Color */}
        <div>
          <label htmlFor="comp-color" className="block text-sm font-medium text-slate-700 mb-1">
            สี
          </label>
          <input
            id="comp-color"
            type="color"
            value={component.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-full h-10 rounded-lg cursor-pointer"
            title="เลือกสี"
          />
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <button
            onClick={onDuplicate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Copy size={16} />
            ทำซ้ำ
          </button>
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            ลบ
          </button>
        </div>
      </div>
    </div>
  );
}
