'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// --- Warehouse Actions ---
export async function createWarehouse(formData: FormData) {
  const code = formData.get('code') as string;
  const name = formData.get('name') as string;
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from('warehouses')
      .insert([{ code, name, is_active: true }]);

    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true, message: 'สร้างคลังสินค้าสำเร็จ' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// --- Category Actions ---
export async function createCategory(formData: FormData) {
  const id = formData.get('id') as string; // e.g., 'FROZEN'
  const name = formData.get('name') as string;
  const supabase = createClient();
  // ตัวอย่างง่ายๆ รับ JSON string จาก Form หรือจะ Hardcode เพื่อทดสอบก็ได้
  const schemaString = formData.get('schema') as string || '[]';

  try {
    // Validate JSON
    JSON.parse(schemaString);

    const { error } = await supabase
      .from('product_categories')
      .insert([{ 
        id: id.toUpperCase(), 
        name, 
        form_schema: JSON.parse(schemaString) 
      }]);

    if (error) throw error;
    revalidatePath('/dashboard/settings');
    return { success: true, message: 'สร้างประเภทสินค้าสำเร็จ' };
  } catch (err: any) {
    return { success: false, message: 'Error: ' + err.message };
  }
}