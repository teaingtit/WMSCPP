'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod'; // ใช้ Zod สำหรับ Validation (ตาม Best Practice)

// --- 1. Validation Schema & Interfaces ---
const InboundSchema = z.object({
  warehouseId: z.string().min(1),
  locationId: z.string().uuid("Invalid Location ID"),
  productId: z.string().uuid("Invalid Product ID"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  attributes: z.record(z.string(), z.any()).optional().default({}),
});

// Helper: Resolve Warehouse Code to ID
async function resolveWarehouseId(supabase: any, warehouseId: string) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(warehouseId);
    if (isUUID) return warehouseId;
    const { data } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
    return data ? data.id : null;
}

// --- 2. Data Fetching Functions (Getters) ---

// ✅ ADD: ดึงหมวดหมู่สินค้าทั้งหมด (สำหรับหน้าเมนูหลัก)
export async function getProductCategories() {
  const supabase = await createClient();
  try {
    const { data } = await supabase.from('product_categories').select('*').order('id', { ascending: true });
    return data || [];
  } catch (error) { return []; }
}

// ✅ ADD: ดึงรายละเอียดหมวดหมู่ (สำหรับหน้า Form) - *Fixes Error*
export async function getCategoryDetail(categoryId: string) {
  const supabase = await createClient();
  try {
    const { data } = await supabase.from('product_categories').select('*').eq('id', categoryId).single();
    return data;
  } catch (error) { return null; }
}

// ✅ ADD: ดึงตัวเลือกสินค้าในหมวดหมู่นั้น (สำหรับ Dropdown) - *Fixes Error*
export async function getInboundOptions(warehouseId: string, categoryId: string) {
  const supabase = await createClient();
  try {
    // ดึงสินค้าเฉพาะใน Category ที่เลือก
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', categoryId)
      .order('name');

    return {
      products: products || []
    };
  } catch (error) {
    return { products: [] };
  }
}

// --- 3. Location Selectors (สำหรับ Dynamic Form) ---
export async function getWarehouseLots(warehouseId: string) {
    const supabase = await createClient();
    const whId = await resolveWarehouseId(supabase, warehouseId);
    if (!whId) return [];
    const { data } = await supabase.from('locations').select('lot').eq('warehouse_id', whId).eq('is_active', true).order('lot'); 
    return data ? Array.from(new Set(data.map(l => l.lot))).filter(Boolean) : [];
}

export async function getCartsByLot(warehouseId: string, lot: string) {
    const supabase = await createClient();
    const whId = await resolveWarehouseId(supabase, warehouseId);
    if (!whId) return [];
    const { data } = await supabase.from('locations').select('cart').eq('warehouse_id', whId).eq('lot', lot).eq('is_active', true).order('cart');
    return data ? Array.from(new Set(data.map(l => l.cart))).filter(Boolean) : [];
}

export async function getLevelsByCart(warehouseId: string, lot: string, cart: string) {
    const supabase = await createClient();
    const whId = await resolveWarehouseId(supabase, warehouseId);
    if (!whId) return [];
    const { data } = await supabase.from('locations').select('id, level, code, type').eq('warehouse_id', whId).eq('lot', lot).eq('cart', cart).eq('is_active', true).order('level');
    return data || [];
}

// --- 4. Main Action (Submit) ---
export async function submitInbound(rawData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !user.email) return { success: false, message: 'Unauthenticated' };

  // Validate Data
  const validated = InboundSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, message: 'Invalid Data', errors: validated.error.flatten().fieldErrors };
  }

  const { warehouseId, locationId, productId, quantity, attributes } = validated.data;

  try {
    const whId = await resolveWarehouseId(supabase, warehouseId);
    if (!whId) throw new Error("Warehouse Not Found");

    // Atomic RPC Call (ตัดสต็อก + บันทึก Log พร้อมกัน)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('process_inbound_transaction', {
        p_warehouse_id: whId,
        p_location_id: locationId,
        p_product_id: productId,
        p_quantity: quantity,
        p_attributes: attributes,
        p_user_id: user.id,
        p_user_email: user.email
    });

    if (rpcError) throw new Error(rpcError.message);
    if (rpcResult && !rpcResult.success) throw new Error(rpcResult.message);

    revalidatePath(`/dashboard/${warehouseId}/inventory`);
    revalidatePath(`/dashboard/${warehouseId}/history`);
    
    return { success: true, message: `✅ รับสินค้าสำเร็จ (${quantity})` };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}