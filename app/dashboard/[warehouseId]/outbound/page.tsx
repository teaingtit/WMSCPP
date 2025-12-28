'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { searchStockForOutbound, submitOutbound } from '@/actions/outbound-actions';
import { LogOut, Search, MapPin, Loader2, PackageCheck, AlertCircle } from 'lucide-react';

export default function OutboundPage() {
  const router = useRouter();
  const params = useParams();
  const warehouseId = params.warehouseId as string;
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false); // เพิ่มสถานะ Loading ของ Search
  const [selectedStock, setSelectedStock] = useState<any>(null);
  
  const [pickQty, setPickQty] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ OPTIMIZATION: Debounce Search Effect
  // ทำงานเมื่อ searchTerm เปลี่ยน และหยุดรอ 500ms ก่อนยิง API
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 0 && !selectedStock) { // Search เมื่อมีคำค้นหา และยังไม่ได้เลือกของ
        setIsSearching(true);
        try {
            const results = await searchStockForOutbound(warehouseId, searchTerm);
            setSearchResults(results);
        } catch (error) {
            console.error(error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
      } else if (searchTerm.length === 0) {
        setSearchResults([]);
      }
    }, 500); // รอ 0.5 วินาทีหลังจากหยุดพิมพ์

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, warehouseId, selectedStock]);

  // Handlers
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (selectedStock) {
        setSelectedStock(null); // ถ้าพิมพ์ใหม่ ให้เคลียร์ค่าที่เลือกไว้
        setSearchResults([]);
    }
  };

  const handleSelect = (stock: any) => {
    setSelectedStock(stock);
    setSearchResults([]);
    setSearchTerm(stock.products.name); // เอาชื่อแปะเพื่อความสวยงาม
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedStock) return alert("❌ กรุณาเลือกสินค้าที่จะเบิก");
    
    const qty = Number(pickQty);
    if(!pickQty || qty <= 0) return alert("❌ ระบุจำนวนที่ถูกต้อง");
    if(qty > selectedStock.quantity) return alert("❌ จำนวนที่เบิกเกินกว่าที่มีในสต็อก");

    if(!confirm(`ยืนยันการเบิก ${selectedStock.products.name} จำนวน ${pickQty} หน่วย?`)) return;

    setLoading(true);
    const result = await submitOutbound({
        warehouseId: warehouseId,
        stockId: selectedStock.id,
        qty: pickQty,
        note: note
    });

    if(result.success) {
        alert("✅ " + result.message);
        router.push(`/dashboard/${warehouseId}/inventory`);
    } else {
        alert("❌ " + result.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
         <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><LogOut size={24}/></div>
            เบิกจ่ายสินค้า (Outbound Picking)
         </h1>
         <p className="text-slate-500 ml-12">ค้นหาตำแหน่งสินค้าและตัดสต็อกออกจากระบบ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         
         {/* LEFT: Search & Select */}
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
                    // Selected View (ส่วนนี้เหมือนเดิม)
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

         {/* RIGHT: Action (ส่วนนี้เหมือนเดิม) */}
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
                onClick={handleSubmit}
                disabled={loading || !pickQty || Number(pickQty) <= 0 || Number(pickQty) > (selectedStock?.quantity || 0)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin"/> : <LogOut size={24}/>}
                ยืนยันการเบิกสินค้า
            </button>
         </div>

      </div>
    </div>
  );
}