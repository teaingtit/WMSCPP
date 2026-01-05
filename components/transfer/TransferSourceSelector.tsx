'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Box, PackageSearch, ArrowRight } from 'lucide-react';
import { searchStockForTransfer } from '@/actions/transfer-actions';
import { useDebounce } from 'use-debounce';

interface Props {
  warehouseId: string;
  activeTab: 'INTERNAL' | 'CROSS';
  selectedStock: any;
  onSelect: (stock: any) => void;
}

export default function TransferSourceSelector({
  warehouseId,
  activeTab,
  selectedStock,
  onSelect,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null); // Suggestion 3: Add ref for focus management

  // Colors based on Tab
  const theme = activeTab === 'INTERNAL' ? 'orange' : 'indigo';
  const themeColors = {
    INTERNAL: {
      text: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      ring: 'focus:ring-orange-500/20',
      borderFocus: 'focus:border-orange-500',
    },
    CROSS: {
      text: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      ring: 'focus:ring-indigo-500/20',
      borderFocus: 'focus:border-indigo-500',
    },
  }[activeTab];

  useEffect(() => {
    if (!debouncedSearch || selectedStock) return;
    const search = async () => {
      setIsSearching(true);
      try {
        const res = await searchStockForTransfer(warehouseId, debouncedSearch);
        setSearchResults(res);
      } catch (error) {
        setSearchResults([]);
        console.error('Failed to search for stock:', error); // Suggestion 2: Improve error logging
      } finally {
        setIsSearching(false);
      }
    };
    search();
  }, [debouncedSearch, warehouseId, selectedStock]);

  return (
    <div
      className={`p-6 rounded-3xl border transition-all bg-white shadow-sm duration-300 ${
        selectedStock ? themeColors.bg + ' ' + themeColors.border : 'border-slate-200'
      }`}
    >
      <h3 className={`font-bold text-slate-700 mb-4 flex items-center gap-2`}>
        <div className={`p-2 rounded-lg ${themeColors.bg} ${themeColors.text}`}>
          <PackageSearch size={20} />
        </div>
        <span>1. เลือกสินค้าต้นทาง</span>
      </h3>

      {!selectedStock ? (
        <div className="relative group">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-600">
              {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            </div>
            <input
              className={`w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white transition-all font-medium ${themeColors.ring} ${themeColors.borderFocus} focus:ring-4`}
              placeholder="ค้นหาชื่อสินค้า, SKU หรือ พิกัด..."
              ref={inputRef} // Suggestion 3: Attach ref
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && !selectedStock && (
            <div className="mt-3 max-h-[320px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-100 absolute w-full z-20 custom-scrollbar animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50 border-b border-slate-50">
                ผลการค้นหา ({searchResults.length})
              </div>
              {searchResults.map((stock) => (
                <div
                  key={stock.id}
                  // Suggestion 1: Improve selection UX by setting search term to product name
                  onClick={() => {
                    onSelect(stock);
                    setSearchTerm(stock.products.name);
                    setSearchResults([]);
                  }}
                  className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer group transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-slate-700 group-hover:text-slate-900 mb-1">
                        {stock.products.name}
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 rounded border border-slate-200">
                          {stock.products.sku}
                        </span>
                      </div>
                    </div>

                    {/* Right Side: Location & Qty Badge */}
                    <div className="text-right pl-4">
                      <div className={`font-black text-lg ${themeColors.text}`}>
                        {stock.quantity.toLocaleString()}{' '}
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {stock.products.uom}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-xs font-bold text-slate-500 mt-1 bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">
                        <MapPin size={10} className={themeColors.text} /> {stock.locations.code}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchTerm && searchResults.length === 0 && !isSearching && (
            <div className="absolute w-full mt-2 p-4 text-center bg-white border border-slate-100 rounded-2xl shadow-lg z-20 text-slate-500 text-sm">
              ไม่พบสินค้าในสต็อก
            </div>
          )}
        </div>
      ) : (
        // Selected Card View
        <div className="relative animate-in fade-in zoom-in-95">
          <div
            className={`p-5 rounded-2xl bg-white border border-white/50 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between`}
          >
            {/* Product Info */}
            <div className="flex-1">
              <div
                className={`text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70 ${themeColors.text}`}
              >
                Source Stock
              </div>
              <div className="font-black text-slate-800 text-xl leading-snug">
                {selectedStock.products.name}
              </div>
              <div className="text-sm text-slate-500 font-mono mt-0.5">
                {selectedStock.products.sku}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="flex items-stretch gap-2 w-full md:w-auto">
              <div
                className={`px-4 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[80px] ${themeColors.bg} ${themeColors.border}`}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Location</span>
                <div className={`font-bold flex items-center gap-1 ${themeColors.text}`}>
                  <MapPin size={14} /> {selectedStock.locations.code}
                </div>
              </div>
              <div
                className={`px-4 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[80px] bg-slate-800 border-slate-700 text-white shadow-lg`}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Available</span>
                <div className="font-black text-lg">
                  {selectedStock.quantity}{' '}
                  <span className="text-[10px] font-normal opacity-70">
                    {selectedStock.products.uom}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Change Button */}
          <button
            // Suggestion 3: Improve workflow by focusing input on clear
            onClick={() => {
              onSelect(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-100 hover:scale-110"
            aria-label="Change selection"
          >
            <Box size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
