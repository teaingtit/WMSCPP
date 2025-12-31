'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// Interfaces (คงเดิม)
interface InboundFormData { warehouseId: string; locationId: string; productId?: string; isNewProduct?: boolean; quantity: string | number; attributes: any; }

async function resolveWarehouseId(supabase: any, warehouseId: string) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(warehouseId);
    if (isUUID) return warehouseId;
    const { data } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
    return data ? data.id : null;
}

// ... (Getters: getWarehouseLots, getCartsByLot, getLevelsByCart คงเดิม ใช้โค้ดเดิมได้) ...
// ใส่เฉพาะฟังก์ชันหลักที่มีการแก้ Logic

export async function submitInbound(formData: InboundFormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthenticated' };

  const { warehouseId, locationId, productId, quantity, attributes } = formData;

  try {
    if (!locationId || !quantity || !productId) throw new Error("ข้อมูลไม่ครบถ้วน");
    const qtyNum = Number(quantity);
    if (qtyNum <= 0) throw new Error("จำนวนต้องมากกว่า 0");

    const whId = await resolveWarehouseId(supabase, warehouseId);
    if (!whId) throw new Error("Warehouse Not Found");

    // Call RPC to update stock
    const { error: rpcError } = await supabase.rpc('handle_inbound_stock', {
        p_warehouse_id: whId,
        p_location_id: locationId,
        p_product_id: productId,
        p_quantity: qtyNum,
        p_attributes: attributes || {},
        p_user_id: user.id
    });

    if (rpcError) throw new Error(rpcError.message);

    // ✅ FIX: Log Transaction Manually to ensure email is saved
    await supabase.from('transactions').insert({
        type: 'INBOUND',
        warehouse_id: whId,
        product_id: productId,
        to_location_id: locationId,
        quantity: qtyNum,
        user_id: user.id,
        user_email: user.email // ✅ บันทึก Email
    });

    revalidatePath(`/dashboard/${warehouseId}/inventory`);
    revalidatePath(`/dashboard/${warehouseId}/history`);
    
    return { success: true, message: `✅ รับสินค้าสำเร็จ (${qtyNum})` };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// อย่าลืมใส่ Getters อื่นๆ กลับคืนมาด้วยนะครับ (getWarehouseLots, etc.) 
// หากต้องการโค้ดส่วนนั้นแจ้งได้ครับ แต่ส่วนใหญ่ Logic การดึงข้อมูลไม่ต้องแก้
export async function getWarehouseLots(warehouseId: string) {
    const supabase = await createClient();
    const whId = await resolveWarehouseId(supabase, warehouseId);
    if (!whId) return [];
    const { data } = await supabase.from('locations').select('lot').eq('warehouse_id', whId).eq('is_active', true).order('lot'); 
    if (!data) return [];
    return Array.from(new Set(data.map(l => l.lot))).filter(Boolean);
}
export async function getCartsByLot(warehouseId: string, lot: string) {
    const supabase = await createClient();
    const whId = await resolveWarehouseId(supabase, warehouseId);
    if (!whId) return [];
    const { data } = await supabase.from('locations').select('cart').eq('warehouse_id', whId).eq('lot', lot).eq('is_active', true).order('cart');
    if (!data) return [];
    return Array.from(new Set(data.map(l => l.cart))).filter(Boolean);
}
export async function getLevelsByCart(warehouseId: string, lot: string, cart: string) {
    const supabase = await createClient();
    const whId = await resolveWarehouseId(supabase, warehouseId);
    if (!whId) return [];
    const { data } = await supabase.from('locations').select('id, level, code, type').eq('warehouse_id', whId).eq('lot', lot).eq('cart', cart).eq('is_active', true).order('level');
    return data || [];
}