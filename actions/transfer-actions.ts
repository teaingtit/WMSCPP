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
    const { warehouseId, stockId, targetLot, targetCart, targetLevel, transferQty } = formData;
    
    const qtyNum = Number(transferQty);

    if (isNaN(qtyNum) || qtyNum <= 0) {
        return { success: false, message: "จำนวนย้ายต้องมากกว่า 0" };
    }

    try {
        // 1. Resolve Target Location ID (หา ID ปลายทางก่อน)
        // Format: WH-Lxx-Cxx-LVxx
        const lotStr = targetLot.toString().padStart(2, '0');
        const cartStr = targetCart.toString().padStart(2, '0');
        const levelStr = targetLevel.toString().padStart(2, '0');
        const targetCode = `${warehouseId}-L${lotStr}-C${cartStr}-LV${levelStr}`;

        // ต้องหา warehouse_id จริงๆก่อน เพราะ code อาจจะซ้ำข้าม Tenant (ถ้ามี) 
        // หรือเพื่อความชัวร์ ดึง warehouse id จาก stockId ต้นทางก็ได้ แต่ในที่นี้หาจาก warehouseCode ที่ส่งมาง่ายกว่า
        const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
        if(!wh) throw new Error("Warehouse Not Found");

        const { data: targetLoc } = await supabase
            .from('locations')
            .select('id')
            .eq('code', targetCode)
            .eq('warehouse_id', wh.id)
            .single();

        if (!targetLoc) throw new Error(`ไม่พบพิกัดปลายทาง ${targetCode}`);

        // 2. Call RPC (Atomic Transfer)
        const { data: result, error: rpcError } = await supabase.rpc('transfer_stock', {
            p_source_stock_id: stockId,
            p_target_location_id: targetLoc.id,
            p_qty: qtyNum
        });

        if (rpcError) throw rpcError;

        if (!result.success) {
            return { success: false, message: result.message };
        }

        revalidatePath(`/dashboard/${warehouseId}`);
        revalidatePath(`/dashboard/${warehouseId}/inventory`);
        
        return { success: true, message: `ย้ายของไปที่ ${targetCode} สำเร็จ` };

    } catch (error: any) {
        console.error("Transfer Error:", error);
        return { success: false, message: error.message || "เกิดข้อผิดพลาดในการย้ายสินค้า" };
    }
}