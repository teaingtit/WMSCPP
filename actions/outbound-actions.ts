// actions/outbound-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// Interface เพื่อ Type Safety
interface OutboundFormData {
  warehouseId: string;
  stockId: string;
  qty: string | number;
  note?: string;
}

// 1. ค้นหาสินค้า (ปรับปรุงให้อ่านง่ายขึ้น)
export async function searchStockForOutbound(warehouseId: string, query: string) {
  // ... (Code เดิม) ...
  const supabase = await createClient();
  const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).maybeSingle();
  if (!wh) return [];

  const { data: stocks, error } = await supabase
    .from('stocks')
    .select(`
        id, quantity, attributes,
        products!inner(id, sku, name, uom),
        locations!inner(id, code)
    `)
    // Note: เพิ่ม products!inner(id) และ locations!inner(id) เพื่อใช้ตอน Log
    .eq('warehouse_id', wh.id)
    .gt('quantity', 0)
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { foreignTable: 'products' })
    .order('quantity', { ascending: false })
    .limit(20);

  if (error) { console.error("Search Error:", error); return []; }
  return stocks || [];
}

// 2. สั่งตัดสต็อก (Atomic Deduct via RPC)
export async function submitOutbound(formData: OutboundFormData) {
    const supabase = await createClient();
    
    // ✅ 1. ดึง User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };

    const { warehouseId, stockId, qty, note } = formData;
    const deductQty = Number(qty);

    if (isNaN(deductQty) || deductQty <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

    try {
        // ✅ 2. ดึงข้อมูล Stock เพื่อใช้บันทึก Log (ก่อนตัดสต็อก)
        const { data: stockInfo } = await supabase
            .from('stocks')
            .select('warehouse_id, product_id, location_id')
            .eq('id', stockId)
            .single();

        if (!stockInfo) throw new Error("ไม่พบข้อมูลสต็อก");

        // ✅ 3. เรียก RPC ตัดสต็อก
        const { data: result, error } = await supabase.rpc('deduct_stock', {
            p_stock_id: stockId,
            p_deduct_qty: deductQty,
            p_note: note || ''
        });

        if (error) throw error;
        if (!result.success) return { success: false, message: result.message };

        // ✅ 4. บันทึก Transaction Log แบบ Manual (เพื่อให้มี User Email)
        const { error: logError } = await supabase.from('transactions').insert({
            type: 'OUTBOUND',
            warehouse_id: stockInfo.warehouse_id,
            product_id: stockInfo.product_id,
            from_location_id: stockInfo.location_id, // ระบุต้นทาง
            quantity: deductQty,
            details: note,
            user_id: user.id,          // ✅ ใส่ ID
            user_email: user.email,    // ✅ ใส่ Email (แก้ปัญหาแสดง System)
            created_at: new Date().toISOString()
        });

        if (logError) console.error("Log Error:", logError);
        revalidatePath(`/dashboard/${warehouseId}/history`);
        revalidatePath(`/dashboard/${warehouseId}`);
        revalidatePath(`/dashboard/${warehouseId}/inventory`);
        
        return { success: true, message: result.message };

    } catch (error: any) {
        console.error("Outbound Error:", error);
        return { success: false, message: error.message || "เกิดข้อผิดพลาด" };
    }
}