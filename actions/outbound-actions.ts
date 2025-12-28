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
  const supabase = await createClient();
  
  // ใช้ maybeSingle เพื่อไม่ให้ throw error ถ้าไม่เจอ
  const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).maybeSingle();
  if (!wh) return [];

  const { data: stocks, error } = await supabase
    .from('stocks')
    .select(`
        id, quantity, attributes,
        products!inner(sku, name, uom),
        locations!inner(code)
    `)
    .eq('warehouse_id', wh.id)
    .gt('quantity', 0)
    // การ search ข้าม table แบบนี้ถูกต้องแล้วใน Supabase-js v2
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { foreignTable: 'products' })
    .order('quantity', { ascending: false })
    .limit(20);

  if (error) {
    console.error("Search Error:", error);
    return [];
  }

  return stocks || [];
}

// 2. สั่งตัดสต็อก (Atomic Deduct via RPC)
export async function submitOutbound(formData: OutboundFormData) {
    const supabase = await createClient();
    const { warehouseId, stockId, qty, note } = formData;
    const deductQty = Number(qty);

    if (isNaN(deductQty) || deductQty <= 0) {
        return { success: false, message: "จำนวนที่ระบุไม่ถูกต้อง" };
    }

    try {
        // เรียกใช้ RPC (Stored Procedure) ที่เราสร้างไว้
        // ปลอดภัยจาก Race Condition 100%
        const { data: result, error } = await supabase.rpc('deduct_stock', {
            p_stock_id: stockId,
            p_deduct_qty: deductQty,
            p_note: note || ''
        });

        if (error) throw error;

        // เช็คผลลัพธ์จาก JSON ที่ return มาจาก DB
        if (!result.success) {
            return { success: false, message: result.message };
        }

        // Revalidate หน้าเว็บ
        revalidatePath(`/dashboard/${warehouseId}`);
        revalidatePath(`/dashboard/${warehouseId}/inventory`);
        
        return { success: true, message: result.message };

    } catch (error: any) {
        console.error("Outbound Error:", error);
        return { success: false, message: error.message || "เกิดข้อผิดพลาดในการตัดสต็อก" };
    }
}