'use client';

import React from 'react';
import { X, ArrowRightLeft, Truck, Package, MapPin, Calendar, Ruler } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StockData {
  id: string;
  quantity: number;
  updated_at: string;
  products: {
    sku: string;
    name: string;
    uom: string;
    category_id: string;
    min_stock: number;
  };
  locations: {
    code: string;
  };
}

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 🟢 เปลี่ยนจาก any เป็น Type ที่ถูกต้อง
  item: StockData | null; 
  warehouseId: string;
}

export default function StockDetailModal({ isOpen, onClose, item, warehouseId }: StockDetailModalProps) {
  const router = useRouter();

  if (!isOpen || !item) return null;

  const handleAction = (action: 'transfer' | 'outbound') => {
    const params = new URLSearchParams({
      sku: item.products.sku,
      batchId: item.id,
      location: item.locations.code
    });
    router.push(`/dashboard/${warehouseId}/${action}?${params.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative h-32 bg-indigo-600 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 text-center text-white">
             <Package size={48} className="mx-auto mb-2 opacity-90" />
             <h2 className="text-xl font-bold">{item.products.sku}</h2>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Close modal"
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-1">{item.products.name}</h3>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              <MapPin size={12} /> {item.locations.code}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 uppercase font-bold">Available Qty</span>
                <div className="text-2xl font-black text-indigo-600">
                  {item.quantity.toLocaleString()} <span className="text-sm font-normal text-slate-500">{item.products.uom}</span>
                </div>
             </div>
             <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                   <span className="text-slate-500 flex items-center gap-1"><Ruler size={12}/> Min Stock</span>
                   <span className="font-bold text-slate-700">{item.products.min_stock || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                   <span className="text-slate-500 flex items-center gap-1"><Calendar size={12}/> Updated</span>
                   <span className="font-bold text-slate-700">{new Date(item.updated_at).toLocaleDateString('th-TH')}</span>
                </div>
             </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={() => handleAction('transfer')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-50 text-amber-700 font-bold hover:bg-amber-100 transition-colors"
            >
              <ArrowRightLeft size={18} /> Transfer
            </button>
            <button 
              onClick={() => handleAction('outbound')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
            >
              <Truck size={18} /> Outbound
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}