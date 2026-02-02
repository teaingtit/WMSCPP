// actions/dashboard-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { getWarehouseId } from '@/lib/utils/db-helpers';
import { TABLES } from '@/lib/constants';

// --- Function 1: สำหรับหน้า Dashboard รวม ---
export async function getDashboardWarehouses() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: roleData } = await supabase
    .from(TABLES.USER_ROLES)
    .select('role, allowed_warehouses')
    .eq('user_id', user.id)
    .single();

  const userRole = roleData?.role || 'staff';
  const allowedWarehouses = roleData?.allowed_warehouses || [];

  let query = supabase
    .from(TABLES.WAREHOUSES)
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (userRole !== 'admin') {
    if (allowedWarehouses.length === 0) return [];
    query = query.in('code', allowedWarehouses);
  }

  const { data } = await query;
  return data || [];
}

// --- Function 2: สำหรับหน้า Dashboard รายคลัง ---
export async function getDashboardStats(warehouseCode: string) {
  const supabase = await createClient();

  try {
    // ✅ FIX: Handle both UUID and code identifiers
    const whId = await getWarehouseId(supabase, warehouseCode);
    if (!whId) throw new Error('Warehouse not found');

    const { data: stocks } = await supabase
      .from(TABLES.STOCKS)
      .select('quantity, locations!inner(warehouse_id)')
      .eq('locations.warehouse_id', whId);

    const totalItems = stocks?.length || 0;
    const totalQty = stocks?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;

    const [{ data: activeAudits }, { data: recentLogs }, { count: todayTransactionCount }] =
      await Promise.all([
        supabase
          .from(TABLES.AUDIT_SESSIONS)
          .select('id, name, created_at, status')
          .eq('warehouse_id', whId)
          .eq('status', 'OPEN')
          .order('created_at', { ascending: false }),
        supabase
          .from(TABLES.TRANSACTIONS)
          .select(
            `
            id, type, quantity, created_at,
            products(name, sku, uom),
            from_location:locations!transactions_from_location_fkey(code),
            to_location:locations!transactions_to_location_fkey(code)
          `,
          )
          .eq('warehouse_id', whId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from(TABLES.TRANSACTIONS)
          .select('*', { count: 'exact', head: true })
          .eq('warehouse_id', whId)
          .gte('created_at', new Date().setHours(0, 0, 0, 0)),
      ]);

    return {
      totalItems,
      totalQty,
      todayTransactionCount: todayTransactionCount || 0,
      activeAudits: activeAudits || [],
      recentLogs: recentLogs || [],
    };
  } catch {
    return {
      totalItems: 0,
      totalQty: 0,
      todayTransactionCount: 0,
      activeAudits: [],
      recentLogs: [],
    };
  }
}
