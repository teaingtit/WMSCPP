// actions/outbound-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

interface OutboundFormData {
  warehouseId: string;
  stockId: string;
  qty: string | number;
  note?: string;
}

// 1. ค้นหาสินค้า (Search)
export async function searchStockForOutbound(warehouseId: string, query: string) {
  const supabase = await createClient();
  const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).maybeSingle();
  if (!wh) return [];

  const { data: stocks, error } = await supabase
    .from('stocks')
    .select(`
        id, quantity, attributes,
        products!inner(id, sku, name, uom),
        locations!inner(id, code, warehouse_id) 
    `)
    // ✅ FIX: กรองจาก locations.warehouse_id แทน warehouse_id ของ stocks
    .eq('locations.warehouse_id', wh.id) 
    .gt('quantity', 0)
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { foreignTable: 'products' })
    .order('quantity', { ascending: false })
    .limit(20);

  if (error) { console.error("Search Error:", error); return []; }
  return stocks || [];
}

// 2. สั่งตัดสต็อก (Submit)
export async function submitOutbound(formData: OutboundFormData) {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };

    const { warehouseId, stockId, qty, note } = formData;
    const deductQty = Number(qty);

    if (isNaN(deductQty) || deductQty <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

    try {
        // ✅ FIX: ดึง warehouse_id ผ่าน locations เพื่อใช้ Log ให้ถูกต้อง
        const { data: stockInfo } = await supabase
            .from('stocks')
            .select(`
                product_id, 
                location_id,
                locations (warehouse_id) 
            `)
            .eq('id', stockId)
            .single();

        if (!stockInfo) throw new Error("ไม่พบข้อมูลสต็อก");

        // เรียก RPC ตัดสต็อก (Database Atomic)
        const { data: result, error } = await supabase.rpc('deduct_stock', {
            p_stock_id: stockId,
            p_deduct_qty: deductQty,
            p_note: note || ''
        });

        if (error) throw error;
        if (!result.success) return { success: false, message: result.message };

        // ✅ FIX: Log โดยใช้ warehouse_id จาก Location จริง
        const realWarehouseId = (stockInfo.locations as any)?.warehouse_id;

        const { error: logError } = await supabase.from('transactions').insert({
            type: 'OUTBOUND',
            warehouse_id: realWarehouseId, // ใช้ ID ที่ถูกต้อง
            product_id: stockInfo.product_id,
            from_location_id: stockInfo.location_id,
            quantity: deductQty,
            details: note,
            user_id: user.id,
            user_email: user.email,
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