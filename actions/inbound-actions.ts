// actions/inbound-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// --- Interfaces ---
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

// --- Getters (ดึงข้อมูล) ---

export async function getProductCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('name');
    
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data || [];
}

export async function getCategoryDetail(categoryId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('product_categories')
    .select('*')
    .eq('id', categoryId)
    .single();
  return data;
}

export async function getInboundOptions(warehouseId: string, categoryId: string) {
  const supabase = await createClient();
  
  // 1. ดึงสินค้าในหมวดหมู่นี้
  const { data: products } = await supabase
    .from('products')
    .select('id, sku, name, uom')
    .eq('category_id', categoryId)
    .order('sku');

  // 2. ดึง Warehouse ID จริง
  // (เช็คว่าเป็น UUID หรือ Code ถ้าเป็น Code ให้หา ID ก่อน)
  let targetWhId = warehouseId;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(warehouseId);
  
  if (!isUUID) {
     const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
     if (wh) targetWhId = wh.id;
  }

  // 3. ดึง Locations ของคลังนี้
  const { data: locations } = await supabase
    .from('locations')
    .select('id, code, type')
    .eq('warehouse_id', targetWhId)
    .eq('is_active', true)
    .order('code', { ascending: true });
  
  return { 
    products: products || [], 
    locations: locations || [] 
  };
}

// --- Main Action (บันทึกรับเข้า) ---

export async function submitInbound(formData: InboundFormData) {
  const supabase = await createClient();
  
  // 1. ตรวจสอบ Auth
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

    // Resolve Warehouse ID
    let whId = warehouseId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(warehouseId);
    if (!isUUID) {
       const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
       if (!wh) throw new Error("Warehouse not found");
       whId = wh.id;
    }

    if (!productId) throw new Error("Product ID is required");

    // 2. เรียก RPC: handle_inbound_stock
    const { data: rpcResult, error: rpcError } = await supabase.rpc('handle_inbound_stock', {
        p_warehouse_id: whId,
        p_location_id: locationId,
        p_product_id: productId,
        p_quantity: qtyNum,
        p_attributes: attributes || {},
        p_user_id: user.id // ส่ง user_id ไปด้วย (ตามที่แก้ RPC ล่าสุด)
    });

    if (rpcError) throw new Error(`Stock Update Failed: ${rpcError.message}`);
    
    // (Optional) ถ้า RPC ไม่ได้บันทึก Transaction ให้ เราบันทึกเองตรงนี้
    // แต่ถ้า RPC บันทึกแล้ว (ตามโค้ดล่าสุด) ก็ไม่ต้องทำซ้ำ 
    // ในที่นี้สมมติว่า RPC จัดการ Stocks อย่างเดียว หรือเราอยาก Log เพิ่มเติม
    /* const { error: logError } = await supabase.from('transactions').insert({
        type: 'INBOUND',
        warehouse_id: whId,
        product_id: productId,
        to_location_id: locationId,
        quantity: qtyNum,
        attributes_snapshot: attributes,
        user_id: user.id,
        user_email: user.email
    });
    */

    revalidatePath(`/dashboard/${warehouseId}/history`);
    revalidatePath(`/dashboard/${warehouseId}/inventory`);
    
    return { success: true, message: `รับสินค้าสำเร็จ (จำนวน ${qtyNum})` };

  } catch (error: any) {
    console.error("Inbound Error:", error);
    return { success: false, message: error.message };
  }
}