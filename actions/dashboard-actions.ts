// actions/dashboard-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';

// --- Function 1: สำหรับหน้า Dashboard รวม (เลือกคลัง) ---
export async function getDashboardWarehouses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  try {
    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, allowed_warehouses')
        .eq('user_id', user.id)
        .single();

    const userRole = roleData?.role || 'staff';
    const allowedWarehouses = roleData?.allowed_warehouses || [];

    let query = supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

    if (userRole !== 'admin') {
        if (allowedWarehouses.length === 0) return [];
        query = query.in('code', allowedWarehouses);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Dashboard Warehouse Error:", error);
        return [];
    }
    return data || [];

  } catch (error) {
    console.error("System Error:", error);
    return [];
  }
}

// --- Function 2: สำหรับหน้า Dashboard รายคลัง (ดู Stats) ---
// ✅ คืนค่าฟังก์ชันนี้กลับมา เพื่อให้ page.tsx เรียกใช้ได้
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