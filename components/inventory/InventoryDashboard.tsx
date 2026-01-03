'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';
import SearchInput from '@/components/ui/SearchInput';
import ExportButton from './ExportButton';
import { StockWithDetails } from '@/types/inventory';
import { StockLotSection } from './dashboard/StockLotSection';
import { BulkActionBar } from './dashboard/BulkActionBar';

interface InventoryDashboardProps {
  stocks: StockWithDetails[];
  warehouseId: string;
}

// Helper: จัดกลุ่มสินค้าตาม Lot -> Position
const buildHierarchy = (stocks: StockWithDetails[]) => {
  const hierarchy: Record<string, Record<string, StockWithDetails[]>> = {};

  stocks.forEach(item => {
    // Use flattened properties from page.tsx mapping for consistency
    const lotKey = item.lot || 'Unassigned';
    const posKey = item.cart || 'No Position';

    if (!hierarchy[lotKey]) hierarchy[lotKey] = {};
    if (!hierarchy[lotKey][posKey]) hierarchy[lotKey][posKey] = [];
    
    hierarchy[lotKey][posKey].push(item);
  });

  return hierarchy;
};

export default function InventoryDashboard({ stocks, warehouseId }: InventoryDashboardProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 1. Prepare Data
  const hierarchy = useMemo(() => buildHierarchy(stocks), [stocks]);
  const lotKeys = Object.keys(hierarchy).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // --- Toggle Logic Helpers ---
  const isLotSelected = (lot: string) => {
    const positions = hierarchy[lot];
    if (!positions) return false;
    const allItems = Object.values(positions).flat();
    return allItems.length > 0 && allItems.every(item => selectedIds.has(item.id));
  };

  const isPosSelected = (lot: string, pos: string) => {
    const items = hierarchy[lot]?.[pos];
    return !!items && items.length > 0 && items.every(item => selectedIds.has(item.id));
  };

  // --- Handlers ---
  const toggleLot = (lot: string) => {
    const positions = hierarchy[lot];
    if (!positions) return;
    const allItems = Object.values(positions).flat();
    const allIds = allItems.map(i => i.id);
    const isAll = isLotSelected(lot);

    const newSet = new Set(selectedIds);
    if (isAll) allIds.forEach(id => newSet.delete(id));
    else allIds.forEach(id => newSet.add(id));
    setSelectedIds(newSet);
  };

  const togglePos = (lot: string, pos: string) => {
    const items = hierarchy[lot]?.[pos];
    if (!items) return;
    const ids = items.map(i => i.id);
    const isAll = isPosSelected(lot, pos);

    const newSet = new Set(selectedIds);
    if (isAll) ids.forEach(id => newSet.delete(id));
    else ids.forEach(id => newSet.add(id));
    setSelectedIds(newSet);
  };

  const toggleItem = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleMultiple = (ids: string[]) => {
    const newSet = new Set(selectedIds);
    const isAll = ids.every(id => newSet.has(id));
    if (isAll) ids.forEach(id => newSet.delete(id));
    else ids.forEach(id => newSet.add(id));
    setSelectedIds(newSet);
  };

  const handleBulkAction = (action: 'transfer' | 'outbound') => {
    const idsArray = Array.from(selectedIds);
    if (idsArray.length === 0) return;
    const params = new URLSearchParams();
    params.set('ids', idsArray.join(','));
    router.push(`/dashboard/${warehouseId}/${action}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
         <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                <span className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
                    <Package size={24}/>
                </span>
                Inventory Management
            </h1>
            <p className="text-slate-500 mt-1 text-sm">มุมมองแบบ <span className="font-bold text-indigo-600">Lot, Position & Level</span></p>
         </div>
         
         <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="w-full md:w-64">
                <SearchInput placeholder="ค้นหา Lot, Position, Level, SKU..." />
            </div>
            <ExportButton warehouseId={warehouseId} />
         </div>
      </div>

      {/* Main Content: Loop Render Lots */}
      <div className="space-y-4">
        {stocks.length === 0 && (
          <div className="text-center py-12 text-slate-400">ไม่พบรายการสินค้า</div>
        )}

        {lotKeys.map(lot => (
            <StockLotSection 
                key={lot}
                lot={lot}
                positions={hierarchy[lot] || {}} // ✅ แก้ไขตรงนี้: ใส่ || {} เพื่อกัน undefined
                selectedIds={selectedIds}
                onToggleLot={toggleLot}
                onTogglePos={togglePos}
                onToggleItem={toggleItem}
                onToggleMultiple={toggleMultiple}
            />
        ))}
      </div>

      {/* Footer Action Bar */}
      <BulkActionBar 
        selectedCount={selectedIds.size} 
        onAction={handleBulkAction} 
      />
    </div>
  );
}