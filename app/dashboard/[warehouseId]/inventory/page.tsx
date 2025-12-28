// app/dashboard/[warehouseId]/inventory/page.tsx
import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { Package, AlertCircle } from 'lucide-react';
import SearchInput from '@/components/ui/SearchInput';
import PaginationControls from '@/components/ui/PaginationControls';
import InventoryCard from '@/components/inventory/InventoryCard';

const ITEMS_PER_PAGE = 12;

export default async function InventoryPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ warehouseId: string }>;
  searchParams?: { q?: string; page?: string };
}) {
  const { warehouseId } = await params;
  const query = searchParams?.q || '';
  const currentPage = Number(searchParams?.page) || 1;
  
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const supabase = await createClient();

  let dbQuery = supabase
    .from('stocks')
    .select(`
      id, quantity, updated_at,
      products!inner (sku, name, uom, category_id, min_stock), 
      locations (code),
      warehouses!inner (code)
    `, { count: 'exact' })
    .eq('warehouses.code', warehouseId)
    .gt('quantity', 0);

  if (query) {
    dbQuery = dbQuery.ilike('products.name', `%${query}%`);
  }

  const { data: stocks, count, error } = await dbQuery
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) {     
      return <div>Error loading data</div>;
  }
const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  return (
    <div className="pb-20 p-4 md:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-4">
         <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                <span className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
                    <Package size={24}/>
                </span>
                Inventory
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">จัดการสต็อกสินค้าในคลัง <span className="font-bold text-indigo-600">{warehouseId}</span></p>
         </div>
         
         <div className="w-full md:w-1/3">
             <SearchInput placeholder="ค้นหาชื่อสินค้า..." />
         </div>
      </div>

      {/* ✅ Grid Layout ที่ Clean ขึ้นมาก */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {stocks?.map((item: any) => (
            <InventoryCard key={item.id} item={item} />
        ))}
      </div>

      {stocks?.length === 0 && (
        <div className="text-center py-16">
            <p className="text-slate-400">ไม่พบสินค้าที่ค้นหา "{query}"</p>
        </div>
      )}

      {totalPages > 1 && (
        <PaginationControls totalPages={totalPages} />
      )}
    </div>
  );
}