// actions/inbound-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// ... (Interface เดิม) ...
interface NewProductData {
  sku: string;
  name: string;
  categoryId?: string;
  uom?: string;
  minStock?: number | string;
}

interface InboundFormData {
  warehouseId: string;
  locationId: string;
  productId?: string;
  isNewProduct?: boolean;
  newProductData?: NewProductData;
  quantity: string | number;
  attributes: any; 
}

// ... (Getters เดิมคงไว้) ...
export async function getProductCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('product_categories').select('*').order('name');
  if (error) console.error('Error fetching categories:', error);
  return data || [];
}

export async function getCategoryDetail(categoryId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('product_categories').select('*').eq('id', categoryId).single();
  return data;
}

export async function getInboundOptions(warehouseId: string, categoryId: string) {
  const supabase = await createClient();
  const { data: products } = await supabase.from('products').select('id, sku, name').eq('category_id', categoryId).order('sku');
  const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
  
  let locations: any[] = [];
  if (wh) {
      const { data: locs } = await supabase.from('locations').select('id, code, type').eq('warehouse_id', wh.id).eq('is_active', true).order('code', { ascending: true });
      locations = locs || [];
  }
  return { products: products || [], locations: locations };
}

// --- MAIN FUNCTION ---
export async function submitInbound(formData: InboundFormData) {
  const supabase = await createClient();
  
  // ✅ 1. ดึง User ปัจจุบันก่อน
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthenticated' };

  const { 
      warehouseId, locationId, 
      productId, quantity, attributes 
  } = formData;

  try {
    if (!warehouseId || !locationId || !quantity) throw new Error("ข้อมูลไม่ครบถ้วน");
    const qtyNum = Number(quantity);
    if (qtyNum <= 0) throw new Error("จำนวนต้องมากกว่า 0");

    const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
    if (!wh) throw new Error("Warehouse not found");

    if (!productId) throw new Error("Product ID is required");

    // ✅ 2. เรียก RPC ที่อัปเกรดแล้ว (รองรับ attributes แยกบรรทัด)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('handle_inbound_stock', {
        p_warehouse_id: wh.id,
        p_location_id: locationId,
        p_product_id: productId,
        p_quantity: qtyNum,
        p_attributes: attributes || {} 
    });

    if (rpcError) throw new Error(`Stock Update Failed: ${rpcError.message}`);
    if (!rpcResult?.success) throw new Error("เกิดข้อผิดพลาดในการอัปเดตสต็อก");

    // ✅ 3. บันทึก Transaction พร้อม User ID และ Email
    const { error: logError } = await supabase.from('transactions').insert({
        type: 'INBOUND',
        warehouse_id: wh.id,
        product_id: productId,
        to_location_id: locationId,
        quantity: qtyNum,
        attributes_snapshot: attributes,
        user_id: user.id,          // บันทึก ID
        user_email: user.email,    // บันทึก Email (แสดงผลง่าย)
        created_at: new Date().toISOString()
    });

    if (logError) console.error("Transaction Log Error:", logError);

    revalidatePath(`/dashboard/${warehouseId}`);
    revalidatePath(`/dashboard/${warehouseId}/inventory`);
    
    return { success: true, message: `รับสินค้าสำเร็จ (จำนวน ${qtyNum})` };

  } catch (error: any) {
    console.error("Inbound Error:", error);
    return { success: false, message: error.message };
  }
}