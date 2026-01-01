import React from 'react';
import { createClient } from '@/lib/db/supabase-server';
import InventoryDashboard from '@/components/inventory/InventoryDashboard';
import { StockWithDetails } from '@/types/inventory';

export default async function InventoryPage({ 
  params,
  searchParams 
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

  if (!wh) return <div className="p-8 text-center text-rose-500 font-bold">Warehouse Not Found</div>;

  // ✅ FIX 1: แก้ Query ให้ดึง lot, cart จากตาราง locations (Source of Truth)
  // ตัด lot, cart_id ที่ stocks ออก เพราะเราย้ายไป locations แล้ว
  let dbQuery = supabase
    .from('stocks')
    .select(`
      id, quantity, updated_at, 
      products!inner(*), 
      locations!inner(*) 
    `)
    .eq('locations.warehouse_id', wh.id)
    .gt('quantity', 0);

  if (query) {
    // ปรับการค้นหาให้รองรับ structure ใหม่
    dbQuery = dbQuery.or(`products.name.ilike.%${query}%,products.sku.ilike.%${query}%,locations.lot.ilike.%${query}%,locations.cart.ilike.%${query}%`);
  }

  // ✅ FIX 2: เรียงลำดับตาม Location จริง
  const { data: stocks, error } = await dbQuery
    .order('lot', { foreignTable: 'locations', ascending: true })
    .order('cart', { foreignTable: 'locations', ascending: true })
    .order('sku', { foreignTable: 'products', ascending: true });

  if (error) {
      console.error(error);
      return <div className="p-8 text-center text-slate-500">Error loading data</div>;
  }

  // The `StockWithDetails` type expects `id` as a string, but Supabase returns it as a number.
  // We also need to handle the Supabase client's incorrect type inference for nested relations (`!inner`).
  // This transformation ensures the data shape matches the component's props.
  const formattedStocks: StockWithDetails[] = (stocks || []).map((stock: any) => ({
    ...stock,
    id: String(stock.id),
  }));

  return (
    <div className="pb-32 p-4 md:p-8"> 
      <InventoryDashboard 
        stocks={formattedStocks} 
        warehouseId={warehouseId} 
      />
    </div>
  );
}