'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import * as ExcelUtils from '@/lib/utils/excel-utils';
import { getWarehouseId } from '@/lib/utils/db-helpers';
import { checkManagerRole } from '@/lib/auth-service';
import { RPC } from '@/lib/constants';
import { Worksheet, Row, Cell } from 'exceljs';
import { SupabaseClient } from '@supabase/supabase-js';
import { enforceRateLimit } from '@/lib/rate-limit';

// ==========================================
// BULK OUTBOUND TEMPLATE
// ==========================================

export async function downloadOutboundTemplate(warehouseId: string) {
  try {
    const supabase = await createClient();

    // Resolve warehouse
    const whId = await getWarehouseId(supabase, warehouseId);
    if (!whId) throw new Error('ไม่พบคลังสินค้า');

    const { data: wh } = await supabase
      .from('warehouses')
      .select('code, name')
      .eq('id', whId)
      .single();

    const whCode = wh?.code || 'WH';

    const base64 = await ExcelUtils.generateOutboundTemplate(whCode);
    return {
      success: true,
      base64,
      fileName: `Outbound_Template_${whCode}.xlsx`,
    };
  } catch (error: any) {
    console.error('Download Outbound Template Error:', error);
    return { success: false, message: error.message || 'Failed to generate template' };
  }
}

// ==========================================
// BULK OUTBOUND IMPORT
// ==========================================

export async function importBulkOutbound(formData: FormData) {
  const warehouseId = formData.get('warehouseId') as string;
  const file = formData.get('file') as File;

  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthenticated' };

  // Rate limit check (5 requests per minute for bulk operations)
  const rateLimitError = await enforceRateLimit('BULK_OUTBOUND', user.id);
  if (rateLimitError) return rateLimitError;

  // Permission check - bulk outbound requires manager role
  const isManager = await checkManagerRole(supabase, user.id);
  if (!isManager) {
    return {
      success: false,
      message: 'ต้องการสิทธิ์ระดับ Manager ขึ้นไปในการนำเข้าข้อมูลแบบกลุ่ม',
    };
  }

  if (!file) return { success: false, message: 'ไม่พบไฟล์ Excel' };

  // Resolve warehouse ID
  const whId = await getWarehouseId(supabase, warehouseId);
  if (!whId) return { success: false, message: `ไม่พบคลังสินค้า: ${warehouseId}` };

  try {
    const worksheet = await ExcelUtils.parseExcel(file);

    // 1. Parse headers
    const headerMap = _parseOutboundHeaders(worksheet);

    // 2. Validate template structure
    const templateError = _validateOutboundTemplate(headerMap);
    if (templateError) {
      return { success: false, message: templateError };
    }

    // 3. Prefetch data for validation
    const context = await _prefetchOutboundData(supabase, whId);

    // 4. Process and validate rows
    const { outboundItems, errors } = _processOutboundRows(worksheet, headerMap, context);

    // 5. If any validation errors, reject entire batch
    if (errors.length > 0) {
      return {
        success: false,
        message: `พบข้อผิดพลาด ${errors.length} รายการ (ยกเลิกการเบิกจ่ายทั้งหมด)`,
        report: {
          total: worksheet.rowCount - 1,
          success: 0,
          failed: errors.length,
          errors,
        },
      };
    }

    if (outboundItems.length === 0) {
      return { success: false, message: 'ไม่พบข้อมูลในไฟล์' };
    }

    // 6. Process each outbound via RPC
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of outboundItems) {
      const { data: result, error } = await supabase.rpc(RPC.DEDUCT_STOCK, {
        p_stock_id: item.stockId,
        p_deduct_qty: item.qty,
        p_note: item.note || `Bulk Outbound - ${new Date().toISOString()}`,
        p_user_id: user.id,
        p_user_email: user.email,
      });

      if (error) {
        results.failed++;
        results.errors.push(`SKU ${item.sku}: ${error.message}`);
      } else if (!result?.success) {
        results.failed++;
        results.errors.push(`SKU ${item.sku}: ${result?.error || 'Unknown error'}`);
      } else {
        results.success++;
      }
    }

    // 7. Revalidate paths
    revalidatePath(`/dashboard/${warehouseId}/inventory`);
    revalidatePath(`/dashboard/${warehouseId}/history`);
    revalidatePath(`/dashboard/${warehouseId}/outbound`);

    if (results.failed > 0) {
      return {
        success: false,
        message: `เบิกจ่ายสำเร็จ ${results.success} รายการ, ล้มเหลว ${results.failed} รายการ`,
        report: {
          total: outboundItems.length,
          success: results.success,
          failed: results.failed,
          errors: results.errors.slice(0, 20), // Limit errors shown
        },
      };
    }

    return {
      success: true,
      message: `เบิกจ่ายสำเร็จทั้งหมด ${results.success} รายการ`,
      report: {
        total: outboundItems.length,
        success: results.success,
        failed: 0,
        errors: [],
      },
    };
  } catch (err: any) {
    console.error('Bulk Outbound Error:', err);
    return {
      success: false,
      message: `เกิดข้อผิดพลาดในระบบ: ${err.message}`,
    };
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/** Parse headers from the outbound Excel template */
function _parseOutboundHeaders(worksheet: Worksheet): Map<string, number> {
  const headerMap = new Map<string, number>();

  worksheet.getRow(1).eachCell((cell: Cell, colNumber: number) => {
    const val = cell.text?.toLowerCase().trim();
    if (!val) return;

    if (val.includes('sku') || val.includes('รหัสสินค้า')) headerMap.set('sku', colNumber);
    if (val.includes('qty') || val.includes('จำนวน')) headerMap.set('qty', colNumber);
    if (val.includes('note') || val.includes('หมายเหตุ')) headerMap.set('note', colNumber);
    if (val.includes('location') || val.includes('ตำแหน่ง')) headerMap.set('location', colNumber);
  });

  return headerMap;
}

/** Validate required columns exist */
function _validateOutboundTemplate(headerMap: Map<string, number>): string | null {
  if (!headerMap.has('sku')) {
    return 'รูปแบบไฟล์ไม่ถูกต้อง: ไม่พบคอลัมน์ SKU';
  }
  if (!headerMap.has('qty')) {
    return 'รูปแบบไฟล์ไม่ถูกต้อง: ไม่พบคอลัมน์ Qty (จำนวน)';
  }
  return null;
}

/** Prefetch data needed for validation */
async function _prefetchOutboundData(supabase: SupabaseClient, warehouseId: string) {
  // Get all stocks in this warehouse with their product info
  const { data: stocks } = await supabase
    .from('stocks')
    .select(
      `
      id,
      quantity,
      products!inner(id, sku, name),
      locations!inner(id, code, warehouse_id)
    `,
    )
    .eq('locations.warehouse_id', warehouseId)
    .gt('quantity', 0);

  // Build lookup maps
  // Map: SKU -> array of stocks (a product can be in multiple locations)
  const stocksBySku = new Map<string, any[]>();
  // Map: SKU+LocationCode -> stock
  const stockBySkuLoc = new Map<string, any>();

  (stocks || []).forEach((stock: any) => {
    const sku = stock.products.sku.toUpperCase();
    const locCode = stock.locations.code.toUpperCase();

    // Add to SKU map
    if (!stocksBySku.has(sku)) {
      stocksBySku.set(sku, []);
    }
    stocksBySku.get(sku)!.push(stock);

    // Add to SKU+Loc map
    stockBySkuLoc.set(`${sku}|${locCode}`, stock);
  });

  return { stocksBySku, stockBySkuLoc };
}

/** Process each row and validate */
function _processOutboundRows(
  worksheet: Worksheet,
  headerMap: Map<string, number>,
  context: Awaited<ReturnType<typeof _prefetchOutboundData>>,
) {
  const outboundItems: Array<{
    stockId: string;
    sku: string;
    qty: number;
    note: string;
  }> = [];
  const errors: string[] = [];
  const { stocksBySku, stockBySkuLoc } = context;

  // Track quantities being deducted to prevent over-deduction in single batch
  const pendingDeductions = new Map<string, number>();

  worksheet.eachRow((row: Row, rowNum: number) => {
    if (rowNum === 1) return; // Skip header

    const skuCol = headerMap.get('sku');
    const qtyCol = headerMap.get('qty');
    const noteCol = headerMap.get('note');
    const locCol = headerMap.get('location');

    const sku = skuCol ? _getSafeCellText(row, skuCol).toUpperCase() : '';
    const qty = qtyCol ? Number(row.getCell(qtyCol).value) : 0;
    const note = noteCol ? _getSafeCellText(row, noteCol) : '';
    const locationCode = locCol ? _getSafeCellText(row, locCol).toUpperCase() : '';

    // Skip empty rows
    if (!sku && !qty) return;

    // Validate required fields
    if (!sku) {
      errors.push(`Row ${rowNum}: ไม่ระบุ SKU`);
      return;
    }
    if (!qty || qty <= 0) {
      errors.push(`Row ${rowNum}: จำนวนต้องมากกว่า 0`);
      return;
    }

    // Find stock
    let stock: any = null;

    if (locationCode) {
      // If location specified, look up exact match
      stock = stockBySkuLoc.get(`${sku}|${locationCode}`);
      if (!stock) {
        errors.push(`Row ${rowNum}: ไม่พบ SKU "${sku}" ที่ตำแหน่ง "${locationCode}"`);
        return;
      }
    } else {
      // No location specified - use FIFO (first available)
      const stocksForSku = stocksBySku.get(sku);
      if (!stocksForSku || stocksForSku.length === 0) {
        errors.push(`Row ${rowNum}: ไม่พบ SKU "${sku}" ในคลังสินค้านี้`);
        return;
      }

      // Find first stock with enough quantity (considering pending deductions)
      for (const s of stocksForSku) {
        const pendingQty = pendingDeductions.get(s.id) || 0;
        const availableQty = s.quantity - pendingQty;
        if (availableQty >= qty) {
          stock = s;
          break;
        }
      }

      if (!stock) {
        // Try to get total available
        const totalAvailable = stocksForSku.reduce((sum: number, s: any) => {
          const pending = pendingDeductions.get(s.id) || 0;
          return sum + (s.quantity - pending);
        }, 0);
        errors.push(
          `Row ${rowNum}: SKU "${sku}" มีสต็อกรวมไม่เพียงพอ (ต้องการ: ${qty}, คงเหลือ: ${totalAvailable})`,
        );
        return;
      }
    }

    // Check quantity against available (considering pending deductions)
    const pendingQty = pendingDeductions.get(stock.id) || 0;
    const availableQty = stock.quantity - pendingQty;
    if (qty > availableQty) {
      errors.push(
        `Row ${rowNum}: SKU "${sku}" ที่ ${stock.locations.code} - จำนวนไม่พอ (ต้องการ: ${qty}, คงเหลือ: ${availableQty})`,
      );
      return;
    }

    // Track pending deduction
    pendingDeductions.set(stock.id, pendingQty + qty);

    outboundItems.push({
      stockId: stock.id,
      sku,
      qty,
      note,
    });
  });

  return { outboundItems, errors };
}

/** Helper to safely get text from cell */
function _getSafeCellText(row: Row, colIdx: number | undefined): string {
  if (!colIdx) return '';
  const cell = row.getCell(colIdx);
  const val = cell.value;

  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return String(val);
  return (cell.text || String(val)).trim();
}
