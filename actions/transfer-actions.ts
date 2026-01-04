'use server';

import { createClient } from '@/lib/db/supabase-server';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { revalidatePath } from 'next/cache';
import { getWarehouseId } from '@/lib/utils/db-helpers';

// Helper: สร้างรหัส Lxx-Pxx-Zxx (ใช้เป็น Fallback เท่านั้น)
function generate3DCode(lot: string, pos: string, level: string) {
    const l = `L${lot.toString().padStart(2, '0')}`;
    const p = `P${pos.toString().padStart(2, '0')}`;
    const z = `Z${level.toString().padStart(2, '0')}`;
    return { code: `${l}-${p}-${z}`, lot: l, cart: p, level: Number(level) };
}

export async function getStockById(stockId: string) {
    const supabase = await createClient();
    const { data } = await supabase.from('stocks')
        .select(`id, quantity, attributes, products!inner(sku, name, uom), locations!inner(code, warehouse_id)`)
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
    .select(`id, quantity, attributes, products!inner(sku, name, uom), locations!inner(code, warehouse_id)`)
    .eq('locations.warehouse_id', whId)
    .gt('quantity', 0)
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { foreignTable: 'products' }) 
    .limit(20);

  if (error) { console.error("Search Error:", error); return []; }
  return stocks || [];
}

// --- Internal Transfer ---
export async function submitTransfer(formData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };

    const { warehouseId, stockId, targetLocationId, targetLot, targetCart, targetLevel, transferQty } = formData;
    const qty = Number(transferQty);
    if (isNaN(qty) || qty <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

    try {
        const whId = await getWarehouseId(supabase, warehouseId);
        if (!whId) throw new Error("Warehouse Not Found");

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
             const { data: tLoc } = await supabase.from('locations').select('code').eq('id', targetLocId).single();
             targetLocCode = tLoc?.code || '';
        }

        // Get Source Info (ดึงมาเพื่อ Log และแสดงผล)
        const { data: sourceStock } = await supabase
            .from('stocks')
            .select('product_id, location_id, products!inner(name, sku, uom), locations!inner(code)')
            .eq('id', stockId)
            .single();
            
        if (!sourceStock) throw new Error("ไม่พบสต็อกต้นทาง");

        // RPC Transfer
        const { data: result, error: rpcError } = await supabase.rpc('transfer_stock', {
            p_source_stock_id: stockId, p_target_location_id: targetLocId, p_qty: qty
        });

        if (rpcError) throw rpcError;
        if (!result.success) return { success: false, message: result.message };

        // Log Transaction
        await supabase.from('transactions').insert({
            type: 'TRANSFER', warehouse_id: whId,
            product_id: sourceStock.product_id,
            from_location_id: sourceStock.location_id, to_location_id: targetLocId,
            quantity: qty, user_id: user.id, 
            user_email: user.email 
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
                timestamp: new Date().toISOString()
            }
        };

    } catch (error: any) {
        console.error("Internal Transfer Error:", error);
        return { success: false, message: error.message };
    }
}

// --- Cross Transfer ---
export async function submitCrossTransfer(formData: any) {
    // ... (logic check user เหมือนเดิม) ...
    const supabase = await createClient(); 
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };
  
    const { sourceWarehouseId, targetWarehouseId, stockId, targetLocationId, targetLot, targetCart, targetLevel, transferQty } = formData;
    const qty = Number(transferQty);
    if (isNaN(qty) || qty <= 0) return { success: false, message: "จำนวนไม่ถูกต้อง" };

  try {
    const sourceWhId = await getWarehouseId(supabase, sourceWarehouseId);
    const { data: targetWh } = await supabaseAdmin.from('warehouses').select('id, code, name').eq('id', targetWarehouseId).single();
    
    if (!sourceWhId || !targetWh) throw new Error("Warehouse Info Missing");

    let targetCode = '';
    if (targetLocationId) {
        const { data: loc } = await supabaseAdmin.from('locations').select('code').eq('id', targetLocationId).single();
        targetCode = loc?.code || '';
    } else {
        const locData = generate3DCode(targetLot, targetCart, targetLevel);
        targetCode = locData.code;
    }

    // Get Source Info
    const { data: sourceStock } = await supabase
        .from('stocks')
        .select('product_id, location_id, products!inner(name, uom), locations!inner(code)')
        .eq('id', stockId)
        .single();
        
    if(!sourceStock) throw new Error("Stock Source Not Found");

    // RPC Cross Transfer
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('transfer_cross_stock', {
        p_stock_id: stockId, p_target_warehouse_id: targetWarehouseId,
        p_target_code: targetCode,
        p_qty: qty,
        p_user_id: user.id, p_user_email: user.email
    });

    if (rpcError) throw new Error(rpcError.message);
    if (!result.success) return { success: false, message: result.message };

    // Log Transaction
    await supabase.from('transactions').insert({
        type: 'TRANSFER_OUT', warehouse_id: sourceWhId,
        product_id: sourceStock.product_id,
        from_location_id: sourceStock.location_id,
        details: `To: ${targetWh.name} (${targetCode})`,
        quantity: qty, user_id: user.id, 
        user_email: user.email 
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
            timestamp: new Date().toISOString()
        }
    };

  } catch (error: any) {
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการย้ายข้ามคลัง' };
  }
}
// actions/transfer-actions.ts
export async function submitBulkTransfer(items: any[]) {
    const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
    };
    
    // Use Sequential Loop to avoid Race Conditions on Source Stock Quantity
    for(const item of items) {
        // Determine type based on item.mode (passed from frontend)
        const res = item.mode === 'CROSS' 
            ? await submitCrossTransfer(item) 
            : await submitTransfer(item);
            
        if(res.success) {
            results.success++;
        } else {
            results.failed++;
            results.errors.push(res.message || 'Unknown Error');
        }
    }
    
    return {
        success: results.failed === 0,
        message: `ย้ายสำเร็จ ${results.success} รายการ${results.failed > 0 ? `, ไม่สำเร็จ ${results.failed} รายการ` : ''}`,
        details: results
    };
}