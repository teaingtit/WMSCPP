// actions/export-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import ExcelJS from 'exceljs';

interface ExportResult {
  success: boolean;
  data?: string; // Base64 string
  fileName?: string;
  error?: string;
}

export async function exportInventoryToExcel(warehouseIdentifier: string): Promise<ExportResult> {
  const supabase = await createClient();

  try {
    // 1. Resolve Warehouse ID
    let targetWhId = warehouseIdentifier;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(warehouseIdentifier);

    if (!isUUID) {
      const { data: wh } = await supabase
        .from('warehouses')
        .select('id')
        .eq('code', warehouseIdentifier)
        .single();
      
      if (!wh) throw new Error(`ไม่พบคลังสินค้ารหัส: ${warehouseIdentifier}`);
      targetWhId = wh.id;
    }

    // 2. Fetch Data (Stocks)
    const { data: stocks, error } = await supabase
      .from('stocks')
      .select(`
        quantity,
        attributes,
        updated_at,
        products (
          sku,
          name,
          uom,
          category_id,
          attributes
        ),
        locations (
          code
        )
      `)
      .eq('warehouse_id', targetWhId)
      .gt('quantity', 0)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!stocks || stocks.length === 0) {
      return { success: false, error: 'ไม่พบสินค้าคงเหลือในคลังนี้' };
    }

    // 3. ✅ Fetch Categories Schema (เพื่อแปล Key -> Label ภาษาไทย)
    const { data: categories } = await supabase
      .from('product_categories')
      .select('form_schema');

    // สร้าง Map สำหรับแปลภาษา: field_123 -> "วันหมดอายุ"
    const keyLabelMap = new Map<string, string>();
    if (categories) {
      categories.forEach((cat: any) => {
        if (Array.isArray(cat.form_schema)) {
           cat.form_schema.forEach((field: any) => {
              if (field.key && field.label) {
                 keyLabelMap.set(field.key, field.label);
              }
           });
        }
      });
    }

    // 4. Scan Keys ที่มีอยู่จริงในข้อมูล
    const stockAttrKeys = new Set<string>();
    const prodAttrKeys = new Set<string>();

    stocks.forEach((item: any) => {
      // Keys ของ Lot (Stock Attributes)
      if (item.attributes) {
        Object.keys(item.attributes).forEach(k => stockAttrKeys.add(k));
      }
      // Keys ของ Spec (Product Attributes)
      if (item.products?.attributes) {
        Object.keys(item.products.attributes).forEach(k => prodAttrKeys.add(k));
      }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Stock Data');

    // 5. Define Columns
    const columns: any[] = [
      { header: 'Location', key: 'location', width: 15 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Product Name', key: 'name', width: 35 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Qty', key: 'qty', width: 10 },
      { header: 'Unit', key: 'uom', width: 10 },
    ];

    // ✅ ปรับลำดับ: เอา Spec (คุณสมบัติ) ขึ้นก่อน Lot
    
    // 5.1 Product Attributes (Spec)
    prodAttrKeys.forEach(key => {
        // ใช้ keyLabelMap แปลเป็นชื่อไทย (ถ้าหาไม่เจอใช้ key เดิม)
        const label = keyLabelMap.get(key) || key;
        columns.push({ 
            header: `[คุณสมบัติ] ${label}`, 
            key: `p_attr_${key}`, 
            width: 20,
            style: { font: { color: { argb: 'FFC05621' } } } // สีส้ม
        });
    });

    // 5.2 Stock Attributes (Lot)
    stockAttrKeys.forEach(key => {
        const label = keyLabelMap.get(key) || key;
        columns.push({ 
            header: `[ล็อต] ${label}`, 
            key: `s_attr_${key}`,   
            width: 20,
            style: { font: { color: { argb: 'FF2F855A' } } } // สีเขียว
        });
    });

    // ปิดท้าย
    columns.push({ header: 'อัปเดตล่าสุด', key: 'updated_at', width: 20 });

    worksheet.columns = columns;

    // 6. Map Data
    stocks.forEach((item: any) => {
      const p = item.products;
      
      const rowData: any = {
        location: item.locations?.code || '-',
        sku: p?.sku || '-',
        name: p?.name || '-',
        category: p?.category_id || '-',
        qty: item.quantity,
        uom: p?.uom || 'PCS',
        updated_at: item.updated_at ? new Date(item.updated_at).toLocaleString('th-TH') : '-'
      };

      // ใส่ข้อมูล Spec
      prodAttrKeys.forEach(key => {
         rowData[`p_attr_${key}`] = p?.attributes?.[key] ?? '-';
      });

      // ใส่ข้อมูล Lot
      stockAttrKeys.forEach(key => {
         rowData[`s_attr_${key}`] = item.attributes?.[key] ?? '-';
      });

      worksheet.addRow(rowData);
    });

    // Styling Header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    };

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const timestamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');

    return {
      success: true,
      data: base64,
      fileName: `Stock-${warehouseIdentifier}-${timestamp}.xlsx`
    };

  } catch (err: any) {
    console.error('Export Error:', err);
    return { success: false, error: err.message };
  }
}