'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Package, Barcode, ChevronRight, ScanBarcode, Loader2 } from 'lucide-react';
import { Product } from '@/types/inventory';
import { searchProducts } from '@/actions/product-search-actions';
import { useDebounce } from 'use-debounce';

interface ProductAutocompleteProps {
  selectedProduct: Product | null;
  onSelect: (product: Product | null) => void;
  queuedProductIds?: Set<string>; // IDs of products already in queue to filter out
}

export default function ProductAutocomplete({
  selectedProduct,
  onSelect,
  queuedProductIds = new Set(),
}: ProductAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 400);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Server-side search with debounce
  useEffect(() => {
    if (!debouncedSearch) {
      setFilteredProducts([]);
      return;
    }

    let active = true;
    const performSearch = async () => {
      setIsSearching(true);
      try {
        const result = await searchProducts(debouncedSearch, 10);
        if (active && result.success && result.data) {
          // Filter out products already in queue
          const filtered = result.data.filter(
            (p) => !queuedProductIds.has(p.id) || selectedProduct?.id === p.id,
          );
          setFilteredProducts(filtered as Product[]);
        }
      } catch (error) {
        console.error('Search error:', error);
        if (active) setFilteredProducts([]);
      } finally {
        if (active) setIsSearching(false);
      }
    };

    performSearch();

    return () => {
      active = false;
    };
  }, [debouncedSearch, queuedProductIds, selectedProduct]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredProducts.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredProducts.length) % filteredProducts.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const productToSelect = filteredProducts[highlightedIndex];
      if (productToSelect) {
        handleSelect(productToSelect);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // Suggestion 2: Improve UX by showing the selected product's name in the input.
  const handleSelect = useCallback(
    (product: Product) => {
      onSelect(product);
      // Don't clear search term - allow continuous selection flow
      setShowDropdown(false);
    },
    [onSelect],
  );

  // Suggestion 3: Create a dedicated handler for clearing the selection.
  const handleClearSelection = useCallback(() => {
    onSelect(null);
    // Don't clear search term - keep the search active
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [onSelect]);

  // Redesigned layout: Always show search input, show selected product above results
  return (
    <div className="relative group">
      <label htmlFor="product-search" className="block text-sm font-bold text-slate-700 mb-2">
        1. ค้นหา หรือ สแกนสินค้า <span className="text-rose-500">*</span>
      </label>

      {/* Search Input - Always visible */}
      <div className="relative transition-all duration-200 transform focus-within:scale-[1.01]">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
          {isSearching ? <Loader2 size={22} className="animate-spin" /> : <Search size={22} />}
        </div>
        <input
          ref={inputRef}
          id="product-search"
          type="text"
          className="w-full pl-12 pr-12 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-lg font-medium placeholder:text-slate-300"
          placeholder="พิมพ์ชื่อ หรือยิงบาร์โค้ด..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
          <Barcode size={24} />
        </div>
      </div>

      {/* Selected Product Preview - Show above results when selected */}
      {selectedProduct && (
        <div className="mt-3 bg-gradient-to-br from-indigo-50 to-white p-4 rounded-2xl border border-indigo-100 flex justify-between items-center shadow-sm animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
              <Package size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">
                กำลังเพิ่ม:
              </div>
              <div className="font-bold text-slate-800 text-base leading-tight">
                {selectedProduct.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                  {selectedProduct.sku}
                </span>
                <span className="text-[10px] text-slate-400">{selectedProduct.uom || 'Unit'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="p-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-slate-400 hover:text-rose-500 transition-all shadow-sm group"
            aria-label="Remove product"
          >
            <X size={16} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      )}

      {/* Dropdown Results - Show when searching */}
      {showDropdown && searchTerm && (
        <div
          ref={dropdownRef}
          className="mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[280px] overflow-y-auto animate-in fade-in slide-in-from-top-2"
        >
          {filteredProducts.length > 0 ? (
            <div>
              <div className="px-4 py-2 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 flex justify-between sticky top-0 backdrop-blur-sm">
                <span>Found {filteredProducts.length} items</span>
                <span className="hidden sm:inline">Use ↑↓ to navigate, Enter to select</span>
              </div>
              {filteredProducts.map((p, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <div
                    key={p.id}
                    onMouseDown={() => handleSelect(p)}
                    className={`p-4 cursor-pointer border-b border-slate-50 last:border-none transition-all flex justify-between items-center group
                      ${isHighlighted ? 'bg-indigo-50 border-indigo-100 pl-6' : 'hover:bg-slate-50'}
                    `}
                  >
                    <div>
                      <div
                        className={`font-bold text-base ${
                          isHighlighted ? 'text-indigo-700' : 'text-slate-700'
                        }`}
                      >
                        {p.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs font-mono px-1.5 rounded ${
                            isHighlighted
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.sku}
                        </span>
                      </div>
                    </div>
                    {isHighlighted && (
                      <ChevronRight size={18} className="text-indigo-400 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center flex flex-col items-center gap-2">
              <div className="p-2 bg-slate-50 rounded-full text-slate-300">
                <ScanBarcode size={24} />
              </div>
              <div className="text-slate-500 font-medium text-sm">
                {queuedProductIds.size > 0
                  ? 'รายการที่ตรงกันอยู่ในคิวแล้ว'
                  : `ไม่พบสินค้า "${searchTerm}"`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
