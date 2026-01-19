'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { LayoutComponent } from './DraggableComponent';

interface PropertyPanelProps {
  component: LayoutComponent | null;
  onUpdate: (updates: Partial<LayoutComponent>) => void;
  onDelete: () => void;
  onAddChild?: (type: 'aisle') => void;
  onRotate?: () => void;
}

export function PropertyPanel({
  component,
  onUpdate,
  onDelete,
  onAddChild,
  onRotate,
}: PropertyPanelProps) {
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
            ชื่อ (Code)
          </label>
          <input
            id="comp-name"
            type="text"
            value={component.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            placeholder="เช่น A1, Z1"
          />
        </div>

        {/* Levels (Only for Cart/Aisle) */}
        {component.type === 'aisle' && (
          <div>
            <label htmlFor="comp-levels" className="block text-sm font-medium text-slate-700 mb-1">
              จำนวนชั้น (Levels)
            </label>
            <input
              id="comp-levels"
              type="number"
              min="1"
              max="20"
              value={component.levels || 1}
              onChange={(e) => onUpdate({ levels: Math.max(1, Number(e.target.value)) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              ระบบจะสร้าง พื้นที่เก็บ(มุมมองบน) ตามจำนวนชั้น
            </p>
          </div>
        )}

        {/* Capacity (Only for Zone/Lot) */}
        {component.type === 'zone' && (
          <div>
            <label
              htmlFor="comp-capacity"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              ความจุ (Max Slots)
            </label>
            <input
              id="comp-capacity"
              type="number"
              min="1"
              value={component.capacity || 10}
              onChange={(e) => onUpdate({ capacity: Math.max(1, Number(e.target.value)) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              placeholder="จำนวนช่องเก็บสูงสุด"
            />
            <p className="text-[10px] text-slate-400 mt-1">จำนวน LOT สูงสุดในโซนนี้</p>

            {onAddChild && (
              <button
                onClick={() => onAddChild('aisle')}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-medium"
              >
                + เพิ่ม LOT
              </button>
            )}
          </div>
        )}

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
          {onRotate && (
            <button
              onClick={onRotate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              🔄 หมุน (Rotate)
            </button>
          )}

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
