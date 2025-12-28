'use client';

import React from 'react';
import { Package, MapPin, AlertCircle, Calendar, Hash } from 'lucide-react';

interface InventoryCardProps {
  item: {
    id: string;
    quantity: number;
    updated_at: string;
    products: {
      sku: string;
      name: string;
      uom: string;
      category_id: string;
      min_stock: number;
    };
    locations: {
      code: string;
    };
  };
}

export default function InventoryCard({ item }: InventoryCardProps) {
  const isLowStock = item.quantity <= (item.products.min_stock || 10);
  const isChemical = item.products.category_id === 'CHEMICAL';

  return (
    <div className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col h-full cursor-pointer">
      
      {/* Decorative BG */}
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full -mr-6 -mt-6 opacity-10 group-hover:opacity-20 transition-opacity ${
          isChemical ? 'bg-amber-500' : 'bg-indigo-500'
      }`}></div>

      {/* Header: Category & Location */}
      <div className="flex justify-between items-start mb-3 relative z-10">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border ${
               isChemical 
               ? 'bg-amber-50 text-amber-700 border-amber-100' 
               : 'bg-indigo-50 text-indigo-700 border-indigo-100'
          }`}>
              {item.products.category_id}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-800 text-white px-2 py-1 rounded">
              <MapPin size={10} /> {item.locations.code}
          </span>
      </div>
      
      {/* Content: Name & SKU */}
      <div className="mb-4 relative z-10 flex-1">
          <h3 className="font-bold text-slate-800 text-base leading-snug mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">
              {item.products.name}
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
              <Hash size={12} /> {item.products.sku}
          </div>
      </div>

      {/* Footer: Qty & Status */}
      <div className="pt-3 border-t border-slate-100 relative z-10 mt-auto">
          <div className="flex justify-between items-end">
              <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                      {item.quantity.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{item.products.uom}</span>
              </div>
              
              {isLowStock && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold border border-rose-100 animate-pulse">
                      <AlertCircle size={12} /> Low Stock
                  </div>
              )}
          </div>
          
          <div className="mt-2 text-[10px] text-slate-300 flex items-center gap-1 justify-end">
             <Calendar size={10} /> {new Date(item.updated_at).toLocaleDateString('th-TH')}
          </div>
      </div>
    </div>
  );
}