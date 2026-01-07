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
import { Truck, Loader2, Package } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { submitBulkOutbound } from '@/actions/outbound-actions';
import { notify } from '@/lib/ui-helpers';

interface BulkOutboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockWithDetails[];
  currentWarehouseId: string;
  onSuccess: () => void;
}

export const BulkOutboundModal = ({
  isOpen,
  onClose,
  items,
  currentWarehouseId,
  onSuccess,
}: BulkOutboundModalProps) => {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize quantities with full amount
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    items.forEach((item) => {
      initial[item.id] = item.quantity;
    });
    return initial;
  });

  const handleQtyChange = (id: string, val: string, max: number) => {
    const num = Number(val);
    if (num < 0) return;
    setQuantities((prev) => ({ ...prev, [id]: num > max ? max : num }));
  };

  const handleSubmit = async () => {
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
        warehouseId: currentWarehouseId,
        stockId: item.id,
        qty: quantities[item.id], // Use edited quantity
        note: note,
      }));

      const result = await submitBulkOutbound(payload);

      if (result.success) {
        notify.ok(result);
        onSuccess();
        onClose();
      } else {
        // Show first error or generic message
        const errorMsg =
          result.details?.errors && result.details.errors.length > 0
            ? result.details.errors[0]
            : 'เกิดข้อผิดพลาดในการทำรายการ';
        notify.error(errorMsg);
      }
    } catch (error: any) {
      notify.error(error.message || 'เกิดข้อผิดพลาดในการทำรายการ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <Truck size={20} />
            ยืนยันการเบิกจ่ายสินค้า (Outbound)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-2">
          {/* Note Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <label className="text-xs font-bold text-slate-500 mb-2 block">
              หมายเหตุ / เลขที่ใบเบิก / Reference
            </label>
            <textarea
              className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500/20 outline-none"
              rows={3}
              placeholder="ระบุสาเหตุการเบิกจ่าย หรือหมายเลขอ้างอิง..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
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
                      เบิกจำนวน / {item.quantity}
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
                        className="w-full text-right p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-rose-500/20 outline-none"
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
            disabled={isSubmitting}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            ยืนยันการเบิกจ่าย ({items.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
