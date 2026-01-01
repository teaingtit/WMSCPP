'use server';

import { createClient } from '@/lib/db/supabase-server';
import { revalidatePath } from 'next/cache';
import * as ExcelUtils from '@/lib/utils/excel-utils';
import { isValidUUID } from '@/lib/utils/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { Worksheet, Row, Cell } from 'exceljs';

interface ImportResult {
  success: boolean;
  message: string;
  report?: {
    total: number;
    success: number;
    failed: number;
    errors: string[]; // รายงาน Error รายบรรทัด
}};
// ==========================================
// 1. MASTER DATA (Global)
// ==========================================

export async function downloadMasterTemplate(type: 'product' | 'category', categoryId?: string) {
  // 1. Category Template
  if (type === 'category') {
      return { base64: await ExcelUtils.generateCategoryTemplate(), fileName: 'Category_Template.xlsx' };
  }

  // 2. Product Template (ต้องมี Category Context)
  // ไม่ต้องเช็ค UUID เพราะ Category ID เป็น Custom String ได้
  if (!categoryId) throw new Error('Category ID is required');

  const supabase = await createClient();
  const { data: cat } = await supabase.from('product_categories').select('*').eq('id', categoryId).single();
  if (!cat) throw new Error(`Category not found: ${categoryId}`);

  const base64 = await ExcelUtils.generateProductTemplate(cat.name, cat.form_schema || [], cat.uom || 'PCS');
  return { base64, fileName: `Product_Template_${cat.name}.xlsx` };
}

export async function importMasterData(formData: FormData, type: 'product' | 'category') {
  const supabase = await createClient();
  const file = formData.get('file') as File;
  const categoryId = formData.get('categoryId') as string;

  if (!file) return { success: false, message: 'ไม่พบไฟล์' };

  try {
    const table = type === 'category' ? 'product_categories' : 'products';
    const conflictKey = type === 'category' ? 'id' : 'sku';

    const worksheet = await ExcelUtils.parseExcel(file);
    const dataToUpsert: any[] = [];
    const errors: string[] = [];
    
    // --- Pre-fetch data for Product import ---
    let categoryUom = 'PCS';
    let schemaKeys: string[] = [];
    if (type === 'product' && categoryId) {
        const { data: cat } = await supabase.from('product_categories').select('*').eq('id', categoryId).single();
        if (cat) {
            categoryUom = cat.uom || 'PCS';
            schemaKeys = (cat.form_schema || []).filter((f:any) => f.scope === 'PRODUCT').map((f:any) => f.key);
        } else {
            return { success: false, message: `Category ID "${categoryId}" not found` };
        }
    }

    // --- Suggestion 1 & 2: Dynamic Header Parsing and Validation ---
    const headerMap = _parseMasterDataHeaders(worksheet, schemaKeys);

    worksheet.eachRow((row, n) => {
      if (n <= 2) return; // Skip header and info rows

      if (type === 'category') {
        const id = row.getCell(headerMap.get('id')!).text?.trim().toUpperCase();
        const name = row.getCell(headerMap.get('name')!).text?.trim();

        if (!id && !name) return; // Skip empty row
        if (!id) { errors.push(`Row ${n}: ไม่ได้ระบุ ID`); return; }
        if (!name) { errors.push(`Row ${n}: ไม่ได้ระบุ Name`); return; }

        const form_schema: any[] = [];
        for (let i = 1; i <= 5; i++) {
            const spec = ExcelUtils.parseAttributeString(row.getCell(headerMap.get(`spec_${i}`)!).text, 'PRODUCT');
            if (spec) form_schema.push(spec);
            const inbound = ExcelUtils.parseAttributeString(row.getCell(headerMap.get(`inbound_${i}`)!).text, 'LOT');
            if (inbound) form_schema.push(inbound);
        }

        dataToUpsert.push({ 
            id, name, form_schema,
            uom: row.getCell(headerMap.get('uom')!).text?.trim().toUpperCase() || 'PCS',
        });
      } else {
        // Product Logic
        const sku = row.getCell(headerMap.get('sku')!).text?.trim().toUpperCase();
        const name = row.getCell(headerMap.get('name')!).text?.trim();

        if (!sku && !name) return; // Skip empty row
        if (!sku) { errors.push(`Row ${n}: ไม่ได้ระบุ SKU`); return; }
        if (!name) { errors.push(`Row ${n}: ไม่ได้ระบุ Name`); return; }

        const attributes: any = {};
        schemaKeys.forEach(key => { 
            const val = row.getCell(headerMap.get(key)!).value; 
            if(val) attributes[key] = val; 
        });
        
        dataToUpsert.push({
            sku, name, attributes, category_id: categoryId, uom: categoryUom, is_active: true,
            image_url: row.getCell(headerMap.get('image_url')!).text?.trim() || null,
        });
      }
    });

    if (errors.length > 0) {
        return { success: false, message: `พบข้อผิดพลาด ${errors.length} รายการ`, report: { total: worksheet.rowCount - 2, success: 0, failed: errors.length, errors }};
    }

    const { error } = await supabase.from(table).upsert(dataToUpsert, { onConflict: conflictKey });
    if (error) throw error;
    
    revalidatePath('/dashboard/settings');
    return { success: true, message: `Imported ${dataToUpsert.length} items successfully.` };

  } catch (err: any) { 
    console.error("Master Data Import Error:", err);
    return { success: false, message: `An unexpected system error occurred: ${err.message}` }; 
  }
}

// ==========================================
// 2. INBOUND (Specific)
// ==========================================

export async function downloadInboundTemplate(warehouseId: string, categoryId: string) {
    if (!isValidUUID(warehouseId)) throw new Error(`Invalid Warehouse ID: ${warehouseId}`);

    const supabase = await createClient();
    const { data: wh } = await supabase.from('warehouses').select('config, code').eq('id', warehouseId).single();
    const { data: cat } = await supabase.from('product_categories').select('*').eq('id', categoryId).single();
    
    if (!wh || !cat) throw new Error('Data not found');

    // เช็ค Config จริง
    const hasGrid = wh.config && (wh.config.axis_x || wh.config.axis_y);
    
    // ส่ง hasGrid ไปสร้าง Template ที่ถูกต้อง
    const base64 = await ExcelUtils.generateInboundTemplate(wh.code, cat.name, !!hasGrid, cat.form_schema || []);
    
    return { base64, fileName: `Inbound_${wh.code}_${cat.name}.xlsx` };
}

export async function importInboundStock(formData: FormData) {
    const warehouseId = formData.get('warehouseId') as string;
    const categoryId = formData.get('categoryId') as string;
    const userId = formData.get('userId') as string;

    if (!isValidUUID(warehouseId)) return { success: false, message: 'Invalid Warehouse ID' };

    const supabase = await createClient();
    const file = formData.get('file') as File;
    if (!file) return { success: false, message: 'ไม่พบไฟล์ Excel' };

    try {
        const worksheet = await ExcelUtils.parseExcel(file);
        
        // 1. Pre-fetch necessary data in parallel
        const context = await _prefetchInboundData(supabase, warehouseId, categoryId);

        // 2. Parse headers to map column names to indices
        const headerMap = _parseInboundHeaders(worksheet, context.schemaKeys);

        // 3. Validate Template Structure
        const templateError = _validateInboundTemplate(headerMap, context.isGridSystem);
        if (templateError) {
            return { success: false, message: templateError };
        }

        // 4. Process all rows, validating data and creating transactions
        const { transactions, errors } = _processInboundRows(worksheet, headerMap, context, { warehouseId, userId });

        // 5. Decision: If any errors, reject the entire batch
        if (errors.length > 0) {
            return { 
                success: false, 
                message: `พบข้อผิดพลาด ${errors.length} รายการ (ยกเลิกการนำเข้าทั้งหมด)`,
                report: { total: worksheet.rowCount - 1, success: 0, failed: errors.length, errors }
            };
        }

        if (transactions.length === 0) {
            return { success: false, message: 'ไม่พบข้อมูลสินค้าในไฟล์' };
        }

        // 6. Batch Execution via RPC
        const { error } = await supabase.rpc('process_inbound_batch', { 
            p_transactions: transactions 
        });

        if (error) throw new Error(error.message);
        
        revalidatePath(`/dashboard/${warehouseId}/inventory`);
        return { 
            success: true, 
            message: `นำเข้าสำเร็จทั้งหมด ${transactions.length} รายการ`,
            report: { total: transactions.length, success: 0, failed: 0, errors: [] }
        };

    } catch (err: any) { 
        console.error(err);
        return { success: false, message: `An unexpected system error occurred: ${err.message}` }; 
    }
}

// =================================================================
// HELPER FUNCTIONS (Not Exported)
// =================================================================

/** Parses headers for Master Data import files (Product/Category). */
function _parseMasterDataHeaders(worksheet: Worksheet, schemaKeys: string[]): Map<string, number> {
    const headerMap = new Map<string, number>();
    worksheet.getRow(1).eachCell((cell: Cell, colNumber: number) => {
        const headerText = cell.text.trim().toLowerCase();
        if (!headerText) return;

        // Standard columns
        if (headerText.includes('id') || headerText.includes('รหัสหมวดหมู่')) headerMap.set('id', colNumber);
        if (headerText.includes('sku')) headerMap.set('sku', colNumber);
        if (headerText.includes('name') || headerText.includes('ชื่อ')) headerMap.set('name', colNumber);
        if (headerText.includes('uom') || headerText.includes('หน่วยนับ')) headerMap.set('uom', colNumber);
        if (headerText.includes('image')) headerMap.set('image_url', colNumber);

        // Dynamic attribute columns for Category
        for (let i = 1; i <= 5; i++) {
            if (headerText === `spec ${i}`) headerMap.set(`spec_${i}`, colNumber);
            if (headerText === `inbound ${i}`) headerMap.set(`inbound_${i}`, colNumber);
        }
        // Dynamic attribute columns for Product
        schemaKeys.forEach(key => {
            if (headerText.includes(`(${key.toLowerCase()})`)) {
                headerMap.set(key, colNumber);
            }
        });
    });
    return headerMap;
}

/** Fetches all necessary data for inbound processing from the database. */
async function _prefetchInboundData(supabase: SupabaseClient, warehouseId: string, categoryId: string) {
    const [productsRes, locsRes, whRes, catRes] = await Promise.all([
        supabase.from('products').select('id, sku').eq('category_id', categoryId),
        supabase.from('locations').select('id, code, lot, cart, level').eq('warehouse_id', warehouseId),
        supabase.from('warehouses').select('config').eq('id', warehouseId).single(),
        supabase.from('product_categories').select('form_schema').eq('id', categoryId).single()
    ]);

    const productMap = new Map(productsRes.data?.map((p: { sku: string, id: string }) => [p.sku, p.id]));
    const whConfig = whRes.data?.config || {};
    const isGridSystem = !!(whConfig.axis_x || whConfig.axis_y);

    const locMap = new Map<string, string>();
    locsRes.data?.forEach((l: { id: string, code: string, lot: string | null, cart: string | null, level: string | null }) => {
        const key = isGridSystem 
            ? `${l.lot}|${l.cart}|${l.level || ''}`.toUpperCase()
            : l.code.toUpperCase();
        locMap.set(key, l.id);
    });

    const schemaKeys = Array.isArray(catRes.data?.form_schema) 
        ? catRes.data.form_schema.map((f: any) => f.key) 
        : [];
    
    return { productMap, locMap, isGridSystem, schemaKeys };
}

/** Parses headers from the inbound Excel file to map column names to indices. */
function _parseInboundHeaders(worksheet: Worksheet, schemaKeys: string[]): Map<string, number> {
    const headerMap = new Map<string, number>();
    worksheet.getRow(1).eachCell((cell: Cell, colNumber: number) => {
            const val = cell.text?.toLowerCase().trim();
            if (!val) return;

            // Keyword Matching
            if (val.includes('sku') || val.includes('รหัสสินค้า')) headerMap.set('sku', colNumber);
            if (val.includes('qty') || val.includes('จำนวน')) headerMap.set('qty', colNumber);
            
            if (val.includes('lot') || val.includes('โซน')) headerMap.set('lot', colNumber);
            if (val.includes('cart') || val.includes('ตู้')) headerMap.set('cart', colNumber);
            if (val.includes('level') || val.includes('ชั้น')) headerMap.set('level', colNumber);
            
            if (val.includes('location') || val.includes('รหัสตำแหน่ง')) headerMap.set('loc_code', colNumber);

            // Attributes Mapping (หาจาก Key ในวงเล็บ หรือ ชื่อ Label)
            schemaKeys.forEach(key => {
                // เช่น "สี (color)" -> match "color"
                if (val.includes(`(${key.toLowerCase()})`) || val === key.toLowerCase()) {
                    headerMap.set(key, colNumber);
                }
            });
        });
    return headerMap;
}

/** Validates the structure of the inbound template based on required columns. */
function _validateInboundTemplate(headerMap: Map<string, number>, isGridSystem: boolean): string | null {
    if (!headerMap.has('sku') || !headerMap.has('qty')) {
        return 'รูปแบบไฟล์ไม่ถูกต้อง: ไม่พบคอลัมน์ SKU หรือ Qty';
    }
    if (isGridSystem && (!headerMap.has('lot') || !headerMap.has('cart'))) {
        return 'คลังสินค้านี้เป็นระบบ Grid: ไฟล์ต้องมีคอลัมน์ Lot และ Cart';
    }
    if (!isGridSystem && !headerMap.has('loc_code')) {
        return 'รูปแบบไฟล์ไม่ถูกต้อง: ไม่พบคอลัมน์ Location Code';
    }
    return null;
}

/** Iterates through worksheet rows, validates them, and builds a list of transactions or errors. */
function _processInboundRows(
    worksheet: Worksheet,
    headerMap: Map<string, number>,
    context: Awaited<ReturnType<typeof _prefetchInboundData>>,
    params: { warehouseId: string, userId: string }
) {
    const transactions: any[] = [];
    const errors: string[] = [];

    worksheet.eachRow((row: Row, n: number) => {
        if (n === 1) return; // Skip Header

        const result = _processInboundRow(row, n, headerMap, context);
        if (result.error) {
            errors.push(result.error);
        } else if (result.txData) {
            transactions.push({ ...result.txData, p_warehouse_id: params.warehouseId, p_user_id: params.userId });
        }
    });

    return { transactions, errors };
}

/** Processes a single row from the inbound Excel file. */
function _processInboundRow(
    row: Row,
    rowNum: number,
    headerMap: Map<string, number>,
    context: Awaited<ReturnType<typeof _prefetchInboundData>>
): { txData?: any; error?: string } {
    const { productMap, locMap, isGridSystem, schemaKeys } = context;

    const sku = row.getCell(headerMap.get('sku')!).text?.trim().toUpperCase();
    const qty = Number(row.getCell(headerMap.get('qty')!).value);

    if (!sku && !qty) return {}; // Skip empty row

    if (!sku) return { error: `Row ${rowNum}: ไม่ระบุ SKU` };
    if (!qty || qty <= 0) return { error: `Row ${rowNum}: จำนวนต้องมากกว่า 0` };

    const productId = productMap.get(sku);
    if (!productId) {
        return { error: `Row ${rowNum}: SKU "${sku}" ไม่พบในหมวดสินค้านี้` };
    }

    // Validate Location
    let locId: string | undefined;
    let locDebug = '';

    if (isGridSystem) {
        const lot = row.getCell(headerMap.get('lot')!).text?.trim();
        const cart = row.getCell(headerMap.get('cart')!).text?.trim();
        const level = headerMap.has('level') ? row.getCell(headerMap.get('level')!).text?.trim() : '';
        
        locDebug = `${lot}-${cart}${level ? `-${level}`: ''}`;
        if (!lot || !cart) return { error: `Row ${rowNum}: ระบุ Lot/Cart ไม่ครบสำหรับ SKU ${sku}` };
        
        locId = locMap.get(`${lot}|${cart}|${level}`.toUpperCase());
    } else {
        const code = row.getCell(headerMap.get('loc_code')!).text?.trim();
        locDebug = code || '';
        if (!code) return { error: `Row ${rowNum}: ไม่ระบุ Location Code สำหรับ SKU ${sku}` };
        
        locId = locMap.get(code.toUpperCase());
    }

    if (!locId) {
        return { error: `Row ${rowNum}: ไม่พบตำแหน่ง "${locDebug}" สำหรับ SKU ${sku}` };
    }

    // Extract Attributes
    const attributes: any = {};
    schemaKeys.forEach((key: string) => {
        const colIdx = headerMap.get(key);
        if (colIdx) {
            const val = row.getCell(colIdx).value;
            if (val instanceof Date) attributes[key] = val.toISOString().split('T')[0];
            else if (val !== null && val !== undefined) attributes[key] = val;
        }
    });

    return {
        txData: {
            p_location_id: locId,
            p_product_id: productId,
            p_quantity: qty,
            p_attributes: attributes,
            p_user_email: 'Bulk Inbound'
        }
    };
}