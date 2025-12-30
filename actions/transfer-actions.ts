'use server';

import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

// --- Type Definitions (คงเดิม) ---
interface InternalTransferParams {
  warehouseId: string;
  stockId: string;
  targetLot: string;
  targetCart: string;
  targetLevel: string;
  transferQty: string;
}

interface CrossTransferParams {
  sourceWarehouseId: string;
  targetWarehouseId: string;
  stockId: string;
  targetLot: string;
  targetCart: string;
  targetLevel: string;
  transferQty: string;
}

// --------------------------------------------------------
// 1. ค้นหาสต็อก (Search) - (คงเดิม)
// --------------------------------------------------------
export async function searchStockForTransfer(warehouseId: string, query: string) {
  const supabase = await createClient();
  const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).maybeSingle();
  if (!wh) return [];

  const { data: stocks, error } = await supabase
    .from('stocks')
    .select(`
        id, quantity, attributes,
        products!inner(sku, name, uom),
        locations!inner(code, warehouse_id)
    `)
    .eq('locations.warehouse_id', wh.id)
    .gt('quantity', 0)
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { foreignTable: 'products' }) 
    .limit(20);

  if (error) {
      console.error("Search Transfer Error:", error);
      return [];
  }
  return stocks || [];
}

// --------------------------------------------------------
// 2. ย้ายภายใน (Internal) - ปรับปรุงให้สร้าง Location อัตโนมัติ ✅
// --------------------------------------------------------
export async function submitTransfer(formData: InternalTransferParams) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };

    const { warehouseId, stockId, targetLot, targetCart, targetLevel, transferQty } = formData;
    const qtyNum = Number(transferQty);

    if (isNaN(qtyNum) || qtyNum <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

    try {
        const lotStr = targetLot.toString().padStart(2, '0');
        const cartStr = targetCart.toString().padStart(2, '0');
        const levelStr = targetLevel.toString().padStart(2, '0');
        const targetCode = `${warehouseId}-L${lotStr}-C${cartStr}-LV${levelStr}`;

        const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
        if(!wh) throw new Error("Warehouse Not Found");

        // ✅ FIX 1: Auto-create Location for Internal Transfer
        let { data: targetLoc } = await supabase.from('locations').select('id').eq('code', targetCode).eq('warehouse_id', wh.id).maybeSingle();
        
        if (!targetLoc) {
             // ใช้ admin สร้าง Location หาก User ไม่มีสิทธิ์สร้าง
             const { data: newLoc, error: createError } = await supabaseAdmin
                .from('locations')
                .insert({ warehouse_id: wh.id, code: targetCode })
                .select('id')
                .single();
             if (createError) throw new Error(`สร้าง Location ไม่สำเร็จ: ${createError.message}`);
             targetLoc = newLoc;
        }

        const { data: sourceStock } = await supabase.from('stocks').select('product_id, location_id').eq('id', stockId).single();
        if (!sourceStock) throw new Error("ไม่พบสต็อกต้นทาง");

        // Use Existing RPC (Internal)
        const { data: result, error: rpcError } = await supabase.rpc('transfer_stock', {
            p_source_stock_id: stockId,
            p_target_location_id: targetLoc!.id, // มั่นใจว่ามีค่าแล้ว
            p_qty: qtyNum
        });

        if (rpcError) throw rpcError;
        if (!result.success) return { success: false, message: result.message };

        // Log Transaction
        await supabase.from('transactions').insert({
            type: 'TRANSFER',
            warehouse_id: wh.id,
            product_id: sourceStock.product_id,
            from_location_id: sourceStock.location_id,
            to_location_id: targetLoc!.id,
            quantity: qtyNum,
            user_id: user.id,
            user_email: user.email
        });

        revalidatePath(`/dashboard/${warehouseId}`);
        return { success: true, message: `ย้ายภายในไปที่ ${targetCode} สำเร็จ` };

    } catch (error: any) {
        console.error("Internal Transfer Error:", error);
        return { success: false, message: error.message };
    }
}

// --------------------------------------------------------
// 3. ย้ายข้ามคลัง (Cross-Warehouse) - ✅ ใช้ RPC ใหม่ ตัดปัญหา Race Condition
// --------------------------------------------------------
export async function submitCrossTransfer(formData: CrossTransferParams) {
  const supabase = await createClient(); 
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthenticated' };

  const { sourceWarehouseId, targetWarehouseId, stockId, targetLot, targetCart, targetLevel, transferQty } = formData;
  const qtyNum = Number(transferQty);

  if (isNaN(qtyNum) || qtyNum <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

  try {
    // 1. Prepare Target Code
    // เราต้องดึง Code ของคลังปลายทางก่อนเพื่อสร้าง Prefix
    const { data: targetWh } = await supabaseAdmin
        .from('warehouses')
        .select('code, name')
        .eq('id', targetWarehouseId)
        .single();
    
    if (!targetWh) throw new Error("ไม่พบข้อมูลคลังปลายทาง");

    const lotStr = targetLot.toString().padStart(2, '0');
    const cartStr = targetCart.toString().padStart(2, '0');
    const levelStr = targetLevel.toString().padStart(2, '0');
    const targetCode = `${targetWh.code}-L${lotStr}-C${cartStr}-LV${levelStr}`;

    // 2. ✅ CALL RPC (The Atomic Transaction)
    // ส่งภาระทั้งหมดให้ Database จัดการ
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('transfer_cross_stock', {
        p_stock_id: stockId,
        p_target_warehouse_id: targetWarehouseId,
        p_target_code: targetCode,
        p_qty: qtyNum,
        p_user_id: user.id,
        p_user_email: user.email
    });

    if (rpcError) throw new Error(rpcError.message);
    if (!result.success) return { success: false, message: result.message };

    // 3. Revalidate
    revalidatePath(`/dashboard/${sourceWarehouseId}`);
    // revalidatePath สำหรับคลังปลายทางอาจจะไม่ทำงานถ้าอยู่คนละ Route แต่ใส่ไว้ไม่เสียหาย
    
    return { success: true, message: `ย้ายสินค้าไปยัง ${targetWh.name} (Location: ${targetCode}) สำเร็จ` };

  } catch (error: any) {
    console.error("Cross Transfer Error:", error);
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการย้ายข้ามคลัง' };
  }
}