// actions/settings-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// --- 1. Getters (เพิ่มส่วนนี้เพื่อให้ Frontend เรียกใช้ได้) ---

export async function getWarehouses() {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from('warehouses')
      .select('*')
      .order('is_active', { ascending: false }) // โชว์ Active ก่อน
      .order('created_at', { ascending: true });
    
    return data || [];
  } catch (error) {
    console.error("Fetch Warehouses Error:", error);
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

// --- 2. Mutations ---

export async function createWarehouse(formData: FormData) {
  const supabase = await createClient(); // อย่าลืม await
  
  // 1. เตรียมข้อมูล
  const payload = {
    p_code: (formData.get('code') as string).trim(),
    p_name: (formData.get('name') as string).trim(),
    p_max_lots: parseInt(formData.get('max_lots') as string) || 1,
    p_max_carts: parseInt(formData.get('max_carts') as string) || 1,
    p_max_levels: parseInt(formData.get('max_levels') as string) || 1,
  };

  try {
    // 2. เรียกใช้ RPC (เหมือนเรียกฟังก์ชันปกติ)
    const { data, error } = await supabase.rpc('create_warehouse_with_locations', payload);

    if (error) throw error;

    // data ที่ return มาจะเป็น JSON ตามที่เรากำหนดใน SQL
    // { success: true/false, message: "..." }
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

export async function deleteWarehouse(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;

  try {
    // 1. เช็คสต็อก
    const { count } = await supabase.from('stocks').select('*', { count: 'exact', head: true }).eq('warehouse_id', id);
    if (count && count > 0) {
      return { success: false, message: '❌ ไม่สามารถลบได้: มีสินค้าคงเหลือในคลังนี้' };
    }

    // 2. เช็ค Transaction (ถ้าซีเรียสเรื่อง Audit Trail ห้ามลบ แต่ถ้า MVP อนุโลม)
    // ในที่นี้เราปล่อยให้ลบได้ถ้าเคลียร์ของหมดแล้ว เพื่อความสะดวกช่วง Dev

    // 3. ลบ Locations ก่อน (Cascade Manual)
    const { error: locError } = await supabase.from('locations').delete().eq('warehouse_id', id);
    if (locError) throw locError;

    // 4. ลบคลัง
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
    // Validate JSON Schema
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