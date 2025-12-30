import React from 'react';
import { createClient } from '@/lib/supabase-server';
import InventoryDashboard from '@/components/inventory/InventoryDashboard';

export default async function InventoryPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ warehouseId: string }>;
  searchParams?: { q?: string; page?: string };
}) {
  const { warehouseId } = await params; 
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
      products!inner (sku, name, uom, category_id), 
      locations!inner (code, lot, cart) 
    `)
    .eq('locations.warehouse_id', wh.id)
    .gt('quantity', 0);

  if (query) {
    // ปรับการค้นหาให้รองรับ structure ใหม่
    dbQuery = dbQuery.or(`products.name.ilike.%${query}%,products.sku.ilike.%${query}%,locations.lot.ilike.%${query}%,locations.cart.ilike.%${query}%`);
  }

  // ✅ FIX 2: เรียงลำดับตาม Location จริง
  const { data: stocks, error } = await dbQuery
    .order('locations(lot)', { ascending: true })
    .order('locations(cart)', { ascending: true })
    .order('products(sku)', { ascending: true });

  if (error) {
      console.error(error);
      return <div className="p-8 text-center text-slate-500">Error loading data</div>;
  }

  return (
    <div className="pb-32 p-4 md:p-8"> 
      <InventoryDashboard 
        stocks={stocks || []} 
        warehouseId={warehouseId} 
      />
    </div>
  );
}