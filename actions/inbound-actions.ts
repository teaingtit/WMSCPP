'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getWarehouseId } from '@/lib/utils/db-helpers';

// --- Validation Schema ---
const InboundSchema = z.object({
  warehouseId: z.string().min(1),
  locationId: z.string().uuid("Invalid Location ID"),
  productId: z.string().uuid("Invalid Product ID"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  attributes: z.record(z.string(), z.any()).optional().default({}),
});

// --- Data Fetching ---

export async function getProductCategories() {
  const supabase = await createClient();
  try {
    const { data } = await supabase.from('product_categories').select('*').order('id', { ascending: true });
    return data || [];
  } catch (error) {
    console.error("Error fetching product categories:", error);
    return [];
  }
}

export async function getCategoryDetail(categoryId: string) {
  const supabase = await createClient();
  try {
    const { data } = await supabase.from('product_categories').select('*').eq('id', categoryId).single();
    return data;
  } catch (error) {
    console.error(`Error fetching category detail for ID ${categoryId}:`, error);
    return null;
  }
}

export async function getInboundOptions(warehouseId: string, categoryId: string) {
  const supabase = await createClient();
  try {
    const { data: products } = await supabase.from('products').select('*').eq('category_id', categoryId).order('name');
    return { products: products || [] };
  } catch (error) {
    console.error(`Error fetching inbound options for warehouse ${warehouseId}, category ${categoryId}:`, error);
    return { products: [] };
  }
}

// --- Location Selectors (จุดที่แก้ไข) ---

export async function getWarehouseLots(warehouseId: string) {
    const supabase = await createClient();
    const whId = await getWarehouseId(supabase, warehouseId);
    if (!whId) return [];
    
    const { data } = await supabase.from('locations')
        .select('lot')
        .eq('warehouse_id', whId)
        .eq('is_active', true)
        .order('lot'); // เรียงตาม Lot
        
    return data ? Array.from(new Set(data.map(l => l.lot))).filter(Boolean) : [];
}

export async function getCartsByLot(warehouseId: string, lot: string) {
    const supabase = await createClient();
    const whId = await getWarehouseId(supabase, warehouseId);
    if (!whId) return [];
    
    const { data } = await supabase.from('locations')
        .select('cart')
        .eq('warehouse_id', whId)
        .eq('lot', lot)
        .eq('is_active', true)
        .order('cart'); // เรียงตาม Cart/Position
        
    return data ? Array.from(new Set(data.map(l => l.cart))).filter(Boolean) : [];
}

export async function getLevelsByCart(warehouseId: string, lot: string, cart: string) {
    const supabase = await createClient();
    const whId = await getWarehouseId(supabase, warehouseId);
    if (!whId) return [];
    
    // ✅ FIX: เพิ่ม .not('level', 'is', null) และ .order('level')
    const { data } = await supabase.from('locations')
        .select('id, level, code, type')
        .eq('warehouse_id', whId)
        .eq('lot', lot)
        .eq('cart', cart)
        .eq('is_active', true)
        .not('level', 'is', null) // กรองค่า Null ออก
        .order('level', { ascending: true }); // เรียงลำดับ Level ให้ถูกต้อง

    return data || [];
}

// --- Submit Action ---
export async function submitInbound(rawData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { success: false, message: 'Unauthenticated' };

  const validated = InboundSchema.safeParse(rawData);
  if (!validated.success) return { success: false, message: 'Invalid Data', errors: validated.error.flatten().fieldErrors };

  const { warehouseId, locationId, productId, quantity, attributes } = validated.data;

  try {
    const whId = await getWarehouseId(supabase, warehouseId);
    if (!whId) throw new Error("Warehouse Not Found");

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

    // --- Optimization: Fetch product and location details in parallel ---
    // TODO: For further optimization, consider modifying the RPC function 
    // to return these details directly, avoiding additional queries.
    const [productRes, locationRes] = await Promise.all([
      supabase.from('products').select('name, uom, sku').eq('id', productId).single(),
      supabase.from('locations').select('code').eq('id', locationId).single()
    ]);

    const product = productRes.data;
    const location = locationRes.data;

    revalidatePath(`/dashboard/${warehouseId}/inventory`);
    revalidatePath(`/dashboard/${warehouseId}/history`);

   return { 
        success: true, 
        message: 'รับสินค้าเข้าเรียบร้อย',
        details: {
            type: 'INBOUND',
            productName: product?.name || 'Unknown Product',
            sku: product?.sku,
            locationCode: location?.code || 'Unknown Location',
            quantity: quantity,
            uom: product?.uom || 'UNIT',
            timestamp: new Date().toISOString()
        }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function submitBulkInbound(items: any[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  const promises = items.map(async (item) => {
    const result = await submitInbound(item);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push(`สินค้า ${item.productName || 'Unknown'}: ${result.message}`);
    }
    return result;
  });

  await Promise.all(promises);

  return {
    success: results.failed === 0,
    message: `บันทึกสำเร็จ ${results.success} รายการ${results.failed > 0 ? `, ไม่สำเร็จ ${results.failed} รายการ` : ''}`,
    details: results
  };
}
