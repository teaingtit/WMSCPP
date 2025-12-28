// actions/inbound-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// --- Helper Types ---
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
  attributes: any; // JSONB
}

// --- Existing Functions (Getters) ---
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
  
  // 1. ดึงสินค้าในหมวดหมู่นั้น
  const { data: products } = await supabase
    .from('products')
    .select('id, sku, name')
    .eq('category_id', categoryId)
    .order('sku');

  // 2. ดึง Warehouse ID
  const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
  
  let locations: any[] = [];
  if (wh) {
      // 3. ดึง Locations เฉพาะของ Warehouse นี้
      const { data: locs } = await supabase
          .from('locations')
          .select('id, code, type')
          .eq('warehouse_id', wh.id)
          .eq('is_active', true)
          .order('code', { ascending: true });
      locations = locs || [];
  }

  return { 
      products: products || [], 
      locations: locations 
  };
}

// --- MAIN FUNCTION: Submit Inbound (Refactored for Safety) ---
export async function submitInbound(formData: InboundFormData) {
  const supabase = await createClient();
  const { 
      warehouseId, locationId, 
      productId, 
      isNewProduct, newProductData,
      quantity, attributes 
  } = formData;

  try {
    // 1. Validation
    if (!warehouseId || !locationId || !quantity) throw new Error("ข้อมูลไม่ครบถ้วน (Warehouse, Location, Qty)");
    const qtyNum = Number(quantity);
    if (qtyNum <= 0) throw new Error("จำนวนต้องมากกว่า 0");

    // 2. หา Warehouse ID
    const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
    if (!wh) throw new Error("Warehouse not found");

    let finalProductId = productId;

    // 3. Logic สร้างสินค้าใหม่ (ถ้ามี)
    if (isNewProduct && newProductData) {
        const sku = newProductData.sku?.trim().toUpperCase();
        const name = newProductData.name?.trim();
        
        if (!sku || !name) throw new Error("กรุณาระบุ SKU และชื่อสินค้าใหม่");

        // 3.1 เช็ค SKU ซ้ำ
        const { data: existingSku } = await supabase
            .from('products')
            .select('id')
            .eq('sku', sku)
            .maybeSingle();

        if (existingSku) {
            throw new Error(`SKU ${sku} มีอยู่ในระบบแล้ว (ID: ${existingSku.id}) กรุณาเลือกสินค้าเดิม`);
        }

        // 3.2 สร้าง Product
        const { data: newProd, error: createError } = await supabase
            .from('products')
            .insert({
                sku: sku,
                name: name,
                category_id: newProductData.categoryId || 'GENERAL',
                uom: newProductData.uom || 'PCS',
                min_stock: Number(newProductData.minStock) || 0
            })
            .select('id')
            .single();

        if (createError) throw createError;
        finalProductId = newProd.id;
    }

    if (!finalProductId) throw new Error("ไม่สามารถระบุ Product ID ได้");

    // =========================================================
    // 4. ✨ Safe Stock Update via RPC ✨ (จุดสำคัญที่แก้ไข)
    // =========================================================
    // เรียกใช้ Database Function ที่เราสร้างไว้ ป้องกัน Race Condition 100%
    const { data: rpcResult, error: rpcError } = await supabase.rpc('handle_inbound_stock', {
        p_warehouse_id: wh.id,
        p_location_id: locationId,
        p_product_id: finalProductId,
        p_quantity: qtyNum,
        p_attributes: attributes || {} // ส่ง JSON เปล่าถ้าไม่มี
    });

    if (rpcError) throw new Error(`Stock Update Failed: ${rpcError.message}`);
    if (!rpcResult?.success) throw new Error("เกิดข้อผิดพลาดในการอัปเดตสต็อก");

    // 5. Transaction Log
    // บันทึกประวัติเพื่อตรวจสอบย้อนหลัง
    const { error: logError } = await supabase.from('transactions').insert({
        type: 'INBOUND',
        warehouse_id: wh.id,
        product_id: finalProductId,
        to_location_id: locationId,
        quantity: qtyNum,
        attributes_snapshot: attributes,
        created_at: new Date().toISOString()
        // user_id: ... ถ้ามี user session ให้ใส่ตรงนี้
    });

    if (logError) console.error("Transaction Log Error:", logError); // Log error แต่ไม่ throw เพื่อให้ flow จบสวยๆ เพราะสต็อกเข้าแล้ว

    // 6. Refresh หน้าจอ
    revalidatePath(`/dashboard/${warehouseId}`);
    revalidatePath(`/dashboard/${warehouseId}/inventory`);
    
    return { success: true, message: `รับสินค้าเข้าคลังสำเร็จ (จำนวน ${qtyNum})` };

  } catch (error: any) {
    console.error("Inbound Error:", error);
    return { success: false, message: error.message };
  }
}