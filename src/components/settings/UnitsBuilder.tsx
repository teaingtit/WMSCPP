'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Scale, Info } from 'lucide-react';

interface UnitsBuilderProps {
  onUnitsChange: (json: string) => void;
  initialUnits?: string;
}

export default function UnitsBuilder({ onUnitsChange, initialUnits }: UnitsBuilderProps) {
  const [units, setUnits] = useState<string[]>([]);
  const [newUnit, setNewUnit] = useState('');
  // Avoid sync loop: skip applying initialUnits when it came from our own onUnitsChange.
  const lastPushedRef = useRef<string | null>(null);

  // Init Data: only apply when initialUnits is from external source (e.g. category), not our own push.
  useEffect(() => {
    if (!initialUnits) return;
    if (initialUnits === lastPushedRef.current) return; // came from our Effect2, skip to break loop
    try {
      const parsed = JSON.parse(initialUnits);
      if (Array.isArray(parsed)) {
        setUnits(parsed);
      }
    } catch (e) {
      console.error('Units Parse Error', e);
    }
  }, [initialUnits]);

  // Sync to Parent
  useEffect(() => {
    const str = JSON.stringify(units);
    lastPushedRef.current = str;
    onUnitsChange(str);
  }, [units, onUnitsChange]);

  const addUnit = () => {
    const trimmed = newUnit.trim().toUpperCase();
    if (!trimmed) return;
    if (units.includes(trimmed)) {
      return; // Prevent duplicates
    }
    setUnits([...units, trimmed]);
    setNewUnit('');
  };

  const removeUnit = (index: number) => {
    setUnits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addUnit();
    }
  };

  // Quick add common units
  const commonUnits = [
    'PCS',
    'KG',
    'G',
    'L',
    'ML',
    'M',
    'CM',
    'BOX',
    'PACK',
    'SET',
    'ROLL',
    'SHEET',
  ];
  const availableCommonUnits = commonUnits.filter((u) => !units.includes(u));

  return (
    <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-emerald-600" />
          <h4 className="text-sm font-bold text-slate-700">หน่วยนับ (Units of Measure)</h4>
          <div className="group relative">
            <Info size={14} className="text-slate-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-800 text-white text-xs p-2 rounded hidden group-hover:block z-10">
              กำหนดหน่วยนับที่ใช้สำหรับสินค้าในหมวดหมู่นี้ เช่น PCS, KG, BOX
            </div>
          </div>
        </div>
      </div>

      {/* Add Unit Input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="เพิ่มหน่วยนับ (เช่น PCS, KG, BOX)"
          className="flex-1 p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all uppercase"
          value={newUnit}
          onChange={(e) => setNewUnit(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          onClick={addUnit}
          disabled={!newUnit.trim()}
          className="px-4 py-2.5 text-sm flex items-center gap-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> เพิ่ม
        </button>
      </div>

      {/* Quick Add Common Units */}
      {availableCommonUnits.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 self-center">เพิ่มเร็ว:</span>
          {availableCommonUnits.slice(0, 8).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => setUnits([...units, unit])}
              className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-md hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors touch-manipulation active:scale-95 min-h-[44px]"
            >
              + {unit}
            </button>
          ))}
        </div>
      )}

      {/* Units List */}
      {units.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          ยังไม่มีหน่วยนับ - สินค้าจะใช้หน่วยเริ่มต้น "UNIT"
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {units.map((unit, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-emerald-200 rounded-lg shadow-sm animate-in slide-in-from-left-2 duration-200"
            >
              <span className="font-bold text-sm text-emerald-700">{unit}</span>
              <button
                type="button"
                onClick={() => removeUnit(idx)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors touch-manipulation active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="ลบหน่วยนี้"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {units.length > 0 && (
        <div className="text-xs text-slate-500 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
          💡 หน่วยแรกในรายการ (<span className="font-bold text-emerald-700">{units[0]}</span>)
          จะเป็นหน่วยเริ่มต้นสำหรับสินค้าใหม่
        </div>
      )}
    </div>
  );
}
