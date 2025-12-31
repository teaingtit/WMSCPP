'use client';

import React, { useState } from 'react';
import { MapPin, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { submitTransfer, submitCrossTransfer } from '@/actions/transfer-actions';
import { useRouter } from 'next/navigation';
import LocationSelector, { LocationData } from '../shared/LocationSelector';

interface Props {
  sourceStock: any;
  currentWarehouseId: string;
  activeTab: 'INTERNAL' | 'CROSS';
  warehouses: any[]; 
}

export default function TransferTargetForm({ sourceStock, currentWarehouseId, activeTab, warehouses }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  
  // State 
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [transferQty, setTransferQty] = useState('');
  
  // ✅ เปลี่ยนจากเก็บ lots/pos/levels แยกกัน มาเก็บแค่ผลลัพธ์สุดท้าย
  const [selectedTargetLocation, setSelectedTargetLocation] = useState<LocationData | null>(null);

  // Logic: คำนวณ Warehouse ปลายทาง
  const effectiveWhId = activeTab === 'INTERNAL' ? currentWarehouseId : targetWarehouseId;

  const handleSubmit = async () => {
     if (!sourceStock) return toast.error("กรุณาเลือกสินค้าต้นทาง");
     
     // ✅ ตรวจสอบจาก Object ที่ได้จาก Component ใหม่
     if (!selectedTargetLocation) return toast.error("กรุณาระบุพิกัดปลายทางให้ครบ");
     
     const qty = Number(transferQty);
     if (!qty || qty <= 0 || qty > sourceStock.quantity) return toast.error("จำนวนสินค้าไม่ถูกต้อง");

     setSubmitting(true);
     const payload = {
        stockId: sourceStock.id,
        targetLot: selectedTargetLocation.lot,
        targetCart: selectedTargetLocation.cart,
        targetLevel: selectedTargetLocation.level, // ส่ง Level string ไปตาม API เดิม
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

  const isDisabled = !sourceStock;

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

          {/* ✅ เรียกใช้ LocationSelector (แทน Dropdowns 3 อันเดิม) */}
          <div className="mb-6">
            <LocationSelector 
                warehouseId={effectiveWhId}
                onSelect={(loc) => setSelectedTargetLocation(loc)}
                disabled={activeTab === 'CROSS' && !targetWarehouseId}
            />
          </div>
          
          {/* Summary Label */}
          {selectedTargetLocation && (
             <div className="mb-4 text-center text-emerald-600 bg-emerald-50 p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in zoom-in">
                <CheckCircle2 size={14}/> Target: {selectedTargetLocation.lot}-{selectedTargetLocation.cart}-{selectedTargetLocation.level}
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
          disabled={submitting || !selectedTargetLocation || !transferQty}
          className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed
             ${activeTab === 'INTERNAL' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700'}`}
       >
          {submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          <span>ยืนยันการย้าย</span>
       </button>
    </div>
  );
}