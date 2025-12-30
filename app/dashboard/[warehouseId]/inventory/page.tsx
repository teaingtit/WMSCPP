// app/dashboard/[warehouseId]/inventory/page.tsx
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
  
  // Note: ในมุมมองแบบ Tree View อาจจะไม่ใช้ Pagination แบบเดิม หรือใช้ Load More 
  // แต่เพื่อความเสถียร ผมจะดึงมาทั้งหมดใน Lot ที่เกี่ยวข้อง หรือใช้ Pagination กว้างๆ
  const supabase = await createClient();

  // 1. Get Warehouse ID
  const { data: wh } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', warehouseId)
    .single();

  if (!wh) return <div className="p-8 text-center text-rose-500 font-bold">Warehouse Not Found</div>;

  // 2. Query Stocks (เพิ่ม lot และ cart_id)
  let dbQuery = supabase
    .from('stocks')
    .select(`
      id, quantity, updated_at, lot, cart_id, 
      products!inner (sku, name, uom, category_id), 
      locations!inner (code) 
    `)
    .eq('locations.warehouse_id', wh.id)
    .gt('quantity', 0);

  if (query) {
    dbQuery = dbQuery.or(`products.name.ilike.%${query}%,products.sku.ilike.%${query}%,lot.ilike.%${query}%,cart_id.ilike.%${query}%`);
  }

  // เรียงตาม Lot -> Cart -> SKU เพื่อให้ Grouping ง่ายขึ้น
  const { data: stocks, error } = await dbQuery
    .order('lot', { ascending: true })
    .order('cart_id', { ascending: true });

  if (error) {
      console.error(error);
      return <div className="p-8 text-center text-slate-500">Error loading data</div>;
  }

  return (
    <div className="pb-32 p-4 md:p-8"> {/* เพิ่ม padding-bottom เผื่อ Action Bar */}
      <InventoryDashboard 
        stocks={stocks || []} 
        warehouseId={warehouseId} 
      />
    </div>
  );
}