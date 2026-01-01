'use server';

import { createClient } from '@/lib/db/supabase-server';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { revalidatePath } from 'next/cache';

// Helper: สร้างรหัส Lxx-Pxx-Zxx (ใช้เป็น Fallback เท่านั้น)
function generate3DCode(lot: string, pos: string, level: string) {
    const l = `L${lot.toString().padStart(2, '0')}`;
    const p = `P${pos.toString().padStart(2, '0')}`;
    const z = `Z${level.toString().padStart(2, '0')}`;
    return { code: `${l}-${p}-${z}`, lot: l, cart: p, level: Number(level) };
}

export async function getStockById(stockId: string) {
    const supabase = await createClient();
    const { data } = await supabase.from('stocks')
        .select(`id, quantity, attributes, products!inner(sku, name, uom), locations!inner(code, warehouse_id)`)
        .eq('id', stockId)
        .single();
    return data;
}

export async function searchStockForTransfer(warehouseId: string, query: string) {
  const supabase = await createClient();
  const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).maybeSingle();
  if (!wh) return [];

  const { data: stocks, error } = await supabase
    .from('stocks')
    .select(`id, quantity, attributes, products!inner(sku, name, uom), locations!inner(code, warehouse_id)`)
    .eq('locations.warehouse_id', wh.id)
    .gt('quantity', 0)
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { foreignTable: 'products' }) 
    .limit(20);

  if (error) { console.error("Search Error:", error); return []; }
  return stocks || [];
}

// --- Internal Transfer ---
export async function submitTransfer(formData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };

    const { warehouseId, stockId, targetLocationId, targetLot, targetCart, targetLevel, transferQty } = formData;
    const qty = Number(transferQty);
    if (isNaN(qty) || qty <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

    try {
        const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
        if (!wh) throw new Error("Warehouse Not Found");

        let targetLocId = targetLocationId;

        // ถ้าไม่มี ID ส่งมา (กรณีเรียกใช้แบบเก่า) ให้พยายามหาจาก Code
        if (!targetLocId) {
            const locData = generate3DCode(targetLot, targetCart, targetLevel);
            const { data: targetLoc } = await supabase
                .from('locations')
                .select('id')
                .eq('code', locData.code)
                .eq('warehouse_id', wh.id)
                .eq('is_active', true) 
                .maybeSingle();
            
            if (!targetLoc) throw new Error(`❌ ไม่พบพิกัดปลายทาง: ${locData.code}`);
            targetLocId = targetLoc.id;
        }

        const { data: sourceStock } = await supabase.from('stocks').select('product_id, location_id').eq('id', stockId).single();
        if (!sourceStock) throw new Error("ไม่พบสต็อกต้นทาง");

        // RPC Transfer
        const { data: result, error: rpcError } = await supabase.rpc('transfer_stock', {
            p_source_stock_id: stockId, p_target_location_id: targetLocId, p_qty: qty
        });

        if (rpcError) throw rpcError;
        if (!result.success) return { success: false, message: result.message };

        // Log Transaction
        await supabase.from('transactions').insert({
            type: 'TRANSFER', warehouse_id: wh.id,
            product_id: sourceStock.product_id,
            from_location_id: sourceStock.location_id, to_location_id: targetLocId,
            quantity: qty, user_id: user.id, 
            user_email: user.email 
        });

        revalidatePath(`/dashboard/${warehouseId}`);
        return { success: true, message: `ย้ายสินค้าสำเร็จ` };

    } catch (error: any) {
        console.error("Internal Transfer Error:", error);
        return { success: false, message: error.message };
    }
}

// --- Cross Transfer ---
export async function submitCrossTransfer(formData: any) {
  const supabase = await createClient(); 
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthenticated' };

  const { sourceWarehouseId, targetWarehouseId, stockId, targetLocationId, targetLot, targetCart, targetLevel, transferQty } = formData;
  const qty = Number(transferQty);
  if (isNaN(qty) || qty <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

  try {
    const { data: sourceWh } = await supabase.from('warehouses').select('id').eq('code', sourceWarehouseId).single();
    if (!sourceWh) throw new Error("ไม่พบข้อมูลคลังต้นทาง");

    const { data: targetWh } = await supabaseAdmin.from('warehouses').select('id, code, name').eq('id', targetWarehouseId).single();
    if (!targetWh) throw new Error("ไม่พบข้อมูลคลังปลายทาง");

    let targetCode = '';
    
    // ✅ Logic ใหม่: ถ้ามี ID ให้ไปหา Code ของ ID นั้น (เพื่อใช้ใน RPC Cross Transfer)
    if (targetLocationId) {
        const { data: loc } = await supabaseAdmin
            .from('locations')
            .select('code')
            .eq('id', targetLocationId)
            .single();
        if (!loc) throw new Error("Invalid Target Location ID");
        targetCode = loc.code;
    } else {
        // Fallback Logic เดิม
        const locData = generate3DCode(targetLot, targetCart, targetLevel);
        targetCode = locData.code;
    }

    // Get Source Info
    const { data: sourceStock } = await supabase.from('stocks').select('product_id, location_id').eq('id', stockId).single();
    if(!sourceStock) throw new Error("Stock Source Not Found");

    // RPC Cross Transfer
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('transfer_cross_stock', {
        p_stock_id: stockId, p_target_warehouse_id: targetWarehouseId,
        p_target_code: targetCode, // ส่ง Code ที่ถูกต้องไป
        p_qty: qty,
        p_user_id: user.id, p_user_email: user.email
    });

    if (rpcError) throw new Error(rpcError.message);
    if (!result.success) return { success: false, message: result.message };

    // Log Transaction
    await supabase.from('transactions').insert({
        type: 'TRANSFER_OUT', warehouse_id: sourceWh.id,
        product_id: sourceStock.product_id,
        from_location_id: sourceStock.location_id,
        details: `To: ${targetWh.name} (${targetCode})`,
        quantity: qty, user_id: user.id, 
        user_email: user.email 
    });

    revalidatePath(`/dashboard/${sourceWarehouseId}`);
    return { success: true, message: `ย้ายไป ${targetWh.name} (${targetCode}) สำเร็จ` };

  } catch (error: any) {
    console.error("Cross Transfer Error:", error);
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการย้ายข้ามคลัง' };
  }
}