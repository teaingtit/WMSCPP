'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { searchStockForOutbound, submitBulkOutbound } from '@/actions/outbound-actions';
import { LogOut, Search, MapPin, Loader2, PackageCheck, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import TransactionConfirmModal from '@/components/shared/TransactionConfirmModal';
import SuccessReceiptModal, { SuccessData } from '@/components/shared/SuccessReceiptModal';

interface OutboundQueueItem {
    id: string; // unique ID
    stock: any; // เก็บ object stock ที่เลือก
    qty: number;
    note: string;
}

export default function OutboundPage() {
  const { setIsLoading } = useGlobalLoading();
  const router = useRouter();
  const params = useParams();
  const warehouseId = params.warehouseId as string;

  // State
  const [queue, setQueue] = useState<OutboundQueueItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false); // เพิ่มสถานะ Loading ของ Search
  const [selectedStock, setSelectedStock] = useState<any>(null);
  
  const [pickQty, setPickQty] = useState('');
  const [note, setNote] = useState('');
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // State for Success Modal
  const [successInfo, setSuccessInfo] = useState<{ data: SuccessData, redirect: boolean } | null>(null);

  // Suggestion 2: Use useDebounce hook for consistency and cleaner code
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  useEffect(() => {
    // Don't search if a stock is already selected or the search term is empty
    if (!debouncedSearch || selectedStock) {
      setSearchResults([]);
      return;
    }
    
    const performSearch = async () => {
      setIsSearching(true);
      try {
        const results = await searchStockForOutbound(warehouseId, debouncedSearch);
        setSearchResults(results);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearch, warehouseId, selectedStock]);

  // Handlers
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (selectedStock) {
        setSelectedStock(null); // ถ้าพิมพ์ใหม่ ให้เคลียร์ค่าที่เลือกไว้
    }
  };

  const handleSelect = (stock: any) => {
    setSelectedStock(stock);
    setSearchResults([]);
    setSearchTerm(stock.products.name); // เอาชื่อแปะเพื่อความสวยงาม
  };

  // Suggestion 1: Centralize form reset logic
  const resetForm = useCallback(() => {
    setPickQty('');
    setNote('');
    setSelectedStock(null);
    setSearchTerm('');
    setSearchResults([]);
  }, []);

  const handleAddToQueue = (e: React.FormEvent) => {
        e.preventDefault();
        const qty = Number(pickQty);
        if(!selectedStock) return toast.error("กรุณาเลือกสินค้า");
        if(!pickQty || qty <= 0) return toast.error("ระบุจำนวนที่ถูกต้อง");
        if(qty > selectedStock.quantity) return toast.error("ยอดเบิกเกินกว่าที่มีในสต็อก");
        
        const newItem: OutboundQueueItem = {
            id: Date.now().toString(),
            stock: selectedStock,
            qty: qty,
            note: note
        };

        setQueue(prev => [...prev, newItem]);
        toast.success("เพิ่มลงรายการเบิกแล้ว");
        
        resetForm();
    };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleConfirmAll = () => {
    if (queue.length === 0) return;
    setShowConfirm(true);
  };

  const executeSubmission = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    setSubmitting(true);

    const payload = queue.map(item => ({
        warehouseId,
        stockId: item.stock.id,
        qty: item.qty,
        note: item.note
    }));

    try {
        const result = await submitBulkOutbound(payload);
        if(result.success) {
            setQueue([]);
            setSuccessInfo({
                data: {
                    title: 'บันทึกการเบิกจ่ายสำเร็จ',
                    details: [
                        { label: 'จำนวนรายการ', value: `${queue.length} รายการ` }, // Assuming success count matches queue for now or use result.details
                        { label: 'เวลา', value: new Date().toLocaleString('th-TH') }
                    ]
                },
                redirect: true
            });
        } else {
            toast.error(`มีบางรายการล้มเหลว: ${result.message}`);
        }
    } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
        setIsLoading(false);
        setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
      const shouldRedirect = successInfo?.redirect;
      setSuccessInfo(null);
      if (shouldRedirect) {
          router.push(`/dashboard/${warehouseId}/history`);
      }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
             {/* Header */}
             <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><LogOut size={24}/></div>
                    เบิกจ่ายสินค้า (Outbound Picking)
                </h1>
                <p className="text-slate-500 ml-12">ค้นหาตำแหน่งสินค้าและตัดสต็อกออกจากระบบ</p>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Search (5 cols) */}
                <div className="lg:col-span-5">
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 min-h-[400px]">
                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
                                <Search className="text-rose-500" /> 1. ค้นหาและเลือกตำแหน่ง
                            </h3>

                            {/* Search Box */}
                            {!selectedStock ? (
                                <div className="relative">
                                    <input 
                                        className="w-full pl-12 pr-4 py-4 text-lg bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                        placeholder="พิมพ์ชื่อสินค้า หรือ SKU..."
                                        value={searchTerm}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        autoFocus
                                    />
                                    {isSearching ? (
                                        <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 animate-spin" size={24}/>
                                    ) : (
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24}/>
                                    )}

                                    {/* Result List */}
                                    {searchResults.length > 0 && (
                                        <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">พบ {searchResults.length} ตำแหน่งจัดเก็บ</p>
                                            {searchResults.map((stock) => (
                                                <div 
                                                    key={stock.id}
                                                    onClick={() => handleSelect(stock)}
                                                    className="p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-all group relative overflow-hidden"
                                                >
                                                    <div className="flex justify-between items-start relative z-10">
                                                        <div>
                                                            <div className="font-bold text-slate-800 group-hover:text-rose-700">{stock.products.name}</div>
                                                            <div className="text-xs font-mono text-slate-400 mt-1">{stock.products.sku}</div>
                                                            {/* Show Attributes if exists */}
                                                            {stock.attributes && Object.keys(stock.attributes).length > 0 && (
                                                                <div className="flex gap-1 mt-1 flex-wrap">
                                                                    {Object.entries(stock.attributes).map(([k, v]: any) => (
                                                                        <span key={k} className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500 border border-slate-200">
                                                                            {k}:{v}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-2xl font-black text-slate-800">{stock.quantity}</div>
                                                            <div className="text-[10px] text-slate-500 uppercase">{stock.products.uom}</div>
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
                                            ไม่พบสินค้าที่มีสต็อก (หรือสินค้าหมด)
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Selected View
                                <div className="animate-in fade-in zoom-in-95">
                                    <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 relative">
                                        <button onClick={() => setSelectedStock(null)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 text-sm font-bold underline">
                                            เปลี่ยน
                                        </button>
                                        <div className="text-sm font-bold text-rose-600 mb-2 uppercase tracking-wide">กำลังทำรายการที่:</div>
                                        <div className="text-2xl font-black text-slate-800 mb-1">{selectedStock.products.name}</div>
                                        {/* Show Attributes in Selected View */}
                                        {selectedStock.attributes && Object.keys(selectedStock.attributes).length > 0 && (
                                            <div className="flex gap-2 mb-4 flex-wrap">
                                                {Object.entries(selectedStock.attributes).map(([k, v]: any) => (
                                                    <span key={k} className="text-xs bg-white/50 px-2 py-1 rounded-md text-rose-700 border border-rose-100 font-medium">
                                                        {k}: {v}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex gap-4 mt-4">
                                            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-rose-100">
                                                <div className="text-[10px] text-slate-400 uppercase">พิกัด</div>
                                                <div className="font-bold text-slate-700 flex items-center gap-1"><MapPin size={14}/> {selectedStock.locations.code}</div>
                                            </div>
                                            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-rose-100">
                                                <div className="text-[10px] text-slate-400 uppercase">คงเหลือ</div>
                                                <div className="font-bold text-slate-700">{selectedStock.quantity} {selectedStock.products.uom}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Middle: Action Form (4 cols) */}
                <div className="lg:col-span-4">
                    <div className={`space-y-6 transition-all ${!selectedStock ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-lg">
                                <PackageCheck className="text-indigo-600" /> 2. ระบุจำนวนที่เบิก
                            </h3>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-500 mb-2">จำนวน (Quantity)</label>
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
                                        <AlertCircle size={16}/> ยอดเบิกเกินกว่าที่มีในสต็อก
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">หมายเหตุ (Optional)</label>
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
                            disabled={!selectedStock || !pickQty || Number(pickQty) <= 0 || Number(pickQty) > (selectedStock?.quantity || 0)}
                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={24}/> เพิ่มลงรายการเบิก
                        </button>
                    </div>
                </div>

                {/* Right: Pick List (3 cols) - NEW */}
                <div className="lg:col-span-3">
                    <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl sticky top-6 h-fit">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <PackageCheck className="text-rose-400"/> รายการรอเบิก ({queue.length})
                        </h3>
                        
                        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                            {queue.length === 0 ? (
                                <div className="text-slate-500 text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                                    ยังไม่มีรายการ
                                </div>
                            ) : (
                                queue.map((item, idx) => (
                                    <div key={item.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-start animate-in fade-in slide-in-from-right-4 relative group">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="font-bold text-sm truncate text-slate-200">{idx + 1}. {item.stock.products.name}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-1">
                                                {item.stock.locations.code}
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <span className="text-rose-400 font-black text-lg">-{item.qty}</span>
                                            <button onClick={() => removeFromQueue(item.id)} aria-label="ลบรายการ" className="text-slate-500 hover:text-rose-400 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t border-slate-700 pt-4">
                            <div className="flex justify-between mb-4 text-sm text-slate-400">
                                <span>รวมทั้งสิ้น</span>
                                <span className="text-white font-bold">{queue.length} รายการ</span>
                            </div>
                            <button 
                                onClick={handleConfirmAll}
                                disabled={queue.length === 0 || submitting}
                                className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                            >
                                {submitting ? <Loader2 className="animate-spin"/> : <LogOut size={20}/>}
                                ยืนยันเบิกทั้งหมด
                            </button>
                        </div>
                    </div>
                </div>
             </div>

             {/* Modals */}
             <TransactionConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={executeSubmission}
                isLoading={submitting}
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
                onClose={handleSuccessClose}
                data={successInfo?.data || null}
            />
        </div>
  );
}