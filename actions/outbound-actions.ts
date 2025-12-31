'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

interface OutboundFormData { warehouseId: string; stockId: string; qty: string | number; note?: string; }

export async function searchStockForOutbound(warehouseId: string, query: string) {
  // ... (โค้ดส่วน search คงเดิม) ...
  const supabase = await createClient();
  const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).maybeSingle();
  if (!wh) return [];

  const { data: stocks, error } = await supabase
    .from('stocks')
    .select(`id, quantity, attributes, products!inner(id, sku, name, uom), locations!inner(id, code, warehouse_id)`)
    .eq('locations.warehouse_id', wh.id) 
    .gt('quantity', 0)
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { foreignTable: 'products' })
    .order('quantity', { ascending: false })
    .limit(20);

  if (error) { console.error("Search Error:", error); return []; }
  return stocks || [];
}

export async function submitOutbound(formData: OutboundFormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return { success: false, message: 'Unauthenticated' };

    const { warehouseId, stockId, qty, note } = formData;
    const deductQty = Number(qty);
    if (isNaN(deductQty) || deductQty <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

    try {
        // เช็คก่อนว่ามี Stock ไหม (เพื่อความชัวร์)
        const { data: stockInfo } = await supabase.from('stocks')
            .select(`id`)
            .eq('id', stockId)
            .single();

        if (!stockInfo) throw new Error("ไม่พบข้อมูลสต็อก");

        // ✅ เรียก RPC ตัวเดียว จบงาน (ตัดของ + บันทึก Log)
        const { data: result, error } = await supabase.rpc('deduct_stock', {
            p_stock_id: stockId, 
            p_deduct_qty: deductQty, 
            p_note: note || '',
            p_user_id: user.id,       // ส่ง User ID
            p_user_email: user.email  // ส่ง Email ไปบันทึกใน RPC
        });

        if (error) throw error;
        if (!result.success) return { success: false, message: result.message };

        // ❌ ลบส่วน Insert transactions ตรงนี้ทิ้งไปเลย (เพราะ RPC ทำแล้ว)
        
        revalidatePath(`/dashboard/${warehouseId}/history`);
        revalidatePath(`/dashboard/${warehouseId}/inventory`);
        
        return { success: true, message: result.message };

    } catch (error: any) {
        console.error("Outbound Error:", error);
        return { success: false, message: error.message || "เกิดข้อผิดพลาด" };
    }
}