'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Grid3x3, Layers, Package, Truck, Building } from 'lucide-react';

export type ComponentType = 'zone' | 'aisle' | 'bin' | 'dock' | 'office';

interface PaletteItemProps {
  type: ComponentType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

function PaletteItem({ type, label, icon, color }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, isNew: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
                flex items-center gap-3 p-3 rounded-lg border-2 cursor-grab
                transition-all hover:shadow-md
                ${isDragging ? 'opacity-50 cursor-grabbing' : ''}
            `}
      style={{ borderColor: color, backgroundColor: `${color}10` }}
    >
      <div className="p-2 rounded-md" style={{ backgroundColor: `${color}20`, color }}>
        {icon}
      </div>
      <div>
        <div className="font-medium text-sm text-slate-800">{label}</div>
        <div className="text-xs text-slate-500">ลากเพื่อวาง</div>
      </div>
    </div>
  );
}

export function ComponentPalette() {
  const components: PaletteItemProps[] = [
    {
      type: 'zone',
      label: 'โซน (Zone)',
      icon: <Grid3x3 size={20} />,
      color: '#4F46E5', // Indigo
    },
    {
      type: 'aisle',
      label: 'ทางเดิน (Aisle)',
      icon: <Layers size={20} />,
      color: '#10B981', // Emerald
    },
    {
      type: 'bin',
      label: 'ช่องเก็บ (Bin)',
      icon: <Package size={20} />,
      color: '#F59E0B', // Amber
    },
    {
      type: 'dock',
      label: 'ท่าขนของ (Dock)',
      icon: <Truck size={20} />,
      color: '#EF4444', // Red
    },
    {
      type: 'office',
      label: 'สำนักงาน (Office)',
      icon: <Building size={20} />,
      color: '#8B5CF6', // Purple
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 p-4 overflow-y-auto">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 mb-1">ส่วนประกอบ</h3>
        <p className="text-xs text-slate-500">ลากส่วนประกอบไปวางบนแผนผัง</p>
      </div>

      <div className="space-y-3">
        {components.map((comp) => (
          <PaletteItem key={comp.type} {...comp} />
        ))}
      </div>

      <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-xs font-medium text-slate-700 mb-2">💡 เคล็ดลับ</div>
        <ul className="text-xs text-slate-600 space-y-1">
          <li>• ลากโซนก่อน แล้วค่อยเพิ่มทางเดิน</li>
          <li>• คลิกเพื่อแก้ไขคุณสมบัติ</li>
          <li>• ใช้กริดช่วยจัดวาง</li>
        </ul>
      </div>
    </div>
  );
}
