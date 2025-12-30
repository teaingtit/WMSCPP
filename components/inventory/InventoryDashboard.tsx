'use client';

import React, { useState, useMemo } from 'react';
import { Box, Search, ChevronDown, ChevronRight, Truck, ArrowRightLeft, CheckSquare, Square, Package, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SearchInput from '@/components/ui/SearchInput';

// --- Types ---
interface StockItem {
  id: string;
  quantity: number;
  lot: string | null;
  cart_id: string | null;
  products: {
    sku: string;
    name: string;
    uom: string;
  };
  locations: {
    code: string;
  };
}

interface InventoryDashboardProps {
  stocks: any[]; // รับข้อมูลดิบ
  warehouseId: string;
}

// --- Hierarchy Helper ---
// แปลงรายการ Flat List เป็น Tree: Lot -> Cart -> Items
const buildHierarchy = (stocks: StockItem[]) => {
  const hierarchy: Record<string, Record<string, StockItem[]>> = {};

  stocks.forEach(item => {
    const lotKey = item.lot || 'Unassigned Lot';
    const cartKey = item.cart_id || 'No Cart';

    if (!hierarchy[lotKey]) hierarchy[lotKey] = {};
    if (!hierarchy[lotKey][cartKey]) hierarchy[lotKey][cartKey] = [];
    
    hierarchy[lotKey][cartKey].push(item);
  });

  return hierarchy;
};

export default function InventoryDashboard({ stocks, warehouseId }: InventoryDashboardProps) {
  const router = useRouter();
  
  // State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set(Object.keys(buildHierarchy(stocks as StockItem[]))));

  const hierarchy = useMemo(() => buildHierarchy(stocks as StockItem[]), [stocks]);
  const lotKeys = Object.keys(hierarchy).sort();

  // --- Selection Logic (Fixed for Type Safety) ---

  // Check ว่า Lot นี้ถูกเลือกครบไหม
  const isLotSelected = (lot: string) => {
    const carts = hierarchy[lot];
    if (!carts) return false; // Safety Check

    const allItems = Object.values(carts).flat();
    return allItems.length > 0 && allItems.every(item => selectedIds.has(item.id));
  };

  // Check ว่า Cart นี้ถูกเลือกครบไหม
  const isCartSelected = (lot: string, cart: string) => {
    const items = hierarchy[lot]?.[cart]; // Optional Chaining
    if (!items) return false; // Safety Check

    return items.length > 0 && items.every(item => selectedIds.has(item.id));
  };

  // Toggle Lot (Select All / Deselect All in Lot)
  const toggleLot = (lot: string) => {
    const carts = hierarchy[lot];
    if (!carts) return; // Safety Check

    const allItems = Object.values(carts).flat();
    const allIds = allItems.map(i => i.id);
    
    const isAll = isLotSelected(lot);
    const newSet = new Set(selectedIds);

    if (isAll) {
      allIds.forEach(id => newSet.delete(id));
    } else {
      allIds.forEach(id => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  // Toggle Cart
  const toggleCart = (lot: string, cart: string) => {
    const items = hierarchy[lot]?.[cart];
    if (!items) return; // Safety Check

    const ids = items.map(i => i.id);
    const isAll = isCartSelected(lot, cart);
    const newSet = new Set(selectedIds);

    if (isAll) {
      ids.forEach(id => newSet.delete(id));
    } else {
      ids.forEach(id => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  // Toggle Single Item
  const toggleItem = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // Toggle Expand Lot
  const toggleExpand = (lot: string) => {
    const newSet = new Set(expandedLots);
    if (newSet.has(lot)) newSet.delete(lot);
    else newSet.add(lot);
    setExpandedLots(newSet);
  };

  // --- Actions ---
  const handleBulkAction = (action: 'transfer' | 'outbound') => {
    const idsArray = Array.from(selectedIds);
    if (idsArray.length === 0) return;

    const params = new URLSearchParams();
    params.set('ids', idsArray.join(','));
    
    router.push(`/dashboard/${warehouseId}/${action}?${params.toString()}`);
  };

  // Helper UI: Checkbox Icon
  const Checkbox = ({ checked, onClick, className }: { checked: boolean, onClick: (e: React.MouseEvent) => void, className?: string }) => (
    <div onClick={(e) => { e.stopPropagation(); onClick(e); }} className={`cursor-pointer transition-colors ${className}`}>
      {checked ? <CheckSquare className="text-indigo-600" size={20} /> : <Square className="text-slate-300" size={20} />}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
         <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                <span className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
                    <Package size={24}/>
                </span>
                Inventory Management
            </h1>
            <p className="text-slate-500 mt-1 text-sm">มุมมองแบบ <span className="font-bold text-indigo-600">Lot & Cart</span></p>
         </div>
         <div className="w-full md:w-80">
            <SearchInput placeholder="ค้นหา Lot, Cart, SKU..." />
         </div>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {stocks.length === 0 && (
          <div className="text-center py-12 text-slate-400">ไม่พบรายการสินค้า</div>
        )}

        {lotKeys.map(lot => {
          // Safety Access for loop
          const carts = hierarchy[lot] || {}; 
          const cartKeys = Object.keys(carts).sort();
          const isExpanded = expandedLots.has(lot);
          const totalItemsInLot = Object.values(carts).flat().length;
          
          return (
            <div key={lot} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* LEVEL 1: LOT Header */}
              <div 
                className="flex items-center gap-4 p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                onClick={() => toggleExpand(lot)}
              >
                <button aria-label="Expand lot">
                    {isExpanded ? <ChevronDown size={20} className="text-slate-400"/> : <ChevronRight size={20} className="text-slate-400"/>}
                </button>
                
                <Checkbox checked={isLotSelected(lot)} onClick={() => toggleLot(lot)} />

                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lot / Batch</div>
                  <div className="font-bold text-lg text-slate-800">{lot}</div>
                </div>
                
                <div className="text-xs font-bold bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-500">
                   {totalItemsInLot} Items
                </div>
              </div>

              {/* LEVEL 2: CARTS */}
              {isExpanded && (
                <div className="divide-y divide-slate-100">
                  {cartKeys.map(cart => {
                    const itemsInCart = carts[cart] || []; // Safety Access
                    const firstItem = itemsInCart[0];

                    return (
                      <div key={cart} className="p-4 pl-12 bg-white">
                        {/* Cart Header */}
                        <div className="flex items-center gap-3 mb-3">
                           <Checkbox checked={isCartSelected(lot, cart)} onClick={() => toggleCart(lot, cart)} />
                           <ShoppingCart size={18} className="text-indigo-500" />
                           <span className="font-bold text-slate-700">{cart}</span>
                           {firstItem && (
                             <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded ml-2">
                                {firstItem.locations.code}
                             </span>
                           )}
                        </div>

                        {/* LEVEL 3: ITEMS GRID */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ml-8">
                           {itemsInCart.map(item => {
                              const isSelected = selectedIds.has(item.id);
                              return (
                                <div 
                                  key={item.id} 
                                  onClick={() => toggleItem(item.id)}
                                  className={`
                                    relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                                    ${isSelected 
                                      ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                                      : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'}
                                  `}
                                >
                                   <Checkbox checked={isSelected} onClick={() => toggleItem(item.id)} className="shrink-0" />
                                   <div className="min-w-0">
                                      <div className="text-xs font-bold text-slate-500 truncate">{item.products.sku}</div>
                                      <div className="text-sm font-bold text-slate-800 truncate">{item.products.name}</div>
                                      <div className="text-xs text-slate-400 mt-1">
                                         Qty: <span className="text-indigo-600 font-bold">{item.quantity}</span> {item.products.uom}
                                      </div>
                                   </div>
                                </div>
                              );
                           })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FLOATING ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-6 z-50">
           <div className="flex items-center gap-3">
              <div className="bg-indigo-500 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                {selectedIds.size}
              </div>
              <div className="flex flex-col">
                 <span className="font-bold text-sm">Selected Items</span>
                 <span className="text-xs text-slate-400">พร้อมดำเนินการ</span>
              </div>
           </div>

           <div className="flex items-center gap-2">
              <button 
                onClick={() => handleBulkAction('transfer')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm transition-colors"
              >
                <ArrowRightLeft size={16} /> Transfer
              </button>
              <button 
                onClick={() => handleBulkAction('outbound')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-indigo-900/50"
              >
                <Truck size={16} /> Outbound
              </button>
           </div>
        </div>
      )}
    </div>
  );
}