'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import * as ExcelUtils from '@/lib/excel-utils';
import { isValidUUID } from '@/lib/utils';

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
    // Check UUID only for Warehouse ID
    if (!isValidUUID(warehouseId)) {
         throw new Error(`Invalid Warehouse ID format: ${warehouseId}`);
    }
    // Category ID can be anything

    const supabase = await createClient();
    const { data: wh } = await supabase.from('warehouses').select('config, code').eq('id', warehouseId).single();
    const { data: cat } = await supabase.from('product_categories').select('*').eq('id', categoryId).single();
    
    if (!wh || !cat) throw new Error('Data not found');

    const hasGrid = wh.config && (wh.config.axis_x || wh.config.axis_y);
    const base64 = await ExcelUtils.generateInboundTemplate(wh.code, cat.name, hasGrid, cat.form_schema || []);
    
    return { base64, fileName: `Inbound_${wh.code}_${cat.name}.xlsx` };
}

export async function importInboundStock(formData: FormData) {
    const warehouseId = formData.get('warehouseId') as string;
    const categoryId = formData.get('categoryId') as string;
    const userId = formData.get('userId') as string;

    // Check UUID only for Warehouse ID
    if (!isValidUUID(warehouseId)) {
        return { success: false, message: 'Invalid Warehouse ID' };
    }

    const supabase = await createClient();
    const file = formData.get('file') as File;

    if (!file) return { success: false, message: 'File missing' };

    try {
        const worksheet = await ExcelUtils.parseExcel(file);
        
        // Prepare Maps
        const { data: products } = await supabase.from('products').select('id, sku').eq('category_id', categoryId);
        const productMap = new Map(products?.map(p => [p.sku, p.id]));
        
        const { data: locations } = await supabase.from('locations').select('*').eq('warehouse_id', warehouseId);
        const locMap = new Map();
        locations?.forEach(l => {
            if (l.lot && l.cart) locMap.set(`${l.lot}|${l.cart}|${l.level || ''}`.toUpperCase(), l.id);
            locMap.set(l.code.toUpperCase(), l.id);
        });

        const { data: cat } = await supabase.from('product_categories').select('form_schema').eq('id', categoryId).single();
        const schemaKeys = Array.isArray(cat?.form_schema) ? cat.form_schema.map((f: any) => f.key) : [];

        const txs: any[] = [];
        const errors: string[] = [];
        
        worksheet.eachRow((row, n) => {
            if (n === 1) return;
            
            const sku = row.getCell(1).text?.trim().toUpperCase();
            const qty = Number(row.getCell(2).value);
            if (!sku || !qty) return;

            if (!productMap.has(sku)) {
                errors.push(`Row ${n}: SKU "${sku}" ไม่พบในหมวด ${categoryId}`);
                return;
            }

            let locId = null;
            // Column 3, 4, 5 for location
            const val3 = row.getCell(3).text?.trim();
            const val4 = row.getCell(4).text?.trim();
            const val5 = row.getCell(5).text?.trim();

            if (val3 && val4) locId = locMap.get(`${val3}|${val4}|${val5 || ''}`.toUpperCase());
            if (!locId && val3) locId = locMap.get(val3.toUpperCase());

            if (!locId) {
                errors.push(`Row ${n}: ไม่พบตำแหน่งจัดเก็บ "${val3} ${val4}"`);
                return;
            }

            const attributes: any = {};
            // Attributes start after location columns (Logic to detect start col)
            // Simplified: If grid (val4 exists), start 6. If code only, start 4?
            // Better: Use fixed template structure.
            // Assumption: Template generated has fixed columns.
            // If Grid: Loc is 3,4,5 -> Attr starts 6
            // If Code: Loc is 3 -> Attr starts 4
            // Dynamic check:
            const startCol = (val3 && val4) ? 6 : 4; 
            
            schemaKeys.forEach((key, index) => {
                const val = row.getCell(startCol + index).value;
                if (val !== null && val !== undefined) {
                    if (val instanceof Date) attributes[key] = val.toISOString().split('T')[0];
                    else attributes[key] = val;
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

        if (errors.length > 0) return { success: false, message: errors.slice(0, 5).join('\n') };

        let successCount = 0;
        for (const tx of txs) {
            const { error } = await supabase.rpc('process_inbound_transaction', tx);
            if (!error) successCount++;
        }
        
        revalidatePath(`/dashboard/${warehouseId}/inventory`);
        return { success: true, message: `นำเข้าสำเร็จ ${successCount} รายการ` };

    } catch (err: any) { return { success: false, message: err.message }; }
}