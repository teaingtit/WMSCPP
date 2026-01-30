'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getWarehouseId } from '@/lib/utils/db-helpers';
import { withAuth, processBulkAction } from '@/lib/action-utils';
import { TABLES, RPC } from '@/lib/constants';

// --- Validation Schema ---
const InboundSchema = z.object({
  warehouseId: z.string().min(1),
  locationId: z.string().uuid('Invalid Location ID'),
  productId: z.string().uuid('Invalid Product ID'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  attributes: z.record(z.string(), z.any()).optional().default({}),
});

export type InboundFormData = z.infer<typeof InboundSchema>;

// --- Data Fetching ---
// ... (Previous fetch functions remain unchanged)

export async function getProductCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('product_categories')
    .select('*')
    .order('id', { ascending: true });
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

export async function getInboundOptions(_warehouseId: string, categoryId: string) {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', categoryId)
    .order('name');
  return { products: products || [] };
}

// --- Location Selectors ---

export async function getWarehouseLots(warehouseId: string) {
  const supabase = await createClient();
  const whId = await getWarehouseId(supabase, warehouseId);
  if (!whId) return [];

  const { data } = await supabase
    .from('locations')
    .select('lot')
    .eq('warehouse_id', whId)
    .eq('is_active', true)
    .order('lot');

  return data ? Array.from(new Set(data.map((l) => l.lot))).filter(Boolean) : [];
}

export async function getCartsByLot(warehouseId: string, lot: string) {
  const supabase = await createClient();
  const whId = await getWarehouseId(supabase, warehouseId);
  if (!whId) return [];

  const { data } = await supabase
    .from('locations')
    .select('cart')
    .eq('warehouse_id', whId)
    .eq('lot', lot)
    .eq('is_active', true)
    .order('cart');

  return data ? Array.from(new Set(data.map((l) => l.cart))).filter(Boolean) : [];
}

export async function getLevelsByCart(warehouseId: string, lot: string, cart: string) {
  const supabase = await createClient();
  const whId = await getWarehouseId(supabase, warehouseId);
  if (!whId) return [];

  const { data } = await supabase
    .from('locations')
    .select('id, level, code, type')
    .eq('warehouse_id', whId)
    .eq('lot', lot)
    .eq('cart', cart)
    .eq('is_active', true)
    .not('level', 'is', null)
    .order('level', { ascending: true });

  return data || [];
}

// --- Submit Action ---
const submitInboundHandler = async (rawData: unknown, { user, supabase }: any) => {
  const validated = InboundSchema.safeParse(rawData);
  if (!validated.success)
    return {
      success: false,
      message: 'Invalid Data',
      errors: validated.error.flatten().fieldErrors,
    };

  const { warehouseId, locationId, productId, quantity, attributes } = validated.data;

  const whId = await getWarehouseId(supabase, warehouseId);
  if (!whId) throw new Error('Warehouse Not Found');

  // ✅ Validate: Check if location exists and belongs to this warehouse
  const { data: locValidation } = await supabase
    .from('locations')
    .select('id, warehouse_id, is_active')
    .eq('id', locationId)
    .single();

  if (!locValidation) {
    return { success: false, message: 'ไม่พบพิกัดที่เลือก กรุณาเลือกพิกัดใหม่' };
  }
  if (locValidation.warehouse_id !== whId) {
    return { success: false, message: 'พิกัดนี้ไม่อยู่ในคลังสินค้าที่เลือก' };
  }
  if (!locValidation.is_active) {
    return { success: false, message: 'พิกัดนี้ถูกปิดใช้งานแล้ว กรุณาเลือกพิกัดอื่น' };
  }

  // ✅ Validate: Check if product exists and is active
  const { data: prodValidation } = await supabase
    .from('products')
    .select('id, is_active')
    .eq('id', productId)
    .single();

  if (!prodValidation) {
    return { success: false, message: 'ไม่พบสินค้าที่เลือก กรุณาเลือกสินค้าใหม่' };
  }
  if (!prodValidation.is_active) {
    return { success: false, message: 'สินค้านี้ถูกปิดใช้งานแล้ว กรุณาเลือกสินค้าอื่น' };
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc(RPC.PROCESS_INBOUND_TRANSACTION, {
    p_warehouse_id: whId,
    p_location_id: locationId,
    p_product_id: productId,
    p_quantity: quantity,
    p_attributes: attributes,
    p_user_id: user.id,
    p_user_email: user.email,
  });

  if (rpcError) throw new Error(rpcError.message);
  if (rpcResult && !rpcResult.success) throw new Error(rpcResult.message);

  const [{ data: product }, { data: location }] = await Promise.all([
    supabase.from('products').select('name, uom, sku').eq('id', productId).single(),
    supabase.from('locations').select('code').eq('id', locationId).single(),
  ]);

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
      timestamp: new Date().toISOString(),
    },
  };
};

export const submitInbound = withAuth(submitInboundHandler);

export async function submitBulkInbound(items: (InboundFormData & { productName?: string })[]) {
  return processBulkAction(items, submitInbound);
}
