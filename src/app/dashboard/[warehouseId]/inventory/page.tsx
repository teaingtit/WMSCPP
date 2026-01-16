import React from 'react';
import { createClient } from '@/lib/supabase/server';
import InventoryDashboard from '@/components/inventory/InventoryDashboard';
import InventoryFAB from '@/components/inventory/InventoryFAB';
import { StockWithDetails } from '@/types/inventory';
import { getProductCategories } from '@/actions/inbound-actions'; // Import getProductCategories
import { isValidUUID } from '@/lib/utils';

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

  // ✅ FIX 1: แก้ Query ให้ดึง lot, cart จากตาราง locations (Source of Truth)
  // ตัด lot, cart_id ที่ stocks ออก เพราะเราย้ายไป locations แล้ว
  // Note: PostgREST has limitations with OR queries on foreign tables
  // We'll fetch all data and filter client-side if there's a search query
  let dbQuery = supabase
    .from('stocks')
    .select(
      `
      id, quantity, updated_at, attributes,
      products!inner(*),
      locations!inner(*)
    `,
    )
    .eq('locations.warehouse_id', wh.id)
    .gt('quantity', 0);

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
          <h3 className="text-lg font-semibold text-slate-900">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
          <p className="text-sm text-slate-500">กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง</p>
        </div>
      </div>
    );
  }

  // Client-side filtering if search query exists
  let filteredStocks = stocks || [];
  if (query) {
    const lowerQuery = query.toLowerCase();
    filteredStocks = filteredStocks.filter((stock: any) => {
      return (
        stock.products?.name?.toLowerCase().includes(lowerQuery) ||
        stock.products?.sku?.toLowerCase().includes(lowerQuery) ||
        stock.locations?.lot?.toLowerCase().includes(lowerQuery) ||
        stock.locations?.cart?.toLowerCase().includes(lowerQuery) ||
        stock.locations?.level?.toLowerCase().includes(lowerQuery)
      );
    });
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

  // The `StockWithDetails` type expects `id` as a string, but Supabase returns it as a number.
  // We also need to handle the Supabase client's incorrect type inference for nested relations (`!inner`).
  // This transformation ensures the data shape matches the component's props.
  const formattedStocks: StockWithDetails[] = (filteredStocks || []).map((stock: any) => {
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

  return (
    <div className="min-h-screen bg-slate-50/30 pb-32 p-3 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mx-auto max-w-7xl">
        <InventoryDashboard
          stocks={formattedStocks}
          warehouseId={wh.id}
          categories={categories} // Pass categories to InventoryDashboard
          warehouses={warehouses} // Pass warehouses list
        />
      </div>

      {/* Floating Action Button - Quick Add Stock */}
      <InventoryFAB warehouseId={warehouseId} />
    </div>
  );
}
