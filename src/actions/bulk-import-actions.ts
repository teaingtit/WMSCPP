'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import * as ExcelUtils from '@/lib/utils/excel-utils';
import { isValidUUID } from '@/lib/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { Worksheet, Row, Cell } from 'exceljs';
import { getWarehouseId } from '@/lib/utils/db-helpers';
import { checkManagerRole } from '@/lib/auth-service';

// ImportResult intentionally removed (unused) — keep helpers minimal

// ==========================================
// 1. MASTER DATA (Global)
// ==========================================

export async function downloadMasterTemplate(type: 'product' | 'category', categoryId?: string) {
  // 1. Category Template
  if (type === 'category') {
    return {
      base64: await ExcelUtils.generateCategoryTemplate(),
      fileName: 'Category_Template.xlsx',
    };
  }

  // 2. Product Template (ต้องมี Category Context)
  // ไม่ต้องเช็ค UUID เพราะ Category ID เป็น Custom String ได้
  if (!categoryId) throw new Error('Category ID is required');

  const supabase = await createClient();
  const { data: cat } = await supabase
    .from('product_categories')
    .select('*')
    .eq('id', categoryId)
    .single();
  if (!cat) throw new Error(`Category not found: ${categoryId}`);

  const base64 = await ExcelUtils.generateProductTemplate(cat.name, cat.form_schema || []);
  return { base64, fileName: `Product_Template_${cat.name}.xlsx` };
}

export async function importMasterData(formData: FormData, type: 'product' | 'category') {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthenticated' };

  const isManager = await checkManagerRole(supabase, user.id);
  if (!isManager)
    return { success: false, message: 'ไม่มีสิทธิ์จัดการข้อมูลหลัก (Requires Manager/Admin)' };

  const file = formData.get('file') as File;
  const categoryId = formData.get('categoryId') as string;

  if (!file) return { success: false, message: 'ไม่พบไฟล์' };

  try {
    const table = type === 'category' ? 'product_categories' : 'products';
    const conflictKey = type === 'category' ? 'id' : 'sku';

    const worksheet = await ExcelUtils.parseExcel(file);
    const dataMap = new Map<string, any>(); // ใช้ Map เพื่อป้องกันข้อมูลซ้ำ
    const errors: string[] = [];

    // --- Pre-fetch data for Product import ---
    let schemaKeys: string[] = [];
    let categoryData: any = null;
    if (type === 'product' && categoryId) {
      const { data: cat } = await supabase
        .from('product_categories')
        .select('*')
        .eq('id', categoryId)
        .single();
      if (cat) {
        categoryData = cat;
        schemaKeys = (cat.form_schema || [])
          .filter((f: any) => f.scope === 'PRODUCT')
          .map((f: any) => f.key);
      } else {
        return { success: false, message: `Category ID "${categoryId}" not found` };
      }
    }

    // --- Suggestion 1 & 2: Dynamic Header Parsing and Validation ---
    const headerMap = _parseMasterDataHeaders(worksheet, schemaKeys);

    // Validate Required Headers
    const requiredHeaders = type === 'category' ? ['id', 'name'] : ['sku', 'name'];
    const missingHeaders = requiredHeaders.filter((h) => !headerMap.has(h));
    if (missingHeaders.length > 0) {
      return {
        success: false,
        message: `รูปแบบไฟล์ไม่ถูกต้อง: ไม่พบคอลัมน์ ${missingHeaders.join(', ')}`,
      };
    }

    worksheet.eachRow((row, n) => {
      if (n <= 2) return; // Skip header and info rows

      if (type === 'category') {
        const id = row.getCell(headerMap.get('id')!).text?.trim().toUpperCase();
        const name = row.getCell(headerMap.get('name')!).text?.trim();

        if (!id && !name) return; // Skip empty row
        if (!id) {
          errors.push(`Row ${n}: ไม่ได้ระบุ ID`);
          return;
        }
        if (!name) {
          errors.push(`Row ${n}: ไม่ได้ระบุ Name`);
          return;
        }

        const form_schema: any[] = [];
        for (let i = 1; i <= 5; i++) {
          const specCol = headerMap.get(`spec_${i}`);
          if (specCol) {
            const spec = ExcelUtils.parseAttributeString(row.getCell(specCol).text, 'PRODUCT');
            if (spec) form_schema.push(spec);
          }
          const inboundCol = headerMap.get(`inbound_${i}`);
          if (inboundCol) {
            const inbound = ExcelUtils.parseAttributeString(row.getCell(inboundCol).text, 'LOT');
            if (inbound) form_schema.push(inbound);
          }
        }

        dataMap.set(id, {
          id,
          name,
          form_schema,
        });
      } else {
        // Product Logic
        const skuCol = headerMap.get('sku');
        const nameCol = headerMap.get('name');
        const uomCol = headerMap.get('uom');
        const sku = skuCol ? row.getCell(skuCol).text?.trim().toUpperCase() : undefined;
        const name = nameCol ? row.getCell(nameCol).text?.trim() : undefined;
        const uom = uomCol ? row.getCell(uomCol).text?.trim().toUpperCase() : undefined;

        if (!sku && !name) return; // Skip empty row
        if (!sku) {
          errors.push(`Row ${n}: ไม่ได้ระบุ SKU`);
          return;
        }
        if (!name) {
          errors.push(`Row ${n}: ไม่ได้ระบุ Name`);
          return;
        }

        // ✅ Validation 1: UOM Check
        if (categoryData && categoryData.units && categoryData.units.length > 0) {
          const categoryUnits = categoryData.units;
          const productUom = uom || categoryUnits[0]; // Default to first unit if not specified

          if (!categoryUnits.includes(productUom)) {
            errors.push(
              `Row ${n}: หน่วย "${productUom}" ไม่ได้กำหนดไว้ในหมวดหมู่นี้ (ใช้ได้: ${categoryUnits.join(
                ', ',
              )})`,
            );
            return;
          }
        }

        const attributes: any = {};
        schemaKeys.forEach((key) => {
          const colIdx = headerMap.get(key);
          if (colIdx) {
            const val = row.getCell(colIdx).value;
            if (val) attributes[key] = val;
          }
        });

        // ✅ Validation 2: Required Attributes Check (PRODUCT Scope only)
        if (categoryData && categoryData.form_schema) {
          const productSchema = categoryData.form_schema.filter((f: any) => f.scope === 'PRODUCT');
          for (const field of productSchema) {
            if (field.required && !attributes[field.key]) {
              errors.push(`Row ${n}: จำเป็นต้องกรอก "${field.label}" (${field.key})`);
              return;
            }
          }
        }

        // ✅ NEW Validation 3: Data Type Validation (PRODUCT Scope)
        if (categoryData && categoryData.form_schema) {
          const productSchema = categoryData.form_schema.filter((f: any) => f.scope === 'PRODUCT');
          for (const field of productSchema) {
            const value = attributes[field.key];
            if (value !== undefined && value !== null && value !== '') {
              const typeError = _validateFieldType(value, field.type, field.label);
              if (typeError) {
                errors.push(`Row ${n}: ${typeError}`);
                return;
              }
            }
          }
        }

        const imgCol = headerMap.get('image_url');
        const finalUom = uom || categoryData?.units?.[0] || 'UNIT';

        dataMap.set(sku, {
          sku,
          name,
          uom: finalUom,
          attributes,
          category_id: categoryId,
          is_active: true,
          image_url: imgCol ? row.getCell(imgCol).text?.trim() || null : null,
        });
      }
    });

    const dataToUpsert = Array.from(dataMap.values());
    if (errors.length > 0) {
      return {
        success: false,
        message: `พบข้อผิดพลาด ${errors.length} รายการ`,
        report: { total: worksheet.rowCount - 2, success: 0, failed: errors.length, errors },
      };
    }

    const { error } = await supabase.from(table).upsert(dataToUpsert, { onConflict: conflictKey });
    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return { success: true, message: `Imported ${dataToUpsert.length} items successfully.` };
  } catch (err: any) {
    console.error('Master Data Import Error:', err);
    return { success: false, message: `An unexpected system error occurred: ${err.message}` };
  }
}

// ==========================================
// 2. INBOUND (Specific)
// ==========================================

export async function downloadInboundTemplate(warehouseId: string, categoryId: string) {
  try {
    const supabase = await createClient();

    // Support both UUID and Code (รองรับทั้ง ID และ Code)
    let whQuery = supabase.from('warehouses').select('config, code');
    if (isValidUUID(warehouseId)) whQuery = whQuery.eq('id', warehouseId);
    else whQuery = whQuery.eq('code', warehouseId);

    const { data: wh, error: whError } = await whQuery.single();
    const { data: cat, error: catError } = await supabase
      .from('product_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (whError || catError || !wh || !cat)
      throw new Error('ไม่พบข้อมูลคลังสินค้าหรือหมวดหมู่สินค้า');

    // เช็ค Config จริง
    const whCode = wh.code || 'WH';
    const catName = cat.name || 'Category';

    // ส่ง hasGrid ไปสร้าง Template ที่ถูกต้อง
    const base64 = await ExcelUtils.generateInboundTemplate(whCode, catName, cat.form_schema || []);

    return { base64, fileName: `Inbound_${whCode}_${catName}.xlsx` };
  } catch (error: any) {
    console.error('Download Template Error:', error);
    throw new Error(error.message || 'Failed to generate template');
  }
}

export async function importInboundStock(formData: FormData) {
  let warehouseId = formData.get('warehouseId') as string;
  const categoryId = formData.get('categoryId') as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthenticated' };
  const userId = user.id;

  // Resolve Warehouse ID if it is a Code (แปลง Code เป็น UUID ถ้าจำเป็น)
  const resolvedWhId = await getWarehouseId(supabase, warehouseId);
  if (!resolvedWhId) return { success: false, message: `ไม่พบคลังสินค้า: ${warehouseId}` };
  warehouseId = resolvedWhId;

  const file = formData.get('file') as File;
  if (!file) return { success: false, message: 'ไม่พบไฟล์ Excel' };

  try {
    const worksheet = await ExcelUtils.parseExcel(file);

    // 1. Pre-fetch necessary data in parallel
    const context = await _prefetchInboundData(supabase, warehouseId, categoryId);

    // 2. Parse headers to map column names to indices
    const headerMap = _parseInboundHeaders(worksheet, context.schemaKeys);

    // 3. Validate Template Structure
    const templateError = _validateInboundTemplate(headerMap);
    if (templateError) {
      return { success: false, message: templateError };
    }

    // 4. Process all rows, validating data and creating transactions
    const { transactions, errors } = _processInboundRows(worksheet, headerMap, context, {
      warehouseId,
      userId,
    });

    // 5. Decision: If any errors, reject the entire batch
    if (errors.length > 0) {
      return {
        success: false,
        message: `พบข้อผิดพลาด ${errors.length} รายการ (ยกเลิกการนำเข้าทั้งหมด)`,
        report: { total: worksheet.rowCount - 1, success: 0, failed: errors.length, errors },
      };
    }

    if (transactions.length === 0) {
      return { success: false, message: 'ไม่พบข้อมูลสินค้าในไฟล์' };
    }

    // 6. Batch Execution via RPC
    const { error } = await supabase.rpc('process_inbound_batch', {
      p_transactions: transactions,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/${warehouseId}/inventory`);
    return {
      success: true,
      message: `นำเข้าสำเร็จทั้งหมด ${transactions.length} รายการ`,
      report: { total: transactions.length, success: 0, failed: 0, errors: [] },
    };
  } catch (err: any) {
    console.error(err);
    return { success: false, message: `An unexpected system error occurred: ${err.message}` };
  }
}

// =================================================================
// HELPER FUNCTIONS (Not Exported)
// =================================================================

/**
 * Validates that a value matches the expected field type.
 * @returns Error message if validation fails, null if valid
 */
function _validateFieldType(
  value: any,
  expectedType: 'text' | 'number' | 'date',
  fieldLabel: string,
): string | null {
  // Null/undefined values are handled by required field validation
  if (value === null || value === undefined || value === '') {
    return null;
  }

  switch (expectedType) {
    case 'number': {
      // Accept actual numbers or numeric strings
      const num = typeof value === 'number' ? value : Number(value);
      if (isNaN(num)) {
        return `ช่อง "${fieldLabel}" ต้องเป็นตัวเลข (ได้รับ: "${value}")`;
      }
      return null;
    }

    case 'date': {
      // Accept Date objects, ISO strings, DD/MM/YYYY, or Excel serial numbers
      if (value instanceof Date) {
        return isNaN(value.getTime()) ? `ช่อง "${fieldLabel}" เป็นวันที่ที่ไม่ถูกต้อง` : null;
      }

      // Excel serial number (e.g., 44927 for 2023-01-01)
      if (typeof value === 'number' && value > 0 && value < 2958466) {
        // Valid Excel date range (1900-01-01 to 9999-12-31)
        return null;
      }

      // String date formats
      if (typeof value === 'string') {
        const trimmed = value.trim();

        // ISO format (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
          const date = new Date(trimmed);
          return isNaN(date.getTime()) ? `ช่อง "${fieldLabel}" เป็นวันที่ที่ไม่ถูกต้อง` : null;
        }

        // DD/MM/YYYY format
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
          const parts = trimmed.split('/').map(Number);
          if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
            const day = parts[0]!;
            const month = parts[1]!;
            const year = parts[2]!;
            const date = new Date(year, month - 1, day);
            if (
              isNaN(date.getTime()) ||
              date.getDate() !== day ||
              date.getMonth() !== month - 1 ||
              date.getFullYear() !== year
            ) {
              return `ช่อง "${fieldLabel}" เป็นวันที่ที่ไม่ถูกต้อง (รูปแบบ: DD/MM/YYYY)`;
            }
            return null;
          }
        }

        return `ช่อง "${fieldLabel}" ต้องเป็นวันที่ (รูปแบบ: YYYY-MM-DD หรือ DD/MM/YYYY, ได้รับ: "${value}")`;
      }

      return `ช่อง "${fieldLabel}" ต้องเป็นวันที่ (ได้รับประเภทข้อมูล: ${typeof value})`;
    }

    case 'text':
    default:
      // Text accepts anything - most permissive
      return null;
  }
}

/** Parses headers for Master Data import files (Product/Category). */
function _parseMasterDataHeaders(worksheet: Worksheet, schemaKeys: string[]): Map<string, number> {
  const headerMap = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell: Cell, colNumber: number) => {
    const headerText = cell.text.trim().toLowerCase();
    if (!headerText) return;

    // Standard columns
    if (headerText.includes('id') || headerText.includes('รหัสหมวดหมู่'))
      headerMap.set('id', colNumber);
    if (headerText.includes('sku')) headerMap.set('sku', colNumber);
    if (headerText.includes('name') || headerText.includes('ชื่อ'))
      headerMap.set('name', colNumber);
    if (headerText.includes('image')) headerMap.set('image_url', colNumber);
    if (headerText.includes('uom') || headerText.includes('หน่วย')) headerMap.set('uom', colNumber);

    // Dynamic attribute columns for Category
    for (let i = 1; i <= 5; i++) {
      if (headerText === `spec ${i}`) headerMap.set(`spec_${i}`, colNumber);
      if (headerText === `inbound ${i}`) headerMap.set(`inbound_${i}`, colNumber);
    }
    // Dynamic attribute columns for Product
    schemaKeys.forEach((key) => {
      if (headerText.includes(`(${key.toLowerCase()})`)) {
        headerMap.set(key, colNumber);
      }
    });
  });
  return headerMap;
}

/** Fetches all necessary data for inbound processing from the database. */
async function _prefetchInboundData(
  supabase: SupabaseClient,
  warehouseId: string,
  categoryId: string,
) {
  const [productsRes, locsRes, , catRes] = await Promise.all([
    supabase.from('products').select('id, sku').eq('category_id', categoryId),
    supabase.from('locations').select('id, code, lot, cart, level').eq('warehouse_id', warehouseId),
    supabase.from('warehouses').select('config').eq('id', warehouseId).single(),
    supabase.from('product_categories').select('form_schema').eq('id', categoryId).single(),
  ]);

  const productMap = new Map(
    productsRes.data?.map((p: { sku: string; id: string }) => [p.sku.trim().toUpperCase(), p.id]),
  );

  const locMap = new Map<string, string>();
  const locMapNumeric = new Map<string, string>(); // ✅ NEW: Map สำหรับจับคู่แบบตัวเลขล้วน

  locsRes.data?.forEach(
    (l: {
      id: string;
      code: string;
      lot: string | null;
      cart: string | null;
      level: string | null;
    }) => {
      const key = `${_normalizeLocPart(l.lot)}|${_normalizeLocPart(l.cart)}|${_normalizeLocPart(
        l.level,
      )}`;
      locMap.set(key, l.id);

      // ✅ NEW: สร้าง Key แบบตัวเลขล้วน (ตัด L, P, Zone ออก) เพื่อช่วยจับคู่
      // เช่น DB: L01|P01|1 -> Numeric Key: 1|1|1
      const nLot = _extractNumber(l.lot);
      const nCart = _extractNumber(l.cart);
      const nLevel = _extractNumber(l.level);
      if (nLot && nCart) {
        const nKey = `${nLot}|${nCart}|${nLevel}`;
        if (!locMapNumeric.has(nKey)) locMapNumeric.set(nKey, l.id);
      }
    },
  );

  const schemaKeys = Array.isArray(catRes.data?.form_schema)
    ? catRes.data.form_schema.map((f: any) => f.key)
    : [];

  const formSchema = Array.isArray(catRes.data?.form_schema) ? catRes.data.form_schema : [];

  return { productMap, locMap, locMapNumeric, schemaKeys, formSchema };
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

    // Attributes Mapping (หาจาก Key ในวงเล็บ หรือ ชื่อ Label)
    schemaKeys.forEach((key) => {
      // เช่น "สี (color)" -> match "color"
      if (val.includes(`(${key.toLowerCase()})`) || val === key.toLowerCase()) {
        headerMap.set(key, colNumber);
      }
    });
  });
  return headerMap;
}

/** Validates the structure of the inbound template based on required columns. */
function _validateInboundTemplate(headerMap: Map<string, number>): string | null {
  if (!headerMap.has('sku') || !headerMap.has('qty')) {
    return 'รูปแบบไฟล์ไม่ถูกต้อง: ไม่พบคอลัมน์ SKU หรือ Qty';
  }
  if (!headerMap.has('lot') || !headerMap.has('cart')) {
    return 'รูปแบบไฟล์ไม่ถูกต้อง: ไฟล์ต้องมีคอลัมน์ Lot และ Cart (ระบบ Grid)';
  }
  return null;
}

/** Iterates through worksheet rows, validates them, and builds a list of transactions or errors. */
function _processInboundRows(
  worksheet: Worksheet,
  headerMap: Map<string, number>,
  context: Awaited<ReturnType<typeof _prefetchInboundData>>,
  params: { warehouseId: string; userId: string },
) {
  const transactions: any[] = [];
  const errors: string[] = [];

  worksheet.eachRow((row: Row, n: number) => {
    if (n === 1) return; // Skip Header

    const result = _processInboundRow(row, n, headerMap, context);
    if (result.error) {
      errors.push(result.error);
    } else if (result.txData) {
      transactions.push({
        ...result.txData,
        p_warehouse_id: params['warehouseId'],
        p_user_id: params.userId,
      });
    }
  });

  return { transactions, errors };
}

/** Processes a single row from the inbound Excel file. */
function _processInboundRow(
  row: Row,
  rowNum: number,
  headerMap: Map<string, number>,
  context: Awaited<ReturnType<typeof _prefetchInboundData>>,
): { txData?: any; error?: string } {
  const { productMap, locMap, locMapNumeric, schemaKeys } = context;

  const sku = _getSafeCellText(row, headerMap.get('sku')).toUpperCase();
  const qty = Number(row.getCell(headerMap.get('qty')!).value); // Qty usually safe as number

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

  const lot = _getSafeCellText(row, headerMap.get('lot'));
  const cart = _getSafeCellText(row, headerMap.get('cart'));
  const level = headerMap.has('level') ? _getSafeCellText(row, headerMap.get('level')) : '';

  locDebug = `${lot}-${cart}${level ? `-${level}` : ''}`;
  if (!lot || !cart) return { error: `Row ${rowNum}: ระบุ Lot/Cart ไม่ครบสำหรับ SKU ${sku}` };

  const key = `${_normalizeLocPart(lot)}|${_normalizeLocPart(cart)}|${_normalizeLocPart(level)}`;
  locId = locMap.get(key);

  // ✅ NEW: Fallback ถ้าหาแบบตรงๆ ไม่เจอ ให้ลองหาแบบตัวเลขล้วน
  if (!locId) {
    const nKey = `${_extractNumber(lot)}|${_extractNumber(cart)}|${_extractNumber(level)}`;
    locId = locMapNumeric.get(nKey);
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

  // ✅ NEW Validation: Data Type Validation (LOT Scope)
  const { formSchema } = context;
  if (formSchema && formSchema.length > 0) {
    const lotSchema = formSchema.filter((f: any) => f.scope === 'LOT');
    for (const field of lotSchema) {
      const value = attributes[field.key];
      if (value !== undefined && value !== null && value !== '') {
        const typeError = _validateFieldType(value, field.type, field.label);
        if (typeError) {
          return { error: `Row ${rowNum}: ${typeError}` };
        }
      }
    }
  }

  return {
    txData: {
      p_to_location_id: locId,
      p_location_id: locId,
      p_product_id: productId,
      p_quantity: qty,
      p_attributes: attributes,
      p_user_email: 'Bulk Inbound',
    },
  };
}

/** Helper to safely get text from cell, avoiding scientific notation for large numbers */
function _getSafeCellText(row: Row, colIdx: number | undefined): string {
  if (!colIdx) return '';
  const cell = row.getCell(colIdx);
  const val = cell.value;

  if (val === null || val === undefined) return '';

  // If it's a number, convert to string directly to avoid formatting issues (e.g. "1.00" vs "1")
  if (typeof val === 'number') return String(val);

  // For other types, use .text but fallback to String(val)
  return (cell.text || String(val)).trim();
}

/** Helper to normalize location parts (strip leading zeros for numbers) */
function _normalizeLocPart(val: string | null | undefined): string {
  if (!val) return '';
  const s = String(val).trim().toUpperCase();
  if (s === '') return '';
  // Check if numeric (digits only) to strip leading zeros (e.g. "01" -> "1")
  if (/^\d+$/.test(s)) {
    return parseInt(s, 10).toString();
  }
  return s;
}

/** ✅ NEW: Helper to extract only numbers from a string (e.g. "L01" -> "1") */
function _extractNumber(val: string | null | undefined): string {
  if (!val) return '';
  const s = String(val);
  const nums = s.replace(/\D/g, ''); // ตัดตัวอักษรออกหมดเหลือแต่เลข
  if (!nums) return '';
  return parseInt(nums, 10).toString(); // แปลงเป็น int เพื่อตัด 0 นำหน้า (01 -> 1)
}
