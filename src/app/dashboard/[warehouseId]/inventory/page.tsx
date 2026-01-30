import { createClient } from '@/lib/supabase/server';
import InventoryDashboard from '@/components/inventory/InventoryDashboard';
import InventoryFAB from '@/components/inventory/InventoryFAB';
import PaginationControls from '@/components/ui/PaginationControls';
import { StockWithDetails } from '@/types/inventory';
import { getProductCategories } from '@/actions/inbound-actions';
import { getInventoryStatusData, getLotStatuses } from '@/actions/status-actions';
import { isValidUUID } from '@/lib/utils';

const PAGE_SIZE = 50;

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: { warehouseId: string };
  searchParams?: { q?: string; page?: string };
}) {
  const { warehouseId } = params;
  const query = searchParams?.q || '';
  const currentPage = Math.max(1, Number(searchParams?.page) || 1);

  const supabase = await createClient();

  // ✅ FIX: Handle both UUID and code identifiers, use maybeSingle() to avoid PGRST116 error
  let warehouseQuery = supabase.from('warehouses').select('id');

  // If it's a UUID, query by id; otherwise query by code
  if (isValidUUID(warehouseId)) {
    warehouseQuery = warehouseQuery.eq('id', warehouseId);
  } else {
    warehouseQuery = warehouseQuery.eq('code', warehouseId);
  }

  const { data: wh } = await warehouseQuery.maybeSingle();

  if (!wh) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="rounded-full bg-rose-50 p-4 ring-1 ring-rose-100">
          <span className="text-3xl">🏠</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">ไม่พบคลังสินค้า</h3>
          <p className="text-sm text-slate-500">ไม่พบข้อมูลคลังสินค้า: {warehouseId}</p>
        </div>
      </div>
    );
  }

  // Fetch product categories and all warehouses (for cross transfer modal)
  const [categories, warehousesRes] = await Promise.all([
    getProductCategories(),
    supabase.from('warehouses').select('id, code, name').order('code'),
  ]);

  const warehouses = warehousesRes.data || [];

  // Build base query for stocks
  let baseQuery = supabase
    .from('stocks')
    .select(
      `
      id, quantity, updated_at, attributes,
      products!inner(*),
      locations!inner(*)
    `,
      { count: 'exact' },
    )
    .eq('locations.warehouse_id', wh.id)
    .gt('quantity', 0);

  // Apply server-side search filter if query exists
  if (query) {
    const searchPattern = `%${query}%`;
    baseQuery = baseQuery.or(
      `products.name.ilike.${searchPattern},products.sku.ilike.${searchPattern}`,
    );
  }

  // Calculate pagination offset
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Execute query with pagination and ordering
  const {
    data: stocks,
    error,
    count,
  } = await baseQuery
    .order('lot', { foreignTable: 'locations', ascending: true })
    .order('cart', { foreignTable: 'locations', ascending: true })
    .order('level', { foreignTable: 'locations', ascending: true })
    .order('sku', { foreignTable: 'products', ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (error) {
    console.error(error);
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="rounded-full bg-slate-50 p-4 ring-1 ring-slate-100">
          <span className="text-3xl">⚠️</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
          <p className="text-sm text-slate-500">กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง</p>
        </div>
      </div>
    );
  }

  // Build Attribute Label Map
  const attributeLabelMap: Record<string, string> = {};
  if (categories) {
    categories.forEach((cat: any) => {
      if (Array.isArray(cat.form_schema)) {
        cat.form_schema.forEach((field: any) => {
          if (field.key && field.label) {
            attributeLabelMap[field.key] = field.label;
          }
        });
      }
    });
  }

  // Transform stock data to match UI component expectations
  const formattedStocks: StockWithDetails[] = (stocks || []).map((stock: any) => {
    // Resolve Attributes
    const resolvedAttributes: Record<string, any> = {};
    if (stock.attributes) {
      Object.entries(stock.attributes).forEach(([key, value]) => {
        const label = attributeLabelMap[key] || key;
        resolvedAttributes[label] = value;
      });
    }

    return {
      ...stock,
      id: String(stock.id),
      // Fix: Map plural (DB) to singular (UI Component Expectation)
      product: stock.products,
      location: stock.locations,
      // Map nested data to top-level properties for UI compatibility
      lot: stock.locations?.lot,
      cart: stock.locations?.cart,
      level: stock.locations?.level,
      sku: stock.products?.sku,
      name: stock.products?.name,
      image_url: stock.products?.image_url,
      attributes: resolvedAttributes, // Pass resolved attributes
    };
  });

  // Fetch status data server-side (eliminates N+1 client-side fetch)
  const stockIds = formattedStocks.map((s) => s.id);
  const [statusData, lotStatusMap] = await Promise.all([
    stockIds.length > 0
      ? getInventoryStatusData(stockIds)
      : { statuses: new Map(), noteCounts: new Map() },
    getLotStatuses(wh.id),
  ]);

  // Convert Maps to serializable objects for client component
  const initialStatusData = {
    statuses: Object.fromEntries(statusData.statuses),
    noteCounts: Object.fromEntries(statusData.noteCounts),
    lotStatuses: Object.fromEntries(lotStatusMap),
  };

  return (
    <div className="min-h-screen bg-slate-50/30 pb-32 p-3 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mx-auto max-w-7xl">
        <InventoryDashboard
          stocks={formattedStocks}
          warehouseId={wh.id}
          categories={categories}
          warehouses={warehouses}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          initialStatusData={initialStatusData}
        />

        {/* Pagination */}
        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}
      </div>

      {/* Floating Action Button - Quick Add Stock */}
      <InventoryFAB warehouseId={warehouseId} />
    </div>
  );
}
