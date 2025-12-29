'use server';

import { createClient } from '@/lib/supabase-server';

export async function getHistory(warehouseId: string, limit = 20) {
  const supabase = await createClient();

  const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
  if (!wh) return [];

  // ดึงข้อมูล Transaction
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      product:products(sku, name, uom),
      from_loc:locations!from_location_id(code),
      to_loc:locations!to_location_id(code)
    `)
    .eq('warehouse_id', wh.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Fetch History Error:', error);
    return [];
  }

  // Map ข้อมูลส่งกลับ Frontend
  return data.map((t: any) => ({
    id: t.id,
    type: t.type,
    product: t.product?.name || 'Unknown',
    sku: t.product?.sku || '-',
    quantity: t.quantity,
    uom: t.product?.uom || 'PCS',
    from: t.from_loc?.code || '-',
    to: t.to_loc?.code || '-',
    date: t.created_at,
    // ✅ แสดง Email ของ User (ถ้าไม่มีให้ขึ้น System)
    user: t.user_email || 'System' 
  }));
}