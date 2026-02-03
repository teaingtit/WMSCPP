/**
 * Email Templates for Scheduled Reports
 * Thai language templates for WMS reports
 */

import { InventorySummaryData, TransactionSummaryData } from './inventory-report';

/**
 * Generate HTML email for inventory summary report
 */
export function inventorySummaryEmailTemplate(data: InventorySummaryData): string {
  const categoryRows = data.categoryBreakdown
    .map(
      (cat) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${cat.categoryName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${
          cat.productCount
        }</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${cat.totalQuantity.toLocaleString()}</td>
      </tr>
    `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 24px; color: white;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px;">📦 รายงานสรุปสินค้าคงคลัง</h1>
      <p style="margin: 0; opacity: 0.9;">คลังสินค้า: ${data.warehouseName} (${
    data.warehouseCode
  })</p>
    </div>

    <!-- Summary Cards -->
    <div style="padding: 24px; display: flex; gap: 16px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 120px; background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #1e40af;">${data.totalProducts.toLocaleString()}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">สินค้าทั้งหมด</div>
      </div>
      <div style="flex: 1; min-width: 120px; background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #1e40af;">${data.totalLocations.toLocaleString()}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">ตำแหน่งจัดเก็บ</div>
      </div>
      <div style="flex: 1; min-width: 120px; background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #1e40af;">${data.totalStockQuantity.toLocaleString()}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">จำนวนรวม</div>
      </div>
    </div>

    <!-- Category Breakdown -->
    <div style="padding: 0 24px 24px;">
      <h2 style="font-size: 16px; color: #374151; margin: 0 0 12px 0;">📊 สรุปตามหมวดหมู่</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">หมวดหมู่</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">จำนวนสินค้า</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">จำนวนรวม</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">รายงานนี้สร้างโดยระบบ WMS อัตโนมัติ</p>
      <p style="margin: 4px 0 0 0;">วันที่สร้าง: ${new Date(data.generatedAt).toLocaleDateString(
        'th-TH',
        { dateStyle: 'full' },
      )}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate HTML email for transaction summary report
 */
export function transactionSummaryEmailTemplate(data: TransactionSummaryData): string {
  const topProductRows = data.topProducts
    .map(
      (p) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${p.sku}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${p.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #16a34a;">+${
          p.inbound
        }</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${
          p.outbound
        }</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${
          p.net >= 0 ? '#16a34a' : '#dc2626'
        };">${p.net >= 0 ? '+' : ''}${p.net}</td>
      </tr>
    `,
    )
    .join('');

  const startDate = new Date(data.period.start).toLocaleDateString('th-TH');
  const endDate = new Date(data.period.end).toLocaleDateString('th-TH');

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 24px; color: white;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px;">📈 รายงานสรุปการเคลื่อนไหว</h1>
      <p style="margin: 0; opacity: 0.9;">คลังสินค้า: ${data.warehouseName} (${
    data.warehouseCode
  })</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.8;">ช่วงเวลา: ${startDate} - ${endDate}</p>
    </div>

    <!-- Summary Cards -->
    <div style="padding: 24px; display: flex; gap: 16px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 150px; background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #16a34a;">
        <div style="font-size: 24px; font-weight: bold; color: #16a34a;">+${data.inboundQuantity.toLocaleString()}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">นำเข้า (${
          data.inboundCount
        } รายการ)</div>
      </div>
      <div style="flex: 1; min-width: 150px; background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;">
        <div style="font-size: 24px; font-weight: bold; color: #dc2626;">-${data.outboundQuantity.toLocaleString()}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">เบิกจ่าย (${
          data.outboundCount
        } รายการ)</div>
      </div>
      <div style="flex: 1; min-width: 150px; background: #f0f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #0284c7;">
        <div style="font-size: 24px; font-weight: bold; color: #0284c7;">${data.transferCount}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">โอนย้าย</div>
      </div>
    </div>

    ${
      data.topProducts.length > 0
        ? `
    <!-- Top Products -->
    <div style="padding: 0 24px 24px;">
      <h2 style="font-size: 16px; color: #374151; margin: 0 0 12px 0;">🏆 สินค้าที่มีการเคลื่อนไหวมากที่สุด</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">SKU</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">ชื่อสินค้า</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">นำเข้า</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">เบิกจ่าย</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">สุทธิ</th>
          </tr>
        </thead>
        <tbody>
          ${topProductRows}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">รายงานนี้สร้างโดยระบบ WMS อัตโนมัติ</p>
      <p style="margin: 4px 0 0 0;">วันที่สร้าง: ${new Date(data.generatedAt).toLocaleDateString(
        'th-TH',
        { dateStyle: 'full' },
      )}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text version of inventory summary
 */
export function inventorySummaryTextTemplate(data: InventorySummaryData): string {
  let text = `
รายงานสรุปสินค้าคงคลัง
=====================
คลังสินค้า: ${data.warehouseName} (${data.warehouseCode})
วันที่: ${new Date(data.generatedAt).toLocaleDateString('th-TH')}

สรุป:
- สินค้าทั้งหมด: ${data.totalProducts.toLocaleString()} รายการ
- ตำแหน่งจัดเก็บ: ${data.totalLocations.toLocaleString()} ตำแหน่ง
- จำนวนรวม: ${data.totalStockQuantity.toLocaleString()} หน่วย
`;

  return text;
}
