import React from 'react';
import { createClient } from '@/lib/supabase/server';
import InventoryDashboard from '@/components/inventory/InventoryDashboard';
import { StockWithDetails } from '@/types/inventory';
import { getProductCategories } from '@/actions/inbound-actions'; // Import getProductCategories

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: { warehouseId: string };
  searchParams?: { q?: string; page?: string };
}) {
  const { warehouseId } = params;
  const query = searchParams?.q || '';

  const supabase = await createClient();

  const { data: wh } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', warehouseId)
    .single();

  if (!wh) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="rounded-full bg-rose-50 p-4 ring-1 ring-rose-100">
          <span className="text-3xl">🏠</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">Warehouse Not Found</h3>
          <p className="text-sm text-slate-500">Could not find warehouse: {warehouseId}</p>
        </div>
      </div>
    );
  }

  // Fetch product categories
  const categories = await getProductCategories();

  // ✅ FIX 1: แก้ Query ให้ดึง lot, cart จากตาราง locations (Source of Truth)
  // ตัด lot, cart_id ที่ stocks ออก เพราะเราย้ายไป locations แล้ว
  let dbQuery = supabase
    .from('stocks')
    .select(
      `
      id, quantity, updated_at,
      products!inner(*),
      locations!inner(*)
    `,
    )
    .eq('locations.warehouse_id', wh.id)
    .gt('quantity', 0);

  if (query) {
    // ปรับการค้นหาให้รองรับ structure ใหม่
    // Sanitize query to prevent PostgREST syntax errors (commas break OR filters)
    const sanitizedQuery = query.replace(/,/g, '');
    if (sanitizedQuery) {
      const searchConditions = [
        `products.name.ilike.%${sanitizedQuery}%`,
        `products.sku.ilike.%${sanitizedQuery}%`,
        `locations.lot.ilike.%${sanitizedQuery}%`,
        `locations.cart.ilike.%${sanitizedQuery}%`,
        `locations.level.ilike.%${sanitizedQuery}%`,
      ];
      dbQuery = dbQuery.or(searchConditions.join(','));
    }
  }

  // ✅ FIX 2: เรียงลำดับตาม Location จริง
  const { data: stocks, error } = await dbQuery
    .order('lot', { foreignTable: 'locations', ascending: true })
    .order('cart', { foreignTable: 'locations', ascending: true })
    .order('level', { foreignTable: 'locations', ascending: true })
    .order('sku', { foreignTable: 'products', ascending: true });

  if (error) {
    console.error(error);
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="rounded-full bg-slate-50 p-4 ring-1 ring-slate-100">
          <span className="text-3xl">⚠️</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">Error loading data</h3>
          <p className="text-sm text-slate-500">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // The `StockWithDetails` type expects `id` as a string, but Supabase returns it as a number.
  // We also need to handle the Supabase client's incorrect type inference for nested relations (`!inner`).
  // This transformation ensures the data shape matches the component's props.
  const formattedStocks: StockWithDetails[] = (stocks || []).map((stock: any) => ({
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
  }));

  return (
    <div className="min-h-screen bg-slate-50/30 pb-32 p-3 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mx-auto max-w-7xl">
        <InventoryDashboard
          stocks={formattedStocks}
          warehouseId={warehouseId}
          categories={categories} // Pass categories to InventoryDashboard
        />
      </div>
    </div>
  );
}
