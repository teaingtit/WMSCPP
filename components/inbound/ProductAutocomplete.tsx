'use client';

import React, { useState } from 'react';
import { Search, X, Package } from 'lucide-react';
import { Product } from '@/types/inventory'; // ตรวจสอบ path type ให้ถูกต้อง

interface ProductAutocompleteProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelect: (product: Product | null) => void;
}

export default function ProductAutocomplete({ products, selectedProduct, onSelect }: ProductAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter Logic
  const filteredProducts = products.filter((p) => 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 8);

  // กรณีเลือกสินค้าแล้ว
  if (selectedProduct) {
    return (
      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center animate-in fade-in zoom-in">
        <div>
           <div className="font-bold text-indigo-900">{selectedProduct.name}</div>
           <div className="text-xs text-indigo-500 font-mono">{selectedProduct.sku}</div>
        </div>
        <button 
           type="button" 
           onClick={() => { onSelect(null); setSearchTerm(''); }} 
           className="p-2 hover:bg-indigo-100 rounded-full text-indigo-600 transition-colors"
           aria-label="Remove product"
        >
           <X size={18} />
        </button>
      </div>
    );
  }

  // กรณีค้นหา
  return (
    <div className="relative">
        <label htmlFor="product-search" className="sr-only">ค้นหาสินค้า</label>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
            id="product-search"
            type="text"
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            placeholder="ค้นหาชื่อ หรือ Scan SKU..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // Delay เพื่อให้คลิกเลือกได้ทัน
            autoComplete="off"
        />
        
        {/* Dropdown Results */}
        {showDropdown && searchTerm && (
            <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden max-h-[300px] overflow-y-auto">
                {filteredProducts.length > 0 ? filteredProducts.map((p) => (
                    <div 
                        key={p.id} 
                        onMouseDown={() => { onSelect(p); setSearchTerm(p.name); setShowDropdown(false); }} // ใช้ onMouseDown แทน onClick เพื่อทำงานก่อน onBlur
                        className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-none transition-colors"
                    >
                        <div className="font-bold text-slate-700">{p.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{p.sku}</div>
                    </div>
                )) : (
                    <div className="p-4 text-center text-slate-400 text-sm">ไม่พบสินค้า</div>
                )}
            </div>
        )}
    </div>
  );
}