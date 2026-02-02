'use client';

import React, { useState, useMemo, createContext, useContext, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Shield } from 'lucide-react';
import SearchInput from '@/components/ui/SearchInput';
import ExportButton from './ExportButton';

import { StockWithDetails } from '@/types/inventory';
import { EntityStatus } from '@/types/status';
import { StockLotSectionV2 } from './dashboard/StockLotSectionV2';
import { BulkActionBar } from './dashboard/BulkActionBar';
import AnimatedList from '@/components/ui/AnimatedList';
import { Category } from '@/components/inbound/DynamicInboundForm';
import { CartDrawer } from './CartDrawer';
import { getInventoryStatusData, getLotStatuses, LotStatus } from '@/actions/status-actions';
import { useUser } from '@/components/providers/UserProvider';

// Dynamic imports for modal components (loaded on demand)
const BulkTransferModal = dynamic(
  () => import('./modals/BulkTransferModal').then((m) => m.BulkTransferModal),
  { ssr: false },
);
const BulkOutboundModal = dynamic(
  () => import('./modals/BulkOutboundModal').then((m) => m.BulkOutboundModal),
  { ssr: false },
);
const StockDetailModal = dynamic(() => import('./StockDetailModal'), { ssr: false });
const StatusAndNotesModal = dynamic(() => import('./status/StatusAndNotesModal'), { ssr: false });
const LotStatusModal = dynamic(() => import('./LotStatusModal'), { ssr: false });

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface InitialStatusData {
  statuses: Record<string, EntityStatus>;
  noteCounts: Record<string, number>;
  lotStatuses: Record<string, LotStatus>;
}

interface InventoryDashboardProps {
  stocks: StockWithDetails[];
  warehouseId: string;
  categories: Category[];
  warehouses: Warehouse[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  initialStatusData?: InitialStatusData;
}

// Helper: จัดกลุ่มสินค้าตาม Lot -> Position
const buildHierarchy = (stocks: StockWithDetails[]) => {
  // ... existing code ...
  const hierarchy: Record<string, Record<string, StockWithDetails[]>> = {};

  stocks.forEach((item) => {
    // Use flattened properties from page.tsx mapping for consistency
    const lotKey = item.lot || 'Unassigned';
    const posKey = item.cart || 'No Position';

    const lot = hierarchy[lotKey] || (hierarchy[lotKey] = {} as Record<string, StockWithDetails[]>);
    const pos = lot[posKey] || (lot[posKey] = []);
    pos.push(item);
  });

  return hierarchy;
};

// --- Context & Provider ---

interface InventorySelectionContextType {
  selectedIds: Set<string>;
  selectedItems: StockWithDetails[]; // ✅ Provide full objects
  hierarchy: Record<string, Record<string, StockWithDetails[]>>;
  categories: Category[];
  categoryFormSchemas: Record<string, any[]>;
  toggleLot: (lot: string) => void;
  togglePos: (lot: string, pos: string) => void;
  toggleItem: (id: string) => void;
  toggleMultiple: (ids: string[]) => void;
  isLotSelected: (lot: string) => boolean;
  isPosSelected: (lot: string, pos: string) => boolean;
  clearSelection: () => void;
  removeById: (id: string) => void;
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
  children,
}: {
  stocks: StockWithDetails[];
  categories: Category[]; // Receive categories
  children: React.ReactNode;
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const hierarchy = useMemo(() => buildHierarchy(stocks), [stocks]);

  // ✅ Create Map for fast lookup
  const stockMap = useMemo(() => {
    const map = new Map<string, StockWithDetails>();
    stocks.forEach((s) => map.set(s.id, s));
    return map;
  }, [stocks]);

  // ✅ Derive Selected Items
  const selectedItems = useMemo(() => {
    return Array.from(selectedIds)
      .map((id) => stockMap.get(id))
      .filter(Boolean) as StockWithDetails[];
  }, [selectedIds, stockMap]);

  // Create memoized map of category_id to form_schema
  const categoryFormSchemas = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = cat.form_schema || [];
      return acc;
    }, {} as Record<string, any[]>);
  }, [categories]);

  // Helpers for selection status
  const isLotSelected = useCallback(
    (lot: string) => {
      const positions = hierarchy[lot];
      if (!positions) return false;
      const allItems = Object.values(positions).flat();
      return allItems.length > 0 && allItems.every((item) => selectedIds.has(item.id));
    },
    [hierarchy, selectedIds],
  );

  const isPosSelected = useCallback(
    (lot: string, pos: string) => {
      const items = hierarchy[lot]?.[pos];
      return !!items && items.length > 0 && items.every((item) => selectedIds.has(item.id));
    },
    [hierarchy, selectedIds],
  );

  // Toggle Handlers
  const toggleLot = useCallback(
    (lot: string) => {
      const positions = hierarchy[lot];
      if (!positions) return;
      const allItems = Object.values(positions).flat();
      const allIds = allItems.map((i) => i.id);

      setSelectedIds((prev) => {
        const isAll = allItems.length > 0 && allItems.every((item) => prev.has(item.id));
        const newSet = new Set(prev);
        if (isAll) allIds.forEach((id) => newSet.delete(id));
        else allIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    },
    [hierarchy],
  );

  const togglePos = useCallback(
    (lot: string, pos: string) => {
      const items = hierarchy[lot]?.[pos];
      if (!items) return;
      const ids = items.map((i) => i.id);

      setSelectedIds((prev) => {
        const isAll = items.length > 0 && items.every((item) => prev.has(item.id));
        const newSet = new Set(prev);
        if (isAll) ids.forEach((id) => newSet.delete(id));
        else ids.forEach((id) => newSet.add(id));
        return newSet;
      });
    },
    [hierarchy],
  );

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  const toggleMultiple = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const isAll = ids.every((id) => prev.has(id));
      const newSet = new Set(prev);
      if (isAll) ids.forEach((id) => newSet.delete(id));
      else ids.forEach((id) => newSet.add(id));
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const removeById = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const value = useMemo(
    () => ({
      selectedIds,
      selectedItems,
      hierarchy,
      categories,
      categoryFormSchemas,
      toggleLot,
      togglePos,
      toggleItem,
      toggleMultiple,
      isLotSelected,
      isPosSelected,
      clearSelection,
      removeById,
    }),
    [
      selectedIds,
      selectedItems,
      hierarchy,
      categories,
      categoryFormSchemas,
      toggleLot,
      togglePos,
      toggleItem,
      toggleMultiple,
      isLotSelected,
      isPosSelected,
      clearSelection,
      removeById,
    ],
  );

  return (
    <InventorySelectionContext.Provider value={value}>
      {children}
    </InventorySelectionContext.Provider>
  );
};

// --- Inner Component ---
const InventoryDashboardContent = ({
  warehouseId,
  warehouses,
  stocks,
  initialStatusData,
}: {
  warehouseId: string;
  warehouses: Warehouse[];
  stocks: StockWithDetails[];
  initialStatusData: InitialStatusData | undefined;
}) => {
  const router = useRouter();
  const user = useUser();
  const isAdmin = user?.role === 'admin';

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'INTERNAL' | 'CROSS' | 'OUTBOUND' | null>(null);

  // Detail modal state for viewing/editing individual items
  const [detailModalItem, setDetailModalItem] = useState<StockWithDetails | null>(null);

  // Status management state - initialize from server-side data if available
  const [statusModalItem, setStatusModalItem] = useState<StockWithDetails | null>(null);
  const [statusMap, setStatusMap] = useState<Map<string, EntityStatus>>(() =>
    initialStatusData?.statuses ? new Map(Object.entries(initialStatusData.statuses)) : new Map(),
  );
  const [noteCountMap, setNoteCountMap] = useState<Map<string, number>>(() =>
    initialStatusData?.noteCounts
      ? new Map(Object.entries(initialStatusData.noteCounts).map(([k, v]) => [k, Number(v)]))
      : new Map(),
  );
  const [_isLoadingStatus, setIsLoadingStatus] = useState(false);

  // Lot status state - initialize from server-side data if available
  const [lotStatusMap, setLotStatusMap] = useState<Map<string, LotStatus>>(() =>
    initialStatusData?.lotStatuses
      ? new Map(Object.entries(initialStatusData.lotStatuses))
      : new Map(),
  );
  const [lotStatusModalLot, setLotStatusModalLot] = useState<string | null>(null);

  const {
    hierarchy,
    selectedIds,
    selectedItems,
    categories,
    categoryFormSchemas,
    toggleLot,
    togglePos,
    toggleItem,
    toggleMultiple,
    clearSelection,
    removeById,
  } = useInventorySelection();

  const lotKeys = useMemo(
    () => Object.keys(hierarchy).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [hierarchy],
  );

  // Load status data for all stocks (skip if already loaded from server)
  useEffect(() => {
    // Skip if we have initial data from server-side render
    if (initialStatusData && statusMap.size > 0) return;

    const loadStatusData = async () => {
      const stockIds = stocks.map((s) => s.id);
      if (stockIds.length === 0) return;

      setIsLoadingStatus(true);
      try {
        const [{ statuses, noteCounts }, lotStatuses] = await Promise.all([
          getInventoryStatusData(stockIds),
          getLotStatuses(warehouseId),
        ]);
        setStatusMap(statuses);
        setNoteCountMap(noteCounts);
        setLotStatusMap(lotStatuses);
      } catch (error) {
        console.error('Error loading status data:', error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    loadStatusData();
  }, [stocks, warehouseId, initialStatusData, statusMap.size]);

  // Reload status data after changes
  const handleStatusChange = async () => {
    const stockIds = stocks.map((s) => s.id);
    if (stockIds.length === 0) return;

    try {
      const { statuses, noteCounts } = await getInventoryStatusData(stockIds);
      setStatusMap(statuses);
      setNoteCountMap(noteCounts);
    } catch (error) {
      console.error('Error reloading status data:', error);
    }
  };

  // Reload lot status data after changes
  const handleLotStatusChange = async () => {
    try {
      const lotStatuses = await getLotStatuses(warehouseId);
      setLotStatusMap(lotStatuses);
    } catch (error) {
      console.error('Error reloading lot status data:', error);
    }
  };

  const handleLotStatusClick = (lot: string) => {
    setLotStatusModalLot(lot);
  };

  const handleStatusClick = (item: StockWithDetails) => {
    setStatusModalItem(item);
  };

  // Handler for opening item detail modal
  const handleCardClick = (item: StockWithDetails) => {
    setDetailModalItem(item);
  };

  const handleBulkAction = (action: 'internal' | 'cross' | 'outbound') => {
    if (selectedItems.length === 0) return;

    if (action === 'internal') setActiveModal('INTERNAL');
    else if (action === 'cross') setActiveModal('CROSS');
    else if (action === 'outbound') setActiveModal('OUTBOUND');

    setIsCartOpen(false); // Close cart when action starts
  };

  const handleSuccess = () => {
    clearSelection();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
            <span className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Package size={24} />
            </span>
            จัดการสินค้าคงคลัง (Inventory Management)
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            มุมมองแบบ <span className="font-bold text-indigo-600">Lot, Position & Level</span>
            {statusMap?.size > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                <Shield size={12} /> {statusMap.size} รายการที่มีสถานะ
              </span>
            )}
          </p>
        </div>

        <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="w-full md:w-64">
            <SearchInput placeholder="ค้นหา Lot, Position, Level, SKU..." />
          </div>
          <ExportButton warehouseId={warehouseId} />
        </div>
      </div>

      {/* Main Content: Loop Render Lots - Mobile-First with Animations */}
      <div>
        {lotKeys.length === 0 && (
          <div className="text-center py-12 px-4">
            <p className="text-slate-500 mb-4">ไม่พบรายการสินค้า</p>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              ยังไม่มีสต็อกในคลังนี้ — รับสินค้าเข้าจากเมนู Inbound หรือเพิ่มตำแหน่ง (Lot/Position)
              ในตั้งค่าระบบ
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={`/dashboard/${warehouseId}/inbound`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Package size={18} /> รับสินค้าเข้า (Inbound)
              </Link>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                ตั้งค่าระบบ
              </Link>
            </div>
          </div>
        )}

        {lotKeys.length > 0 && (
          <AnimatedList staggerDelay={50}>
            {lotKeys.map((lot) => (
              <StockLotSectionV2
                key={lot}
                lot={lot}
                positions={hierarchy[lot] || {}}
                selectedIds={selectedIds}
                onToggleLot={toggleLot}
                onTogglePos={togglePos}
                onToggleItem={toggleItem}
                onToggleMultiple={toggleMultiple}
                onCardClick={handleCardClick}
                statusMap={statusMap}
                noteCountMap={noteCountMap}
                onStatusClick={handleStatusClick}
                lotStatus={lotStatusMap.get(lot) || null}
                isAdmin={isAdmin}
                onLotStatusClick={handleLotStatusClick}
              />
            ))}
          </AnimatedList>
        )}
      </div>

      {/* ✅ Cart Drawer Component */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={selectedItems}
        onRemove={removeById}
        onAction={handleBulkAction}
      />

      {/* Footer Action Bar (Trigger) */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onOpenCart={() => setIsCartOpen(true)}
        onClear={clearSelection}
      />

      {/* ✅ Action Modals */}
      {activeModal && (activeModal === 'INTERNAL' || activeModal === 'CROSS') && (
        <BulkTransferModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          items={selectedItems}
          currentWarehouseId={warehouseId}
          warehouses={warehouses}
          mode={activeModal}
          onSuccess={handleSuccess}
        />
      )}

      {activeModal === 'OUTBOUND' && (
        <BulkOutboundModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          items={selectedItems}
          currentWarehouseId={warehouseId}
          onSuccess={handleSuccess}
        />
      )}

      {/* Status & Notes Modal */}
      <StatusAndNotesModal
        isOpen={!!statusModalItem}
        onClose={() => setStatusModalItem(null)}
        item={statusModalItem}
        entityType="STOCK"
        onStatusChange={handleStatusChange}
      />

      {/* Stock Detail Modal - for viewing/editing individual items */}
      <StockDetailModal
        isOpen={!!detailModalItem}
        onClose={() => setDetailModalItem(null)}
        item={detailModalItem}
        warehouseId={warehouseId}
        categories={categories}
        categoryFormSchemas={categoryFormSchemas}
      />

      {/* Lot Status Modal - Admin only */}
      {isAdmin && (
        <LotStatusModal
          isOpen={!!lotStatusModalLot}
          onClose={() => setLotStatusModalLot(null)}
          warehouseId={warehouseId}
          lot={lotStatusModalLot || ''}
          currentStatus={lotStatusModalLot ? lotStatusMap.get(lotStatusModalLot) || null : null}
          onStatusChange={handleLotStatusChange}
        />
      )}
    </div>
  );
};

export default function InventoryDashboard({
  stocks,
  warehouseId,
  categories,
  warehouses,
  initialStatusData,
}: InventoryDashboardProps) {
  return (
    <InventorySelectionProvider stocks={stocks} categories={categories}>
      <InventoryDashboardContent
        warehouseId={warehouseId}
        warehouses={warehouses}
        stocks={stocks}
        initialStatusData={initialStatusData}
      />
    </InventorySelectionProvider>
  );
}
