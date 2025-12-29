// actions/transfer-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// 1. ค้นหาสต็อกต้นทาง
export async function searchStockForTransfer(warehouseId: string, query: string) {
  const supabase = await createClient();
  
  const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).maybeSingle();
  if (!wh) return [];

  // MVP Search: Limit 20 เพื่อความเร็ว
  const { data: stocks, error } = await supabase
    .from('stocks')
    .select(`
        id, quantity, attributes,
        products!inner(sku, name, uom),
        locations!inner(code)
    `)
    .eq('warehouse_id', wh.id)
    .gt('quantity', 0)
    // การ search ข้าม table (products)
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { foreignTable: 'products' }) 
    .limit(20);

  if (error) {
      console.error("Search Transfer Error:", error);
      return [];
  }

  return stocks || [];
}

// 2. สั่งย้ายของ (Atomic Move via RPC)
export async function submitTransfer(formData: any) {
    const supabase = await createClient();
    
    // ✅ 1. ดึง User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };

    const { warehouseId, stockId, targetLot, targetCart, targetLevel, transferQty } = formData;
    const qtyNum = Number(transferQty);

    if (isNaN(qtyNum) || qtyNum <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

    try {
        // ... (Logic หา Location ปลายทาง คงเดิม) ...
        const lotStr = targetLot.toString().padStart(2, '0');
        const cartStr = targetCart.toString().padStart(2, '0');
        const levelStr = targetLevel.toString().padStart(2, '0');
        const targetCode = `${warehouseId}-L${lotStr}-C${cartStr}-LV${levelStr}`;

        const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
        if(!wh) throw new Error("Warehouse Not Found");

        const { data: targetLoc } = await supabase.from('locations').select('id').eq('code', targetCode).eq('warehouse_id', wh.id).single();
        if (!targetLoc) throw new Error(`ไม่พบพิกัดปลายทาง ${targetCode}`);

        // ✅ 2. ดึงข้อมูล Stock ต้นทาง เพื่อบันทึก Log
        const { data: sourceStock } = await supabase.from('stocks').select('product_id, location_id').eq('id', stockId).single();
        if (!sourceStock) throw new Error("ไม่พบสต็อกต้นทาง");

        // ✅ 3. Call RPC
        const { data: result, error: rpcError } = await supabase.rpc('transfer_stock', {
            p_source_stock_id: stockId,
            p_target_location_id: targetLoc.id,
            p_qty: qtyNum
        });

        if (rpcError) throw rpcError;
        if (!result.success) return { success: false, message: result.message };

        // ✅ 4. บันทึก Transaction Log
        const { error: logError } = await supabase.from('transactions').insert({
            type: 'TRANSFER',
            warehouse_id: wh.id,
            product_id: sourceStock.product_id,
            from_location_id: sourceStock.location_id, // ต้นทาง
            to_location_id: targetLoc.id,            // ปลายทาง
            quantity: qtyNum,
            user_id: user.id,        // ✅ ใส่ User
            user_email: user.email,  // ✅ ใส่ User Email
            created_at: new Date().toISOString()
        });

        if (logError) console.error("Transfer Log Error:", logError);
        revalidatePath(`/dashboard/${warehouseId}/history`);
        revalidatePath(`/dashboard/${warehouseId}`);
        revalidatePath(`/dashboard/${warehouseId}/inventory`);
        
        return { success: true, message: `ย้ายของไปที่ ${targetCode} สำเร็จ` };

    } catch (error: any) {
        console.error("Transfer Error:", error);
        return { success: false, message: error.message || "เกิดข้อผิดพลาด" };
    }
}