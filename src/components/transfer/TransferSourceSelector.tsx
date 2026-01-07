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
  queuedStockIds?: Set<string>; // IDs of stocks already in queue to filter out
}

export default function TransferSourceSelector({
  warehouseId,
  activeTab,
  selectedStock,
  onSelect,
  onAddToQueue,
  queuedStockIds = new Set(),
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
    // Don't search if the search term is empty
    if (!debouncedSearch) {
      setSearchResults([]);
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
          // Filter out items already in queue
          const filtered = normalized.filter((s: any) => !queuedStockIds.has(s.id));
          setSearchResults(filtered);
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
  }, [debouncedSearch, warehouseId, queuedStockIds]);

  return (
    <div
      className={`p-6 rounded-3xl border transition-all bg-white shadow-sm duration-300 border-slate-200`}
    >
      <h3 className={`font-bold text-slate-700 mb-4 flex items-center gap-2`}>
        <div className={`p-2 rounded-lg ${themeColors.bg} ${themeColors.text}`}>
          <PackageSearch size={20} />
        </div>
        <span>1. เลือกสินค้าต้นทาง</span>
      </h3>

      {/* Search Input - Always visible */}
      <div className="relative group z-10">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-600">
            {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
          </div>
          <input
            className={`w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white transition-all font-medium ${themeColors.ring} ${themeColors.borderFocus} focus:ring-4`}
            placeholder="ค้นหาชื่อสินค้า, SKU หรือ พิกัด..."
            ref={inputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Selected Stock Preview - Show above results when selected */}
        {selectedStock && (
          <div className="mt-3 animate-in fade-in zoom-in-95">
            <div
              className={`p-4 rounded-2xl ${themeColors.bg} ${themeColors.border} border relative`}
            >
              <button
                onClick={() => {
                  onSelect(null);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 text-xs font-bold underline"
              >
                ยกเลิก
              </button>
              <div
                className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${themeColors.text}`}
              >
                กำลังทำรายการ:
              </div>
              <div className="font-black text-slate-800 text-lg leading-snug pr-16">
                {selectedStock?.product?.name}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="font-mono bg-white/50 text-slate-600 px-1.5 py-0.5 rounded border">
                  {selectedStock?.product?.sku}
                </span>
                <span className={`flex items-center gap-1 ${themeColors.text}`}>
                  <MapPin size={12} /> {selectedStock?.location?.code}
                </span>
                <span className="font-bold text-slate-700 ml-auto">
                  {selectedStock?.quantity} {selectedStock?.product?.uom}
                </span>
              </div>
              {/* Add to Queue Button */}
              {onAddToQueue && (
                <button
                  onClick={() => {
                    onAddToQueue(selectedStock);
                    onSelect(null);
                  }}
                  className={`mt-3 w-full py-2 ${
                    activeTab === 'INTERNAL'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  } text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2`}
                >
                  <PackageSearch size={16} />
                  เพิ่มลงคิว
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search Results - Always visible when there are results */}
        {searchResults.length > 0 && (
          <div className="mt-3 max-h-[280px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-100 custom-scrollbar animate-in fade-in slide-in-from-top-2 ring-1 ring-slate-900/5">
            <div className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase bg-slate-50/80 backdrop-blur-sm border-b border-slate-100 sticky top-0">
              ผลการค้นหา ({searchResults.length})
            </div>
            {searchResults.map((stock) => (
              <div
                key={stock.id}
                onClick={() => {
                  onSelect(stock);
                  // Don't clear search term or results - allow continuous adding
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

        {searchTerm && searchResults.length === 0 && !isSearching && (
          <div className="mt-4 text-center text-slate-400 text-sm">
            {queuedStockIds.size > 0
              ? 'รายการที่ตรงกันอยู่ในคิวแล้ว หรือไม่พบสินค้า'
              : 'ไม่พบสินค้าที่มีสต็อก'}
          </div>
        )}
      </div>
    </div>
  );
}
