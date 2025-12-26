// actions/outbound-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// --- Types ---
type OutboundType = 'ISSUE' | 'TRANSFER';

interface OutboundParams {
  warehouseId: string; // Code ของคลังต้นทาง
  itemId: string;      // ID ของ Stock Item ที่จะตัด (จากตาราง stocks)
  qty: number;
  type: OutboundType;
  // กรณี Transfer
  toWarehouseId?: string; // Code คลังปลายทาง
  toLocationId?: string;  // ID Location ปลายทาง
  note?: string;
  userId?: string;
}

export async function submitOutbound(params: OutboundParams) {
  const { warehouseId, itemId, qty, type, toWarehouseId, toLocationId, note } = params;

  try {
    const supabase = createClient();
    // 1. ดึงข้อมูล Stock ปัจจุบันเพื่อตรวจสอบและ Snapshot Attributes
    const { data: currentStock } = await supabase
      .from('stocks')
      .select('*, products(id, name), warehouses(id)')
      .eq('id', itemId)
      .single();

    if (!currentStock) throw new Error("Item not found");
    if (currentStock.quantity < qty) throw new Error("Insufficient stock (ยอดคงเหลือไม่พอ)");

    // 2. เรียก Database Function (RPC) เพื่อตัดสต็อก (ถ้าคุณยังไม่ได้สร้าง RPC ให้ใช้ SQL Update ปกติไปก่อนได้ แต่ RPC ปลอดภัยกว่า)
    // ในที่นี้ใช้ Update ตรงๆ เพื่อความง่ายใน WMSv.03 แต่ใน Production ควรใช้ RPC
    const newQty = Number(currentStock.quantity) - Number(qty);
    
    // 2.1 อัปเดตยอดคงเหลือ
    const { error: updateError } = await supabase
        .from('stocks')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', itemId);

    if (updateError) throw updateError;

    // 2.2 ถ้าเป็นการย้าย (TRANSFER) -> ต้องไปเพิ่มที่ปลายทาง
    if (type === 'TRANSFER' && toLocationId && toWarehouseId) {
        // หา warehouse_id (UUID) ของปลายทาง
        const { data: destWh } = await supabase.from('warehouses').select('id').eq('code', toWarehouseId).single();
        if (!destWh) throw new Error("Destination Warehouse Not Found");

        // เช็คว่ามีของเดิมที่ปลายทางไหม (Merge Logic)
        const { data: destStock } = await supabase
            .from('stocks')
            .select('id, quantity')
            .eq('warehouse_id', destWh.id)
            .eq('location_id', toLocationId)
            .eq('product_id', currentStock.product_id)
            .contains('attributes', currentStock.attributes) // Attributes ต้องเหมือนเดิมเป๊ะ
            .maybeSingle();

        if (destStock) {
            await supabase.from('stocks').update({
                quantity: Number(destStock.quantity) + Number(qty)
            }).eq('id', destStock.id);
        } else {
            await supabase.from('stocks').insert({
                warehouse_id: destWh.id,
                location_id: toLocationId,
                product_id: currentStock.product_id,
                quantity: Number(qty),
                attributes: currentStock.attributes // ยก Attributes เดิมไปทั้งก้อน (Batch/Expiry)
            });
        }
    }

    // 3. บันทึก Transaction Log
    const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
    
    await supabase.from('transactions').insert({
        type: type,
        warehouse_id: wh?.id,
        product_id: currentStock.product_id,
        from_location_id: currentStock.location_id,
        to_location_id: type === 'TRANSFER' ? toLocationId : null,
        quantity: qty,
        attributes_snapshot: currentStock.attributes,
        note: note
    });

    revalidatePath(`/dashboard/${warehouseId}`);
    revalidatePath(`/dashboard/${warehouseId}/inventory`);
    
    return { success: true, message: 'ทำรายการสำเร็จ' };

  } catch (error: any) {
    console.error("Outbound Error:", error);
    return { success: false, message: error.message };
  }
}