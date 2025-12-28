'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { searchStockForTransfer, submitTransfer } from '@/actions/transfer-actions';
import { ArrowRightLeft, Search, MapPin, Loader2, Save, Box } from 'lucide-react';

const coordInputClass = "w-full text-center font-mono text-3xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none h-20 transition-all";

export default function TransferPage() { 
  const router = useRouter();
  const params = useParams();
  const warehouseId = params.warehouseId as string;
  
  // --- State Definitions ---
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false); // ✅ เพิ่มสถานะ Loading ของ Search
  const [selectedStock, setSelectedStock] = useState<any>(null);
  
  const [targetCoords, setTargetCoords] = useState({ lot: '', cart: '', level: '' });
  const [transferQty, setTransferQty] = useState('');
  const [loading, setLoading] = useState(false);

  // --- ⚡ OPTIMIZATION: Debounce Search Effect ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 0 && !selectedStock) {
        setIsSearching(true);
        try {
            const results = await searchStockForTransfer(warehouseId, searchTerm);
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
    }, 500); // รอ 0.5 วินาที

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, warehouseId, selectedStock]);

  // --- Handlers ---
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (selectedStock) {
        setSelectedStock(null); // เคลียร์ของที่เลือกถ้าพิมพ์ค้นหาใหม่
        setSearchResults([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStock) return alert("❌ กรุณาเลือกสินค้าต้นทาง");
    if (!targetCoords.lot || !targetCoords.cart || !targetCoords.level) return alert("❌ ระบุพิกัดปลายทางให้ครบ");
    if (!transferQty || Number(transferQty) <= 0) return alert("❌ ระบุจำนวนที่ถูกต้อง");
    if (Number(transferQty) > selectedStock.quantity) return alert("❌ จำนวนที่ย้ายเกินกว่าที่มีในสต็อก");
    
    setLoading(true);
    const result = await submitTransfer({
        warehouseId: warehouseId,
        stockId: selectedStock.id,
        targetLot: targetCoords.lot,
        targetCart: targetCoords.cart,
        targetLevel: targetCoords.level,
        transferQty: transferQty
    });

    if (result.success) {
        alert("✅ " + result.message);
        router.push(`/dashboard/${warehouseId}/inventory`);
    } else {
        alert("❌ " + result.message);
    }
    setLoading(false);
  };

  // --- JSX Render ---
  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
         <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <ArrowRightLeft size={24}/>
            </div>
            ย้ายสินค้าภายในคลัง (Internal Transfer)
         </h1>
         <p className="text-slate-500 ml-12">
            ย้ายตำแหน่งจัดเก็บ โดยที่ข้อมูลสินค้า (Lot, Expiry) ไม่เปลี่ยนแปลง
         </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         
         {/* LEFT COLUMN: SOURCE SELECTION */}
         <div className="space-y-6">
            <div className={`p-6 rounded-3xl border transition-all ${selectedStock ? 'bg-slate-50 border-slate-200' : 'bg-white border-orange-200 shadow-md'}`}>
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Box size={20} className="text-orange-500"/> 1. เลือกสินค้าต้นทาง (Source)
                </h3>

                {!selectedStock ? (
                    <div className="relative">
                        {isSearching ? (
                            <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 animate-spin" size={20}/>
                        ) : (
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                        )}
                        <input 
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                            placeholder="ค้นหาชื่อสินค้า หรือ SKU..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            autoFocus
                        />
                        
                        {searchResults.length > 0 && (
                            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto custom-scrollbar bg-white rounded-xl shadow-sm border border-slate-100 p-2">
                                <div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">พบ {searchResults.length} รายการ</div>
                                {searchResults.map((stock) => (
                                    <div 
                                        key={stock.id} 
                                        onClick={() => setSelectedStock(stock)}
                                        className="p-4 bg-white border border-slate-100 rounded-xl hover:border-orange-400 hover:bg-orange-50 cursor-pointer group transition-all"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-slate-800 group-hover:text-orange-700">{stock.products.name}</div>
                                                <div className="text-xs text-slate-400 font-mono">SKU: {stock.products.sku}</div>
                                                
                                                {/* ✅ SHOW ATTRIBUTES */}
                                                {stock.attributes && Object.keys(stock.attributes).length > 0 && (
                                                    <div className="flex gap-1 mt-2 flex-wrap">
                                                        {Object.entries(stock.attributes).map(([k, v]: any) => (
                                                            <span key={k} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200 group-hover:bg-white group-hover:border-orange-200">
                                                                {k}:{v}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-xl font-black text-slate-800">{stock.quantity}</span>
                                                <span className="text-[10px] text-slate-400 uppercase">{stock.products.uom}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg group-hover:bg-white group-hover:text-orange-600 border border-transparent group-hover:border-orange-100">
                                            <MapPin size={14}/> {stock.locations.code}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {searchTerm && searchResults.length === 0 && !isSearching && (
                            <div className="mt-4 text-center text-slate-400 text-sm p-4 border border-dashed border-slate-200 rounded-xl">
                                ไม่พบสินค้า
                            </div>
                        )}
                    </div>
                ) : (
                    // Selected State
                    <div className="animate-in fade-in zoom-in-95">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-8 -mt-8"></div>
                            <div className="relative z-10">
                                <div className="text-sm font-bold text-orange-600 mb-1">สินค้าที่เลือก:</div>
                                <div className="text-xl font-black text-slate-800">{selectedStock.products.name}</div>
                                <div className="text-sm font-mono text-slate-400 mb-4">{selectedStock.products.sku}</div>

                                {/* ✅ SHOW ATTRIBUTES IN SELECTED VIEW */}
                                {selectedStock.attributes && Object.keys(selectedStock.attributes).length > 0 && (
                                    <div className="flex gap-2 mb-4 flex-wrap">
                                        {Object.entries(selectedStock.attributes).map(([k, v]: any) => (
                                            <span key={k} className="text-xs bg-orange-50 px-2 py-1 rounded-md text-orange-700 border border-orange-100 font-bold">
                                                {k}: {v}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <div className="bg-slate-100 px-3 py-2 rounded-lg">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">จากพิกัด</div>
                                        <div className="font-bold text-slate-700 flex items-center gap-1">
                                            <MapPin size={14}/> {selectedStock.locations.code}
                                        </div>
                                    </div>
                                    <div className="bg-slate-100 px-3 py-2 rounded-lg">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">ยอดที่มี</div>
                                        <div className="font-bold text-slate-700">{selectedStock.quantity} {selectedStock.products.uom}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedStock(null)} 
                                    className="mt-6 text-xs text-slate-400 hover:text-orange-600 underline font-bold"
                                >
                                    เปลี่ยนสินค้า
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
         </div>

         {/* RIGHT COLUMN: DESTINATION & QTY */}
         <div className={`space-y-6 transition-all ${!selectedStock ? 'opacity-50 pointer-events-none blur-[1px]' : 'opacity-100'}`}>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                 <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                    <MapPin size={20} className="text-indigo-600"/> 2. ระบุปลายทาง & จำนวน
                 </h3>

                 {/* 3D Coordinates Input */}
                 <div className="flex gap-2 items-end mb-8">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-400 text-center block mb-2">LOT</label>
                            <input 
                                type="number" 
                                className={coordInputClass}
                                placeholder="-" 
                                value={targetCoords.lot} 
                                onChange={e => setTargetCoords({...targetCoords, lot: e.target.value})} 
                            />
                        </div>
                        <span className="text-2xl text-slate-200 pb-4">-</span>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-400 text-center block mb-2">CART</label>
                            <input 
                                type="number" 
                                className={coordInputClass}
                                placeholder="-" 
                                value={targetCoords.cart} 
                                onChange={e => setTargetCoords({...targetCoords, cart: e.target.value})} 
                            />
                        </div>
                        <span className="text-2xl text-slate-200 pb-4">-</span>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-indigo-500 text-center block mb-2">LEVEL</label>
                            <input 
                                type="number" 
                                className={`${coordInputClass} text-indigo-700 border-indigo-100 bg-indigo-50`}
                                placeholder="-" 
                                value={targetCoords.level} 
                                onChange={e => setTargetCoords({...targetCoords, level: e.target.value})} 
                            />
                        </div>
                 </div>

                 {/* QTY Input */}
                 <div>
                    <label className="font-bold text-slate-700 mb-2 block">จำนวนที่ต้องการย้าย</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            className="w-full text-4xl font-black text-slate-900 pl-6 pr-20 py-6 bg-slate-50 border border-slate-200 rounded-2xl focus:border-orange-500 outline-none placeholder:text-slate-200"
                            placeholder="0"
                            value={transferQty}
                            onChange={(e) => setTransferQty(e.target.value)}
                            max={selectedStock?.quantity}
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold bg-white px-3 py-1 rounded-lg border border-slate-200 text-sm">
                            {selectedStock?.products.uom}
                        </span>
                    </div>
                 </div>
            </div>

            <button 
                onClick={handleSubmit}
                disabled={loading || !transferQty || Number(transferQty) <= 0 || Number(transferQty) > (selectedStock?.quantity || 0)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xl hover:bg-slate-800 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin"/> : <Save size={24}/>}
                ยืนยันการย้าย
            </button>
         </div>

      </div>
    </div>
  );
}