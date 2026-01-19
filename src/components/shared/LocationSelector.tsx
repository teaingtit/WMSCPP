'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { getWarehouseLots, getCartsByLot, getLevelsByCart } from '@/actions/inbound-actions';

// Interface Data - Updated for hierarchical structure
export interface LocationData {
  id: string;
  level: string; // Maps to bin_code for backward compatibility
  code: string;
  lot: string; // Maps to zone for backward compatibility
  cart: string; // Maps to aisle for backward compatibility
  zone?: string;
  aisle?: string;
  bin_code?: string;
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
  // Data States (using new terminology internally)
  const [zones, setZones] = useState<string[]>([]);
  const [aisles, setAisles] = useState<string[]>([]);
  const [bins, setBins] = useState<any[]>([]);

  // Selection States
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedAisle, setSelectedAisle] = useState('');
  const [selectedBinId, setSelectedBinId] = useState('');

  // Loading States
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingAisles, setLoadingAisles] = useState(false);
  const [loadingBins, setLoadingBins] = useState(false);

  // 1. Reset & Fetch Zones (เมื่อเปลี่ยนคลัง)
  useEffect(() => {
    // Reset selection
    setSelectedZone('');
    setSelectedAisle('');
    setSelectedBinId('');
    setZones([]);
    setAisles([]);
    setBins([]);
    onSelect(null);

    if (warehouseId) {
      setLoadingZones(true);
      getWarehouseLots(warehouseId) // Backend function returns zones
        .then(setZones)
        .catch((err) => console.error('Error fetching zones:', err))
        .finally(() => setLoadingZones(false));
    }
  }, [warehouseId]);

  // 2. Fetch Aisles (เมื่อเปลี่ยน Zone)
  useEffect(() => {
    setSelectedAisle('');
    setSelectedBinId('');
    setAisles([]);
    setBins([]);
    onSelect(null);

    if (warehouseId && selectedZone) {
      setLoadingAisles(true);
      getCartsByLot(warehouseId, selectedZone) // Backend function returns aisles
        .then(setAisles)
        .catch((err) => console.error('Error fetching aisles:', err))
        .finally(() => setLoadingAisles(false));
    }
  }, [warehouseId, selectedZone]);

  // 3. Fetch Bins (เมื่อเปลี่ยน Aisle)
  useEffect(() => {
    setSelectedBinId('');
    setBins([]);
    onSelect(null);

    if (warehouseId && selectedZone && selectedAisle) {
      setLoadingBins(true);
      getLevelsByCart(warehouseId, selectedZone, selectedAisle) // Backend function returns bins
        .then((data) => {
          // ✅ ป้องกันกรณี data เป็น null หรือ undefined
          if (Array.isArray(data)) {
            setBins(data);
          } else {
            setBins([]);
          }
        })
        .catch((err) => console.error('Error fetching bins:', err))
        .finally(() => setLoadingBins(false));
    }
  }, [warehouseId, selectedZone, selectedAisle]);

  // Handle Final Selection
  const handleBinChange = (binId: string) => {
    setSelectedBinId(binId);
    if (!binId) {
      onSelect(null);
      return;
    }
    const binObj = bins.find((b) => b.id === binId);
    if (binObj) {
      // Return data with both new and old property names for compatibility
      onSelect({
        ...binObj,
        lot: selectedZone, // Backward compatibility
        cart: selectedAisle, // Backward compatibility
        zone: selectedZone,
        aisle: selectedAisle,
        bin_code: binObj.level,
      });
    }
  };

  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {/* ZONE */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 mb-1 block">โซนจัดเก็บ</label>
        <div className="relative">
          <select
            aria-label="เลือก Zone"
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            disabled={disabled || loadingZones || !warehouseId}
          >
            <option value="">- เลือก -</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          {loadingZones && (
            <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14} />
          )}
        </div>
      </div>

      {/* AISLE */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 mb-1 block">LOT</label>
        <div className="relative">
          <select
            aria-label="เลือก Aisle"
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
            value={selectedAisle}
            onChange={(e) => setSelectedAisle(e.target.value)}
            disabled={disabled || !selectedZone}
          >
            <option value="">- เลือก -</option>
            {aisles.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {loadingAisles && (
            <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14} />
          )}
        </div>
      </div>

      {/* BIN */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 mb-1 block">พื้นที่เก็บ</label>
        <div className="relative">
          <select
            aria-label="เลือก Bin"
            className={`w-full p-2.5 border-2 rounded-lg font-black text-sm outline-none transition-colors disabled:opacity-50
              ${
                selectedBinId
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            value={selectedBinId}
            onChange={(e) => handleBinChange(e.target.value)}
            disabled={disabled || !selectedAisle}
          >
            <option value="">- เลือก -</option>
            {bins.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.level}
              </option>
            ))}
          </select>
          {loadingBins && (
            <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14} />
          )}
          {selectedBinId && !loadingBins && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
              <CheckCircle2 className="text-emerald-500" size={16} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
