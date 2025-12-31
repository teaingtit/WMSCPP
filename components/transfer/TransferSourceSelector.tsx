'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Loader2, Box } from 'lucide-react';
import { searchStockForTransfer } from '@/actions/transfer-actions';
import { useDebounce } from 'use-debounce'; // *แนะนำให้ลง npm i use-debounce หรือใช้ setTimeout แบบเดิมก็ได้

interface Props {
  warehouseId: string;
  activeTab: 'INTERNAL' | 'CROSS';
  selectedStock: any;
  onSelect: (stock: any) => void;
}

export default function TransferSourceSelector({ warehouseId, activeTab, selectedStock, onSelect }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Effect: Search Logic
  useEffect(() => {
    if (!debouncedSearch || selectedStock) return;
    
    const search = async () => {
      setIsSearching(true);
      try {
        const res = await searchStockForTransfer(warehouseId, debouncedSearch);
        setSearchResults(res);
      } catch (e) {
        console.error(e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    search();
  }, [debouncedSearch, warehouseId, selectedStock]);

  // UI: Colors based on Tab
  const theme = activeTab === 'INTERNAL' ? 'orange' : 'indigo';
  const borderColor = activeTab === 'INTERNAL' ? 'border-orange-200' : 'border-indigo-200';
  const ringColor = activeTab === 'INTERNAL' ? 'focus:ring-orange-500/20' : 'focus:ring-indigo-500/20';

  return (
    <div className={`p-6 rounded-3xl border transition-all bg-white shadow-sm ${selectedStock ? 'bg-slate-50' : ''} ${borderColor}`}>
      <h3 className={`font-bold text-slate-700 mb-4 flex items-center gap-2`}>
        <Box size={20} className={`text-${theme}-500`} /> 1. เลือกสินค้าต้นทาง
      </h3>

      {!selectedStock ? (
        <div className="relative">
          <div className="relative">
             {isSearching ? <Loader2 className="absolute left-4 top-3.5 animate-spin text-slate-400" size={20}/> 
                          : <Search className="absolute left-4 top-3.5 text-slate-400" size={20}/>}
             <input
                className={`w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:border-${theme}-500 ${ringColor}`}
                placeholder="ค้นหาชื่อสินค้า หรือ SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>

          {searchResults.length > 0 && !selectedStock && (
            <div className="mt-2 max-h-60 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-100 absolute w-full z-10">
              {searchResults.map((stock) => (
                <div
                  key={stock.id}
                  onClick={() => { onSelect(stock); setSearchTerm(''); setSearchResults([]); }}
                  className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-slate-700 text-sm">{stock.products.name}</div>
                    <div className="text-xs text-slate-400">{stock.products.sku}</div>
                  </div>
                  <div className="text-right text-xs">
                     <span className="font-bold block">{stock.quantity} {stock.products.uom}</span>
                     <span className="text-slate-400 flex items-center justify-end gap-1"><MapPin size={10}/> {stock.locations.code}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Selected Card
        <div className="relative animate-in fade-in zoom-in-95">
           <div className={`p-4 rounded-xl border bg-${theme}-50/50 border-${theme}-100`}>
              <div className={`text-xs font-bold text-${theme}-600 mb-1`}>SELECTED ITEM</div>
              <div className="font-black text-slate-800 text-lg">{selectedStock.products.name}</div>
              <div className="text-sm text-slate-500 mb-2 font-mono">{selectedStock.products.sku}</div>
              <div className="flex gap-2 text-xs">
                 <span className="bg-white px-2 py-1 rounded border border-slate-200 font-bold text-slate-600">
                    Qty: {selectedStock.quantity} {selectedStock.products.uom}
                 </span>
                 <span className="bg-white px-2 py-1 rounded border border-slate-200 font-bold text-slate-600 flex items-center gap-1">
                    <MapPin size={12}/> {selectedStock.locations.code}
                 </span>
              </div>
           </div>
           <button 
             onClick={() => onSelect(null)} 
             className="absolute top-4 right-4 text-xs font-bold text-red-500 hover:underline"
           >
             เปลี่ยน
           </button>
        </div>
      )}
    </div>
  );
}