
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function createWarehouse(formData: FormData) {
  const supabase = createClient();
  
  const code = formData.get('code') as string;
  const name = formData.get('name') as string;
  const maxLots = parseInt(formData.get('max_lots') as string) || 1;
  const maxCarts = parseInt(formData.get('max_carts') as string) || 1;

  try {
    // 1. สร้าง Warehouse แม่
    const { data: wh, error: whError } = await supabase
      .from('warehouses')
      .insert([{ 
          code, 
          name, 
          is_active: true,
          capacity_config: { max_lots: maxLots, max_carts: maxCarts } // เก็บ Config ไว้
      }])
      .select('id')
      .single();

    if (whError) throw whError;

    // 2. Generate Locations อัตโนมัติ (Loop)
    // Format: {WH-CODE}-L{xx}-C{xx} เช่น WH-A-L01-C05
    const locationsToInsert = [];

    for (let l = 1; l <= maxLots; l++) {
        for (let c = 1; c <= maxCarts; c++) {
            // Pad Zero: 1 -> "01"
            const lotStr = l.toString().padStart(2, '0');
            const cartStr = c.toString().padStart(2, '0');
            
            locationsToInsert.push({
                warehouse_id: wh.id,
                code: `${code}-L${lotStr}-C${cartStr}`, // Gen รหัสอัตโนมัติ
                type: 'CART', // ประเภทเป็นแคร่
                is_active: true
            });
        }
    }

    // Insert ทีเดียว (Batch Insert)
    const { error: locError } = await supabase.from('locations').insert(locationsToInsert);
    
    if (locError) throw locError;

    revalidatePath('/dashboard');
    return { success: true, message: `สร้างคลังพร้อม ${locationsToInsert.length} ตำแหน่งสำเร็จ` };
    
  } catch (err: any) {
    console.error(err);
    return { success: false, message: err.message };
  }
}

// ... (ส่วน createCategory, delete... คงเดิม)
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
export async function deleteWarehouse(formData: FormData) {
  const supabase = createClient();
  const id = formData.get('id') as string;

  try {
    // เช็คก่อนว่ามีของในคลังไหม (Safety Check)
    const { count } = await supabase.from('stocks').select('*', { count: 'exact', head: true }).eq('warehouse_id', id);
    
    if (count && count > 0) {
      return { success: false, message: 'ไม่สามารถลบคลังที่มีสินค้าอยู่ได้ กรุณาเคลียร์สต็อกก่อน' };
    }

    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard'); // อัปเดตหน้าเลือกคลังด้วย
    return { success: true, message: 'ลบคลังสินค้าสำเร็จ' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteCategory(formData: FormData) {
  const supabase = createClient();
  const id = formData.get('id') as string;

  try {
    // เช็คว่ามีสินค้าใช้ Category นี้อยู่ไหม
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category_id', id);

    if (count && count > 0) {
       return { success: false, message: `มีสินค้า ${count} รายการใช้ประเภทนี้อยู่ ลบไม่ได้` };
    }

    const { error } = await supabase.from('product_categories').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'ลบประเภทสินค้าสำเร็จ' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}