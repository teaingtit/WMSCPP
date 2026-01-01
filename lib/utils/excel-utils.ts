import ExcelJS from 'exceljs';

// --- Generators (สร้าง Template) ---

export async function generateProductTemplate(catName: string, schema: any[], uom: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Template');

  const columns: any[] = [
    { header: 'SKU (รหัสสินค้า)*', key: 'sku', width: 20 },
    { header: 'Name (ชื่อสินค้า)*', key: 'name', width: 35 },
    { header: 'Image URL', key: 'image_url', width: 30 }
  ];

  // Dynamic Spec Columns
  schema.filter((f: any) => !f.scope || f.scope === 'PRODUCT').forEach((field: any) => {
      columns.push({ 
          header: field.label, 
          key: `attr_${field.key}`, 
          width: 25,
          style: { font: { color: { argb: 'FF2F75B5' } } }
      });
  });

  sheet.columns = columns;
  
  // Info Row
  const infoRow = sheet.addRow([`*** Template: ${catName} (Unit: ${uom}) ***`]);
  infoRow.font = { italic: true, color: { argb: 'FF888888' } };
  
  sheet.addRow({ sku: 'DEMO-001', name: 'สินค้าตัวอย่าง' }); // Example

  return Buffer.from(await workbook.xlsx.writeBuffer()).toString('base64');
}

export async function generateCategoryTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Template');

  const columns: any[] = [
    { header: 'ID (รหัสหมวดหมู่)*', key: 'id', width: 15 },
    { header: 'Name (ชื่อหมวดหมู่)*', key: 'name', width: 30 },
  ];

  // Spec & Inbound Columns Loop
  for (let i = 1; i <= 5; i++) columns.push({ header: `Spec ${i} (key/label/type)`, key: `spec_${i}`, width: 30, style: { font: { color: { argb: 'FF2F75B5' } } } });
  for (let i = 1; i <= 5; i++) columns.push({ header: `Inbound ${i} (key/label/type)`, key: `inbound_${i}`, width: 30, style: { font: { color: { argb: 'FFC05621' } } } });
  
  sheet.columns = columns;
  const row = sheet.addRow({ id: 'ELEC', name: 'Electronics' });
  row.getCell(3).value = 'voltage/แรงดันไฟ/text'; // Example

  return Buffer.from(await workbook.xlsx.writeBuffer()).toString('base64');
}

export async function generateInboundTemplate(whName: string, catName: string, hasGrid: boolean, schema: any[]) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inbound');
  
    const columns: any[] = [
      { header: 'SKU (รหัสสินค้า)*', key: 'sku', width: 20 },
      { header: 'Qty (จำนวน)*', key: 'qty', width: 15 },
    ];
  
    if (hasGrid) {
        columns.push(
            { header: 'Lot/Zone*', key: 'lot', width: 12 },
            { header: 'Cart/Pos*', key: 'cart', width: 12 },
            { header: 'Level*', key: 'level', width: 12 }
        );
    } else {
        columns.push({ header: 'Location Code*', key: 'loc_code', width: 20 });
    }
  
    schema.forEach((field: any) => {
        columns.push({ 
            header: field.label, 
            key: `attr_${field.key}`, 
            width: 20,
            style: { font: { color: { argb: 'FFC05621' } } }
        });
    });
  
    sheet.columns = columns;
    const example: any = { sku: 'SKU-001', qty: 50 };
    if(hasGrid) { example.lot = 'A'; example.cart = '01'; example.level = '1'; } 
    else { example.loc_code = 'A-01-01'; }
    sheet.addRow(example);
  
    return Buffer.from(await workbook.xlsx.writeBuffer()).toString('base64');
}

// --- Parsers (อ่านไฟล์) ---

export async function parseExcel(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new Error('Invalid Excel Format');
    return worksheet;
}

export function parseAttributeString(val: string, scope: 'PRODUCT' | 'LOT') {
    if(!val) return null;
    const parts = val.toString().split('/').map(s => s.trim());
    if(!parts[0]) return null;
    return { 
        key: parts[0].toLowerCase().replace(/\s+/g, '_'), 
        label: parts[1]||parts[0], 
        type: (parts[2]||'text').toLowerCase(), 
        scope 
    };
}