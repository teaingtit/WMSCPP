// actions/dashboard-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';

// --- Function 1: สำหรับหน้า Dashboard รวม (คงเดิม) ---
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

// --- Function 2: สำหรับหน้า Dashboard รายคลัง (แก้ไข Query) ---
export async function getDashboardStats(warehouseCode: string) {
  const supabase = await createClient();

  try {
    const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseCode).single();
    if (!wh) throw new Error("Warehouse not found");

    // ✅ FIX: Query ผ่าน locations เพื่อกรองตาม warehouse_id ที่แท้จริง
    const { data: stocks, error: stockError } = await supabase
        .from('stocks')
        .select(`
            quantity, 
            locations!inner(warehouse_id) 
        `)
        .eq('locations.warehouse_id', wh.id); // กรองจาก Location ที่ผูกกับ Warehouse นี้

    if (stockError) {
        console.error("Stock Query Error:", stockError);
    }

    const totalItems = stocks?.length || 0;
    
    // คำนวณยอดรวม (Handle null/undefined safely)
    const totalQty = stocks?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;

    // Fetch Active Audits
    const { data: activeAudits } = await supabase
        .from('audit_sessions')
        .select('id, name, created_at, status')
        .eq('warehouse_id', wh.id)
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false });
    
    // ส่วนของ Recent Logs (คงเดิม หรือปรับให้ชัวร์)
    const { data: recentLogs } = await supabase
        .from('transactions')
        .select(`
            id, type, quantity, created_at,
            products(name, sku, uom),
            from_location:locations!transactions_from_location_id_fkey(code),
            to_location:locations!transactions_to_location_id_fkey(code)
        `)
        .eq('warehouse_id', wh.id)
        .order('created_at', { ascending: false })
        .limit(20);

    // Count Today's Transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayTransactionCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('warehouse_id', wh.id)
        .gte('created_at', today.toISOString());

    return {
        totalItems,
        totalQty,
        todayTransactionCount: todayTransactionCount || 0,
        activeAudits: activeAudits || [],
        recentLogs: recentLogs || []
    };

  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return { totalItems: 0, totalQty: 0, recentLogs: [] };
  }
}