'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Loader2, Package } from 'lucide-react';
import LocationSelector, { LocationData } from '@/components/shared/LocationSelector';
import { StockWithDetails } from '@/types/inventory';
import { submitBulkTransfer } from '@/actions/transfer-actions';
import { notify } from '@/lib/ui-helpers';

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface BulkTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockWithDetails[];
  currentWarehouseId: string;
  warehouses: Warehouse[];
  mode: 'INTERNAL' | 'CROSS';
  onSuccess: () => void;
}

export const BulkTransferModal = ({
  isOpen,
  onClose,
  items,
  currentWarehouseId,
  warehouses,
  mode,
  onSuccess,
}: BulkTransferModalProps) => {
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize quantities with full amount
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    items.forEach((item) => {
      initial[item.id] = item.quantity;
    });
    return initial;
  });

  // Determine effective warehouse for location selector
  const effectiveWhId = mode === 'INTERNAL' ? currentWarehouseId : targetWarehouseId;

  const handleQtyChange = (id: string, val: string, max: number) => {
    const num = Number(val);
    if (num < 0) return;
    // Allow going above max? No, should restrict.
    setQuantities((prev) => ({ ...prev, [id]: num > max ? max : num }));
  };

  const handleSubmit = async () => {
    if (!selectedLocation) {
      notify.error('กรุณาระบุตำแหน่งปลายทาง');
      return;
    }
    if (mode === 'CROSS' && !targetWarehouseId) {
      notify.error('กรุณาระบุคลังปลายทาง');
      return;
    }

    // Validate quantities
    const invalidItem = items.find((item) => {
      const qty = quantities[item.id];
      return !qty || qty <= 0;
    });
    if (invalidItem) {
      notify.error('กรุณาระบุจำนวนที่ถูกต้อง (มากกว่า 0) ให้ครบทุกรายการ');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = items.map((item) => ({
        mode,
        stockId: item.id,
        transferQty: quantities[item.id], // Use edited quantity
        targetLocationId: selectedLocation.id,
        warehouseId: currentWarehouseId,
        sourceWarehouseId: currentWarehouseId,
        targetWarehouseId: mode === 'CROSS' ? targetWarehouseId : undefined,
      }));

      const result = await submitBulkTransfer(payload);

      if (result.success) {
        notify.ok(result);
        onSuccess();
        onClose();
      } else {
        // Show first error or generic message
        const errorMsg =
          result.details?.errors && result.details.errors.length > 0
            ? result.details.errors[0]
            : result.message || 'เกิดข้อผิดพลาด';
        notify.error(errorMsg);
      }
    } catch (error: any) {
      notify.error(error.message || 'เกิดข้อผิดพลาดในการย้ายสินค้า');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <ArrowRightLeft size={20} />
            {mode === 'INTERNAL' ? 'ย้ายตำแหน่งภายในคลัง' : 'ย้ายข้ามคลังสินค้า'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-2">
          {/* Target Section */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {mode === 'CROSS' && (
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  คลังสินค้าปลายทาง
                </label>
                <select
                  aria-label="Select destination warehouse"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={targetWarehouseId}
                  onChange={(e) => {
                    setTargetWarehouseId(e.target.value);
                    setSelectedLocation(null);
                  }}
                >
                  <option value="">-- เลือกคลังปลายทาง --</option>
                  {warehouses
                    .filter((w) => w.id !== currentWarehouseId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div
              className={
                mode === 'CROSS' && !targetWarehouseId ? 'opacity-50 pointer-events-none' : ''
              }
            >
              <label className="text-xs font-bold text-slate-500 mb-1 block">ตำแหน่งปลายทาง</label>
              <LocationSelector warehouseId={effectiveWhId} onSelect={setSelectedLocation} />
            </div>
          </div>

          {/* Items List */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Package size={16} /> รายการสินค้า ({items.length})
            </h4>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-3 border border-slate-100 rounded-xl bg-white shadow-sm"
                >
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.product?.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package size={18} className="text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">
                      {item.product?.name || 'Unknown Product'}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span className="font-mono">{item.product?.sku}</span>
                      <span className="w-px h-3 bg-slate-300"></span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                        {item.location?.code}
                      </span>
                    </div>
                  </div>

                  <div className="w-32">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 text-right">
                      ย้ายจำนวน / {item.quantity}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        aria-label={`Quantity for ${item.product?.name || item.id}`}
                        placeholder="0"
                        min={1}
                        max={item.quantity}
                        value={quantities[item.id] ?? item.quantity}
                        onChange={(e) => handleQtyChange(item.id, e.target.value, item.quantity)}
                        className="w-full text-right p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">
                        {item.product?.uom}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedLocation || (mode === 'CROSS' && !targetWarehouseId)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            ยืนยันการย้าย ({items.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
