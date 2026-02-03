// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  inventorySummaryEmailTemplate,
  transactionSummaryEmailTemplate,
  inventorySummaryTextTemplate,
} from '@/lib/reports/email-templates';
import type { InventorySummaryData, TransactionSummaryData } from '@/lib/reports/inventory-report';

const baseInventoryData: InventorySummaryData = {
  warehouseName: 'คลังหลัก',
  warehouseCode: 'WH01',
  totalProducts: 42,
  totalLocations: 100,
  totalStockQuantity: 5000,
  categoryBreakdown: [
    { categoryName: 'อิเล็กทรอนิกส์', productCount: 10, totalQuantity: 1000 },
    { categoryName: 'ของใช้', productCount: 32, totalQuantity: 4000 },
  ],
  generatedAt: '2024-06-01T08:00:00.000Z',
};

const baseTransactionData: TransactionSummaryData = {
  warehouseName: 'คลังหลัก',
  warehouseCode: 'WH01',
  period: {
    start: '2024-05-25T00:00:00.000Z',
    end: '2024-06-01T23:59:59.999Z',
  },
  inboundCount: 15,
  inboundQuantity: 500,
  outboundCount: 10,
  outboundQuantity: 200,
  transferCount: 3,
  topProducts: [
    { sku: 'SKU-001', name: 'สินค้า A', inbound: 100, outbound: 30, net: 70 },
    { sku: 'SKU-002', name: 'สินค้า B', inbound: 50, outbound: 80, net: -30 },
  ],
  generatedAt: '2024-06-01T08:00:00.000Z',
};

describe('email-templates', () => {
  describe('inventorySummaryEmailTemplate', () => {
    it('should include warehouse name and code in HTML', () => {
      const html = inventorySummaryEmailTemplate(baseInventoryData);
      expect(html).toContain('คลังหลัก');
      expect(html).toContain('WH01');
    });

    it('should include summary numbers', () => {
      const html = inventorySummaryEmailTemplate(baseInventoryData);
      expect(html).toContain('42');
      expect(html).toContain('100');
      expect(html).toContain('5,000');
    });

    it('should include category breakdown', () => {
      const html = inventorySummaryEmailTemplate(baseInventoryData);
      expect(html).toContain('อิเล็กทรอนิกส์');
      expect(html).toContain('ของใช้');
      expect(html).toContain('สรุปตามหมวดหมู่');
    });

    it('should be valid HTML with lang="th"', () => {
      const html = inventorySummaryEmailTemplate(baseInventoryData);
      expect(html).toMatch(/<html[^>]*lang="th"/);
      expect(html).toContain('</body>');
      expect(html).toContain('</html>');
    });
  });

  describe('transactionSummaryEmailTemplate', () => {
    it('should include warehouse and period', () => {
      const html = transactionSummaryEmailTemplate(baseTransactionData);
      expect(html).toContain('คลังหลัก');
      expect(html).toContain('WH01');
    });

    it('should include inbound/outbound/transfer counts', () => {
      const html = transactionSummaryEmailTemplate(baseTransactionData);
      expect(html).toContain('500');
      expect(html).toContain('200');
      expect(html).toContain('15');
      expect(html).toContain('10');
      expect(html).toContain('3');
    });

    it('should include top products when present', () => {
      const html = transactionSummaryEmailTemplate(baseTransactionData);
      expect(html).toContain('SKU-001');
      expect(html).toContain('สินค้า A');
      expect(html).toContain('+70');
      expect(html).toContain('-30');
    });

    it('should be valid HTML', () => {
      const html = transactionSummaryEmailTemplate(baseTransactionData);
      expect(html).toMatch(/<html/);
      expect(html).toContain('</body>');
    });

    it('should not break when topProducts is empty', () => {
      const data = { ...baseTransactionData, topProducts: [] };
      const html = transactionSummaryEmailTemplate(data);
      expect(html).toContain('คลังหลัก');
    });
  });

  describe('inventorySummaryTextTemplate', () => {
    it('should include warehouse and summary in plain text', () => {
      const text = inventorySummaryTextTemplate(baseInventoryData);
      expect(text).toContain('รายงานสรุปสินค้าคงคลัง');
      expect(text).toContain('คลังหลัก');
      expect(text).toContain('WH01');
      expect(text).toContain('42');
      expect(text).toContain('100');
      expect(text).toContain('5,000');
    });
  });
});
