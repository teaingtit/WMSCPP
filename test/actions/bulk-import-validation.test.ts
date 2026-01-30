// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importMasterData, importInboundStock } from '@/actions/bulk-import-actions';
import * as ExcelUtils from '@/lib/utils/excel-utils';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/utils/excel-utils');
vi.mock('@/lib/auth-service');
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Data Type Validation in Bulk Import', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      upsert: vi.fn(),
      rpc: vi.fn(),
    };

    (createClient as any).mockResolvedValue(mockSupabase);

    const { checkManagerRole } = await import('@/lib/auth-service');
    vi.mocked(checkManagerRole).mockResolvedValue(true);
  });

  describe('Number Field Validation', () => {
    it('should reject text value in number field', async () => {
      // Mock category with number field
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'CAT001',
          name: 'Electronics',
          form_schema: [
            {
              key: 'voltage',
              label: 'แรงดันไฟฟ้า',
              type: 'number',
              required: true,
              scope: 'PRODUCT',
            },
          ],
          units: ['UNIT'],
        },
      });

      // Mock Excel with text in number field
      const mockWorksheet = {
        rowCount: 3,
        getRow: vi.fn((rowNum) => ({
          eachCell: vi.fn((callback) => {
            if (rowNum === 1) {
              // Header row
              callback({ text: 'SKU' }, 1);
              callback({ text: 'Name' }, 2);
              callback({ text: 'แรงดันไฟฟ้า (voltage)' }, 3);
            }
          }),
          getCell: vi.fn((colNum) => {
            if (rowNum === 3) {
              // Data row with invalid number
              if (colNum === 1) return { text: 'PROD001', value: 'PROD001' };
              if (colNum === 2) return { text: 'Product 1', value: 'Product 1' };
              if (colNum === 3) return { text: 'สองร้อยยี่สิบ', value: 'สองร้อยยี่สิบ' }; // Text instead of number
            }
            return { text: '', value: null };
          }),
        })),
        eachRow: vi.fn((callback) => {
          callback(mockWorksheet.getRow(1), 1);
          callback(mockWorksheet.getRow(2), 2);
          callback(mockWorksheet.getRow(3), 3);
        }),
      };

      (ExcelUtils.parseExcel as any).mockResolvedValue(mockWorksheet);

      const formData = new FormData();
      formData.append('file', new File([''], 'test.xlsx'));
      formData.append('categoryId', 'CAT001');

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(false);
      expect(result.message).toContain('พบข้อผิดพลาด');
      expect(result.report?.errors).toBeDefined();
      expect(result.report?.errors[0]).toContain('แรงดันไฟฟ้า');
      expect(result.report?.errors[0]).toContain('ต้องเป็นตัวเลข');
    });

    it('should accept valid number values', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'CAT001',
          name: 'Electronics',
          form_schema: [
            {
              key: 'voltage',
              label: 'แรงดันไฟฟ้า',
              type: 'number',
              required: true,
              scope: 'PRODUCT',
            },
          ],
          units: ['UNIT'],
        },
      });

      const mockWorksheet = {
        rowCount: 3,
        getRow: vi.fn((rowNum) => ({
          eachCell: vi.fn((callback) => {
            if (rowNum === 1) {
              callback({ text: 'SKU' }, 1);
              callback({ text: 'Name' }, 2);
              callback({ text: 'แรงดันไฟฟ้า (voltage)' }, 3);
            }
          }),
          getCell: vi.fn((colNum) => {
            if (rowNum === 3) {
              if (colNum === 1) return { text: 'PROD001', value: 'PROD001' };
              if (colNum === 2) return { text: 'Product 1', value: 'Product 1' };
              if (colNum === 3) return { text: '220', value: 220 }; // Valid number
            }
            return { text: '', value: null };
          }),
        })),
        eachRow: vi.fn((callback) => {
          callback(mockWorksheet.getRow(1), 1);
          callback(mockWorksheet.getRow(2), 2);
          callback(mockWorksheet.getRow(3), 3);
        }),
      };

      (ExcelUtils.parseExcel as any).mockResolvedValue(mockWorksheet);
      mockSupabase.upsert.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.append('file', new File([''], 'test.xlsx'));
      formData.append('categoryId', 'CAT001');

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(true);
    });
  });

  describe('Date Field Validation', () => {
    it('should accept ISO date format (YYYY-MM-DD)', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'CAT001',
          form_schema: [
            {
              key: 'expiry_date',
              label: 'วันหมดอายุ',
              type: 'date',
              scope: 'PRODUCT',
            },
          ],
          units: ['UNIT'],
        },
      });

      const mockWorksheet = {
        rowCount: 3,
        getRow: vi.fn((rowNum) => ({
          eachCell: vi.fn((callback) => {
            if (rowNum === 1) {
              callback({ text: 'SKU' }, 1);
              callback({ text: 'Name' }, 2);
              callback({ text: 'วันหมดอายุ (expiry_date)' }, 3);
            }
          }),
          getCell: vi.fn((colNum) => {
            if (rowNum === 3) {
              if (colNum === 1) return { text: 'PROD001', value: 'PROD001' };
              if (colNum === 2) return { text: 'Product 1', value: 'Product 1' };
              if (colNum === 3) return { text: '2026-12-31', value: '2026-12-31' };
            }
            return { text: '', value: null };
          }),
        })),
        eachRow: vi.fn((callback) => {
          callback(mockWorksheet.getRow(1), 1);
          callback(mockWorksheet.getRow(2), 2);
          callback(mockWorksheet.getRow(3), 3);
        }),
      };

      (ExcelUtils.parseExcel as any).mockResolvedValue(mockWorksheet);
      mockSupabase.upsert.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.append('file', new File([''], 'test.xlsx'));
      formData.append('categoryId', 'CAT001');

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(true);
    });

    it('should accept DD/MM/YYYY date format', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'CAT001',
          form_schema: [
            {
              key: 'expiry_date',
              label: 'วันหมดอายุ',
              type: 'date',
              scope: 'PRODUCT',
            },
          ],
          units: ['UNIT'],
        },
      });

      const mockWorksheet = {
        rowCount: 3,
        getRow: vi.fn((rowNum) => ({
          eachCell: vi.fn((callback) => {
            if (rowNum === 1) {
              callback({ text: 'SKU' }, 1);
              callback({ text: 'Name' }, 2);
              callback({ text: 'วันหมดอายุ (expiry_date)' }, 3);
            }
          }),
          getCell: vi.fn((colNum) => {
            if (rowNum === 3) {
              if (colNum === 1) return { text: 'PROD001', value: 'PROD001' };
              if (colNum === 2) return { text: 'Product 1', value: 'Product 1' };
              if (colNum === 3) return { text: '31/12/2026', value: '31/12/2026' };
            }
            return { text: '', value: null };
          }),
        })),
        eachRow: vi.fn((callback) => {
          callback(mockWorksheet.getRow(1), 1);
          callback(mockWorksheet.getRow(2), 2);
          callback(mockWorksheet.getRow(3), 3);
        }),
      };

      (ExcelUtils.parseExcel as any).mockResolvedValue(mockWorksheet);
      mockSupabase.upsert.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.append('file', new File([''], 'test.xlsx'));
      formData.append('categoryId', 'CAT001');

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'CAT001',
          form_schema: [
            {
              key: 'expiry_date',
              label: 'วันหมดอายุ',
              type: 'date',
              required: true,
              scope: 'PRODUCT',
            },
          ],
          units: ['UNIT'],
        },
      });

      const mockWorksheet = {
        rowCount: 3,
        getRow: vi.fn((rowNum) => ({
          eachCell: vi.fn((callback) => {
            if (rowNum === 1) {
              callback({ text: 'SKU' }, 1);
              callback({ text: 'Name' }, 2);
              callback({ text: 'วันหมดอายุ (expiry_date)' }, 3);
            }
          }),
          getCell: vi.fn((colNum) => {
            if (rowNum === 3) {
              if (colNum === 1) return { text: 'PROD001', value: 'PROD001' };
              if (colNum === 2) return { text: 'Product 1', value: 'Product 1' };
              if (colNum === 3) return { text: '32/13/2026', value: '32/13/2026' }; // Invalid date
            }
            return { text: '', value: null };
          }),
        })),
        eachRow: vi.fn((callback) => {
          callback(mockWorksheet.getRow(1), 1);
          callback(mockWorksheet.getRow(2), 2);
          callback(mockWorksheet.getRow(3), 3);
        }),
      };

      (ExcelUtils.parseExcel as any).mockResolvedValue(mockWorksheet);

      const formData = new FormData();
      formData.append('file', new File([''], 'test.xlsx'));
      formData.append('categoryId', 'CAT001');

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(false);
      expect(result.report?.errors[0]).toContain('วันหมดอายุ');
      expect(result.report?.errors[0]).toContain('วันที่ที่ไม่ถูกต้อง');
    });
  });

  describe('Text Field Validation', () => {
    it('should accept any value for text fields', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'CAT001',
          form_schema: [
            {
              key: 'color',
              label: 'สี',
              type: 'text',
              scope: 'PRODUCT',
            },
          ],
          units: ['UNIT'],
        },
      });

      const mockWorksheet = {
        rowCount: 3,
        getRow: vi.fn((rowNum) => ({
          eachCell: vi.fn((callback) => {
            if (rowNum === 1) {
              callback({ text: 'SKU' }, 1);
              callback({ text: 'Name' }, 2);
              callback({ text: 'สี (color)' }, 3);
            }
          }),
          getCell: vi.fn((colNum) => {
            if (rowNum === 3) {
              if (colNum === 1) return { text: 'PROD001', value: 'PROD001' };
              if (colNum === 2) return { text: 'Product 1', value: 'Product 1' };
              if (colNum === 3) return { text: 'แดง 123 !@#', value: 'แดง 123 !@#' }; // Any text
            }
            return { text: '', value: null };
          }),
        })),
        eachRow: vi.fn((callback) => {
          callback(mockWorksheet.getRow(1), 1);
          callback(mockWorksheet.getRow(2), 2);
          callback(mockWorksheet.getRow(3), 3);
        }),
      };

      (ExcelUtils.parseExcel as any).mockResolvedValue(mockWorksheet);
      mockSupabase.upsert.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.append('file', new File([''], 'test.xlsx'));
      formData.append('categoryId', 'CAT001');

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(true);
    });
  });
});
