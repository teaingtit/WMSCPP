'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { getWarehouseLots, getCartsByLot, getLevelsByCart } from '@/actions/inbound-actions';

// Interface สำหรับข้อมูล Location ที่จะส่งกลับ
export interface LocationData {
  id: string;
  level: string;
  code: string;
  type?: string;
  lot: string;    // เพิ่มข้อมูล Lot เพื่อให้ง่ายต่อการแสดงผล
  cart: string;   // เพิ่มข้อมูล Cart/Position
}

interface LocationSelectorProps {
  warehouseId: string;
  onSelect: (location: LocationData | null) => void;
  disabled?: boolean;
  className?: string;
}

export default function LocationSelector({ warehouseId, onSelect, disabled = false, className = "" }: LocationSelectorProps) {
  // --- Data States ---
  const [lots, setLots] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [levels, setLevels] = useState<any[]>([]);

  // --- Selection States ---
  const [selectedLot, setSelectedLot] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');

  // --- Loading States ---
  const [loadingLots, setLoadingLots] = useState(false);
  const [loadingPos, setLoadingPos] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);

  // 1. Reset & Fetch Lots เมื่อ warehouseId เปลี่ยน
  useEffect(() => {
    setSelectedLot('');
    setSelectedPos('');
    setSelectedLevelId('');
    setLots([]);
    setPositions([]);
    setLevels([]);
    onSelect(null);

    if (warehouseId) {
      setLoadingLots(true);
      getWarehouseLots(warehouseId)
        .then(setLots)
        .finally(() => setLoadingLots(false));
    }
  }, [warehouseId, onSelect]);

  // 2. Fetch Positions เมื่อ Lot เปลี่ยน
  useEffect(() => {
    setSelectedPos('');
    setSelectedLevelId('');
    setPositions([]);
    setLevels([]);
    onSelect(null);

    if (warehouseId && selectedLot) {
      setLoadingPos(true);
      getCartsByLot(warehouseId, selectedLot)
        .then(setPositions)
        .finally(() => setLoadingPos(false));
    }
  }, [warehouseId, selectedLot, onSelect]);

  // 3. Fetch Levels เมื่อ Position เปลี่ยน
  useEffect(() => {
    setSelectedLevelId('');
    setLevels([]);
    onSelect(null);

    if (warehouseId && selectedLot && selectedPos) {
      setLoadingLevels(true);
      getLevelsByCart(warehouseId, selectedLot, selectedPos)
        .then(setLevels)
        .finally(() => setLoadingLevels(false));
    }
  }, [warehouseId, selectedLot, selectedPos, onSelect]);

  // Handle Final Selection
  const handleLevelChange = (levelId: string) => {
    setSelectedLevelId(levelId);
    if (!levelId) {
      onSelect(null);
      return;
    }
    
    const levelObj = levels.find(l => l.id === levelId);
    if (levelObj) {
      onSelect({
        ...levelObj,
        lot: selectedLot,
        cart: selectedPos
      });
    }
  };

  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {/* LOT SELECTOR */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 mb-1 block">LOT</label>
        <div className="relative">
          <select
            aria-label="เลือก Lot"
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
            value={selectedLot}
            onChange={(e) => setSelectedLot(e.target.value)}
            disabled={disabled || loadingLots || !warehouseId}
          >
            <option value="">-</option>
            {lots.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          {loadingLots && <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14} />}
        </div>
      </div>

      {/* POSITION SELECTOR */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 mb-1 block">POSITION</label>
        <div className="relative">
          <select
            aria-label="เลือก Position"
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
            value={selectedPos}
            onChange={(e) => setSelectedPos(e.target.value)}
            disabled={disabled || !selectedLot}
          >
            <option value="">-</option>
            {positions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {loadingPos && <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14} />}
        </div>
      </div>

      {/* LEVEL SELECTOR */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 mb-1 block">LEVEL</label>
        <div className="relative">
          <select
            aria-label="เลือก Level"
            className={`w-full p-2.5 border-2 rounded-lg font-black text-sm outline-none disabled:opacity-50 transition-colors
              ${selectedLevelId 
                ? 'bg-emerald-50 border-emerald-400 text-emerald-700' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            value={selectedLevelId}
            onChange={(e) => handleLevelChange(e.target.value)}
            disabled={disabled || !selectedPos}
          >
            <option value="">-</option>
            {levels.map((l: any) => (
              <option key={l.id} value={l.id}>{l.level}</option>
            ))}
          </select>
          {loadingLevels && <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14} />}
          
          {/* Indicator ว่าเลือกแล้ว */}
          {selectedLevelId && !loadingLevels && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                <CheckCircle2 className="text-emerald-500" size={16} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}