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
import { StockQuantityList, useBulkQuantities } from './StockQuantityList';

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
  const { quantities, handleQuantityChange, validateQuantities } = useBulkQuantities(items);

  const handleSubmit = async () => {
    if (!validateQuantities()) {
      notify.error('กรุณาระบุจำนวนที่ถูกต้อง (มากกว่า 0) ให้ครบทุกรายการ');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = items.map((item) => ({
        warehouseId: currentWarehouseId,
        stockId: item.id,
        qty: quantities[item.id],
        note: note,
      }));

      const result = await submitBulkOutbound(payload);

      if (result.success) {
        notify.ok(result);
        onSuccess();
        onClose();
      } else {
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
            <StockQuantityList
              items={items}
              quantities={quantities}
              onQuantityChange={handleQuantityChange}
            />
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
