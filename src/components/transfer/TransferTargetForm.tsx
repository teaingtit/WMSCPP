'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, ArrowRight, Trash2, X, ListChecks, Eye, Box, MapPin } from 'lucide-react';
import { notify } from '@/lib/ui-helpers';
import { submitBulkTransfer, preflightBulkTransfer } from '@/actions/transfer-actions';
import LocationSelector, { LocationData } from '../shared/LocationSelector';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
import { StockWithDetails } from '@/types/inventory';
import TransactionConfirmModal from '@/components/shared/TransactionConfirmModal';
import SuccessReceiptModal from '@/components/shared/SuccessReceiptModal';
import useTransactionFlow from '@/hooks/useTransactionFlow';

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
  targetWarehouseId: string | null; // Use null when not set
  qty: number;
  mode: 'INTERNAL' | 'CROSS';
}

interface Props {
  sourceStock: StockWithDetails | null; // ใช้ Type ที่ชัดเจนและอนุญาตให้เป็น null ได้
  currentWarehouseId: string;
  activeTab: 'INTERNAL' | 'CROSS';
  warehouses: Warehouse[]; // ใช้ Type ที่ชัดเจน
  onClearSelection?: () => void; // Callback เพื่อเคลียร์การเลือกสินค้าต้นทาง
  prefilledStocks?: StockWithDetails[] | null;
  incomingStocks?: StockWithDetails[] | null;
  onConsumeIncoming?: () => void;
}
// simple uid generator for deterministic unique ids in tests
let __uid = 0;

interface PreflightResult {
  stockId: string;
  ok: boolean;
  reason?: string;
}

export default function TransferTargetForm({
  currentWarehouseId,
  activeTab,
  prefilledStocks,
  incomingStocks,
  onConsumeIncoming,
}: Props) {
  const { setIsLoading } = useGlobalLoading();
  const [submitting, setSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<'INTERNAL' | 'CROSS' | null>(null);

  const executor = async (redirect = true) => {
    setIsLoading(true);
    try {
      // Validate queued items have target locations
      const missing = queue.find(
        (it) => !it.targetLocation || !it.targetLocation.id || it.qty <= 0,
      );
      if (pendingAction === 'CROSS') {
        const missingWh = queue.find((it) => !it.targetWarehouseId);
        if (missingWh) {
          return { success: false, message: 'กรุณาระบุคลังปลายทางสำหรับการย้ายข้ามคลัง' };
        }
      }
      if (missing) {
        return {
          success: false,
          message: 'กรุณาระบุปลายทางและจำนวนที่ถูกต้องสำหรับทุกรายการในคิว',
        };
      }

      // ✅ Validate: Prevent transfer to same location
      const sameLocation = queue.find(
        (it) => it.targetLocation && it.sourceStock.location?.id === it.targetLocation.id,
      );
      if (sameLocation) {
        return {
          success: false,
          message: 'ไม่สามารถย้ายไปยังตำแหน่งเดิมได้ กรุณาเลือกตำแหน่งปลายทางอื่น',
        };
      }

      // Preflight
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
        return { success: false, message: 'มีรายการที่ไม่ผ่านการตรวจสอบก่อนส่ง กรุณาแก้ไขก่อนส่ง' };
      }

      // Prepare payload
      const payload = queue.map((item) => ({
        mode: item.mode,
        stockId: item.sourceStock.id,
        targetLocationId: item.targetLocation!.id,
        transferQty: item.qty,
        warehouseId: currentWarehouseId,
        sourceWarehouseId: currentWarehouseId,
        targetWarehouseId: item.targetWarehouseId,
      }));

      const result = await submitBulkTransfer(payload);

      if (result.success) {
        return {
          success: true,
          data: {
            title: 'บันทึกการย้ายสินค้าสำเร็จ',
            details: [
              { label: 'จำนวนรายการ', value: `${result.details.success} รายการ` },
              { label: 'เวลา', value: new Date().toLocaleString('th-TH') },
            ],
          },
          redirect,
        } as const;
      }

      return { success: false, message: result.message || 'มีบางรายการล้มเหลว' };
    } finally {
      setIsLoading(false);
      setPendingAction(null);
    }
  };

  const {
    isOpen,
    isLoading,
    openConfirm,
    closeConfirm,
    execute,
    successInfo,
    handleSuccessModalClose,
  } = useTransactionFlow(executor, (info) =>
    info?.redirect ? `/dashboard/${currentWarehouseId}/inventory` : undefined,
  );

  // State
  const [queue, setQueue] = useState<TransferQueueItem[]>([]);
  const [activeQueueItemId, setActiveQueueItemId] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<Record<string, PreflightResult> | null>(
    null,
  );
  const [previewSummary, setPreviewSummary] = useState<{ total: number; ok: number } | null>(null);
  const [targetWarehouseId, setTargetWarehouseId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0); // Key to force reset LocationSelector
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<number | ''>('');
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkLocation, setBulkLocation] = useState<LocationData | null>(null);

  const effectiveWhId = activeTab === 'INTERNAL' ? currentWarehouseId : targetWarehouseId ?? '';

  // Clear queue when switching tabs to avoid mixing Internal/Cross transfers
  useEffect(() => {
    setQueue([]);
    // reset selected target and target warehouse when switching tabs
    setTargetWarehouseId(null);
    // resetKey may be used by child selectors
    setResetKey((k) => k + 1);
  }, [activeTab]);

  // Prefill queue when prefilledStocks provided
  useEffect(() => {
    if (!prefilledStocks || prefilledStocks.length === 0) return;
    const items = prefilledStocks.map((stock: any, idx: number) => {
      return {
        id: `prefill-${++__uid}-${idx}`,
        sourceStock: stock,
        targetLocation: null,
        targetWarehouseId: null,
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
          id: `in-${++__uid}-${idx}`,
          sourceStock: stock,
          targetLocation: null,
          targetWarehouseId: null,
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
    // assign the selected location to every queued item (overwrite existing)
    setQueue((prev) => prev.map((it) => ({ ...it, targetLocation: loc })));
    notify.success('กำหนดปลายทางให้รายการทั้งหมดแล้ว');
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

  // Note: Add-to-queue UI removed per request; queue is populated from prefilled/incoming stocks only.

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQueueItem = (id: string, patch: Partial<TransferQueueItem>) => {
    setQueue((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const handleConfirmAll = () => {
    if (queue.length === 0) return;
    if (activeTab === 'INTERNAL') {
      setPendingAction('INTERNAL');
    } else {
      setPendingAction('CROSS');
    }
    openConfirm();
  };

  // NOTE: Deprecated per new design — tab-level confirm handles modes.

  const executeSubmission = async () => {
    setSubmitting(true);
    try {
      const res = await execute(true);
      if (res.success) {
        setQueue([]);
      } else {
        notify.error(res.message || 'มีบางรายการล้มเหลว');
      }
    } catch (err: any) {
      console.error('Transfer Error:', err);
      notify.error(err?.message || 'เกิดข้อผิดพลาดในการย้ายสินค้า');
    } finally {
      setSubmitting(false);
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
      notify.success('ตรวจสอบสถานะเรียบร้อย — ดู badge ในแต่ละรายการ');
    } catch (err: any) {
      console.error('Preflight Error', err);
      notify.error(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบ');
    } finally {
      setIsLoading(false);
    }
  };

  // form disabled state handled by specific controls when needed

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <ListChecks size={20} />
          </div>
          <span>2. รายการรอโอนย้าย ({queue.length})</span>
        </h3>
        {queue.length > 0 && (
          <button
            onClick={() => setQueue([])}
            className="text-xs text-rose-500 hover:text-rose-700 font-bold px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
          >
            ล้างทั้งหมด
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 min-h-[400px] max-h-[60vh] custom-scrollbar">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
              <Box size={32} className="opacity-50" />
            </div>
            <p className="font-medium">ยังไม่มีรายการในคิว</p>
            <p className="text-xs mt-1">เลือกสินค้าจากด้านซ้ายเพื่อเพิ่มรายการ</p>
          </div>
        ) : (
          queue.map((item, idx) => {
            const hasQtyError = item.qty <= 0 || item.qty > item.sourceStock.quantity;
            const hasTargetError = !item.targetLocation || !item.targetLocation.id;
            const itemError =
              hasQtyError || hasTargetError || (item.mode === 'CROSS' && !item.targetWarehouseId);

            return (
              <div
                key={item.id}
                onClick={() => {
                  setActiveQueueItemId(item.id);
                  openEditPanel(item.id);
                }}
                className={`bg-white p-4 rounded-2xl border transition-all relative overflow-hidden cursor-pointer group hover:shadow-md ${
                  activeQueueItemId === item.id
                    ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                    : 'border-slate-100 shadow-sm hover:border-indigo-200'
                }`}
              >
                {/* Background Status Indicator */}
                <div
                  className={`absolute top-0 left-0 w-1 h-full transition-colors ${
                    itemError ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                />

                <div className="flex justify-between items-start gap-3 pl-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-slate-800 truncate text-sm">
                        {item.sourceStock.product?.name || item.sourceStock.name || 'Unknown Item'}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mt-2">
                      <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <span className="text-slate-400 text-[10px] uppercase">From</span>
                        <span className="font-mono font-bold text-slate-700">
                          {item.sourceStock.location?.code}
                        </span>
                      </div>
                      <ArrowRight size={14} className="text-slate-300" />
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border ${
                          item.targetLocation
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                            : 'bg-rose-50 border-rose-100 text-rose-600'
                        }`}
                      >
                        <span
                          className={`text-[10px] uppercase ${
                            item.targetLocation ? 'text-indigo-400' : 'text-rose-400'
                          }`}
                        >
                          To
                        </span>
                        <span className="font-mono font-bold">
                          {item.targetLocation?.code || 'ระบุปลายทาง'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-center min-w-[60px]">
                      <span className="block text-xl font-black text-indigo-600 leading-none">
                        {item.qty}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {item.sourceStock.product?.uom || 'Unit'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 pl-3">
                  <div className="flex items-center gap-2">
                    {itemError && (
                      <span className="flex items-center gap-1 text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold border border-rose-100">
                        Incomplete
                      </span>
                    )}
                    {(() => {
                      const pr = previewResults?.[item.sourceStock.id];
                      if (!pr) return null;
                      return (
                        <>
                          <span
                            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              pr.ok
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}
                          >
                            {pr.ok ? 'Ready' : 'Failed'}
                          </span>
                          {!pr.ok && (
                            <span className="text-[10px] text-rose-500 font-medium truncate max-w-[100px]">
                              {pr.reason}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPanel(item.id);
                      }}
                      title="แก้ไข"
                    >
                      <ListChecks size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(item.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="ลบรายการ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      {queue.length > 0 && (
        <div className="p-6 border-t border-slate-200 bg-white space-y-3 z-10">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setIsBulkAssignOpen(true)}
              className="py-2.5 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <MapPin size={16} /> Set Target All
            </button>
            <button
              onClick={handlePreview}
              className="py-2.5 px-4 bg-amber-50 text-amber-600 rounded-xl font-bold text-sm hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
            >
              <Eye size={16} /> ตรวจสอบ (Preview)
            </button>
          </div>

          {previewSummary && (
            <div className="text-xs text-center text-slate-400 font-bold">
              ผลการตรวจสอบ: <span className="text-emerald-500">{previewSummary.ok}</span> /{' '}
              {previewSummary.total}
            </div>
          )}

          <button
            onClick={handleConfirmAll}
            disabled={submitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            ยืนยันการย้ายทั้งหมด
          </button>
        </div>
      )}

      {/* Modals & Overlays */}
      <TransactionConfirmModal
        isOpen={isOpen}
        onClose={closeConfirm}
        onConfirm={executeSubmission}
        isLoading={isLoading || submitting}
        title={
          activeTab === 'INTERNAL'
            ? 'ยืนยันการย้ายภายใน (Internal Transfer)'
            : 'ยืนยันการย้ายข้ามคลัง (Cross Dock)'
        }
        type="TRANSFER"
        confirmText="ยืนยันการย้าย"
        details={
          <div className="flex flex-col gap-3 text-sm p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">จำนวนรายการ</span>
              <span className="font-bold text-slate-900">{queue.length} รายการ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">ประเภท</span>
              <span className="font-bold text-indigo-600">
                {activeTab === 'INTERNAL' ? 'Internal Transfer' : 'Cross Transfer'}
              </span>
            </div>
          </div>
        }
      />

      <SuccessReceiptModal
        isOpen={!!successInfo}
        onClose={handleSuccessModalClose}
        data={successInfo?.data || null}
      />

      {/* Right-side Edit Panel - Improved UI */}
      {editingItemId &&
        (() => {
          const item = queue.find((q) => q.id === editingItemId);
          if (!item) return null;
          return (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
              <div className="w-full h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h4 className="font-black text-slate-800 text-lg">แก้ไขรายการ</h4>
                    <p className="text-xs text-slate-400 font-medium">ปรับปรุงจำนวนหรือปลายทาง</p>
                  </div>
                  <button
                    onClick={closeEditPanel}
                    title="ปิด"
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                  {/* Product Card */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      สินค้าที่เลือก
                    </div>
                    <div className="font-bold text-slate-800 text-lg leading-tight mb-1">
                      {item.sourceStock.name || item.sourceStock.product?.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded w-fit">
                      {item.sourceStock.product?.sku}
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">
                      จำนวนที่จะย้าย
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={item.sourceStock.quantity}
                        value={editingQty === '' ? '' : editingQty}
                        onChange={(e) =>
                          setEditingQty(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        aria-label="จำนวนที่จะย้าย"
                        className="w-full text-3xl font-black text-indigo-600 pl-4 pr-16 py-4 bg-indigo-50/30 border-2 border-indigo-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        / {item.sourceStock.quantity} {item.sourceStock.product?.uom}
                      </span>
                    </div>
                  </div>

                  {/* Target Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">
                      ตำแหน่งปลายทาง
                    </label>
                    <div className="p-1 bg-slate-50 rounded-2xl border border-slate-200">
                      <LocationSelector
                        warehouseId={
                          activeTab === 'CROSS' ? item.targetWarehouseId || '' : currentWarehouseId
                        }
                        onSelect={(loc) => setEditingLocation(loc)}
                        key={`edit-loc-${editingItemId}-${resetKey}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        saveEditPanel();
                      }}
                      className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-base shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                      บันทึกการเปลี่ยนแปลง
                    </button>
                    <button
                      onClick={() => {
                        closeEditPanel();
                      }}
                      className="py-3.5 px-6 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Bulk Assign Modal - Improved UI */}
      {isBulkAssignOpen && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 rounded-3xl">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800">กำหนดปลายทางให้ทุกรายการ</h3>
              <button
                onClick={() => {
                  setIsBulkAssignOpen(false);
                }}
                title="ปิด"
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">
                เลือกตำแหน่งปลายทางเพียงหนึ่งแห่งเพื่อนำไปใช้กับรายการสินค้าทั้งหมดในคิว (
                {queue.length} รายการ)
              </p>
              <div className="p-1 bg-slate-50 rounded-2xl border border-slate-200">
                <LocationSelector
                  warehouseId={effectiveWhId}
                  onSelect={setBulkLocation}
                  disabled={activeTab === 'CROSS' && !targetWarehouseId}
                />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/30 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsBulkAssignOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (bulkLocation) {
                    assignTargetToAll(bulkLocation);
                    setIsBulkAssignOpen(false);
                    setBulkLocation(null);
                  }
                }}
                disabled={!bulkLocation}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                ยืนยัน ({queue.length} รายการ)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
