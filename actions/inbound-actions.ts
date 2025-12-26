// actions/inbound-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// --- Existing Functions (getCategories, etc.) เก็บไว้เหมือนเดิม ---
export async function getProductCategories() {
  const supabase = createClient();
  const { data, error } = await supabase.from('product_categories').select('*');
  if (error) console.error('Error fetching categories:', error);
  return data || [];
}

export async function getCategoryDetail(categoryId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('product_categories').select('*').eq('id', categoryId).single();
  return data;
}

export async function getInboundOptions(warehouseId: string, categoryId: string) {
    const supabase = createClient();
    const { data: products } = await supabase.from('products').select('id, sku, name').eq('category_id', categoryId);
    const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
    
    let locations: any[] = [];
    if (wh) {
        const { data: locs } = await supabase
            .from('locations') // ดึงจาก table locations ตรงๆ
            .select('id, code, type')
            .eq('warehouse_id', wh.id)
            .order('code', { ascending: true });
        locations = locs || [];
    }

    return { 
        products: products || [], 
        locations: locations // ส่งกลับไป
    };
  }

// --- MAIN FUNCTION: Submit Inbound ---
export async function submitInbound(formData: any) {
  const supabase = createClient();
  const { 
      warehouseId, locationId, 
      productId, // ID สินค้าเดิม (ถ้ามี)
      isNewProduct, newProductData, // ข้อมูลสินค้าใหม่
      quantity, attributes 
  } = formData;

  try {
    // 1. Validation เบื้องต้น
    if (!warehouseId || !locationId || !quantity) throw new Error("ข้อมูลไม่ครบถ้วน (Warehouse, Location, Qty)");

    // 2. หา Warehouse ID
    const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
    if (!wh) throw new Error("Warehouse not found");

    let finalProductId = productId;

    // 3. Logic สร้างสินค้าใหม่ (Auto Create Product Master)
    if (isNewProduct) {
        if (!newProductData?.sku || !newProductData?.name) throw new Error("กรุณาระบุ SKU และชื่อสินค้าใหม่");

        // 3.1 เช็คว่า SKU ซ้ำไหม?
        const { data: existingSku } = await supabase
            .from('products')
            .select('id')
            .eq('sku', newProductData.sku.toUpperCase()) // บังคับตัวใหญ่
            .maybeSingle(); // ใช้ maybeSingle เพื่อไม่ throw error ถ้าไม่เจอ

        if (existingSku) {
            throw new Error(`SKU ${newProductData.sku} มีอยู่ในระบบแล้ว (ID: ${existingSku.id}) กรุณาเลือกจากรายการสินค้าเดิม`);
        }

        // 3.2 สร้าง Product ใหม่
        const { data: newProd, error: createError } = await supabase
            .from('products')
            .insert({
                sku: newProductData.sku.toUpperCase(),
                name: newProductData.name,
                category_id: newProductData.categoryId || 'GENERAL', // Default Category
                uom: newProductData.uom || 'PCS',
                min_stock: Number(newProductData.minStock) || 0
            })
            .select('id')
            .single();

        if (createError) throw createError;
        finalProductId = newProd.id;
    }

    if (!finalProductId) throw new Error("System Error: Product ID not resolved");

    // 4. บันทึก Stock (Merge or Insert)
    // เช็คว่ามีของเดิมที่ Location นี้ + Attributes นี้ไหม
    const { data: existingStock } = await supabase
        .from('stocks')
        .select('id, quantity')
        .eq('location_id', locationId)
        .eq('product_id', finalProductId)
        .contains('attributes', attributes) // JSONB Match
        .maybeSingle();

    if (existingStock) {
        // UPDATE: บวกยอด
        await supabase.from('stocks').update({
            quantity: Number(existingStock.quantity) + Number(quantity),
            updated_at: new Date().toISOString()
        }).eq('id', existingStock.id);
    } else {
        // INSERT: แถวใหม่
        await supabase.from('stocks').insert({
            warehouse_id: wh.id,
            location_id: locationId,
            product_id: finalProductId,
            quantity: Number(quantity),
            attributes: attributes
        });
    }

    // 5. Transaction Log (สำคัญมากสำหรับการตรวจสอบย้อนหลัง)
    await supabase.from('transactions').insert({
        type: 'INBOUND',
        warehouse_id: wh.id,
        product_id: finalProductId,
        to_location_id: locationId,
        quantity: Number(quantity),
        attributes_snapshot: attributes,
        created_at: new Date().toISOString()
        // user_id: ... (ถ้ามี auth context ให้ใส่ตรงนี้)
    });

    // 6. Refresh หน้าจอ
    revalidatePath(`/dashboard/${warehouseId}`);
    return { success: true, message: `รับสินค้า ${isNewProduct ? newProductData.sku : ''} เข้าคลังสำเร็จ` };

  } catch (error: any) {
    console.error("Inbound Error:", error);
    return { success: false, message: error.message };
  }
}