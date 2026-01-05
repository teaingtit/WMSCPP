'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Save,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Plus,
  Trash2,
  ListChecks,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { submitBulkTransfer } from '@/actions/transfer-actions';
import { useRouter } from 'next/navigation';
import LocationSelector, { LocationData } from '../shared/LocationSelector';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
import { StockWithDetails } from '@/types/inventory';
import TransactionConfirmModal from '@/components/shared/TransactionConfirmModal';
import SuccessReceiptModal, { SuccessData } from '@/components/shared/SuccessReceiptModal';
// 1. เพิ่ม Type-safety เพื่อความชัดเจนและลดข้อผิดพลาด
interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface TransferQueueItem {
  id: string;
  sourceStock: StockWithDetails;
  targetLocation: LocationData;
  targetWarehouseId?: string; // For Cross
  qty: number;
  mode: 'INTERNAL' | 'CROSS';
}

interface Props {
  sourceStock: StockWithDetails | null; // ใช้ Type ที่ชัดเจนและอนุญาตให้เป็น null ได้
  currentWarehouseId: string;
  activeTab: 'INTERNAL' | 'CROSS';
  warehouses: Warehouse[]; // ใช้ Type ที่ชัดเจน
  onClearSelection?: () => void; // Callback เพื่อเคลียร์การเลือกสินค้าต้นทาง
}

export default function TransferTargetForm({
  sourceStock,
  currentWarehouseId,
  activeTab,
  warehouses,
  onClearSelection,
}: Props) {
  const router = useRouter();
  const { setIsLoading } = useGlobalLoading();
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // State for Success Modal
  const [successInfo, setSuccessInfo] = useState<{ data: SuccessData; redirect: boolean } | null>(
    null,
  );

  // State
  const [queue, setQueue] = useState<TransferQueueItem[]>([]);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [transferQty, setTransferQty] = useState('');

  const [selectedTargetLocation, setSelectedTargetLocation] = useState<LocationData | null>(null);
  const [resetKey, setResetKey] = useState(0); // Key to force reset LocationSelector

  const effectiveWhId = activeTab === 'INTERNAL' ? currentWarehouseId : targetWarehouseId;

  // Clear queue when switching tabs to avoid mixing Internal/Cross transfers
  useEffect(() => {
    setQueue([]);
  }, [activeTab]);

  const handleAddToQueue = (): void => {
    // --- 1. Validation (จัดกลุ่มการตรวจสอบให้ชัดเจน) ---
    if (!sourceStock) {
      toast.error('กรุณาเลือกสินค้าต้นทางก่อน');
      return;
    }
    if (!selectedTargetLocation) {
      toast.error('กรุณาระบุพิกัดปลายทาง');
      return;
    }
    const qty = Number(transferQty);
    if (!transferQty || qty <= 0) {
      toast.error('กรุณาระบุจำนวนที่ต้องการย้ายให้ถูกต้อง');
      return;
    }
    if (qty > sourceStock.quantity) {
      toast.error('จำนวนที่ย้ายเกินกว่าสินค้าคงคลัง');
      return;
    }

    // Check duplicate (Optional logic: allow same stock to different location)

    const newItem: TransferQueueItem = {
      id: Date.now().toString(),
      sourceStock: sourceStock,
      targetLocation: selectedTargetLocation,
      targetWarehouseId: activeTab === 'CROSS' ? targetWarehouseId : undefined,
      qty: qty,
      mode: activeTab,
    };

    setQueue((prev) => [...prev, newItem]);
    toast.success('เพิ่มลงรายการย้ายแล้ว');

    // Reset Form
    setTransferQty('');
    setSelectedTargetLocation(null);
    setResetKey((prev) => prev + 1);

    // Notify parent to clear selection if possible
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleConfirmAll = () => {
    if (queue.length === 0) return;
    setShowConfirm(true);
  };

  const processSubmit = async (redirect: boolean) => {
    // --- 2. Set Loading State ---
    setIsLoading(true);
    setSubmitting(true);
    setShowConfirm(false);

    try {
      // --- 3. Prepare Payload ---
      const payload = queue.map((item) => ({
        mode: item.mode,
        // Common fields
        stockId: item.sourceStock.id,
        targetLocationId: item.targetLocation.id,
        transferQty: item.qty,
        // Specific fields
        warehouseId: currentWarehouseId, // For Internal
        sourceWarehouseId: currentWarehouseId, // For Cross
        targetWarehouseId: item.targetWarehouseId, // For Cross
      }));

      // --- 4. Call Action ---
      const result = await submitBulkTransfer(payload);

      // --- 5. Handle Result ---
      if (result.success) {
        setQueue([]);
        setSuccessInfo({
          data: {
            title: 'บันทึกการย้ายสินค้าสำเร็จ',
            details: [
              { label: 'จำนวนรายการ', value: `${result.details.success} รายการ` },
              { label: 'เวลา', value: new Date().toLocaleString('th-TH') },
            ],
          },
          redirect: redirect,
        });
      } else {
        toast.error(`มีบางรายการล้มเหลว: ${result.message}`);
      }
    } catch (error: any) {
      console.error('Transfer Error:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการย้ายสินค้า');
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  const handleSuccessModalClose = () => {
    if (!successInfo) return;

    if (successInfo.redirect) {
      router.push(`/dashboard/${currentWarehouseId}/inventory`);
    } else {
      // For "Save & Continue", a page refresh is the safest way to ensure
      // the source stock data is up-to-date for the next operation.
      router.refresh();
    }
    setSuccessInfo(null); // Clear data and close modal
  };

  const isFormDisabled = !sourceStock;

  return (
    <div className="space-y-6">
      <div
        className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-200 transition-all ${
          isFormDisabled ? 'opacity-50 pointer-events-none grayscale' : ''
        }`}
      >
        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
          <MapPin size={20} className="text-indigo-600" /> 2. ระบุปลายทาง
        </h3>

        {activeTab === 'CROSS' && (
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-400 mb-1 block">
              DESTINATION WAREHOUSE
            </label>
            <select
              aria-label="เลือกคลังปลายทาง"
              className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={targetWarehouseId}
              onChange={(e) => {
                setTargetWarehouseId(e.target.value);
                setSelectedTargetLocation(null); // 2. UX Improvement: Reset location เมื่อเปลี่ยนคลัง
              }}
            >
              <option value="">-- เลือกคลังสินค้า --</option>
              {/* 3. UX Improvement: กรองคลังปัจจุบันออกเพื่อลดความสับสน */}
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

        <div className="mb-6">
          <LocationSelector
            warehouseId={effectiveWhId}
            onSelect={setSelectedTargetLocation}
            disabled={activeTab === 'CROSS' && !targetWarehouseId}
            key={`${effectiveWhId}-${resetKey}`} // 4. UX Improvement: ใช้ key เพื่อบังคับให้ component รีเซ็ต state
          />
        </div>

        {selectedTargetLocation && (
          <div className="mb-4 text-center text-emerald-600 bg-emerald-50 p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in zoom-in">
            <CheckCircle2 size={14} /> Target: {selectedTargetLocation.lot}-
            {selectedTargetLocation.cart}-{selectedTargetLocation.level}
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-700 mb-2 block">QUANTITY</label>
          <div className="relative">
            <input
              type="number"
              min="1" // 5. เพิ่ม min/max attribute เพื่อการ validation ที่ดีขึ้น
              max={sourceStock?.quantity}
              className="w-full text-3xl font-black text-slate-800 pl-4 pr-16 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10"
              placeholder="0"
              value={transferQty}
              onChange={(e) => setTransferQty(e.target.value)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold bg-white px-2 py-1 rounded border text-slate-400">
              {sourceStock?.product.uom || 'UNIT'}
            </span>
          </div>
          {/* Show Available Qty considering Queue? (Advanced feature) */}
        </div>

        <button
          onClick={handleAddToQueue}
          disabled={submitting || !selectedTargetLocation || !transferQty}
          className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  activeTab === 'INTERNAL'
                    ? 'bg-slate-900 hover:bg-slate-800'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
        >
          <Plus size={20} />
          <span>เพิ่มลงรายการย้าย</span>
        </button>
      </div>

      {/* Queue List Section */}
      {queue.length > 0 && (
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <ListChecks className="text-indigo-400" /> รายการรอโอนย้าย ({queue.length})
          </h3>

          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mb-6">
            {queue.map((item, idx) => (
              <div
                key={item.id}
                className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-start group"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="font-bold text-sm truncate text-slate-200">
                    {idx + 1}. {item.sourceStock.product.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-1">
                    <span className="bg-slate-700 px-1 rounded">
                      {item.sourceStock.location.code}
                    </span>
                    <ArrowRight size={12} />
                    <span className="bg-indigo-900/50 text-indigo-300 px-1 rounded border border-indigo-500/30">
                      {item.targetLocation.code}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className="text-indigo-400 font-black text-lg">{item.qty}</span>
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    aria-label="ลบรายการ"
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirmAll}
            disabled={submitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            ยืนยันการย้ายทั้งหมด
          </button>
        </div>
      )}

      <TransactionConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => processSubmit(true)}
        isLoading={submitting}
        title={
          activeTab === 'INTERNAL'
            ? 'ย้ายภายในคลัง (Internal Transfer)'
            : 'ย้ายข้ามคลัง (Cross Dock)'
        }
        type="TRANSFER"
        confirmText="ยืนยันการย้าย"
        details={
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">จำนวนรายการ</span>
              <span className="font-medium text-slate-900">{queue.length} รายการ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ประเภท</span>
              <span className="font-medium text-slate-900">
                {activeTab === 'INTERNAL' ? 'Internal Transfer' : 'Cross Transfer'}
              </span>
            </div>
          </div>
        }
      />

      {/* Success Modal */}
      <SuccessReceiptModal
        isOpen={!!successInfo}
        onClose={handleSuccessModalClose}
        data={successInfo?.data || null}
      />
    </div>
  );
}
