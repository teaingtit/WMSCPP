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
    const { data: locations } = await supabase.from('warehouses').select('locations(id, code, type)').eq('code', warehouseId).single();
    return { products: products || [], locations: locations?.locations || [] };
}

// --- NEW: Submit Inbound with "New Product" Support ---
export async function submitInbound(formData: any) {
  const supabase = createClient();
  const { 
      warehouseId, locationId, 
      productId, // ถ้าเลือกจาก Dropdown จะมีค่านี้
      isNewProduct, newProductData, // ข้อมูลสำหรับสินค้าใหม่
      quantity, attributes 
  } = formData;

  try {
    // 1. ตรวจสอบ Warehouse
    const { data: wh } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
    if (!wh) throw new Error("Warehouse not found");

    let finalProductId = productId;

    // 2. ถ้าเป็นสินค้าใหม่ -> สร้าง Product Master ก่อน
    if (isNewProduct && newProductData) {
        // เช็ค SKU ซ้ำ
        const { data: existingSku } = await supabase.from('products').select('id').eq('sku', newProductData.sku).single();
        if (existingSku) throw new Error(`SKU ${newProductData.sku} มีอยู่ในระบบแล้ว กรุณาเลือกจากรายการ`);

        const { data: newProd, error: createError } = await supabase.from('products').insert({
            sku: newProductData.sku,
            name: newProductData.name,
            category_id: newProductData.categoryId,
            uom: newProductData.uom,
            min_stock: Number(newProductData.minStock) || 0,
            base_attributes: {} // เผื่ออนาคต
        }).select('id').single();

        if (createError) throw createError;
        finalProductId = newProd.id;
    }

    if (!finalProductId) throw new Error("ระบุสินค้าไม่ถูกต้อง");

    // 3. จัดการ Stock (Logic เดิม: Merge หรือ Insert)
    const { data: existingStock } = await supabase
        .from('stocks')
        .select('id, quantity')
        .eq('location_id', locationId)
        .eq('product_id', finalProductId)
        .contains('attributes', attributes)
        .maybeSingle();

    if (existingStock) {
        await supabase.from('stocks').update({
            quantity: Number(existingStock.quantity) + Number(quantity),
            updated_at: new Date().toISOString()
        }).eq('id', existingStock.id);
    } else {
        await supabase.from('stocks').insert({
            warehouse_id: wh.id,
            location_id: locationId,
            product_id: finalProductId,
            quantity: Number(quantity),
            attributes: attributes
        });
    }

    // 4. Log Transaction
    await supabase.from('transactions').insert({
        type: 'INBOUND',
        warehouse_id: wh.id,
        product_id: finalProductId,
        to_location_id: locationId,
        quantity: Number(quantity),
        attributes_snapshot: attributes,
        created_at: new Date().toISOString()
    });

    revalidatePath(`/dashboard/${warehouseId}`);
    return { success: true };

  } catch (error: any) {
    console.error("Inbound Error:", error);
    return { success: false, message: error.message };
  }
}