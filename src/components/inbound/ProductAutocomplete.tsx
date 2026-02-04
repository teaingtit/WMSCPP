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
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Clear timeouts on unmount to avoid setState / focus on unmounted component
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    };
  }, []);

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
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    focusTimeoutRef.current = setTimeout(() => {
      focusTimeoutRef.current = null;
      inputRef.current?.focus();
    }, 100);
  }, [onSelect]);

  // Redesigned layout: Always show search input, show selected product above results
  return (
    <div className="relative group">
      <label htmlFor="product-search" className="block text-sm font-bold text-foreground mb-2">
        1. ค้นหา หรือ สแกนสินค้า <span className="text-rose-500">*</span>
      </label>

      {/* Search Input - Always visible */}
      <div className="relative transition-all duration-200 transform focus-within:scale-[1.01]">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-indigo-500 transition-colors">
          {isSearching ? <Loader2 size={22} className="animate-spin" /> : <Search size={22} />}
        </div>
        <input
          ref={inputRef}
          id="product-search"
          type="text"
          className="w-full pl-12 pr-12 py-4 bg-card border-2 border-border rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-lg font-medium text-foreground placeholder:text-muted-foreground"
          placeholder="พิมพ์ชื่อ หรือยิงบาร์โค้ด..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => {
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = setTimeout(() => {
              blurTimeoutRef.current = null;
              setShowDropdown(false);
            }, 200);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Barcode size={24} />
        </div>
      </div>

      {/* Selected Product Preview - Show above results when selected */}
      {selectedProduct && (
        <div className="mt-3 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-card p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex justify-between items-center shadow-sm animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
              <Package size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-500 uppercase tracking-wide">
                กำลังเพิ่ม:
              </div>
              <div className="font-bold text-foreground text-base leading-tight">
                {selectedProduct.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                  {selectedProduct.sku}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedProduct.uom || 'Unit'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="p-2 bg-card hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-border hover:border-rose-200 dark:border-border rounded-xl text-muted-foreground hover:text-rose-500 transition-all shadow-sm group"
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
          className="mt-2 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[280px] overflow-y-auto animate-in fade-in slide-in-from-top-2 overscroll-contain"
        >
          {filteredProducts.length > 0 ? (
            <div>
              <div className="px-4 py-2 bg-muted/50 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border flex justify-between sticky top-0 backdrop-blur-sm">
                <span>Found {filteredProducts.length} items</span>
                <span className="hidden sm:inline">Use ↑↓ to navigate, Enter to select</span>
              </div>
              {filteredProducts.map((p, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <div
                    key={p.id}
                    onMouseDown={() => handleSelect(p)}
                    className={`py-5 px-4 cursor-pointer border-b border-border last:border-none transition-all flex justify-between items-center group touch-manipulation active:bg-indigo-100 dark:active:bg-indigo-900/30
                      ${
                        isHighlighted
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-800 pl-6'
                          : 'hover:bg-accent'
                      }
                    `}
                  >
                    <div>
                      <div
                        className={`font-bold text-base ${
                          isHighlighted ? 'text-indigo-700 dark:text-indigo-400' : 'text-foreground'
                        }`}
                      >
                        {p.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs font-mono px-1.5 rounded ${
                            isHighlighted
                              ? 'bg-card text-indigo-600 dark:text-indigo-400 shadow-sm'
                              : 'bg-muted text-muted-foreground'
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
              <div className="p-2 bg-muted rounded-full text-muted-foreground">
                <ScanBarcode size={24} />
              </div>
              <div className="text-muted-foreground font-medium text-sm">
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
