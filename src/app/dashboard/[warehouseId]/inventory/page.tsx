import { createClient } from '@/lib/supabase/server';
import InventoryDashboard from '@/components/inventory/InventoryDashboard';
import InventoryFAB from '@/components/inventory/InventoryFAB';
import PaginationControls from '@/components/ui/PaginationControls';
import { StockWithDetails } from '@/types/inventory';
import { getProductCategories } from '@/actions/inbound-actions';
import { getInventoryStatusData, getLotStatuses } from '@/actions/status-actions';
import { getInventoryByPositions } from '@/actions/inventory-actions';
import { isValidUUID } from '@/lib/utils';
import { Category } from '@/components/inbound/DynamicInboundForm';
import {
  formatInventoryError,
  formatSupabaseError,
  transformStockForUI,
  buildAttributeLabelMap,
} from '@/lib/inventory-helpers';

const POSITIONS_PER_PAGE = 15;

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ warehouseId: string }>;
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const { warehouseId } = await params;
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q || '';
  const currentPage = Math.max(1, Number(resolvedSearchParams?.page) || 1);

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

  let categories: Category[] = [];
  let warehouses: { id: string; code: string; name: string }[] = [];
  let stocks: unknown[] = [];
  let formattedError: { message: string; details?: string; isHeadersOverflow: boolean } | null =
    null;
  let totalCount = 0;
  let totalPages = 0;
  let usePositionPagination = false;

  try {
    // Fetch product categories and all warehouses (for cross transfer modal)
    const [categoriesRes, warehousesRes] = await Promise.all([
      getProductCategories(),
      supabase.from('warehouses').select('id, code, name').order('code'),
    ]);

    categories = Array.isArray(categoriesRes) ? (categoriesRes as Category[]) : [];
    warehouses = warehousesRes.data || [];

    // Try position-aware pagination first (requires get_inventory_by_positions RPC)
    const positionResult = await getInventoryByPositions({
      warehouseId: wh.id,
      page: currentPage,
      positionsPerPage: POSITIONS_PER_PAGE,
      ...(query?.trim() ? { search: query.trim() } : {}),
    });

    if (positionResult) {
      stocks = positionResult.stocks;
      totalCount = positionResult.totalStocks;
      totalPages = positionResult.totalPages;
      usePositionPagination = true;
    } else {
      // Fallback: row-based pagination (may split positions across pages)
      const PAGE_SIZE = 50;
      const offset = (currentPage - 1) * PAGE_SIZE;
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
        .eq('locations.is_active', true)
        .gt('quantity', 0);

      if (query) {
        const searchPattern = `%${query}%`;
        baseQuery = baseQuery.or(
          `products.name.ilike.${searchPattern},products.sku.ilike.${searchPattern}`,
        );
      }

      const result = await baseQuery
        .order('lot', { foreignTable: 'locations', ascending: true })
        .order('cart', { foreignTable: 'locations', ascending: true })
        .order('level', { foreignTable: 'locations', ascending: true })
        .order('sku', { foreignTable: 'products', ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      stocks = result.data ?? [];
      formattedError = formatSupabaseError(result.error);
      totalCount = result.count ?? 0;
      totalPages = Math.ceil(totalCount / PAGE_SIZE);
    }
  } catch (err: unknown) {
    formattedError = formatInventoryError(err);
    console.error('Inventory load error:', formattedError.message, formattedError.details ?? '');
  }

  if (formattedError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="rounded-full bg-slate-50 p-4 ring-1 ring-slate-100">
          <span className="text-3xl">{formattedError.isHeadersOverflow ? '🔌' : '⚠️'}</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
          <p className="text-sm text-slate-500 max-w-md">
            {formattedError.isHeadersOverflow
              ? 'การเชื่อมต่อล้มเหลว (Headers overflow) — ลองล้างคุกกี้ ออกจากระบบแล้วเข้าสู่ระบบใหม่ หรือรีเฟรชหน้า'
              : 'กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง'}
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <a
            href={`/dashboard/${warehouseId}/inventory`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            รีเฟรชหน้า
          </a>
          {formattedError.isHeadersOverflow && (
            <a
              href="/auth/logout"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              ออกจากระบบ
            </a>
          )}
        </div>
      </div>
    );
  }

  // Build attribute label map from categories using helper
  const attributeLabelMap = buildAttributeLabelMap(
    categories as Array<{ form_schema?: Array<{ key?: string; label?: string }> }>,
  );

  // Transform stock data to match UI component expectations using helper
  const formattedStocks = (stocks || []).map((stock: unknown) =>
    transformStockForUI(stock as Record<string, unknown>, { attributeLabelMap }),
  ) as unknown as StockWithDetails[];

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
          pageSize={usePositionPagination ? POSITIONS_PER_PAGE : 50}
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
