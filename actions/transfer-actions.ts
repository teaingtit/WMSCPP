'use server';

import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

// Helper: สร้างรหัส Lxx-Pxx-Zxx
function generate3DCode(lot: string, pos: string, level: string) {
    const l = `L${lot.toString().padStart(2, '0')}`;
    const p = `P${pos.toString().padStart(2, '0')}`;
    const z = `Z${level.toString().padStart(2, '0')}`;
    return { code: `${l}-${p}-${z}`, lot: l, cart: p, level: Number(level) };
}

// Helper: ดึงข้อมูล Stock ตาม ID (ใช้ใน Frontend Auto-load)
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

// --- Internal Transfer (แก้ไข: Strict Location Check) ---
export async function submitTransfer(formData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };

    const { warehouseId, stockId, targetLot, targetCart, targetLevel, transferQty } = formData;
    const qty = Number(transferQty);
    if (isNaN(qty) || qty <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

    try {
        const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
        if (!wh) throw new Error("Warehouse Not Found");

        // 1. Prepare Target Location Code
        const locData = generate3DCode(targetLot, targetCart, targetLevel);
        
        // 2. ✅ FIX: ตรวจสอบพิกัดอย่างเคร่งครัด (Strict Check)
        const { data: targetLoc } = await supabase
            .from('locations')
            .select('id')
            .eq('code', locData.code)
            .eq('warehouse_id', wh.id)
            .eq('is_active', true) 
            .maybeSingle();

        // ❌ ไม่มีการ Auto-Create แล้ว ถ้าไม่เจอคือ Error เลย
        if (!targetLoc) {
             throw new Error(`❌ ไม่พบพิกัดปลายทาง: ${locData.code} ในระบบ กรุณาตรวจสอบ`);
        }

        const { data: sourceStock } = await supabase.from('stocks').select('product_id, location_id').eq('id', stockId).single();
        if (!sourceStock) throw new Error("ไม่พบสต็อกต้นทาง");

        // 3. RPC Transfer
        const { data: result, error: rpcError } = await supabase.rpc('transfer_stock', {
            p_source_stock_id: stockId, p_target_location_id: targetLoc.id, p_qty: qty
        });

        if (rpcError) throw rpcError;
        if (!result.success) return { success: false, message: result.message };

        // 4. Log Transaction
        await supabase.from('transactions').insert({
            type: 'TRANSFER', warehouse_id: wh.id,
            product_id: sourceStock.product_id,
            from_location_id: sourceStock.location_id, to_location_id: targetLoc.id,
            quantity: qty, user_id: user.id, 
            user_email: user.email 
        });

        revalidatePath(`/dashboard/${warehouseId}`);
        return { success: true, message: `ย้ายไป ${locData.code} สำเร็จ` };

    } catch (error: any) {
        console.error("Internal Transfer Error:", error);
        return { success: false, message: error.message };
    }
}

// --- Cross Transfer (แก้ไข: คืนค่า sourceStock และ Strict Check) ---
export async function submitCrossTransfer(formData: any) {
  const supabase = await createClient(); 
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthenticated' };

  const { sourceWarehouseId, targetWarehouseId, stockId, targetLot, targetCart, targetLevel, transferQty } = formData;
  const qty = Number(transferQty);
  if (isNaN(qty) || qty <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

  try {
    const { data: sourceWh } = await supabase.from('warehouses').select('id').eq('code', sourceWarehouseId).single();
    if (!sourceWh) throw new Error("ไม่พบข้อมูลคลังต้นทาง");

    const { data: targetWh } = await supabaseAdmin.from('warehouses').select('id, code, name').eq('id', targetWarehouseId).single();
    if (!targetWh) throw new Error("ไม่พบข้อมูลคลังปลายทาง");

    // 1. Prepare Target Code
    const locData = generate3DCode(targetLot, targetCart, targetLevel);
    
    // 2. ✅ Fix: Get Source Info (ต้องประกาศตรงนี้ เพื่อให้มีใช้ใน Transaction Log)
    const { data: sourceStock } = await supabase.from('stocks').select('product_id, location_id').eq('id', stockId).single();
    if(!sourceStock) throw new Error("Stock Source Not Found");

    // 3. ✅ Check: Pre-validate Target Location in Target Warehouse
    const { data: targetLocExists } = await supabaseAdmin
        .from('locations')
        .select('id')
        .eq('warehouse_id', targetWh.id)
        .eq('code', locData.code)
        .eq('is_active', true)
        .maybeSingle();

    if (!targetLocExists) {
        throw new Error(`❌ คลังปลายทาง (${targetWh.name}) ไม่มีพิกัด ${locData.code}`);
    }

    // 4. RPC Cross Transfer
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('transfer_cross_stock', {
        p_stock_id: stockId, p_target_warehouse_id: targetWarehouseId,
        p_target_code: locData.code,
        p_qty: qty,
        p_user_id: user.id, p_user_email: user.email
    });

    if (rpcError) throw new Error(rpcError.message);
    if (!result.success) return { success: false, message: result.message };

    // 5. Log Transaction (Outbound Side)
    // ตรงนี้จะใช้ sourceStock ได้แล้ว เพราะประกาศไว้ในขั้นตอนที่ 2
    await supabase.from('transactions').insert({
        type: 'TRANSFER_OUT', warehouse_id: sourceWh.id,
        product_id: sourceStock.product_id,
        from_location_id: sourceStock.location_id,
        details: `To: ${targetWh.name} (${locData.code})`,
        quantity: qty, user_id: user.id, 
        user_email: user.email 
    });

    revalidatePath(`/dashboard/${sourceWarehouseId}`);
    return { success: true, message: `ย้ายไป ${targetWh.name} (${locData.code}) สำเร็จ` };

  } catch (error: any) {
    console.error("Cross Transfer Error:", error);
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการย้ายข้ามคลัง' };
  }
}