'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// --- 1. Getters (ดึงเฉพาะ Active) ---

export async function getAllWarehousesForAdmin() {
  const supabase = await createClient();
  try {
    // ✅ FIX: ดึงเฉพาะคลังที่เปิดใช้งาน
    const { data } = await supabase.from('warehouses')
        .select('*')
        .eq('is_active', true) 
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: true });
    return data || [];
  } catch (error) { return []; }
}

export async function getCategories() {
  const supabase = await createClient();
  try {
    // หมวดหมู่มักไม่ต้อง Soft Delete ซับซ้อน แต่ถ้าต้องการก็เพิ่ม .eq('is_active', true) ได้
    const { data } = await supabase.from('product_categories').select('*').order('id', { ascending: true });
    return data || [];
  } catch (error) { return []; }
}

export async function getProducts() {
  const supabase = await createClient();
  try {
    // ✅ FIX: ดึงเฉพาะสินค้าที่ยังไม่ถูกลบ
    const { data } = await supabase.from('products')
        .select('*, category:product_categories(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    return data || [];
  } catch (error) { return []; }
}

// --- 2. Mutations ---

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const sku = (formData.get('sku') as string).trim().toUpperCase();
  const name = (formData.get('name') as string).trim();
  const categoryId = formData.get('category_id') as string;
  
  const { data: category } = await supabase.from('product_categories').select('form_schema').eq('id', categoryId).single();
  const attributes: Record<string, any> = {};
  if (category?.form_schema) {
    (category.form_schema as any[]).forEach((field) => {
      const value = formData.get(field.key);
      if (value) attributes[field.key] = field.type === 'number' ? Number(value) : value;
    });
  }

  if (!sku || !name) return { success: false, message: 'SKU and Name are required' };

  try {
    const { error } = await supabase.from('products').insert({
      sku, name, category_id: categoryId || 'GENERAL',
      uom: formData.get('uom') as string || 'PCS',
      min_stock: Number(formData.get('min_stock')) || 0,
      image_url: formData.get('image_url') as string || null,
      attributes: attributes,
      is_active: true // ✅ Default เป็น True เสมอ
    });

    if (error) {
      if (error.code === '23505') return { success: false, message: `SKU "${sku}" มีอยู่แล้ว` };
      throw error;
    }
    revalidatePath('/dashboard/settings');
    return { success: true, message: 'สร้างสินค้าสำเร็จ' };
  } catch (err: any) { return { success: false, message: err.message }; }
}

// ✅ RE-DESIGNED: Soft Delete Product
export async function deleteProduct(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  
  try {
    // 1. เช็คสินค้าคงเหลือ (ถ้ายังมีของอยู่ ห้ามลบเด็ดขาด!)
    const { count } = await supabase.from('stocks').select('*', { count: 'exact', head: true }).eq('product_id', id);
    if (count && count > 0) return { success: false, message: '❌ ลบไม่ได้: มีสินค้าคงเหลือในสต็อก' };
    
    // 2. ดึงข้อมูลสินค้าเดิมเพื่อเอา SKU
    const { data: product } = await supabase.from('products').select('sku').eq('id', id).single();
    if (!product) return { success: false, message: 'ไม่พบสินค้า' };

    // 3. ทำ Soft Delete + Rename SKU
    // เราต้องแก้ชื่อ SKU เพื่อให้ User สามารถสร้างสินค้าใหม่ด้วย SKU เดิมได้ทันที
    const archivedSku = `${product.sku}_DEL_${Date.now()}`; 

    const { error } = await supabase.from('products')
      .update({ 
        is_active: false,
        sku: archivedSku // เปลี่ยนชื่อ SKU เพื่อคืนค่าให้ระบบ
      })
      .eq('id', id);

    if (error) throw error;
    
    revalidatePath('/dashboard/settings');
    return { success: true, message: 'ลบสินค้าสำเร็จ (ย้ายไปถังขยะ)' };

  } catch (err: any) { return { success: false, message: err.message }; }
}

// ✅ RE-DESIGNED: Soft Delete Warehouse
export async function deleteWarehouse(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  try {
    // 1. เช็คสินค้าคงเหลือ
    const { count } = await supabase.from('stocks').select('*', { count: 'exact', head: true }).eq('warehouse_id', id);
    if (count && count > 0) return { success: false, message: '❌ มีสินค้าคงเหลือ ลบไม่ได้' };
    
    // 2. Soft Delete (ปิดการใช้งาน)
    const { error } = await supabase.from('warehouses')
        .update({ is_active: false })
        .eq('id', id);
    
    if (error) throw error;
    
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true, message: 'ปิดใช้งานคลังสินค้าเรียบร้อย' };
  } catch (err: any) { return { success: false, message: err.message }; }
}

export async function createWarehouse(formData: FormData) {
  const supabase = await createClient();
  
  const payload = {
    p_code: (formData.get('code') as string).trim().toUpperCase(),
    p_name: (formData.get('name') as string).trim(),
    p_axis_x: parseInt(formData.get('axis_x') as string) || 1, 
    p_axis_y: parseInt(formData.get('axis_y') as string) || 1, 
    p_axis_z: parseInt(formData.get('axis_z') as string) || 1, 
  };

  try {
    const { data, error } = await supabase.rpc('create_warehouse_xyz_grid', payload);

    if (error) throw error;
    const result = data as { success: boolean; message: string };

    if (result.success) {
        revalidatePath('/dashboard/settings');
        revalidatePath('/dashboard');
        return { success: true, message: result.message };
    } else {
        return { success: false, message: result.message };
    }
  } catch (err: any) {
    console.error('RPC Error:', err);
    return { success: false, message: 'System Error: ' + err.message };
  }
}

export async function createCategory(formData: FormData) {
  const id = (formData.get('id') as string).trim().toUpperCase();
  const name = formData.get('name') as string;
  const schemaString = formData.get('schema') as string || '[]';
  if (!id || !name) return { success: false, message: 'ระบุ ID และชื่อ' };
  const supabase = await createClient();
  try {
    let parsedSchema = JSON.parse(schemaString);
    const { error } = await supabase.from('product_categories').insert([{ id, name, form_schema: parsedSchema }]);
    if (error) {
        if (error.code === '23505') return { success: false, message: 'ID ซ้ำ' };
        throw error;
    }
    revalidatePath('/dashboard/settings');
    return { success: true, message: 'สร้างประเภทสินค้าสำเร็จ' };
  } catch (err: any) { return { success: false, message: 'Error: ' + err.message }; }
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  try {
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category_id', id);
    if (count && count > 0) return { success: false, message: '❌ มีสินค้าใช้ประเภทนี้อยู่' };
    const { error } = await supabase.from('product_categories').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard/settings');
    return { success: true, message: 'ลบประเภทสินค้าสำเร็จ' };
  } catch (err: any) { return { success: false, message: err.message }; }
}