'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Save,
  Loader2,
  ArrowRight,
  Plus,
  Trash2,
  X,
  ListChecks,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { submitBulkTransfer, preflightBulkTransfer } from '@/actions/transfer-actions';
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
  targetLocation: LocationData | null;
  targetWarehouseId: string | undefined; // For Cross (explicitly allow undefined for exactOptionalPropertyTypes)
  qty: number;
  mode: 'INTERNAL' | 'CROSS';
}

interface Props {
  sourceStock: StockWithDetails | null; // ใช้ Type ที่ชัดเจนและอนุญาตให้เป็น null ได้
  currentWarehouseId: string;
  activeTab: 'INTERNAL' | 'CROSS';
  warehouses: Warehouse[]; // ใช้ Type ที่ชัดเจน
  onClearSelection?: () => void; // Callback เพื่อเคลียร์การเลือกสินค้าต้นทาง
  prefilledStocks?: any[] | null;
  incomingStocks?: any[] | null;
  onConsumeIncoming?: () => void;
}

export default function TransferTargetForm({
  sourceStock,
  currentWarehouseId,
  activeTab,
  warehouses,
  onClearSelection,
  prefilledStocks,
  incomingStocks,
  onConsumeIncoming,
}: Props) {
  const router = useRouter();
  const { setIsLoading } = useGlobalLoading();
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'INTERNAL' | 'CROSS' | null>(null);
  // State for Success Modal
  const [successInfo, setSuccessInfo] = useState<{ data: SuccessData; redirect: boolean } | null>(
    null,
  );

  // State
  const [queue, setQueue] = useState<TransferQueueItem[]>([]);
  const [activeQueueItemId, setActiveQueueItemId] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<Record<string, any> | null>(null);
  const [previewSummary, setPreviewSummary] = useState<any | null>(null);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [transferQty, setTransferQty] = useState('');

  const [selectedTargetLocation, setSelectedTargetLocation] = useState<LocationData | null>(null);
  const [resetKey, setResetKey] = useState(0); // Key to force reset LocationSelector
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<number | ''>('');
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null);

  const effectiveWhId = activeTab === 'INTERNAL' ? currentWarehouseId : targetWarehouseId;

  // Clear queue when switching tabs to avoid mixing Internal/Cross transfers
  useEffect(() => {
    setQueue([]);
  }, [activeTab]);

  // Prefill queue when prefilledStocks provided
  useEffect(() => {
    if (!prefilledStocks || prefilledStocks.length === 0) return;
    const items = prefilledStocks.map((stock: any, idx: number) => {
      return {
        id: `prefill-${Date.now()}-${idx}`,
        sourceStock: stock,
        targetLocation: null,
        targetWarehouseId: activeTab === 'CROSS' ? undefined : undefined,
        qty: 1,
        mode: activeTab,
      } as TransferQueueItem;
    });
    setQueue((prev) => {
      const existing = new Set(prev.map((p) => p.sourceStock.id));
      const toAdd = items.filter((it: TransferQueueItem) => !existing.has(it.sourceStock.id));
      return [...prev, ...toAdd];
    });
  }, [prefilledStocks]);

  // Handle incoming stocks added from Source Selector
  useEffect(() => {
    if (!incomingStocks || incomingStocks.length === 0) return;
    const items = incomingStocks.map(
      (stock: any, idx: number) =>
        ({
          id: `in-${Date.now()}-${idx}`,
          sourceStock: stock,
          targetLocation: null,
          targetWarehouseId: undefined,
          qty: 1,
          mode: activeTab,
        } as TransferQueueItem),
    );

    setQueue((prev) => {
      const existing = new Set(prev.map((p) => p.sourceStock.id));
      const toAdd = items.filter((it: TransferQueueItem) => !existing.has(it.sourceStock.id));
      return [...prev, ...toAdd];
    });

    // Notify parent to clear its incoming buffer
    if (onConsumeIncoming) onConsumeIncoming();
  }, [incomingStocks]);

  const assignTargetToAll = (loc: LocationData) => {
    if (!loc) return;
    setQueue((prev) => prev.map((it) => (it.targetLocation ? it : { ...it, targetLocation: loc })));
    toast.success('กำหนดปลายทางให้รายการทั้งหมดแล้ว');
  };

  const openEditPanel = (itemId: string) => {
    const it = queue.find((q) => q.id === itemId);
    if (!it) return;
    setEditingItemId(itemId);
    setEditingQty(it.qty);
    setEditingLocation(it.targetLocation || null);
  };

  const saveEditPanel = () => {
    if (!editingItemId) return;
    updateQueueItem(editingItemId, {
      qty: Number(editingQty) || 0,
      targetLocation: editingLocation,
    });
    // clear preview for this stock so user can re-run preview
    setPreviewResults((prev) => {
      if (!prev) return prev;
      const copy = { ...prev };
      const stockId = queue.find((q) => q.id === editingItemId)?.sourceStock.id;
      if (stockId && copy[stockId]) delete copy[stockId];
      return copy;
    });
    setEditingItemId(null);
    setEditingQty('');
    setEditingLocation(null);
  };

  const closeEditPanel = () => {
    setEditingItemId(null);
    setEditingQty('');
    setEditingLocation(null);
  };

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

  const updateQueueItem = (id: string, patch: Partial<TransferQueueItem>) => {
    setQueue((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const handleConfirmAll = () => {
    if (queue.length === 0) return;
    setShowConfirm(true);
  };

  const handleDoInternal = () => {
    if (queue.length === 0) return;
    // set all items to INTERNAL
    setQueue((prev) => prev.map((it) => ({ ...it, mode: 'INTERNAL' } as TransferQueueItem)));
    setPendingAction('INTERNAL');
    setShowConfirm(true);
  };

  const handleDoCross = () => {
    if (queue.length === 0) return;
    setQueue((prev) => prev.map((it) => ({ ...it, mode: 'CROSS' } as TransferQueueItem)));
    setPendingAction('CROSS');
    setShowConfirm(true);
  };

  const handleSendToOutbound = () => {
    if (queue.length === 0) return;
    const ids = queue.map((it) => it.sourceStock.id).join(',');
    // Redirect to Outbound page with ids param to prefill outbound queue
    router.push(`/dashboard/${currentWarehouseId}/outbound?ids=${encodeURIComponent(ids)}`);
  };

  const processSubmit = async (redirect: boolean) => {
    // --- 2. Set Loading State ---
    setIsLoading(true);
    setSubmitting(true);
    setShowConfirm(false);

    try {
      // Validate queued items have target locations
      const missing = queue.find(
        (it) => !it.targetLocation || !it.targetLocation.id || it.qty <= 0,
      );
      if (pendingAction === 'CROSS') {
        const missingWh = queue.find((it) => !it.targetWarehouseId);
        if (missingWh) {
          toast.error('กรุณาระบุคลังปลายทางสำหรับการย้ายข้ามคลัง');
          setIsLoading(false);
          setSubmitting(false);
          return;
        }
      }
      if (missing) {
        toast.error('กรุณาระบุปลายทางและจำนวนที่ถูกต้องสำหรับทุกรายการในคิว');
        setIsLoading(false);
        setSubmitting(false);
        return;
      }
      // --- 3. Preflight: validate latest state before committing ---
      const preflightPayload = queue.map((item) => ({
        sourceStock: { id: item.sourceStock.id },
        qty: item.qty,
        targetLocation: item.targetLocation ? { id: item.targetLocation.id } : null,
        mode: item.mode,
      }));

      const pre = await preflightBulkTransfer(preflightPayload as any);
      const okCount = pre.summary?.ok ?? (pre.results || []).filter((r: any) => r.ok).length;
      const total = pre.summary?.total ?? (pre.results || []).length;
      setPreviewResults(
        (pre.results || []).reduce((acc: Record<string, any>, r: any) => {
          if (r.stockId) acc[r.stockId] = r;
          return acc;
        }, {} as Record<string, any>),
      );
      setPreviewSummary(pre.summary || { total, ok: okCount });

      if (okCount < total) {
        toast.error('มีรายการที่ไม่ผ่านการตรวจสอบก่อนส่ง กรุณาแก้ไขก่อนส่ง');
        setIsLoading(false);
        setSubmitting(false);
        return;
      }

      // --- 4. Prepare Payload and Call Action ---
      const payload = queue.map((item) => ({
        mode: item.mode,
        // Common fields
        stockId: item.sourceStock.id,
        targetLocationId: item.targetLocation!.id,
        transferQty: item.qty,
        // Specific fields
        warehouseId: currentWarehouseId, // For Internal
        sourceWarehouseId: currentWarehouseId, // For Cross
        targetWarehouseId: item.targetWarehouseId, // For Cross
      }));

      // --- 5. Call Action ---
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
      setPendingAction(null);
    }
  };

  const handlePreview = async () => {
    if (queue.length === 0) return;
    setIsLoading(true);
    try {
      const payload = queue.map((item) => ({
        sourceStock: { id: item.sourceStock.id },
        qty: item.qty,
        targetLocation: item.targetLocation ? { id: item.targetLocation.id } : null,
        mode: item.mode,
      }));

      const res = await preflightBulkTransfer(payload as any);
      // Map results by stockId for quick lookup
      const map: Record<string, any> = {};
      (res.results || []).forEach((r: any) => {
        if (r.stockId) map[r.stockId] = r;
      });
      setPreviewResults(map);
      setPreviewSummary(res.summary || null);
      toast.success('ตรวจสอบสถานะเรียบร้อย — ดู badge ในแต่ละรายการ');
    } catch (err: any) {
      console.error('Preflight Error', err);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบ');
    } finally {
      setIsLoading(false);
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

        {/* Action buttons: ทำรายการ ย้ายในคลัง / ย้ายข้ามคลัง / จ่ายออก */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleDoInternal}
            className="px-3 py-2 bg-amber-50 text-amber-700 rounded-lg font-bold hover:bg-amber-100"
          >
            ย้ายในคลัง
          </button>
          <button
            onClick={handleDoCross}
            className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold hover:bg-indigo-100"
          >
            ย้ายข้ามคลัง
          </button>
          <button
            onClick={handleSendToOutbound}
            className="ml-auto px-3 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700"
          >
            จ่ายออก
          </button>
        </div>

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
          {/* Bulk-assign button: กรณีมีคิว ให้สามารถกำหนดปลายทางให้ทั้งหมดได้ */}
          {selectedTargetLocation && queue.length > 0 && (
            <div className="mt-3 text-right">
              <button
                onClick={() => assignTargetToAll(selectedTargetLocation)}
                className="px-3 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700"
              >
                กำหนดปลายทางให้ทั้งหมด
              </button>
            </div>
          )}
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
              {sourceStock?.product?.uom || 'UNIT'}
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
            {queue.map((item, idx) => {
              const hasQtyError = item.qty <= 0 || item.qty > item.sourceStock.quantity;
              const hasTargetError = !item.targetLocation || !item.targetLocation.id;
              const itemError =
                hasQtyError || hasTargetError || (item.mode === 'CROSS' && !item.targetWarehouseId);

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveQueueItemId(item.id)}
                  className={`bg-slate-800 p-3 rounded-xl border border-slate-700 flex flex-col gap-3 group ${
                    activeQueueItemId === item.id ? 'ring-2 ring-indigo-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-sm truncate text-slate-200">
                        {idx + 1}. {item.sourceStock.name || item.sourceStock.product?.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                        <span className="bg-slate-700 px-1 rounded">
                          {item.sourceStock.location?.code || '-'}
                        </span>
                        <ArrowRight size={12} />
                        <span className="bg-indigo-900/50 text-indigo-300 px-1 rounded border border-indigo-500/30">
                          {item.targetLocation?.code || 'ยังไม่ได้ระบุปลายทาง'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {itemError && (
                        <span className="text-rose-400 text-xs font-bold mr-2">มีข้อผิดพลาด</span>
                      )}
                      {/* Preview badge */}
                      {previewResults &&
                        previewResults[item.sourceStock.id] &&
                        (() => {
                          const p = previewResults[item.sourceStock.id];
                          if (p.ok)
                            return (
                              <span className="text-emerald-300 text-xs font-bold mr-2">OK</span>
                            );
                          return (
                            <span className="text-rose-300 text-xs font-bold mr-2">
                              {p.reason || 'ไม่ผ่าน'}
                            </span>
                          );
                        })()}
                      {/* Edit button when preview shows failure */}
                      {previewResults &&
                        previewResults[item.sourceStock.id] &&
                        !previewResults[item.sourceStock.id].ok && (
                          <button
                            onClick={() => openEditPanel(item.id)}
                            className="text-amber-300 text-xs font-bold mr-2 px-2 py-1 bg-amber-800/10 rounded"
                          >
                            แก้ไข
                          </button>
                        )}
                      <input
                        type="number"
                        aria-label={`จำนวนสำหรับรายการ ${idx + 1}`}
                        placeholder="จำนวน"
                        min={1}
                        max={item.sourceStock.quantity}
                        value={String(item.qty)}
                        onChange={(e) =>
                          updateQueueItem(item.id, { qty: Number(e.target.value) || 0 })
                        }
                        className="w-20 text-right bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-white"
                      />
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        aria-label="ลบรายการ"
                        className="text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-col sm:flex-row">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">
                        ปลายทางสำหรับรายการนี้
                      </label>
                      <LocationSelector
                        warehouseId={
                          activeTab === 'CROSS' ? item.targetWarehouseId || '' : currentWarehouseId
                        }
                        onSelect={(loc) => {
                          updateQueueItem(item.id, { targetLocation: loc });
                          setActiveQueueItemId(item.id);
                        }}
                        disabled={activeTab === 'CROSS' && !targetWarehouseId}
                        key={`loc-${item.id}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleConfirmAll}
            disabled={submitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            ยืนยันการย้ายทั้งหมด
          </button>
          <div className="mt-3 flex gap-3">
            <button
              onClick={handlePreview}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold"
            >
              ตรวจสอบ (Preview)
            </button>
            <div className="w-48 text-right text-sm text-amber-200">
              {previewSummary && (
                <div>
                  ผลการตรวจสอบ: {previewSummary.ok || 0} / {previewSummary.total}
                </div>
              )}
            </div>
          </div>
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

      {/* Right-side Edit Panel */}
      {editingItemId &&
        (() => {
          const item = queue.find((q) => q.id === editingItemId);
          if (!item) return null;
          return (
            <div className="fixed right-6 top-16 w-96 h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-50 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">แก้ไขรายการ</h4>
                <button onClick={closeEditPanel} className="text-slate-500 hover:text-slate-700">
                  <X />
                </button>
              </div>

              <div className="text-sm text-slate-600 mb-3">
                <div className="font-medium">สินค้า</div>
                <div className="text-slate-500">
                  {item.sourceStock.name || item.sourceStock.product?.name}
                </div>
              </div>

              <label className="text-xs font-bold text-slate-700 mb-2 block">จำนวน</label>
              <input
                type="number"
                min={1}
                max={item.sourceStock.quantity}
                value={String(editingQty)}
                onChange={(e) => setEditingQty(Number(e.target.value) || 0)}
                className="w-full text-2xl font-black text-slate-800 pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none mb-4"
              />

              <div className="mb-4">
                <label className="text-xs font-bold text-slate-700 mb-2 block">ปลายทาง</label>
                <LocationSelector
                  warehouseId={
                    activeTab === 'CROSS' ? item.targetWarehouseId || '' : currentWarehouseId
                  }
                  onSelect={(loc) => setEditingLocation(loc)}
                  key={`edit-loc-${editingItemId}-${resetKey}`}
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => saveEditPanel()}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  บันทึกการแก้ไข
                </button>
                <button
                  onClick={closeEditPanel}
                  className="py-3 px-4 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
