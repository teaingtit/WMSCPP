'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, ArrowRight, Trash2, X, ListChecks, Eye, Box, MapPin } from 'lucide-react';
import { notify } from '@/lib/ui-helpers';
import {
  submitBulkTransfer,
  preflightBulkTransfer,
  type PreflightTransferItem,
  type PreflightTransferResultItem,
} from '@/actions/transfer-actions';
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
      const preflightPayload: PreflightTransferItem[] = queue.map((item) => ({
        sourceStock: { id: item.sourceStock.id },
        qty: item.qty,
        targetLocation: item.targetLocation ? { id: item.targetLocation.id } : null,
        mode: item.mode,
      }));

      const pre = await preflightBulkTransfer(preflightPayload);
      const okCount =
        pre.summary?.ok ??
        (pre.results || []).filter((r: PreflightTransferResultItem) => r.ok).length;
      const total = pre.summary?.total ?? (pre.results || []).length;
      setPreviewResults(
        (pre.results || []).reduce(
          (acc: Record<string, PreflightTransferResultItem>, r: PreflightTransferResultItem) => {
            if (r.stockId) acc[r.stockId] = r;
            return acc;
          },
          {} as Record<string, PreflightTransferResultItem>,
        ),
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

      // If there are failures, preserve the error details for display
      if (!result.success && result.details) {
        // Map errors to stock IDs for better visibility
        const errorMap: Record<string, string> = {};
        queue.forEach((item, idx) => {
          // Match errors by index (errors array corresponds to items array)
          const errorMsg = result.details.errors[idx];
          if (idx < result.details.errors.length && errorMsg) {
            errorMap[item.sourceStock.id] = errorMsg;
          }
        });
        setTransferErrors(errorMap);

        // Update preview results to show failures
        setPreviewResults((prev) => {
          const updated = prev ? { ...prev } : {};
          Object.keys(errorMap).forEach((stockId) => {
            const errorReason = errorMap[stockId];
            if (!errorReason) return;

            if (updated[stockId]) {
              updated[stockId] = { stockId, ok: false, reason: errorReason };
            } else {
              updated[stockId] = { stockId, ok: false, reason: errorReason };
            }
          });
          return updated;
        });
      }

      return {
        success: false,
        message: result.message || 'มีบางรายการล้มเหลว',
        details: result.details,
      };
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
  const [previewResults, setPreviewResults] = useState<Record<
    string,
    PreflightTransferResultItem
  > | null>(null);
  const [previewSummary, setPreviewSummary] = useState<{ total: number; ok: number } | null>(null);
  const [transferErrors, setTransferErrors] = useState<Record<string, string>>({});
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
    // clear preview and errors for this stock so user can re-run preview
    const stockId = queue.find((q) => q.id === editingItemId)?.sourceStock.id;
    setPreviewResults((prev) => {
      if (!prev) return prev;
      const copy = { ...prev };
      if (stockId && copy[stockId]) delete copy[stockId];
      return copy;
    });
    // Clear transfer error for this item when editing
    if (stockId) {
      setTransferErrors((prev) => {
        if (prev[stockId]) {
          const copy = { ...prev };
          delete copy[stockId];
          return copy;
        }
        return prev;
      });
    }
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
        setPreviewResults(null);
        setPreviewSummary(null);
        setTransferErrors({});
      } else {
        // Show detailed error message with failed items count
        const errorDetails = res.details as
          | { success: number; failed: number; errors: string[] }
          | undefined;
        if (errorDetails) {
          const errorMsg = `ย้ายสำเร็จ ${errorDetails.success} รายการ, ไม่สำเร็จ ${
            errorDetails.failed
          } รายการ${errorDetails.errors.length > 0 ? `: ${errorDetails.errors[0]}` : ''}`;
          notify.error(errorMsg);

          // If there are multiple errors, log them for debugging
          if (errorDetails.errors.length > 1) {
            console.warn('Transfer errors:', errorDetails.errors);
          }
        } else {
          notify.error(res.message || 'มีบางรายการล้มเหลว');
        }
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
      // Clear previous transfer errors when running new preview
      setTransferErrors({});

      const payload: PreflightTransferItem[] = queue.map((item) => ({
        sourceStock: { id: item.sourceStock.id },
        qty: item.qty,
        targetLocation: item.targetLocation ? { id: item.targetLocation.id } : null,
        mode: item.mode,
      }));

      const res = await preflightBulkTransfer(payload);
      // Map results by stockId for quick lookup
      const map: Record<string, PreflightTransferResultItem> = {};
      (res.results || []).forEach((r: PreflightTransferResultItem) => {
        if (r.stockId) map[r.stockId] = r;
      });
      setPreviewResults(map);
      setPreviewSummary(res.summary || null);

      const okCount =
        res.summary?.ok ??
        Object.values(map).filter((r: PreflightTransferResultItem) => r.ok).length;
      const total = res.summary?.total ?? Object.keys(map).length;
      if (okCount === total) {
        notify.success(`ตรวจสอบสถานะเรียบร้อย — ทุกรายการพร้อมย้าย (${okCount}/${total})`);
      } else {
        notify.error(
          `ตรวจสอบสถานะ: ผ่าน ${okCount}/${total} รายการ — กรุณาแก้ไขรายการที่ล้มเหลวก่อนย้าย`,
        );
      }
    } catch (err: any) {
      console.error('Preflight Error', err);
      notify.error(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบ');
    } finally {
      setIsLoading(false);
    }
  };

  // form disabled state handled by specific controls when needed

  return (
    <div className="flex flex-col h-full bg-card rounded-3xl border border-border shadow-sm overflow-hidden relative">
      <div className="p-6 border-b border-border flex items-center justify-between bg-muted/50">
        <h3 className="font-bold text-foreground flex items-center gap-2">
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

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30 min-h-[400px] max-h-[60vh] custom-scrollbar landscape-compact">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
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
                className={`bg-card p-4 rounded-2xl border transition-all relative overflow-hidden cursor-pointer group hover:shadow-md ${
                  activeQueueItemId === item.id
                    ? 'border-primary shadow-md ring-1 ring-primary/20'
                    : 'border-border shadow-sm hover:border-primary/50'
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
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-foreground truncate text-sm">
                        {item.sourceStock.product?.name || item.sourceStock.name || 'Unknown Item'}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium mt-2">
                      <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border border-border">
                        <span className="text-muted-foreground text-xs uppercase">From</span>
                        <span className="font-mono font-bold text-foreground">
                          {item.sourceStock.location?.code}
                        </span>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground" />
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border ${
                          item.targetLocation
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                            : 'bg-rose-50 border-rose-100 text-rose-600'
                        }`}
                      >
                        <span
                          className={`text-xs uppercase ${
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
                      <span className="text-xs text-muted-foreground font-medium">
                        {item.sourceStock.product?.uom || 'Unit'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border pl-3">
                  <div className="flex items-center gap-2">
                    {itemError && (
                      <span className="flex items-center gap-1 text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold border border-rose-100">
                        Incomplete
                      </span>
                    )}
                    {(() => {
                      const pr = previewResults?.[item.sourceStock.id];
                      const transferError = transferErrors[item.sourceStock.id];
                      const hasError = (pr && !pr.ok) || transferError;
                      const errorReason = transferError || pr?.reason;

                      if (!pr && !transferError) return null;
                      return (
                        <>
                          <span
                            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold border ${
                              !hasError
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}
                          >
                            {!hasError ? 'Ready' : 'Failed'}
                          </span>
                          {hasError && errorReason && (
                            <span
                              className="text-xs text-rose-500 font-medium truncate max-w-[150px]"
                              title={errorReason}
                            >
                              {errorReason}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors touch-manipulation active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPanel(item.id);
                      }}
                      title="แก้ไข"
                      aria-label="แก้ไขรายการ"
                    >
                      <ListChecks size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(item.id);
                      }}
                      className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors touch-manipulation active:scale-95"
                      title="ลบรายการ"
                      aria-label="ลบรายการ"
                    >
                      <Trash2 size={18} />
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
        <div className="p-6 border-t border-border bg-card space-y-3 z-10">
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <button
              onClick={() => setIsBulkAssignOpen(true)}
              className="py-2.5 px-4 bg-muted text-foreground rounded-xl font-bold text-sm hover:bg-accent transition-colors flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] min-h-[48px]"
            >
              <MapPin size={16} /> Set Target All
            </button>
            <button
              onClick={handlePreview}
              className="py-2.5 px-4 bg-amber-50 text-amber-600 rounded-xl font-bold text-sm hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] min-h-[48px]"
              title="ตรวจสอบความพร้อมก่อนย้ายจริง (ไม่บันทึกข้อมูล)"
            >
              <Eye size={16} /> ตรวจสอบ (Preview)
            </button>
          </div>

          {previewSummary && (
            <div className="text-xs text-center text-muted-foreground font-bold">
              ผลการตรวจสอบ: <span className="text-emerald-500">{previewSummary.ok}</span> /{' '}
              {previewSummary.total}
            </div>
          )}

          {/* Help text for Preview */}
          {!previewSummary && queue.length > 0 && (
            <div className="text-xs text-center text-muted-foreground italic">
              💡 แนะนำ: คลิก "ตรวจสอบ (Preview)" เพื่อตรวจสอบความพร้อมก่อนย้ายจริง
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
          <div className="flex flex-col gap-3 text-sm p-4 bg-muted rounded-xl border border-border">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground font-medium">จำนวนรายการ</span>
              <span className="font-bold text-foreground">{queue.length} รายการ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">ประเภท</span>
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
            <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
              <div className="w-full h-full bg-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/50">
                  <div>
                    <h4 className="font-black text-foreground text-lg">แก้ไขรายการ</h4>
                    <p className="text-xs text-muted-foreground font-medium">
                      ปรับปรุงจำนวนหรือปลายทาง
                    </p>
                  </div>
                  <button
                    onClick={closeEditPanel}
                    title="ปิด"
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                  {/* Product Card */}
                  <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                    <div className="text-label text-muted-foreground mb-2">สินค้าที่เลือก</div>
                    <div className="font-bold text-foreground text-lg leading-tight mb-1">
                      {item.sourceStock.name || item.sourceStock.product?.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded w-fit">
                      {item.sourceStock.product?.sku}
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label className="text-xs font-bold text-foreground mb-2 block uppercase tracking-wide">
                      จำนวนที่จะย้าย
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={item.sourceStock.quantity}
                        value={editingQty === '' ? '' : editingQty}
                        onChange={(e) =>
                          setEditingQty(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        aria-label="จำนวนที่จะย้าย"
                        className="w-full text-3xl font-black text-primary pl-4 pr-16 py-4 bg-primary/10 border-2 border-primary/20 rounded-2xl focus:border-primary focus:bg-background transition-all outline-none touch-manipulation"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                        / {item.sourceStock.quantity} {item.sourceStock.product?.uom}
                      </span>
                    </div>
                  </div>

                  {/* Target Selector */}
                  <div>
                    <label className="text-xs font-bold text-foreground mb-2 block uppercase tracking-wide">
                      ตำแหน่งปลายทาง
                    </label>
                    <div className="p-1 bg-muted rounded-2xl border border-border">
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
                <div className="p-6 border-t border-border bg-muted/50">
                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <button
                      onClick={() => {
                        saveEditPanel();
                      }}
                      className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-base shadow-lg shadow-indigo-200 transition-all active:scale-95 touch-manipulation min-h-[48px]"
                    >
                      บันทึกการเปลี่ยนแปลง
                    </button>
                    <button
                      onClick={() => {
                        closeEditPanel();
                      }}
                      className="py-3.5 px-6 bg-card border border-border text-foreground rounded-xl font-bold hover:bg-accent transition-all touch-manipulation active:scale-[0.98] min-h-[48px]"
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
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-border bg-muted/50 flex justify-between items-center">
              <h3 className="text-lg font-black text-foreground">กำหนดปลายทางให้ทุกรายการ</h3>
              <button
                onClick={() => {
                  setIsBulkAssignOpen(false);
                }}
                title="ปิด"
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
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

            <div className="px-6 py-5 border-t border-border bg-muted/30 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsBulkAssignOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-foreground hover:bg-accent transition-colors"
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
