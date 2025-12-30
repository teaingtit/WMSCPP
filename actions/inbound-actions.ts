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

// --- Helper: Resolve Warehouse ID ---
// ช่วยแปลง Code (WH-01) เป็น UUID ถ้าจำเป็น
async function resolveWarehouseId(supabase: any, warehouseId: string) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(warehouseId);
    if (isUUID) return warehouseId;
    
    const { data } = await supabase.from('warehouses').select('id').eq('code', warehouseId).single();
    return data ? data.id : null;
}

// --- 1. Basic Getters (ฟังก์ชันเดิมที่ต้องคงไว้ เพื่อให้หน้าเว็บโหลดได้) ---

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

  // 2. Resolve Warehouse ID
  const targetWhId = await resolveWarehouseId(supabase, warehouseId);

  return { 
    products: products || [], 
    targetWhId 
  };
}

// --- 2. Smart Cascading Selectors (High Performance Mode - ระบบใหม่) ---

// Step A: ดึงรายการ Lot (ใช้ DISTINCT จาก DB ตรงๆ เร็วมาก)
export async function getWarehouseLots(warehouseId: string) {
  const supabase = await createClient();
  const whId = await resolveWarehouseId(supabase, warehouseId);
  if (!whId) return [];

  const { data, error } = await supabase
    .from('locations')
    .select('lot')
    .eq('warehouse_id', whId)
    .eq('is_active', true)
    .order('lot'); 

  if (error || !data) return [];
  
  // กรองตัวซ้ำใน JS
  const uniqueLots = Array.from(new Set(data.map(l => l.lot))).filter(Boolean);
  return uniqueLots;
}

// Step B: ดึงรายการ Cart ตาม Lot
export async function getCartsByLot(warehouseId: string, lot: string) {
  const supabase = await createClient();
  const whId = await resolveWarehouseId(supabase, warehouseId);
  if (!whId) return [];

  const { data } = await supabase
    .from('locations')
    .select('cart')
    .eq('warehouse_id', whId)
    .eq('lot', lot) // ✅ Query ตรงๆ เร็วมาก
    .eq('is_active', true)
    .order('cart');

  if (!data) return [];
  const uniqueCarts = Array.from(new Set(data.map(l => l.cart))).filter(Boolean);
  return uniqueCarts;
}

// Step C: ดึงรายการ Level และ ID สุดท้าย
export async function getLevelsByCart(warehouseId: string, lot: string, cart: string) {
  const supabase = await createClient();
  const whId = await resolveWarehouseId(supabase, warehouseId);
  if (!whId) return [];

  const { data } = await supabase
    .from('locations')
    .select('id, level, code, type')
    .eq('warehouse_id', whId)
    .eq('lot', lot)
    .eq('cart', cart)
    .eq('is_active', true)
    .order('level');

  return data || [];
}

// --- 3. Main Action: Submit Inbound ---

export async function submitInbound(formData: InboundFormData) {
  const supabase = await createClient();
  
  // Check Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthenticated' };

  const { warehouseId, locationId, productId, quantity, attributes } = formData;

  try {
    if (!locationId || !quantity || !productId) throw new Error("ข้อมูลไม่ครบถ้วน");
    const qtyNum = Number(quantity);
    if (qtyNum <= 0) throw new Error("จำนวนต้องมากกว่า 0");

    const whId = await resolveWarehouseId(supabase, warehouseId);
    if (!whId) throw new Error("Warehouse Not Found");

    // Call RPC
    const { error: rpcError } = await supabase.rpc('handle_inbound_stock', {
        p_warehouse_id: whId,
        p_location_id: locationId,
        p_product_id: productId,
        p_quantity: qtyNum,
        p_attributes: attributes || {},
        p_user_id: user.id
    });

    if (rpcError) throw new Error(rpcError.message);

    revalidatePath(`/dashboard/${warehouseId}/inventory`);
    revalidatePath(`/dashboard/${warehouseId}/history`);
    
    return { success: true, message: `✅ รับสินค้าสำเร็จ (${qtyNum})` };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}