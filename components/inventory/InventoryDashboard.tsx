'use client';

import React, { useState, useMemo, createContext, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';
import SearchInput from '@/components/ui/SearchInput';
import ExportButton from './ExportButton';
import { StockWithDetails } from '@/types/inventory';
import { StockLotSection } from './dashboard/StockLotSection';
import { BulkActionBar } from './dashboard/BulkActionBar';
import { Category } from '@/components/inbound/DynamicInboundForm'; // Import Category interface

interface InventoryDashboardProps {
  stocks: StockWithDetails[];
  warehouseId: string;
  categories: Category[]; // Add categories prop
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

// --- Context & Provider ---

interface InventorySelectionContextType {
  selectedIds: Set<string>;
  hierarchy: Record<string, Record<string, StockWithDetails[]>>;
  categoryFormSchemas: Record<string, any[]>; // Add categoryFormSchemas to context
  toggleLot: (lot: string) => void;
  togglePos: (lot: string, pos: string) => void;
  toggleItem: (id: string) => void;
  toggleMultiple: (ids: string[]) => void;
  isLotSelected: (lot: string) => boolean;
  isPosSelected: (lot: string, pos: string) => boolean;
}

const InventorySelectionContext = createContext<InventorySelectionContextType | null>(null);

export const useInventorySelection = () => {
  const context = useContext(InventorySelectionContext);
  if (!context) {
    throw new Error('useInventorySelection must be used within an InventorySelectionProvider');
  }
  return context;
};

export const InventorySelectionProvider = ({ 
  stocks, 
  categories, // Receive categories
  children 
}: { 
  stocks: StockWithDetails[]; 
  categories: Category[]; // Receive categories
  children: React.ReactNode; 
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const hierarchy = useMemo(() => buildHierarchy(stocks), [stocks]);

  // Create memoized map of category_id to form_schema
  const categoryFormSchemas = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = cat.form_schema || [];
      return acc;
    }, {} as Record<string, any[]>);
  }, [categories]);

  // Helpers for selection status
  const isLotSelected = useCallback((lot: string) => {
    const positions = hierarchy[lot];
    if (!positions) return false;
    const allItems = Object.values(positions).flat();
    return allItems.length > 0 && allItems.every(item => selectedIds.has(item.id));
  }, [hierarchy, selectedIds]);

  const isPosSelected = useCallback((lot: string, pos: string) => {
    const items = hierarchy[lot]?.[pos];
    return !!items && items.length > 0 && items.every(item => selectedIds.has(item.id));
  }, [hierarchy, selectedIds]);

  // Toggle Handlers
  const toggleLot = useCallback((lot: string) => {
    const positions = hierarchy[lot];
    if (!positions) return;
    const allItems = Object.values(positions).flat();
    const allIds = allItems.map(i => i.id);

    setSelectedIds(prev => {
        const isAll = allItems.length > 0 && allItems.every(item => prev.has(item.id));
        const newSet = new Set(prev);
        if (isAll) allIds.forEach(id => newSet.delete(id));
        else allIds.forEach(id => newSet.add(id));
        return newSet;
    });
  }, [hierarchy]);

  const togglePos = useCallback((lot: string, pos: string) => {
    const items = hierarchy[lot]?.[pos];
    if (!items) return;
    const ids = items.map(i => i.id);

    setSelectedIds(prev => {
        const isAll = items.length > 0 && items.every(item => prev.has(item.id));
        const newSet = new Set(prev);
        if (isAll) ids.forEach(id => newSet.delete(id));
        else ids.forEach(id => newSet.add(id));
        return newSet;
    });
  }, [hierarchy]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
    });
  }, []);

  const toggleMultiple = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
        const isAll = ids.every(id => prev.has(id));
        const newSet = new Set(prev);
        if (isAll) ids.forEach(id => newSet.delete(id));
        else ids.forEach(id => newSet.add(id));
        return newSet;
    });
  }, []);

  const value = useMemo(() => ({
    selectedIds,
    hierarchy,
    categoryFormSchemas, // Provide categoryFormSchemas
    toggleLot,
    togglePos,
    toggleItem,
    toggleMultiple,
    isLotSelected,
    isPosSelected
  }), [selectedIds, hierarchy, categoryFormSchemas, toggleLot, togglePos, toggleItem, toggleMultiple, isLotSelected, isPosSelected]);

  return (
    <InventorySelectionContext.Provider value={value}>
      {children}
    </InventorySelectionContext.Provider>
  );
};

// --- Inner Component ---
const InventoryDashboardContent = ({ warehouseId }: { warehouseId: string }) => {
  const router = useRouter();
  const { 
    hierarchy, 
    selectedIds, 
    toggleLot, 
    togglePos, 
    toggleItem, 
    toggleMultiple 
  } = useInventorySelection();

  const lotKeys = useMemo(() => Object.keys(hierarchy).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [hierarchy]);

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
        {lotKeys.length === 0 && (
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
                categoryFormSchemas={categoryFormSchemas} // Pass categoryFormSchemas to StockLotSection
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

export default function InventoryDashboard({ stocks, warehouseId, categories }: InventoryDashboardProps) {
  return (
    <InventorySelectionProvider stocks={stocks} categories={categories}>
      <InventoryDashboardContent warehouseId={warehouseId} />
    </InventorySelectionProvider>
  );
}