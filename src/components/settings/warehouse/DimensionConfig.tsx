'use client';

import { Grid3X3 } from 'lucide-react';

export const DimensionConfig = () => {
  return (
    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
      <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
        <Grid3X3 size={16} className="text-indigo-500" />
        โครงสร้างพิกัด 3 มิติ (3D Grid Structure)
      </h4>
      <div className="grid grid-cols-3 gap-6">
        <AxisInput label="แกน X (Lot/Zone)" name="axis_x" def={5} max={50} desc="จำนวนแถว" />
        <AxisInput
          label="แกน Y (Position)"
          name="axis_y"
          def={10}
          max={100}
          desc="ความลึก (ช่องเก็บ)"
          color="emerald"
        />
        <AxisInput
          label="แกน Z (Level)"
          name="axis_z"
          def={3}
          max={10}
          desc="ความสูง (ชั้น)"
          color="indigo"
          isHighlight
        />
      </div>
    </div>
  );
};

// Helper Component (ใช้เฉพาะในไฟล์นี้)
const AxisInput = ({ label, name, def, max, desc, color = 'slate', isHighlight }: any) => (
  <div>
    <label
      htmlFor={name}
      className={`block text-xs font-bold mb-1 text-center ${
        isHighlight ? 'text-indigo-500' : 'text-slate-500'
      }`}
    >
      {label}
    </label>
    <input
      id={name}
      type="number"
      name={name}
      defaultValue={def}
      min="1"
      max={max}
      required
      className={`w-full p-3 border rounded-xl text-center font-bold text-slate-700 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 ${
        isHighlight
          ? 'border-2 border-indigo-100 bg-white shadow-sm focus-visible:ring-indigo-500/30'
          : `focus-visible:ring-${color}-500/30 focus-visible:border-${color}-500`
      }`}
    />
    <p className="text-xs text-slate-500 text-center mt-1">{desc}</p>
  </div>
);
