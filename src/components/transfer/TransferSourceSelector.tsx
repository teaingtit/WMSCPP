'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Box, PackageSearch } from 'lucide-react';
import { searchStockForTransfer } from '@/actions/transfer-actions';
import { useDebounce } from 'use-debounce';

interface Props {
  warehouseId: string;
  activeTab: 'INTERNAL' | 'CROSS';
  selectedStock: any;
  onSelect: (stock: any) => void;
  onAddToQueue?: (stock: any) => void;
}

export default function TransferSourceSelector({
  warehouseId,
  activeTab,
  selectedStock,
  onSelect,
  onAddToQueue,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null); // Suggestion 3: Add ref for focus management

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
    if (!debouncedSearch || selectedStock) {
      setSearchResults([]); // Ensure results are cleared if term is empty or item selected
      return;
    }

    let active = true;
    const search = async () => {
      setIsSearching(true);
      try {
        const res = await searchStockForTransfer(warehouseId, debouncedSearch);
        if (active) {
          // Normalize the response to handle 'products' vs 'product'
          const normalized = (res || []).map((s: any) => ({
            ...s,
            product: s.products || s.product,
            location: s.locations || s.location,
          }));
          setSearchResults(normalized);
        }
      } catch (error) {
        if (active) {
          setSearchResults([]);
          console.error('Failed to search for stock:', error);
        }
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    };
    search();

    return () => {
      active = false;
    };
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
        <div className="relative group z-10">
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
            <div className="mt-3 max-h-[320px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-100 absolute w-full z-20 custom-scrollbar animate-in fade-in slide-in-from-top-2 ring-1 ring-slate-900/5">
              <div className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase bg-slate-50/80 backdrop-blur-sm border-b border-slate-100 sticky top-0">
                ผลการค้นหา ({searchResults.length})
              </div>
              {searchResults.map((stock) => (
                <div
                  key={stock.id}
                  onClick={() => {
                    onSelect(stock);
                    setSearchTerm(stock.product?.name || '');
                    setSearchResults([]);
                    // Auto-add to queue if the parent provided handler
                    onAddToQueue && onAddToQueue(stock);
                  }}
                  className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer group transition-colors flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <Box size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-700 group-hover:text-slate-900 truncate">
                      {stock.product?.name || 'Unknown Product'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                        {stock.product?.sku || 'NO SKU'}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                        <MapPin size={10} /> {stock.location?.code || '?'}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-auto">
                        Qty: {stock.quantity} {stock.product?.uom}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
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
            <div className="flex-1 min-w-0">
              <div
                className={`text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70 ${themeColors.text}`}
              >
                Source Stock
              </div>
              <div className="font-black text-slate-800 text-xl leading-snug truncate pr-8">
                {selectedStock?.product?.name}
              </div>
              <div className="text-sm text-slate-500 font-mono mt-0.5">
                {selectedStock?.product?.sku}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="flex items-stretch gap-2 w-full md:w-auto mt-2 md:mt-0">
              <div
                className={`px-4 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[90px] ${themeColors.bg} ${themeColors.border}`}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Location</span>
                <div className={`font-bold flex items-center gap-1 ${themeColors.text}`}>
                  <MapPin size={14} /> {selectedStock?.location?.code}
                </div>
              </div>
              <div
                className={`px-4 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[90px] bg-slate-800 border-slate-700 text-white shadow-lg`}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Available</span>
                <div className="font-black text-lg">
                  {selectedStock?.quantity}{' '}
                  <span className="text-[10px] font-normal opacity-70">
                    {selectedStock?.product?.uom}
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
            className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-100 hover:scale-110 z-10"
            aria-label="Change selection"
          >
            <Box size={16} />
          </button>

          {/* Add to Queue Button - Only show if callback exists */}
          {onAddToQueue && (
            <button
              onClick={() => onAddToQueue(selectedStock)}
              className="absolute -bottom-3 -right-3 py-2 px-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all border-2 border-white flex items-center gap-2 font-bold text-sm"
            >
              <PackageSearch size={16} />
              เพิ่มลงคิว
            </button>
          )}
        </div>
      )}
    </div>
  );
}
