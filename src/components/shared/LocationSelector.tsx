'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { getWarehouseLots, getCartsByLot, getLevelsByCart } from '@/actions/inbound-actions';

// Interface Data
export interface LocationData {
  id: string;
  level: string;
  code: string;
  lot: string;
  cart: string;
  type?: string;
}

interface LocationSelectorProps {
  warehouseId: string;
  onSelect: (location: LocationData | null) => void;
  disabled?: boolean;
  className?: string;
}

export default function LocationSelector({
  warehouseId,
  onSelect,
  disabled = false,
  className = '',
}: LocationSelectorProps) {
  // Data States
  const [lots, setLots] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [levels, setLevels] = useState<any[]>([]);

  // Selection States
  const [selectedLot, setSelectedLot] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');

  // Loading States
  const [loadingLots, setLoadingLots] = useState(false);
  const [loadingPos, setLoadingPos] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);

  // 1. Reset & Fetch Lots (เมื่อเปลี่ยนคลัง)
  useEffect(() => {
    // Reset selection
    setSelectedLot('');
    setSelectedPos('');
    setSelectedLevelId('');
    setLots([]);
    setPositions([]);
    setLevels([]);
    onSelect(null);

    if (!warehouseId) return;

    let cancelled = false;
    setLoadingLots(true);
    getWarehouseLots(warehouseId)
      .then((data) => {
        if (!cancelled) setLots(data);
      })
      .catch((err) => console.error('Error fetching lots:', err))
      .finally(() => {
        if (!cancelled) setLoadingLots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);

  // 2. Fetch Positions (เมื่อเปลี่ยน Lot)
  useEffect(() => {
    setSelectedPos('');
    setSelectedLevelId('');
    setPositions([]);
    setLevels([]);
    onSelect(null);

    if (!warehouseId || !selectedLot) return;

    let cancelled = false;
    setLoadingPos(true);
    getCartsByLot(warehouseId, selectedLot)
      .then((data) => {
        if (!cancelled) setPositions(data);
      })
      .catch((err) => console.error('Error fetching positions:', err))
      .finally(() => {
        if (!cancelled) setLoadingPos(false);
      });
    return () => {
      cancelled = true;
    };
  }, [warehouseId, selectedLot]);

  // 3. Fetch Levels (เมื่อเปลี่ยน Position)
  useEffect(() => {
    setSelectedLevelId('');
    setLevels([]);
    onSelect(null);

    if (!warehouseId || !selectedLot || !selectedPos) return;

    let cancelled = false;
    setLoadingLevels(true);
    getLevelsByCart(warehouseId, selectedLot, selectedPos)
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          setLevels(data);
        } else {
          setLevels([]);
        }
      })
      .catch((err) => console.error('Error fetching levels:', err))
      .finally(() => {
        if (!cancelled) setLoadingLevels(false);
      });
    return () => {
      cancelled = true;
    };
  }, [warehouseId, selectedLot, selectedPos]);

  // Handle Final Selection
  const handleLevelChange = (levelId: string) => {
    setSelectedLevelId(levelId);
    if (!levelId) {
      onSelect(null);
      return;
    }
    const levelObj = levels.find((l) => l.id === levelId);
    if (levelObj) {
      onSelect({
        ...levelObj,
        lot: selectedLot,
        cart: selectedPos,
      });
    }
  };

  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {/* LOT */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 mb-1 block">ล็อต (LOT)</label>
        <div className="relative">
          <select
            aria-label="เลือก Lot" // ✅ เพิ่ม aria-label แก้ปัญหา a11y
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
            value={selectedLot}
            onChange={(e) => setSelectedLot(e.target.value)}
            disabled={disabled || loadingLots || !warehouseId}
          >
            <option value="">- เลือก -</option>
            {lots.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {loadingLots && (
            <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14} />
          )}
        </div>
      </div>

      {/* POSITION */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 mb-1 block">
          ตำแหน่ง (POSITION)
        </label>
        <div className="relative">
          <select
            aria-label="เลือก Position" // ✅ เพิ่ม aria-label แก้ปัญหา a11y
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
            value={selectedPos}
            onChange={(e) => setSelectedPos(e.target.value)}
            disabled={disabled || !selectedLot}
          >
            <option value="">- เลือก -</option>
            {positions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {loadingPos && (
            <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14} />
          )}
        </div>
      </div>

      {/* LEVEL */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 mb-1 block">ชั้น (LEVEL)</label>
        <div className="relative">
          <select
            aria-label="เลือก Level" // ✅ เพิ่ม aria-label แก้ปัญหา a11y
            className={`w-full p-2.5 border-2 rounded-lg font-black text-sm outline-none transition-colors disabled:opacity-50
              ${
                selectedLevelId
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            value={selectedLevelId}
            onChange={(e) => handleLevelChange(e.target.value)}
            disabled={disabled || !selectedPos}
          >
            <option value="">- เลือก -</option>
            {levels.map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.level}
              </option>
            ))}
          </select>
          {loadingLevels && (
            <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14} />
          )}
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
