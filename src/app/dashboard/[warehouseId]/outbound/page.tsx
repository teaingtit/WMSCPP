'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { searchStockForOutbound, submitBulkOutbound } from '@/actions/outbound-actions';
import {
  LogOut,
  Search,
  MapPin,
  Loader2,
  PackageCheck,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
import { useDebounce } from 'use-debounce';
import { notify } from '@/lib/ui-helpers';
import TransactionConfirmModal from '@/components/shared/TransactionConfirmModal';
import SuccessReceiptModal from '@/components/shared/SuccessReceiptModal';
import useTransactionFlow from '@/hooks/useTransactionFlow';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
// drawer/floating UI removed — queue is rendered inline now

interface OutboundQueueItem {
  id: string; // unique ID
  stock: any; // เก็บ object stock ที่เลือก
  qty: number;
  note: string;
}

export default function OutboundPage() {
  useGlobalLoading();
  const params = useParams();
  const warehouseId = params['warehouseId'] as string;
  const searchParams = useSearchParams();

  // State
  const [queue, setQueue] = useState<OutboundQueueItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false); // เพิ่มสถานะ Loading ของ Search
  const [selectedStock, setSelectedStock] = useState<any>(null);

  const [pickQty, setPickQty] = useState('');
  const [note, setNote] = useState('');

  // Track queued stock IDs for filtering search results
  const queuedStockIds = useMemo(() => new Set(queue.map((item) => item.stock.id)), [queue]);

  const [submitting, setSubmitting] = useState(false);

  const executor = async () => {
    const payload = queue.map((item) => ({
      warehouseId,
      stockId: item.stock.id,
      qty: item.qty,
      note: item.note,
    }));
    const result = await submitBulkOutbound(payload);
    return {
      success: result.success,
      data: result.success
        ? {
            title: 'บันทึกการเบิกจ่ายสำเร็จ',
            details: [
              { label: 'จำนวนรายการ', value: `${queue.length} รายการ` },
              { label: 'เวลา', value: new Date().toLocaleString('th-TH') },
            ],
          }
        : undefined,
      message: result.message,
      redirect: true,
    } as const;
  };

  const {
    isOpen,
    isLoading,
    openConfirm,
    closeConfirm,
    execute,
    successInfo,
    handleSuccessModalClose,
  } = useTransactionFlow(executor);

  // Suggestion 2: Use useDebounce hook for consistency and cleaner code
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  useEffect(() => {
    // Don't search if the search term is empty
    if (!debouncedSearch) {
      setSearchResults([]);
      return;
    }

    let active = true;
    const performSearch = async () => {
      setIsSearching(true);
      try {
        const results = await searchStockForOutbound(warehouseId, debouncedSearch);
        if (!active) return;
        // Filter out items already in queue
        const filtered = results.filter((stock: any) => !queuedStockIds.has(stock.id));
        setSearchResults(filtered);
      } catch (error) {
        console.error('Search failed:', error);
        if (active) setSearchResults([]);
      } finally {
        if (active) setIsSearching(false);
      }
    };

    performSearch();
    return () => {
      active = false;
    };
  }, [debouncedSearch, warehouseId, queuedStockIds]);

  useEffect(() => {
    // If `ids` present in query (from Inventory bulk action), prefill queue
    const idsParam = searchParams?.get('ids');
    if (!idsParam) return;

    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const { data: stocks, error } = await supabaseBrowser
          .from('stocks')
          .select(
            `id, quantity, attributes, products!inner(id, sku, name, uom), locations!inner(id, code)`,
          )
          .in('id', ids)
          .limit(100);

        if (error) {
          console.error('Prefill Outbound Error:', error);
          return;
        }

        if (cancelled) return;
        if (stocks && stocks.length > 0) {
          // Map to queue items with default qty = 1
          const prefilled = stocks.map((stock: any) => ({
            id: Date.now().toString() + '-' + String(stock.id),
            stock: stock,
            qty: 1,
            note: '',
          }));
          setQueue((prev) => {
            const existingIds = new Set(prev.map((p) => p.stock.id));
            const toAdd = prefilled.filter((p) => !existingIds.has(p.stock.id));
            return [...prev, ...toAdd];
          });
        }
      } catch (err) {
        console.error('Failed to prefill outbound:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Handlers
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleSelect = (stock: any) => {
    setSelectedStock(stock);
    // Don't clear search results or search term - allow continuous adding
  };

  // Suggestion 1: Centralize form reset logic - keep search for continuous workflow
  const resetForm = useCallback(() => {
    setPickQty('');
    setNote('');
    setSelectedStock(null);
    // Don't clear search term/results to allow adding more items from same search
  }, []);

  const handleAddToQueue = (e: React.FormEvent): void => {
    e.preventDefault();
    const qty = Number(pickQty);
    if (!selectedStock) {
      notify.error('กรุณาเลือกสินค้า');
      return;
    }
    if (!pickQty || qty <= 0) {
      notify.error('ระบุจำนวนที่ถูกต้อง');
      return;
    }
    if (qty > selectedStock.quantity) {
      notify.error('ยอดเบิกเกินกว่าที่มีในสต็อก');
      return;
    }

    const newItem: OutboundQueueItem = {
      id: Date.now().toString(),
      stock: selectedStock,
      qty: qty,
      note: note,
    };

    setQueue((prev) => [...prev, newItem]);
    notify.success('เพิ่มลงรายการเบิกแล้ว');

    resetForm();
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleConfirmAll = () => {
    if (queue.length === 0) return;
    openConfirm();
  };

  const executeSubmission = async () => {
    setSubmitting(true);
    try {
      const res = await execute();
      if (res.success) {
        setQueue([]);
      } else {
        notify.error(`มีบางรายการล้มเหลว: ${res.message}`);
      }
    } catch (err) {
      notify.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // success modal close handled by hook

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
            <LogOut size={24} />
          </div>
          เบิกจ่ายสินค้า (Outbound Picking)
        </h1>
        <p className="text-slate-500 ml-12">ค้นหาตำแหน่งสินค้าและตัดสต็อกออกจากระบบ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Search */}
        <div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 min-h-[400px]">
              <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
                <Search className="text-rose-500" /> 1. ค้นหาและเลือกตำแหน่ง
              </h3>

              {/* Search Box - Always visible */}
              <div className="relative">
                <input
                  className="w-full pl-12 pr-4 py-4 text-lg bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                  placeholder="พิมพ์ชื่อสินค้า หรือ SKU..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  autoFocus
                />
                {isSearching ? (
                  <Loader2
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 animate-spin"
                    size={24}
                  />
                ) : (
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={24}
                  />
                )}
              </div>

              {/* Selected Stock Preview - Show above results when selected */}
              {selectedStock && (
                <div className="mt-4 animate-in fade-in zoom-in-95">
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 relative">
                    <button
                      onClick={() => setSelectedStock(null)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 text-xs font-bold underline"
                    >
                      ยกเลิก
                    </button>
                    <div className="text-[10px] font-bold text-rose-600 mb-1 uppercase tracking-wide">
                      กำลังทำรายการ:
                    </div>
                    <div className="text-lg font-black text-slate-800">
                      {selectedStock.products.name}
                    </div>
                    {selectedStock.attributes &&
                      Object.keys(selectedStock.attributes).length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {Object.entries(selectedStock.attributes).map(([k, v]: any) => (
                            <span
                              key={k}
                              className="text-[10px] bg-white/50 px-1.5 py-0.5 rounded text-rose-700 border border-rose-100"
                            >
                              {k}: {v}
                            </span>
                          ))}
                        </div>
                      )}
                    <div className="flex gap-3 mt-3">
                      <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-rose-100 text-xs">
                        <span className="text-slate-400">พิกัด:</span>{' '}
                        <span className="font-bold text-slate-700">
                          {selectedStock.locations.code}
                        </span>
                      </div>
                      <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-rose-100 text-xs">
                        <span className="text-slate-400">คงเหลือ:</span>{' '}
                        <span className="font-bold text-slate-700">
                          {selectedStock.quantity} {selectedStock.products.uom}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Result List - Always visible when there are results */}
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    พบ {searchResults.length} ตำแหน่งจัดเก็บ
                  </p>
                  {searchResults.map((stock) => (
                    <div
                      key={stock.id}
                      onClick={() => handleSelect(stock)}
                      className="p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-all group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <div className="font-bold text-slate-800 group-hover:text-rose-700">
                            {stock.products.name}
                          </div>
                          <div className="text-xs font-mono text-slate-400 mt-1">
                            {stock.products.sku}
                          </div>
                          {stock.attributes && Object.keys(stock.attributes).length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {Object.entries(stock.attributes).map(([k, v]: any) => (
                                <span
                                  key={k}
                                  className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500 border border-slate-200"
                                >
                                  {k}:{v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-slate-800">{stock.quantity}</div>
                          <div className="text-[10px] text-slate-500 uppercase">
                            {stock.products.uom}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 group-hover:bg-white group-hover:text-rose-600">
                        <MapPin size={14} /> {stock.locations.code}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchTerm && searchResults.length === 0 && !isSearching && (
                <div className="mt-8 text-center text-slate-400">
                  {queuedStockIds.size > 0 &&
                  queue.some((q) =>
                    q.stock.products.name.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                    ? 'รายการที่ตรงกันอยู่ในคิวแล้ว'
                    : 'ไม่พบสินค้าที่มีสต็อก (หรือสินค้าหมด)'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action Form */}
        <div>
          <div
            className={`space-y-6 transition-all ${
              !selectedStock ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'
            }`}
          >
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-lg">
                <PackageCheck className="text-indigo-600" /> 2. ระบุจำนวนที่เบิก
              </h3>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-500 mb-2">
                  จำนวน (Quantity)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full text-5xl font-black text-rose-600 pl-6 pr-20 py-6 bg-rose-50 border border-rose-100 rounded-2xl focus:border-rose-500 outline-none transition-all placeholder:text-rose-200"
                    placeholder="0"
                    value={pickQty}
                    onChange={(e) => setPickQty(e.target.value)}
                    max={selectedStock?.quantity}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold bg-white px-3 py-1 rounded-lg border border-slate-100 text-sm uppercase">
                    {selectedStock?.products.uom}
                  </span>
                </div>
                {Number(pickQty) > (selectedStock?.quantity || 0) && (
                  <div className="mt-2 text-rose-500 text-sm font-bold flex items-center gap-1">
                    <AlertCircle size={16} /> ยอดเบิกเกินกว่าที่มีในสต็อก
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">
                  หมายเหตุ (Optional)
                </label>
                <textarea
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                  rows={3}
                  placeholder="เช่น เบิกไปใช้หน้างาน, สินค้าเสียหาย..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={handleAddToQueue}
              disabled={
                !selectedStock ||
                !pickQty ||
                Number(pickQty) <= 0 ||
                Number(pickQty) > (selectedStock?.quantity || 0)
              }
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={24} /> เพิ่มลงรายการเบิก
            </button>
          </div>
        </div>
      </div>

      {/* --- Inline Queue --- */}
      <div className="mt-8 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <LogOut size={18} /> รายการรอเบิกจ่าย ({queue.length})
          </h4>
          <div className="text-sm text-slate-500">ตรวจสอบและแก้ไขรายการก่อนยืนยัน</div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex-1 overflow-y-auto p-2 space-y-3 bg-slate-50/30 min-h-[200px] max-h-[60vh] custom-scrollbar">
            {queue.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-6">ยังไม่มีรายการ</div>
            ) : (
              queue.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3 group hover:border-rose-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-700 truncate text-sm">
                        {idx + 1}. {item.stock.products.name}
                      </h4>
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        aria-label="ลบรายการ"
                        className="text-slate-300 hover:text-rose-500 transition-colors p-1 -mr-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1">
                      {item.stock.locations.code}
                    </div>
                    {item.note && (
                      <div className="text-xs text-slate-400 mt-1 italic">Note: {item.note}</div>
                    )}
                    <div className="flex justify-end mt-2">
                      <span className="text-rose-600 font-black text-lg">-{item.qty}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
              <span>จำนวนรายการ:</span>
              <span className="text-lg text-rose-600">{queue.length}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setQueue([])}
                disabled={queue.length === 0}
                className="flex-1 py-3 border border-slate-200 rounded-xl bg-white font-bold text-sm disabled:opacity-50"
              >
                ล้างทั้งหมด
              </button>
              <button
                onClick={handleConfirmAll}
                disabled={queue.length === 0 || submitting}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-900/20 disabled:opacity-50 disabled:grayscale"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <LogOut size={16} />}
                ยืนยันเบิกทั้งหมด
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TransactionConfirmModal
        isOpen={isOpen}
        onClose={closeConfirm}
        onConfirm={executeSubmission}
        isLoading={isLoading || submitting}
        title="ยืนยันการเบิกสินค้า"
        type="OUTBOUND"
        confirmText="ยืนยันการเบิก"
        details={
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">จำนวนรายการ</span>
              <span className="font-medium text-slate-900">{queue.length} รายการ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ประเภท</span>
              <span className="font-medium text-slate-900">เบิกจ่าย (Outbound)</span>
            </div>
          </div>
        }
      />

      <SuccessReceiptModal
        isOpen={!!successInfo}
        onClose={handleSuccessModalClose}
        data={successInfo?.data || null}
      />
    </div>
  );
}
