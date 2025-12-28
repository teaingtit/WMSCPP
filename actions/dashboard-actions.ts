'use server';

import { createClient } from '@/lib/supabase-server';

export async function getDashboardStats(warehouseCode: string) {
  const supabase = await createClient();

  try {
    const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseCode).single();
    if (!wh) throw new Error("Warehouse not found");

    const { data: stocks } = await supabase
        .from('stocks')
        .select('quantity, products(min_stock)')
        .eq('warehouse_id', wh.id);

    const totalItems = stocks?.length || 0;
    const totalQty = stocks?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0;
    const lowStockCount = stocks?.filter((item: any) => 
        item.quantity <= (item.products?.min_stock || 0)
    ).length || 0;

    const { data: recentLogs } = await supabase
        .from('transactions')
        .select(`
            id, type, quantity, created_at,
            products(name, sku),
            from_location:locations!transactions_from_location_id_fkey(code),
            to_location:locations!transactions_to_location_id_fkey(code)
        `)
        .eq('warehouse_id', wh.id)
        .order('created_at', { ascending: false })
        .limit(5);

    return {
        totalItems,
        totalQty,
        lowStockCount,
        recentLogs: recentLogs || []
    };

  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return { totalItems: 0, totalQty: 0, lowStockCount: 0, recentLogs: [] };
  }
}