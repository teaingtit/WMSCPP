// actions/settings-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// --- 1. Getters (ดึงข้อมูล) ---

// [ADMIN ONLY] ดึงคลังทั้งหมด (รวมที่ปิดใช้งาน) เพื่อการจัดการ
export async function getAllWarehousesForAdmin() {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from('warehouses')
      .select('*')
      .order('is_active', { ascending: false }) // โชว์ Active ก่อน
      .order('created_at', { ascending: true });
    
    return data || [];
  } catch (error) {
    console.error("Fetch All Warehouses Error:", error);
    return [];
  }
}
export async function getCategories() {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from('product_categories')
      .select('*')
      .order('id', { ascending: true });

    return data || [];
  } catch (error) {
    console.error("Fetch Categories Error:", error);
    return [];
  }
}

// --- 2. Mutations (แก้ไขข้อมูล) ---
export async function getProducts() {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from('products')
      .select('*, category:product_categories(name)') // Join เอาชื่อหมวดหมู่
      .order('created_at', { ascending: false });
    return data || [];
  } catch (error) {
    return [];
  }
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  
  const sku = (formData.get('sku') as string).trim().toUpperCase();
  const name = (formData.get('name') as string).trim();
  const categoryId = formData.get('category_id') as string;
  
  if (!sku || !name) return { success: false, message: 'SKU and Name are required' };

  try {
    const { error } = await supabase.from('products').insert({
      sku,
      name,
      category_id: categoryId || 'GENERAL',
      uom: formData.get('uom') as string || 'PCS',
      min_stock: Number(formData.get('min_stock')) || 0,
      image_url: formData.get('image_url') as string || null
    });

    if (error) {
      if (error.code === '23505') return { success: false, message: `SKU "${sku}" มีอยู่แล้ว` };
      throw error;
    }

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'สร้างสินค้าสำเร็จ' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteProduct(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;

  try {
    // 1. Check Stock
    const { count } = await supabase.from('stocks').select('*', { count: 'exact', head: true }).eq('product_id', id);
    if (count && count > 0) return { success: false, message: '❌ ลบไม่ได้: มีสินค้าคงเหลือในสต็อก' };

    // 2. Check Transactions (ถ้าเข้มงวดต้องห้ามลบ แต่ถ้า MVP อนุโลมให้ลบได้ถ้าไม่มีของ)
    // const { count: transCount } = ...

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'ลบสินค้าสำเร็จ' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
export async function createWarehouse(formData: FormData) {
  const supabase = await createClient();
  
  const payload = {
    p_code: (formData.get('code') as string).trim(),
    p_name: (formData.get('name') as string).trim(),
    p_max_lots: parseInt(formData.get('max_lots') as string) || 1,
    p_max_carts: parseInt(formData.get('max_carts') as string) || 1,
    p_max_levels: parseInt(formData.get('max_levels') as string) || 1,
  };

  try {
    const { data, error } = await supabase.rpc('create_warehouse_with_locations', payload);

    if (error) throw error;

    const result = data as { success: boolean; message: string };

    if (result.success) {
        revalidatePath('/dashboard/settings');
        revalidatePath('/dashboard'); // อัปเดตเมนูหรือหน้าอื่นๆ ด้วย
        return { success: true, message: result.message };
    } else {
        return { success: false, message: result.message };
    }

  } catch (err: any) {
    console.error('RPC Error:', err);
    return { success: false, message: 'System Error: ' + err.message };
  }
}

export async function deleteWarehouse(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;

  try {
    // 1. เช็คสต็อก
    const { count } = await supabase.from('stocks').select('*', { count: 'exact', head: true }).eq('warehouse_id', id);
    if (count && count > 0) {
      return { success: false, message: '❌ ไม่สามารถลบได้: มีสินค้าคงเหลือในคลังนี้' };
    }

    // 2. ลบ Locations
    const { error: locError } = await supabase.from('locations').delete().eq('warehouse_id', id);
    if (locError) throw locError;

    // 3. ลบคลัง
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true, message: 'ลบคลังสินค้าเรียบร้อย' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function createCategory(formData: FormData) {
  const id = (formData.get('id') as string).trim().toUpperCase();
  const name = formData.get('name') as string;
  const schemaString = formData.get('schema') as string || '[]';
  
  if (!id || !name) return { success: false, message: 'กรุณาระบุ ID และชื่อประเภท' };

  const supabase = await createClient();

  try {
    let parsedSchema;
    try {
        parsedSchema = JSON.parse(schemaString);
    } catch {
        return { success: false, message: 'Invalid Schema Format' };
    }

    const { error } = await supabase
      .from('product_categories')
      .insert([{ 
        id, 
        name, 
        form_schema: parsedSchema 
      }]);

    if (error) {
        if (error.code === '23505') return { success: false, message: 'รหัสประเภทสินค้าซ้ำ (ID Exists)' };
        throw error;
    }

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'สร้างประเภทสินค้าสำเร็จ' };
  } catch (err: any) {
    return { success: false, message: 'Error: ' + err.message };
  }
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;

  try {
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category_id', id);

    if (count && count > 0) {
       return { success: false, message: `❌ มีสินค้า ${count} รายการใช้ประเภทนี้อยู่ ลบไม่ได้` };
    }

    const { error } = await supabase.from('product_categories').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'ลบประเภทสินค้าสำเร็จ' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}