'use client';

import React from 'react';
import { X, ArrowRightLeft, Truck, Package, MapPin, Calendar, Ruler } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StockWithDetails } from '@/types/inventory'; // ✅ Import Type กลาง

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockWithDetails | null; // ✅ ใช้ Type ที่ถูกต้อง
  warehouseId: string;
}

export default function StockDetailModal({
  isOpen,
  onClose,
  item,
  warehouseId,
}: StockDetailModalProps) {
  const router = useRouter();

  if (!isOpen || !item) return null;

  // Note: When changing URL parameters, ensure the destination pages
  // (`/transfer`, `/outbound`) are updated to expect the new parameter names.
  const handleAction = (action: 'transfer' | 'outbound') => {
    const params = new URLSearchParams({
      sku: item.product?.sku || '',
      // Suggestion 2 & 3: Use unique IDs for robustness and clearer naming.
      stockId: item.id, // `item.id` is already a string from the page component.
      locationId: String(item.location?.id ?? ''), // `locations.id` is likely a number.
    });
    router.push(`/dashboard/${warehouseId}/${action}?${params.toString()}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      // Suggestion 1: Improve accessibility with ARIA roles for screen readers.
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-detail-modal-title"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="relative h-32 bg-indigo-600 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 text-center text-white">
            <Package size={48} className="mx-auto mb-2 opacity-90" />
            <h2 id="stock-detail-modal-title" className="text-xl font-bold">
              {item.product?.sku || 'Unknown SKU'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-3 right-3 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90 touch-manipulation"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-1">
              {item.product?.name || 'Unknown Product'}
            </h3>

            <div className="flex items-center justify-center gap-3 my-3">
              <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center min-w-[4rem]">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Lot</span>
                <span className="font-bold text-slate-700">{item.lot || '-'}</span>
              </div>
              <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center min-w-[4rem]">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Pos</span>
                <span className="font-bold text-slate-700">{item.cart || '-'}</span>
              </div>
              <div className="px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 flex flex-col items-center min-w-[4rem]">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Level</span>
                <span className="font-bold text-indigo-700">{item.level || '-'}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <MapPin size={12} /> {item.location?.code || 'Unassigned'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-400 uppercase font-bold">Available Qty</span>
              <div className="text-2xl font-black text-indigo-600">
                {item.quantity.toLocaleString()}{' '}
                <span className="text-sm font-normal text-slate-500">{item.product?.uom}</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1">
                  <Calendar size={12} /> Updated
                </span>
                <span className="font-bold text-slate-700">
                  {new Date(item.updated_at).toLocaleDateString('th-TH')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleAction('transfer')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-50 text-amber-700 font-bold hover:bg-amber-100 active:bg-amber-200 active:scale-[0.98] transition-all touch-manipulation"
            >
              <ArrowRightLeft size={18} /> Transfer
            </button>
            <button
              onClick={() => handleAction('outbound')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:bg-indigo-800 active:scale-[0.98] shadow-lg shadow-indigo-200 transition-all touch-manipulation"
            >
              <Truck size={18} /> Outbound
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
