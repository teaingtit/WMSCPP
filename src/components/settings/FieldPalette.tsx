'use client';

import { Type, Hash, Calendar } from 'lucide-react';

interface FieldPaletteProps {
  onDragStart: (type: 'text' | 'number' | 'date') => void;
}

export default function FieldPalette({ onDragStart }: FieldPaletteProps) {
  const fieldTypes = [
    { type: 'text' as const, icon: Type, label: 'ข้อความ', color: 'blue' },
    { type: 'number' as const, icon: Hash, label: 'ตัวเลข', color: 'emerald' },
    { type: 'date' as const, icon: Calendar, label: 'วันที่', color: 'purple' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h4 className="text-sm font-bold text-slate-700 mb-3">ประเภทฟิลด์</h4>
      <div className="grid grid-cols-3 gap-3">
        {fieldTypes.map(({ type, icon: Icon, label, color }) => (
          <div
            key={type}
            draggable
            onDragStart={() => onDragStart(type)}
            className={`
              p-4 rounded-lg border-2 cursor-move transition-all
              bg-${color}-50 border-${color}-200 hover:border-${color}-300 hover:shadow-md
              flex flex-col items-center gap-2
            `}
          >
            <Icon size={24} className={`text-${color}-600`} />
            <span className="text-sm font-bold text-slate-700">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-3">ลากฟิลด์ไปวางในพื้นที่ด้านล่าง</p>
    </div>
  );
}
