// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';
import {
  generateProductTemplate,
  generateCategoryTemplate,
  generateInboundTemplate,
  parseExcel,
  parseAttributeString,
} from '@/lib/utils/excel-utils';

describe('excel-utils', () => {
  describe('generateProductTemplate', () => {
    it('should return base64 string and valid excel file', async () => {
      const result = await generateProductTemplate('Category A', []);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      const buffer = Buffer.from(result, 'base64');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet('Template');
      expect(sheet).toBeDefined();
      expect(sheet?.getRow(1).getCell(1).text).toContain('SKU');
    });

    it('should include schema columns when schema provided', async () => {
      const schema = [
        { key: 'lot', label: 'Lot', scope: 'PRODUCT' },
        { key: 'exp', label: 'Expiry', scope: 'LOT' },
      ];
      const result = await generateProductTemplate('Cat', schema);
      const buffer = Buffer.from(result, 'base64');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet('Template');

      // SKU, Name, Image, Lot (PRODUCT scope only)
      expect(sheet?.columnCount).toBe(4);
      expect(sheet?.getRow(1).getCell(4).text).toBe('Lot');
    });
  });

  describe('generateCategoryTemplate', () => {
    it('should return base64 string and valid structure', async () => {
      const result = await generateCategoryTemplate();
      const buffer = Buffer.from(result, 'base64');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet('Template');

      expect(sheet).toBeDefined();
      expect(sheet?.getRow(1).getCell(1).text).toContain('ID');
      // ID, Name, 5 Specs, 5 Inbounds = 2 + 5 + 5 = 12 columns
      expect(sheet?.columnCount).toBe(12);
    });
  });

  describe('generateInboundTemplate', () => {
    it('should return base64 string and include schema columns', async () => {
      const schema = [{ key: 'batch', label: 'Batch' }];
      const result = await generateInboundTemplate('WH', 'Cat', schema);
      const buffer = Buffer.from(result, 'base64');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet('Inbound');

      expect(sheet).toBeDefined();
      expect(sheet?.getRow(1).getCell(1).text).toContain('SKU');
      // SKU, Qty, Lot, Cart, Level + schema(1) = 5 + 1 = 6
      expect(sheet?.columnCount).toBe(6);
      expect(sheet?.getRow(1).getCell(6).text).toBe('Batch');
    });
  });

  describe('parseExcel', () => {
    it('should throw when file is invalid or worksheet not found', async () => {
      const blob = new Blob(['invalid'], { type: 'application/octet-stream' });
      const file = new File([blob], 'test.xlsx');
      await expect(parseExcel(file)).rejects.toThrow();
    });

    it('should parse valid Excel file and return worksheet', async () => {
      const base64 = await generateProductTemplate('TestCat', []);
      const buffer = Buffer.from(base64, 'base64');
      const arrayBuf = new ArrayBuffer(buffer.length);
      new Uint8Array(arrayBuf).set(buffer);
      const file = {
        arrayBuffer: () => Promise.resolve(arrayBuf),
      } as File;

      const worksheet = await parseExcel(file);
      expect(worksheet).toBeDefined();
      expect(worksheet.name).toBe('Template');
      expect(worksheet.getRow(1).getCell(1).text).toContain('SKU');
    });
  });

  describe('parseAttributeString', () => {
    it('should return null for empty string', () => {
      expect(parseAttributeString('', 'PRODUCT')).toBeNull();
      expect(parseAttributeString('', 'LOT')).toBeNull();
    });

    it('should parse key/label/type format', () => {
      const result = parseAttributeString('lot / Lot / text', 'PRODUCT');
      expect(result).toEqual({
        key: 'lot',
        label: 'Lot',
        type: 'text',
        scope: 'PRODUCT',
      });
    });

    it('should default label to key and type to text', () => {
      const result = parseAttributeString('expiry_date', 'LOT');
      expect(result).toEqual({
        key: 'expiry_date',
        label: 'expiry_date',
        type: 'text',
        scope: 'LOT',
      });
    });

    it('should trim parts and normalize key', () => {
      const result = parseAttributeString('  my key  /  My Label  /  number  ', 'PRODUCT');
      expect(result?.key).toBe('my_key');
      expect(result?.label).toBe('My Label');
      expect(result?.type).toBe('number');
    });

    it('should return null when first part is empty', () => {
      expect(parseAttributeString('  / label / type', 'PRODUCT')).toBeNull();
    });

    it('should handle falsy values and return null', () => {
      expect(parseAttributeString(null as any, 'PRODUCT')).toBeNull();
      expect(parseAttributeString(undefined as any, 'LOT')).toBeNull();
    });

    it('should default type to text when third part is empty', () => {
      const result = parseAttributeString('key/label/', 'PRODUCT');
      expect(result?.type).toBe('text');
    });
  });
});
