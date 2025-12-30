'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
// Actions
import { searchStockForTransfer, submitTransfer, submitCrossTransfer } from '@/actions/transfer-actions';
import { getWarehouses, type Warehouse } from '@/actions/warehouse-actions';
// Icons & UI
import { ArrowRightLeft, Search, MapPin, Loader2, Save, Box, Building2, Warehouse as WarehouseIcon } from 'lucide-react';

// Styles
const coordInputClass = "w-full text-center font-mono text-3xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none h-20 transition-all";

export default function TransferPage() { 
  const router = useRouter();
  const params = useParams();
  const currentWarehouseId = params.warehouseId as string;
  
  // --- Global State ---
  const [activeTab, setActiveTab] = useState<'INTERNAL' | 'CROSS'>('INTERNAL');
  const [loading, setLoading] = useState(false);
  
  // --- Search State (Shared) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);

  // --- Target State ---
  const [targetCoords, setTargetCoords] = useState({ lot: '', cart: '', level: '' });
  const [transferQty, setTransferQty] = useState('');
  
  // --- Cross-Warehouse Specific State ---
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');

  // --- 1. Fetch Warehouses (Run once) ---
  useEffect(() => {
    const loadData = async () => {
        const wData = await getWarehouses();
        // กรองคลังปัจจุบันออก
        setWarehouses(wData.filter(w => w.id !== currentWarehouseId));
    };
    loadData();
  }, [currentWarehouseId]);

  // --- 2. Search Debounce Effect ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 0 && !selectedStock) {
        setIsSearching(true);
        try {
            const results = await searchStockForTransfer(currentWarehouseId, searchTerm);
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
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentWarehouseId, selectedStock]);

  // --- Handlers ---
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (selectedStock) {
        setSelectedStock(null);
        setSearchResults([]);
    }
  };

  const handleTabChange = (tab: 'INTERNAL' | 'CROSS') => {
      setActiveTab(tab);
      // Optional: Reset target fields when switching tabs
      setTargetCoords({ lot: '', cart: '', level: '' });
      setTargetWarehouseId('');
  };

  const handleSubmit = async () => {
    // Validation Common
    if (!selectedStock) return alert("❌ กรุณาเลือกสินค้าต้นทาง");
    if (!targetCoords.lot || !targetCoords.cart || !targetCoords.level) return alert("❌ ระบุพิกัดปลายทางให้ครบ");
    if (!transferQty || Number(transferQty) <= 0) return alert("❌ ระบุจำนวนที่ถูกต้อง");
    if (Number(transferQty) > selectedStock.quantity) return alert("❌ จำนวนที่ย้ายเกินกว่าที่มีในสต็อก");

    setLoading(true);
    let result;

    if (activeTab === 'INTERNAL') {
        // --- INTERNAL TRANSFER ---
        result = await submitTransfer({
            warehouseId: currentWarehouseId,
            stockId: selectedStock.id,
            targetLot: targetCoords.lot,
            targetCart: targetCoords.cart,
            targetLevel: targetCoords.level,
            transferQty: transferQty
        });
    } else {
        // --- CROSS WAREHOUSE TRANSFER ---
        if (!targetWarehouseId) {
            setLoading(false);
            return alert("❌ กรุณาเลือกคลังปลายทาง");
        }

        result = await submitCrossTransfer({
            sourceWarehouseId: currentWarehouseId,
            targetWarehouseId: targetWarehouseId,
            stockId: selectedStock.id,
            targetLot: targetCoords.lot,
            targetCart: targetCoords.cart,
            targetLevel: targetCoords.level,
            transferQty: transferQty
        });
    }

    if (result.success) {
        alert("✅ " + result.message);
        router.push(`/dashboard/${currentWarehouseId}/inventory`);
    } else {
        alert("❌ " + result.message);
    }
    setLoading(false);
  };

  // --- Render ---
  return (
    <div className="max-w-6xl mx-auto pb-20">
      
      {/* 1. Header & Tab Switcher */}
      <div className="mb-8 space-y-6">
         <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <div className={`p-2 rounded-lg transition-colors ${activeTab === 'INTERNAL' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {activeTab === 'INTERNAL' ? <ArrowRightLeft size={24}/> : <Building2 size={24}/>}
                </div>
                {activeTab === 'INTERNAL' ? 'ย้ายสินค้าภายในคลัง (Internal)' : 'ย้ายสินค้าข้ามคลัง (Cross-Warehouse)'}
            </h1>
            <p className="text-slate-500 ml-12">
                {activeTab === 'INTERNAL' 
                    ? 'ย้ายตำแหน่งจัดเก็บภายในคลังเดิม ข้อมูลสินค้าไม่เปลี่ยนแปลง' 
                    : 'ตัดสต็อกออกจากคลังปัจจุบัน เพื่อส่งไปยังคลังอื่น'}
            </p>
         </div>

         {/* Tab Pills */}
         <div className="flex p-1 bg-slate-100 rounded-xl w-fit border border-slate-200">
            <button 
                onClick={() => handleTabChange('INTERNAL')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'INTERNAL' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <ArrowRightLeft size={16}/> Internal Transfer
            </button>
            <button 
                onClick={() => handleTabChange('CROSS')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'CROSS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Building2 size={16}/> Cross-Warehouse
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         
         {/* 2. LEFT COLUMN: SOURCE SELECTION (Shared) */}
         <div className="space-y-6">
            <div className={`p-6 rounded-3xl border transition-all ${selectedStock ? 'bg-slate-50 border-slate-200' : 'bg-white shadow-md ' + (activeTab === 'INTERNAL' ? 'border-orange-200' : 'border-indigo-200')}`}>
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Box size={20} className={activeTab === 'INTERNAL' ? 'text-orange-500' : 'text-indigo-500'}/> 1. เลือกสินค้าต้นทาง (Source)
                </h3>

                {!selectedStock ? (
                    <div className="relative">
                        {isSearching ? (
                            <Loader2 className={`absolute left-4 top-1/2 -translate-y-1/2 animate-spin ${activeTab === 'INTERNAL' ? 'text-orange-500' : 'text-indigo-500'}`} size={20}/>
                        ) : (
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                        )}
                        <input 
                            className={`w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl outline-none transition-all focus:ring-2 ${activeTab === 'INTERNAL' ? 'focus:ring-orange-500/20 focus:border-orange-500' : 'focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                            placeholder="ค้นหาชื่อสินค้า หรือ SKU..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                        
                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto custom-scrollbar bg-white rounded-xl shadow-sm border border-slate-100 p-2">
                                <div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">พบ {searchResults.length} รายการ</div>
                                {searchResults.map((stock) => (
                                    <div 
                                        key={stock.id} 
                                        onClick={() => setSelectedStock(stock)}
                                        className={`p-4 bg-white border border-slate-100 rounded-xl cursor-pointer group transition-all hover:bg-slate-50 ${activeTab === 'INTERNAL' ? 'hover:border-orange-400' : 'hover:border-indigo-400'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className={`font-bold text-slate-800 ${activeTab === 'INTERNAL' ? 'group-hover:text-orange-700' : 'group-hover:text-indigo-700'}`}>{stock.products.name}</div>
                                                <div className="text-xs text-slate-400 font-mono">SKU: {stock.products.sku}</div>
                                                {/* Attributes */}
                                                {stock.attributes && Object.keys(stock.attributes).length > 0 && (
                                                    <div className="flex gap-1 mt-2 flex-wrap">
                                                        {Object.entries(stock.attributes).map(([k, v]: any) => (
                                                            <span key={k} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">
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
                                        <div className={`mt-2 flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg border border-transparent ${activeTab === 'INTERNAL' ? 'group-hover:text-orange-600 group-hover:bg-white group-hover:border-orange-100' : 'group-hover:text-indigo-600 group-hover:bg-white group-hover:border-indigo-100'}`}>
                                            <MapPin size={14}/> {stock.locations.code}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                         
                        {searchTerm && searchResults.length === 0 && !isSearching && (
                            <div className="mt-4 text-center text-slate-400 text-sm p-4 border border-dashed border-slate-200 rounded-xl">ไม่พบสินค้า</div>
                        )}
                    </div>
                ) : (
                    // Selected Item Card
                    <div className="animate-in fade-in zoom-in-95">
                        <div className={`bg-white p-6 rounded-2xl shadow-sm border relative overflow-hidden ${activeTab === 'INTERNAL' ? 'border-orange-100' : 'border-indigo-100'}`}>
                            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-8 -mt-8 ${activeTab === 'INTERNAL' ? 'bg-orange-50' : 'bg-indigo-50'}`}></div>
                            <div className="relative z-10">
                                <div className={`text-sm font-bold mb-1 ${activeTab === 'INTERNAL' ? 'text-orange-600' : 'text-indigo-600'}`}>สินค้าที่เลือก:</div>
                                <div className="text-xl font-black text-slate-800">{selectedStock.products.name}</div>
                                <div className="text-sm font-mono text-slate-400 mb-4">{selectedStock.products.sku}</div>

                                {selectedStock.attributes && Object.keys(selectedStock.attributes).length > 0 && (
                                    <div className="flex gap-2 mb-4 flex-wrap">
                                        {Object.entries(selectedStock.attributes).map(([k, v]: any) => (
                                            <span key={k} className={`text-xs px-2 py-1 rounded-md border font-bold ${activeTab === 'INTERNAL' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
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
                                <button onClick={() => setSelectedStock(null)} className={`mt-6 text-xs underline font-bold ${activeTab === 'INTERNAL' ? 'text-orange-600' : 'text-indigo-600'}`}>
                                    เปลี่ยนสินค้า
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
         </div>

         {/* 3. RIGHT COLUMN: DESTINATION & QTY */}
         <div className={`space-y-6 transition-all ${!selectedStock ? 'opacity-50 pointer-events-none blur-[1px]' : 'opacity-100'}`}>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                 <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                    <MapPin size={20} className={activeTab === 'INTERNAL' ? 'text-orange-600' : 'text-indigo-600'}/> 2. ระบุปลายทาง & จำนวน
                 </h3>

                 {/* --- Conditional Field: Destination Warehouse (Only for CROSS) --- */}
                 {activeTab === 'CROSS' && (
                     <div className="mb-6 animate-in slide-in-from-top-2">
                        <label className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2">
                            <WarehouseIcon size={16} className="text-indigo-500"/> คลังปลายทาง (Destination)
                        </label>
                        <select 
                            aria-label="เลือกคลังปลายทาง"
                            className="w-full p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all focus:ring-2 focus:ring-indigo-500/20"
                            value={targetWarehouseId}
                            onChange={(e) => setTargetWarehouseId(e.target.value)}
                        >
                            <option value="">-- เลือกคลังปลายทาง --</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                            ))}
                        </select>
                     </div>
                 )}

                 {/* 3D Coordinates Input (Shared UI but logic handled in Submit) */}
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
                            <label className={`text-xs font-bold text-center block mb-2 ${activeTab === 'INTERNAL' ? 'text-orange-500' : 'text-indigo-500'}`}>LEVEL</label>
                            <input 
                                type="number" 
                                className={`${coordInputClass} ${activeTab === 'INTERNAL' ? 'text-orange-700 border-orange-100 bg-orange-50' : 'text-indigo-700 border-indigo-100 bg-indigo-50'}`}
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
                            className={`w-full text-4xl font-black text-slate-900 pl-6 pr-20 py-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none placeholder:text-slate-200 focus:ring-2 ${activeTab === 'INTERNAL' ? 'focus:border-orange-500 focus:ring-orange-500/20' : 'focus:border-indigo-500 focus:ring-indigo-500/20'}`}
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
                disabled={loading || !transferQty || Number(transferQty) <= 0 || Number(transferQty) > (selectedStock?.quantity || 0) || (activeTab === 'CROSS' && !targetWarehouseId)}
                className={`w-full py-5 text-white rounded-2xl font-bold text-xl transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                    ${activeTab === 'INTERNAL' 
                        ? 'bg-slate-900 hover:bg-slate-800 shadow-orange-200' 
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                    }`}
            >
                {loading ? <Loader2 className="animate-spin"/> : <Save size={24}/>}
                {activeTab === 'INTERNAL' ? 'ยืนยันการย้าย (Internal)' : 'ยืนยันย้ายข้ามคลัง (Cross)'}
            </button>
         </div>

      </div>
    </div>
  );
}