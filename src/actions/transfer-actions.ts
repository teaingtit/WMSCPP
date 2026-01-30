'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getWarehouseId } from '@/lib/utils/db-helpers';
import { withAuth } from '@/lib/action-utils';
import { RPC, TABLES } from '@/lib/constants';

// Helper: สร้างรหัส Lxx-Pxx-Zxx (ใช้เป็น Fallback เท่านั้น)
const pad2 = (n: string | number) => String(n).padStart(2, '0');
const generate3DCode = (lot: string, pos: string, level: string) => ({
  code: `L${pad2(lot)}-P${pad2(pos)}-Z${pad2(level)}`,
  lot: `L${pad2(lot)}`,
  cart: `P${pad2(pos)}`,
  level: Number(level),
});

export async function getStockById(stockId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('stocks')
    .select(
      'id, quantity, attributes, products!inner(sku, name, uom), locations!inner(code, warehouse_id)',
    )
    .eq('id', stockId)
    .single();
  return data;
}

export async function searchStockForTransfer(warehouseId: string, query: string) {
  const supabase = await createClient();
  const whId = await getWarehouseId(supabase, warehouseId);
  if (!whId) return [];

  const { data: stocks, error } = await supabase
    .from('stocks')
    .select(
      `id, quantity, attributes, products!inner(sku, name, uom), locations!inner(code, warehouse_id)`,
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

// --- Internal Transfer ---
const submitTransferHandler = async (formData: any, { user, supabase }: any) => {
  const {
    warehouseId,
    stockId,
    targetLocationId,
    targetLot,
    targetCart,
    targetLevel,
    transferQty,
  } = formData;
  const qty = Number(transferQty);
  if (isNaN(qty) || qty <= 0) return { success: false, message: 'จำนวนไม่ถูกต้อง' };

  const whId = await getWarehouseId(supabase, warehouseId);
  if (!whId) throw new Error('Warehouse Not Found');

  // Resolve Target Location
  let targetLocId = targetLocationId;
  let targetLocCode = ''; // เก็บ Code ไว้แสดงผล

  if (!targetLocId) {
    const locData = generate3DCode(targetLot, targetCart, targetLevel);
    targetLocCode = locData.code;
    const { data: targetLoc } = await supabase
      .from('locations')
      .select('id')
      .eq('code', locData.code)
      .eq('warehouse_id', whId)
      .eq('is_active', true)
      .maybeSingle();

    if (!targetLoc) throw new Error(`❌ ไม่พบพิกัดปลายทาง: ${locData.code}`);
    targetLocId = targetLoc.id;
  } else {
    // ถ้ามี ID หา Code กลับมาเพื่อแสดงผล
    const { data: tLoc } = await supabase
      .from('locations')
      .select('code')
      .eq('id', targetLocId)
      .single();
    targetLocCode = tLoc?.code || '';
  }

  // Get Source Info (ดึงมาเพื่อ Log และแสดงผล)
  const { data: sourceStock } = await supabase
    .from('stocks')
    .select('product_id, location_id, products!inner(name, sku, uom), locations!inner(code)')
    .eq('id', stockId)
    .single();

  if (!sourceStock) throw new Error('ไม่พบสต็อกต้นทาง');

  // ✅ Check status restrictions before transfer
  const { data: stockStatus } = await supabase
    .from('entity_statuses')
    .select('status_definitions!inner(effect, name)')
    .eq('entity_type', 'stock')
    .eq('entity_id', stockId)
    .maybeSingle();

  if (stockStatus) {
    const effect = stockStatus.status_definitions.effect;
    const statusName = stockStatus.status_definitions.name;

    // Block transfer if status prohibits transactions or is outbound-only
    if (
      effect === 'TRANSACTIONS_PROHIBITED' ||
      effect === 'CLOSED' ||
      effect === 'OUTBOUND_ONLY' ||
      effect === 'AUDIT_ONLY'
    ) {
      return {
        success: false,
        message: `ไม่สามารถย้ายสินค้านี้ได้ สถานะ: ${statusName}`,
      };
    }
  }

  // ✅ Validate: Prevent transfer to same location
  if (sourceStock.location_id === targetLocId) {
    return {
      success: false,
      message: 'ไม่สามารถย้ายไปยังตำแหน่งเดิมได้ กรุณาเลือกตำแหน่งปลายทางอื่น',
    };
  }

  // RPC Transfer
  const { data: result, error: rpcError } = await supabase.rpc(RPC.TRANSFER_STOCK, {
    p_source_stock_id: stockId,
    p_target_location_id: targetLocId,
    p_qty: qty,
  });

  if (rpcError) throw rpcError;
  if (!result.success) return { success: false, message: result.message };

  // Log Transaction
  await supabase.from(TABLES.TRANSACTIONS).insert({
    type: 'TRANSFER',
    warehouse_id: whId,
    product_id: sourceStock.product_id,
    from_location_id: sourceStock.location_id,
    to_location_id: targetLocId,
    quantity: qty,
    user_id: user.id,
    user_email: user.email,
  });

  revalidatePath(`/dashboard/${warehouseId}`);

  // ✅ Return Data Structure
  return {
    success: true,
    message: `ย้ายสินค้าสำเร็จ`,
    details: {
      type: 'TRANSFER',
      productName: (sourceStock.products as any)?.name,
      fromLocation: (sourceStock.locations as any)?.code,
      toLocation: targetLocCode,
      quantity: qty,
      uom: (sourceStock.products as any)?.uom,
      timestamp: new Date().toISOString(),
    },
  };
};

export const submitTransfer = withAuth(submitTransferHandler);

// --- Cross Transfer ---
const submitCrossTransferHandler = async (formData: any, { user, supabase }: any) => {
  const {
    sourceWarehouseId,
    targetWarehouseId,
    stockId,
    targetLocationId,
    targetLot,
    targetCart,
    targetLevel,
    transferQty,
  } = formData;
  const qty = Number(transferQty);
  if (isNaN(qty) || qty <= 0) return { success: false, message: 'จำนวนไม่ถูกต้อง' };

  // ✅ Validate: Cannot transfer to same warehouse for cross-transfer
  if (sourceWarehouseId === targetWarehouseId) {
    return {
      success: false,
      message: 'การย้ายข้ามคลังต้องเลือกคลังปลายทางที่แตกต่างจากคลังต้นทาง',
    };
  }

  const sourceWhId = await getWarehouseId(supabase, sourceWarehouseId);
  const { data: targetWh } = await supabaseAdmin
    .from('warehouses')
    .select('id, code, name, is_active')
    .eq('id', targetWarehouseId)
    .single();

  if (!sourceWhId || !targetWh) throw new Error('Warehouse Info Missing');

  // ✅ Validate: Target warehouse must be active
  if (!targetWh.is_active) {
    return { success: false, message: 'คลังปลายทางถูกปิดใช้งานแล้ว กรุณาเลือกคลังอื่น' };
  }

  let targetCode = '';
  if (targetLocationId) {
    const { data: loc } = await supabaseAdmin
      .from('locations')
      .select('code')
      .eq('id', targetLocationId)
      .single();
    targetCode = loc?.code || '';
  } else {
    const locData = generate3DCode(targetLot, targetCart, targetLevel);
    targetCode = locData.code;
  }

  // Get Source Info
  const { data: sourceStock } = await supabase
    .from('stocks')
    .select('product_id, location_id, quantity, products!inner(name, uom), locations!inner(code)')
    .eq('id', stockId)
    .single();

  if (!sourceStock) throw new Error('Stock Source Not Found');

  // ✅ Validate: Check quantity before transfer
  if (qty > (sourceStock as any).quantity) {
    return {
      success: false,
      message: `จำนวนที่ต้องการ (${qty}) มากกว่าสินค้าคงเหลือ (${(sourceStock as any).quantity})`,
    };
  }

  // RPC Cross Transfer
  const { data: result, error: rpcError } = await supabaseAdmin.rpc(RPC.TRANSFER_CROSS_STOCK, {
    p_stock_id: stockId,
    p_target_warehouse_id: targetWarehouseId,
    p_target_code: targetCode,
    p_qty: qty,
    p_user_id: user.id,
    p_user_email: user.email,
  });

  if (rpcError) throw new Error(rpcError.message);
  if (!result.success) return { success: false, message: result.message };

  // Log Transaction
  await supabase.from(TABLES.TRANSACTIONS).insert({
    type: 'TRANSFER_OUT',
    warehouse_id: sourceWhId,
    product_id: sourceStock.product_id,
    from_location_id: sourceStock.location_id,
    details: `To: ${targetWh.name} (${targetCode})`,
    quantity: qty,
    user_id: user.id,
    user_email: user.email,
  });

  revalidatePath(`/dashboard/${sourceWarehouseId}`);

  // ✅ Return Data Structure
  return {
    success: true,
    message: `ย้ายข้ามคลังสำเร็จ`,
    details: {
      type: 'CROSS_TRANSFER',
      productName: (sourceStock.products as any)?.name,
      fromLocation: `${(sourceStock.locations as any)?.code}`,
      toWarehouse: targetWh.name,
      toLocation: targetCode,
      quantity: qty,
      uom: (sourceStock.products as any)?.uom,
      timestamp: new Date().toISOString(),
    },
  };
};

export const submitCrossTransfer = withAuth(submitCrossTransferHandler);

// actions/transfer-actions.ts
export async function submitBulkTransfer(items: any[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Use Sequential Loop to avoid Race Conditions on Source Stock Quantity
  for (const item of items) {
    // Determine type based on item.mode (passed from frontend)
    const res =
      item.mode === 'CROSS' ? await submitCrossTransfer(item) : await submitTransfer(item);

    if (res.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push(res.message || 'Unknown Error');
    }
  }

  return {
    success: results.failed === 0,
    message: `ย้ายสำเร็จ ${results.success} รายการ${
      results.failed > 0 ? `, ไม่สำเร็จ ${results.failed} รายการ` : ''
    }`,
    details: results,
  };
}

// Preflight: validate items without committing. Returns per-item preview and overall summary.
export async function preflightBulkTransfer(items: any[]) {
  const supabase = await createClient();

  const results: Array<any> = [];

  for (const item of items) {
    try {
      const stockId = item.sourceStock?.id || item.stockId || item.stock_id;
      const requested = Number(item.qty || item.transferQty || item.requested_qty || 0);

      if (!stockId) {
        results.push({ ok: false, reason: 'Missing stock id', stockId: null });
        continue;
      }

      // Fetch stock info
      const { data: stock } = await supabase
        .from('stocks')
        .select(
          'id, quantity, products!inner(id, sku, name), locations!inner(id, code, warehouse_id)',
        )
        .eq('id', stockId)
        .single();

      if (!stock) {
        results.push({ ok: false, reason: 'Stock not found', stockId });
        continue;
      }

      // Validate target location if provided
      let targetLoc = null;
      if (item.targetLocation && item.targetLocation.id) {
        const { data: loc } = await supabase
          .from('locations')
          .select('id, code, warehouse_id')
          .eq('id', item.targetLocation.id)
          .maybeSingle();
        targetLoc = loc || null;
        if (!loc) {
          results.push({ ok: false, reason: 'Target location not found', stockId });
          continue;
        }

        // ✅ Validate: Prevent transfer to same location
        const sourceLocationId = (stock.locations as any)?.id;
        if (targetLoc && sourceLocationId === targetLoc.id) {
          results.push({
            ok: false,
            reason: 'Cannot transfer to same location',
            stockId,
            available: stock.quantity,
          });
          continue;
        }
      }

      // Basic availability check
      const available = Number(stock.quantity || 0);
      if (requested <= 0) {
        results.push({ ok: false, reason: 'Invalid quantity', stockId, available });
        continue;
      }

      if (requested > available) {
        results.push({ ok: false, reason: 'Insufficient quantity', stockId, available, requested });
        continue;
      }

      results.push({ ok: true, stockId, available, requested, targetLocation: targetLoc });
    } catch (err: any) {
      results.push({ ok: false, reason: err.message || 'Preflight error' });
    }
  }

  const summary = { total: items.length, ok: results.filter((r) => r.ok).length };
  return { results, summary };
}
