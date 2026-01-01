'use server';

import { createClient } from '@/lib/db/supabase-server';
import { revalidatePath } from 'next/cache';
import * as ExcelUtils from '@/lib/utils/excel-utils';
import { isValidUUID } from '@/lib/utils/utils';

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
    const worksheet = await ExcelUtils.parseExcel(file);
    const rows: any[] = [];
    
    // Pre-fetch Data
    let categoryUom = 'PCS';
    let schemaKeys: string[] = [];
    
    if (type === 'product' && categoryId) {
        const { data: cat } = await supabase.from('product_categories').select('*').eq('id', categoryId).single();
        if(cat) {
             categoryUom = cat.uom || 'PCS';
             schemaKeys = (cat.form_schema || []).filter((f:any) => f.scope === 'PRODUCT').map((f:any) => f.key);
        } else {
             return { success: false, message: `Category ID "${categoryId}" not found` };
        }
    }

    worksheet.eachRow((row, n) => {
      // Skip Header & Info Row
      if (n === 1 || row.getCell(1).text.startsWith('***')) return;

      if (type === 'category') {
        const id = row.getCell(1).text?.trim().toUpperCase();
        const name = row.getCell(2).text?.trim();
        if (id && name) {
            const form_schema = [];
            // อ่าน Spec (เริ่ม Col 4, 5 ชุด)
            for(let i=0; i<5; i++) { 
                const a = ExcelUtils.parseAttributeString(row.getCell(4+i).text, 'PRODUCT'); 
                if(a) form_schema.push(a); 
            }
            // อ่าน Inbound (เริ่ม Col 9, 5 ชุด)
            for(let i=0; i<5; i++) { 
                const a = ExcelUtils.parseAttributeString(row.getCell(9+i).text, 'LOT'); 
                if(a) form_schema.push(a); 
            }
            rows.push({ 
                id, // Use Custom ID
                name, 
                uom: row.getCell(3).text?.trim().toUpperCase() || 'PCS',
                form_schema 
            });
        }
      } else {
        // Product Logic
        const sku = row.getCell(1).text?.trim().toUpperCase();
        if (sku) {
            const attributes: any = {};
            schemaKeys.forEach((key, idx) => { 
                const val = row.getCell(4 + idx).value; 
                if(val) attributes[key] = val; 
            });
            
            rows.push({
                sku, 
                name: row.getCell(2).text?.trim(), 
                category_id: categoryId, // Use Custom ID from context
                uom: categoryUom,        // Inherit UOM
                image_url: row.getCell(3).text?.trim() || null,
                attributes,
                is_active: true
            });
        }
      }
    });

    const table = type === 'category' ? 'product_categories' : 'products';
    const conflict = type === 'category' ? 'id' : 'sku';
    const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict });
    if (error) throw error;
    
    revalidatePath('/dashboard/settings');
    return { success: true, message: `Imported ${rows.length} items.` };

  } catch (err: any) { return { success: false, message: err.message }; }
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
        
        // 1. ดึงข้อมูลจำเป็น (Parallel Fetching เพื่อความเร็ว)
        const [productsRes, locsRes, whRes, catRes] = await Promise.all([
            supabase.from('products').select('id, sku').eq('category_id', categoryId),
            supabase.from('locations').select('id, code, lot, cart, level').eq('warehouse_id', warehouseId),
            supabase.from('warehouses').select('config').eq('id', warehouseId).single(),
            supabase.from('product_categories').select('form_schema').eq('id', categoryId).single()
        ]);

        const productMap = new Map(productsRes.data?.map(p => [p.sku, p.id]));
        
        const whConfig = whRes.data?.config || {};
        const isGridSystem = !!(whConfig.axis_x || whConfig.axis_y);

        // Map Locations (Optimized)
        const locMap = new Map<string, string>();
        locsRes.data?.forEach(l => {
            if (isGridSystem) {
                // Key แบบ Grid: LOT|CART|LEVEL
                locMap.set(`${l.lot}|${l.cart}|${l.level || ''}`.toUpperCase(), l.id);
            } else {
                // Key แบบ Code: LOCATION_CODE
                locMap.set(l.code.toUpperCase(), l.id);
            }
        });

        const schemaKeys = Array.isArray(catRes.data?.form_schema) 
            ? catRes.data.form_schema.map((f: any) => f.key) 
            : [];

        // 2. Dynamic Header Parsing (อ่านหัวตารางเพื่อหา Index)
        const headerMap = new Map<string, number>();
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
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

        // Validate Template Structure
        if (!headerMap.has('sku') || !headerMap.has('qty')) {
            return { success: false, message: 'รูปแบบไฟล์ไม่ถูกต้อง: ไม่พบคอลัมน์ SKU หรือ Qty' };
        }
        if (isGridSystem && (!headerMap.has('lot') || !headerMap.has('cart'))) {
             return { success: false, message: 'คลังสินค้านี้เป็นระบบ Grid: ไฟล์ต้องมีคอลัมน์ Lot และ Cart' };
        }

        // 3. Row Validation (Strict Mode)
        const txs: any[] = [];
        const errors: string[] = [];

        worksheet.eachRow((row, n) => {
            if (n === 1) return; // Skip Header

            // อ่านค่าตาม Header Map
            const skuCol = headerMap.get('sku');
            const qtyCol = headerMap.get('qty');
            
            const sku = skuCol ? row.getCell(skuCol).text?.trim().toUpperCase() : null;
            const qtyVal = qtyCol ? row.getCell(qtyCol).value : 0;
            const qty = Number(qtyVal);

            if (!sku && !qty) return; // ข้ามแถวว่าง

            if (!sku) { errors.push(`Row ${n}: ไม่ระบุ SKU`); return; }
            if (!qty || qty <= 0) { errors.push(`Row ${n}: จำนวนต้องมากกว่า 0`); return; }

            // Validate Product
            if (!productMap.has(sku)) {
                errors.push(`Row ${n}: SKU "${sku}" ไม่พบในหมวดสินค้านี้`);
                return;
            }

            // Validate Location
            let locId: string | undefined;
            let locDebug = '';

            if (isGridSystem) {
                const lot = row.getCell(headerMap.get('lot')!).text?.trim();
                const cart = row.getCell(headerMap.get('cart')!).text?.trim();
                const level = headerMap.has('level') ? row.getCell(headerMap.get('level')!).text?.trim() : '';
                
                locDebug = `${lot}-${cart}-${level}`;
                if (!lot || !cart) {
                    errors.push(`Row ${n}: ระบุ Lot/Cart ไม่ครบ`);
                    return;
                }
                locId = locMap.get(`${lot}|${cart}|${level}`.toUpperCase());
            } else {
                const code = row.getCell(headerMap.get('loc_code')!).text?.trim();
                locDebug = code;
                if (!code) {
                    errors.push(`Row ${n}: ไม่ระบุ Location Code`);
                    return;
                }
                locId = locMap.get(code.toUpperCase());
            }

            if (!locId) {
                errors.push(`Row ${n}: ไม่พบตำแหน่ง "${locDebug}" ในคลังสินค้านี้`);
                return;
            }

            // Extract Attributes
            const attributes: any = {};
            schemaKeys.forEach(key => {
                const colIdx = headerMap.get(key);
                if (colIdx) {
                    const val = row.getCell(colIdx).value;
                    // แปลง Date object เป็น string ถ้าจำเป็น
                    if (val instanceof Date) attributes[key] = val.toISOString().split('T')[0];
                    else if (val !== null && val !== undefined) attributes[key] = val;
                }
            });

            txs.push({
                p_warehouse_id: warehouseId,
                p_location_id: locId,
                p_product_id: productMap.get(sku),
                p_quantity: qty,
                p_attributes: attributes,
                p_user_id: userId,
                p_user_email: 'Bulk Inbound'
            });
        });

        // 4. Decision: ถ้ามี Error แม้แต่รายการเดียว -> Reject ทั้งหมด
        if (errors.length > 0) {
            return { 
                success: false, 
                message: `พบข้อผิดพลาด ${errors.length} รายการ (ยกเลิกการนำเข้าทั้งหมด)`,
                report: { total: worksheet.rowCount - 1, failed: errors.length, errors }
            };
        }

        if (txs.length === 0) {
            return { success: false, message: 'ไม่พบข้อมูลสินค้าในไฟล์' };
        }

        // 5. Batch Execution (Atomic Transaction)
        // เรียก RPC ใหม่ที่สร้างไว้ใน Step 1
        const { error } = await supabase.rpc('process_inbound_batch', { 
            p_transactions: txs 
        });

        if (error) throw new Error(error.message);
        
        revalidatePath(`/dashboard/${warehouseId}/inventory`);
        return { 
            success: true, 
            message: `นำเข้าสำเร็จทั้งหมด ${txs.length} รายการ`,
            report: { total: txs.length, failed: 0, errors: [] }
        };

    } catch (err: any) { 
        console.error(err);
        return { success: false, message: `System Error: ${err.message}` }; 
    }
}