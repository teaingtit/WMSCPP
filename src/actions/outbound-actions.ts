'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getWarehouseId } from '@/lib/utils/db-helpers';
import { withAuth, processBulkAction } from '@/lib/action-utils';

interface OutboundFormData {
  warehouseId: string;
  stockId: string;
  qty: string | number;
  note?: string;
}

export async function searchStockForOutbound(warehouseId: string, query: string) {
  const supabase = await createClient();
  const whId = await getWarehouseId(supabase, warehouseId);
  if (!whId) return [];

  const { data: stocks, error } = await supabase
    .from('stocks')
    .select(
      `id, quantity, attributes, products!inner(id, sku, name, uom), locations!inner(id, code, warehouse_id)`,
    )
    .eq('locations.warehouse_id', whId)
    .gt('quantity', 0)
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { foreignTable: 'products' })
    .order('quantity', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Search Error:', error);
    return [];
  }
  return stocks || [];
}

const submitOutboundHandler = async (formData: OutboundFormData, { user, supabase }: any) => {
  const { warehouseId, stockId, qty, note } = formData;
  const deductQty = Number(qty);
  if (isNaN(deductQty) || deductQty <= 0) return { success: false, message: 'จำนวนไม่ถูกต้อง' };

  // ✅ 1. ดึงข้อมูลสินค้าก่อนตัดสต็อก (เพื่อเอาไว้แสดงผล)
  const { data: stockInfo } = await supabase
    .from('stocks')
    .select(`id, quantity, products!inner(name, sku, uom), locations!inner(code)`)
    .eq('id', stockId)
    .single();

  if (!stockInfo) throw new Error('ไม่พบข้อมูลสต็อก');

  // ✅ Check status restrictions before outbound
  const { data: entityStatus } = await supabase
    .from('entity_statuses')
    .select('status:status_definitions(name, effect)')
    .eq('entity_type', 'STOCK')
    .eq('entity_id', stockId)
    .single();

  if (entityStatus?.status) {
    const effect = entityStatus.status.effect;
    const statusName = entityStatus.status.name;

    // Block outbound for restricted statuses
    if (['TRANSACTIONS_PROHIBITED', 'CLOSED', 'INBOUND_ONLY', 'AUDIT_ONLY'].includes(effect)) {
      return {
        success: false,
        message: `ไม่สามารถเบิกจ่ายได้: สินค้านี้มีสถานะ "${statusName}" ที่ไม่อนุญาตให้เบิกจ่าย`,
      };
    }
  }

  // ✅ Validate: Check quantity before sending to RPC
  if (deductQty > stockInfo.quantity) {
    return {
      success: false,
      message: `จำนวนที่ต้องการ (${deductQty}) มากกว่าสินค้าคงเหลือ (${stockInfo.quantity})`,
    };
  }

  // 2. เรียก RPC ตัดของ
  const { data: result, error } = await supabase.rpc('deduct_stock', {
    p_stock_id: stockId,
    p_deduct_qty: deductQty,
    p_note: note || '',
    p_user_id: user.id,
    p_user_email: user.email,
  });

  if (error) throw error;
  if (!result.success) return { success: false, message: result.message };

  revalidatePath(`/dashboard/${warehouseId}/history`);
  revalidatePath(`/dashboard/${warehouseId}/inventory`);

  // ✅ 3. Return Data Structure
  return {
    success: true,
    message: result.message,
    details: {
      type: 'OUTBOUND',
      productName: (stockInfo.products as any).name,
      locationCode: (stockInfo.locations as any).code,
      quantity: deductQty,
      uom: (stockInfo.products as any).uom,
      note: note || '-',
      timestamp: new Date().toISOString(),
    },
  };
};

export const submitOutbound = withAuth(submitOutboundHandler);

export async function submitBulkOutbound(items: any[]) {
  return processBulkAction(items, submitOutbound);
}
