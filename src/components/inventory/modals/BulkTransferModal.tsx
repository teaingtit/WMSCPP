'use client';

import { useState } from 'react';
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
import { StockQuantityList, useBulkQuantities } from './StockQuantityList';

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
  const { quantities, handleQuantityChange, validateQuantities } = useBulkQuantities(items);

  // Determine effective warehouse for location selector
  const effectiveWhId = mode === 'INTERNAL' ? currentWarehouseId : targetWarehouseId;

  const handleSubmit = async () => {
    if (!selectedLocation) {
      notify.error('กรุณาระบุตำแหน่งปลายทาง');
      return;
    }
    if (mode === 'CROSS' && !targetWarehouseId) {
      notify.error('กรุณาระบุคลังปลายทาง');
      return;
    }
    if (!validateQuantities()) {
      notify.error('กรุณาระบุจำนวนที่ถูกต้อง (มากกว่า 0) ให้ครบทุกรายการ');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = items.map((item) => ({
        mode,
        stockId: item.id,
        transferQty: quantities[item.id],
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
      <DialogContent className="sm:max-w-2xl max-h-dvh-90 flex flex-col">
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
