'use client';

import React from 'react';
import { Grid3x3, Truck, Building } from 'lucide-react';

export type ComponentType = 'zone' | 'aisle' | 'bin' | 'dock' | 'office';

interface PaletteItemProps {
  type: ComponentType;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function PaletteItem({ label, icon, color, onClick }: PaletteItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
                w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white shadow-sm
                transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            `}
    >
      <div
        className="p-2.5 rounded-lg shadow-inner"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className="text-left">
        <div className="font-semibold text-sm text-slate-700">{label}</div>
        <div className="text-[10px] text-slate-400 font-medium">คลิกเพื่อเพิ่ม</div>
      </div>
    </button>
  );
}

interface ComponentPaletteProps {
  onAdd: (type: ComponentType) => void;
}

export function ComponentPalette({ onAdd }: ComponentPaletteProps) {
  const components: PaletteItemProps[] = [
    {
      type: 'zone', // Using 'zone' as internal ID for 'Lot' to maintain compatibility
      label: 'โซนจัดเก็บ',
      icon: <Grid3x3 size={20} />,
      color: '#4F46E5', // Indigo
      onClick: () => onAdd('zone'),
    },
    // {
    //   type: 'aisle', // Using 'aisle' as internal ID for 'Cart'/'Slot'
    //   label: 'ช่องจัดเก็บ (Storage Slot)',
    //   icon: <Layers size={20} />,
    //   color: '#F59E0B', // Amber
    // },
    {
      type: 'dock', // Repurposed for Road/Path
      label: 'ทางเดินรถ (Road)',
      icon: <Truck size={20} />,
      color: '#64748b', // Slate
      onClick: () => onAdd('dock'),
    },
    {
      type: 'office',
      label: 'ออฟฟิศ (Office)',
      icon: <Building size={20} />,
      color: '#8B5CF6', // Purple
      onClick: () => onAdd('office'),
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 p-4 overflow-y-auto">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 mb-1">ส่วนประกอบ</h3>
        <p className="text-xs text-slate-500">คลิกเพื่อเพิ่มลงในแผนผัง</p>
      </div>

      <div className="space-y-3">
        {components.map((comp) => (
          <PaletteItem key={comp.type} {...comp} />
        ))}
      </div>

      <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-xs font-medium text-slate-700 mb-2">💡 เคล็ดลับ</div>
        <ul className="text-xs text-slate-600 space-y-1">
          <li>• คลิกเพิ่ม โซนจัดเก็บ</li>
          <li>• คลิกที่ โซนจัดเก็บ เพื่อเพิ่ม LOT</li>
          <li>• ลากมุมขวาล่างเพื่อปรับขนาด</li>
        </ul>
      </div>
    </div>
  );
}
