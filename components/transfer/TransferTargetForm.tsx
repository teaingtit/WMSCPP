'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Building2, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { getWarehouseLots, getCartsByLot, getLevelsByCart } from '@/actions/inbound-actions';
import { submitTransfer, submitCrossTransfer } from '@/actions/transfer-actions';
import { useRouter } from 'next/navigation';

interface Props {
  sourceStock: any;
  currentWarehouseId: string;
  activeTab: 'INTERNAL' | 'CROSS';
  warehouses: any[]; // List of warehouses for Cross Transfer
}

export default function TransferTargetForm({ sourceStock, currentWarehouseId, activeTab, warehouses }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  
  // States
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [transferQty, setTransferQty] = useState('');
  
  // Dropdown Data
  const [lots, setLots] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  
  // Selected Coords
  const [selectedLot, setSelectedLot] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  // Loading UI
  const [loadingLots, setLoadingLots] = useState(false);
  const [loadingPos, setLoadingPos] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);

  // Logic: Determine Effective Warehouse ID
  const effectiveWhId = activeTab === 'INTERNAL' ? currentWarehouseId : targetWarehouseId;

  // 1. Fetch Lots when Warehouse Changes
  useEffect(() => {
    setLots([]); setPositions([]); setLevels([]);
    setSelectedLot(''); setSelectedPos(''); setSelectedLevel('');
    
    if (effectiveWhId) {
       setLoadingLots(true);
       getWarehouseLots(effectiveWhId)
         .then(setLots)
         .finally(() => setLoadingLots(false));
    }
  }, [effectiveWhId]);

  // 2. Fetch Positions when Lot Changes
  useEffect(() => {
    setPositions([]); setLevels([]);
    setSelectedPos(''); setSelectedLevel('');
    
    if (effectiveWhId && selectedLot) {
       setLoadingPos(true);
       getCartsByLot(effectiveWhId, selectedLot)
         .then(setPositions)
         .finally(() => setLoadingPos(false));
    }
  }, [effectiveWhId, selectedLot]);

  // 3. Fetch Levels when Position Changes
  useEffect(() => {
    setLevels([]);
    setSelectedLevel('');
    
    if (effectiveWhId && selectedLot && selectedPos) {
       setLoadingLevels(true);
       getLevelsByCart(effectiveWhId, selectedLot, selectedPos)
         .then(setLevels)
         .finally(() => setLoadingLevels(false));
    }
  }, [effectiveWhId, selectedLot, selectedPos]);

  // Submit Handler
  const handleSubmit = async () => {
     if (!sourceStock) return toast.error("กรุณาเลือกสินค้าต้นทาง");
     if (!selectedLevel) return toast.error("กรุณาระบุพิกัดปลายทางให้ครบ");
     
     const qty = Number(transferQty);
     if (!qty || qty <= 0 || qty > sourceStock.quantity) return toast.error("จำนวนสินค้าไม่ถูกต้อง");

     setSubmitting(true);
     const payload = {
        stockId: sourceStock.id,
        targetLot: selectedLot,
        targetCart: selectedPos,
        targetLevel: selectedLevel,
        transferQty: qty
     };

     let result;
     if (activeTab === 'INTERNAL') {
        result = await submitTransfer({ ...payload, warehouseId: currentWarehouseId });
     } else {
        if (!targetWarehouseId) { setSubmitting(false); return toast.error("กรุณาเลือกคลังปลายทาง"); }
        result = await submitCrossTransfer({ ...payload, sourceWarehouseId: currentWarehouseId, targetWarehouseId });
     }

     if (result.success) {
        toast.success(result.message);
        router.push(`/dashboard/${currentWarehouseId}/inventory`);
     } else {
        toast.error(result.message);
     }
     setSubmitting(false);
  };

  // Render Logic
  const isDisabled = !sourceStock;
  const theme = activeTab === 'INTERNAL' ? 'slate' : 'indigo'; // Button Theme

  return (
    <div className={`space-y-6 transition-all ${isDisabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
       <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
             <MapPin size={20} className="text-indigo-600" /> 2. ระบุปลายทาง
          </h3>

          {/* Cross Warehouse Select */}
          {activeTab === 'CROSS' && (
             <div className="mb-6">
                <label className="text-xs font-bold text-slate-400 mb-1 block">DESTINATION WAREHOUSE</label>
                <select 
                   aria-label="เลือกคลังปลายทาง"
                   className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                   value={targetWarehouseId}
                   onChange={e => setTargetWarehouseId(e.target.value)}
                >
                   <option value="">-- เลือกคลังสินค้า --</option>
                   {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                </select>
             </div>
          )}

          {/* 3 Steps Dropdowns */}
          <div className="grid grid-cols-3 gap-3 mb-6">
             <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">LOT</label>
                <div className="relative">
                   <select 
                      aria-label="เลือก Lot"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500"
                      value={selectedLot} onChange={e => setSelectedLot(e.target.value)}
                      disabled={loadingLots || (activeTab==='CROSS' && !targetWarehouseId)}
                   >
                      <option value="">-</option>
                      {lots.map(l => <option key={l} value={l}>{l}</option>)}
                   </select>
                   {loadingLots && <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14}/>}
                </div>
             </div>
             
             <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">POSITION</label>
                <div className="relative">
                   <select 
                      aria-label="เลือก Position"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500"
                      value={selectedPos} onChange={e => setSelectedPos(e.target.value)}
                      disabled={!selectedLot}
                   >
                      <option value="">-</option>
                      {positions.map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                   {loadingPos && <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14}/>}
                </div>
             </div>

             <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">LEVEL</label>
                <div className="relative">
                   <select 
                      aria-label="เลือก Level"
                      className={`w-full p-2.5 border-2 rounded-lg font-black text-sm outline-none ${selectedLevel ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-slate-50 border-slate-200'}`}
                      value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}
                      disabled={!selectedPos}
                   >
                      <option value="">-</option>
                      {levels.map((l:any) => <option key={l.id} value={l.level}>{l.level}</option>)}
                   </select>
                   {loadingLevels && <Loader2 className="absolute right-2 top-3 animate-spin text-slate-400" size={14}/>}
                </div>
             </div>
          </div>
          
          {/* Summary Label */}
          {selectedLevel && (
             <div className="mb-4 text-center text-emerald-600 bg-emerald-50 p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 size={14}/> Target: {selectedLot}-{selectedPos}-{selectedLevel}
             </div>
          )}

          {/* Quantity Input */}
          <div>
             <label className="text-xs font-bold text-slate-700 mb-2 block">QUANTITY</label>
             <div className="relative">
                <input 
                   type="number"
                   className="w-full text-3xl font-black text-slate-800 pl-4 pr-16 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10"
                   placeholder="0"
                   value={transferQty}
                   onChange={e => setTransferQty(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold bg-white px-2 py-1 rounded border text-slate-400">
                   {sourceStock?.products.uom || 'UNIT'}
                </span>
             </div>
          </div>
       </div>

       <button 
          onClick={handleSubmit}
          disabled={submitting || !selectedLevel || !transferQty}
          className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed
             ${activeTab === 'INTERNAL' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700'}`}
       >
          {submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          <span>ยืนยันการย้าย</span>
       </button>
    </div>
  );
}