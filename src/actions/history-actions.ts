'use server';

import { createClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export async function getHistory(warehouseId: string, limit = 20) {
  noStore();
  const supabase = await createClient();

  const { data: wh } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', warehouseId)
    .single();
  // ✅ FIX: Null Check
  if (!wh) return [];

  // Query: Join warehouses via locations
  const { data, error } = await supabase
    .from('transactions')
    .select(
      `
      *,
      product:products(sku, name, uom),
      from_loc:locations!from_location_id(code, warehouse:warehouses(name)),
      to_loc:locations!to_location_id(code, warehouse:warehouses(name))
    `,
    )
    .eq('warehouse_id', wh.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Fetch History Error:', error);
    return [];
  }

  // Map Data
  return data.map((t: any) => {
    // Format: "Warehouse Name (Loc Code)"
    const formatLoc = (loc: any) => (loc ? `${loc.warehouse?.name || ''} (${loc.code})` : null);

    return {
      id: t.id,
      type: t.type,
      product: t.product?.name || 'Unknown',
      sku: t.product?.sku || '-',
      quantity: t.quantity,
      uom: t.product?.uom || 'PCS',
      // ใช้ details ถ้าไม่มี Location (เช่น External Outbound)
      from: formatLoc(t.from_loc) || t.details || '-',
      to: formatLoc(t.to_loc) || t.details || '-',
      date: t.created_at,
      user: t.user_email || 'System', // ✅ Display Email
    };
  });
}
