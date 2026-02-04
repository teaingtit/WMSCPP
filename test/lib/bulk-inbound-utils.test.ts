/**
 * Unit tests for bulk-inbound-utils (pure functions).
 * No React, no mocks — fast and deterministic.
 */

import { describe, it, expect } from 'vitest';
import {
  buildInboundFormData,
  mapImportResultToReport,
  canDownload,
  canUpload,
} from '@/components/inbound/bulk-inbound-utils';

describe('bulk-inbound-utils', () => {
  describe('buildInboundFormData', () => {
    it('builds FormData with all required fields', () => {
      const file = new File(['x'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = buildInboundFormData('wh-1', 'cat-1', 'user-1', file);

      expect(formData.get('warehouseId')).toBe('wh-1');
      expect(formData.get('categoryId')).toBe('cat-1');
      expect(formData.get('userId')).toBe('user-1');
      expect(formData.get('file')).toBe(file);
    });
  });

  describe('mapImportResultToReport', () => {
    it('maps success result to report with zero failed', () => {
      const result = {
        success: true,
        report: { total: 10, success: 10, failed: 0, errors: [] },
      };
      const report = mapImportResultToReport(result);

      expect(report).toEqual({ total: 10, failed: 0, errors: [] });
    });

    it('maps failure result to report with errors', () => {
      const result = {
        success: false,
        message: 'Validation failed',
        report: {
          total: 5,
          success: 3,
          failed: 2,
          errors: ['Row 2: SKU duplicate', 'Row 4: Invalid qty'],
        },
      };
      const report = mapImportResultToReport(result);

      expect(report.total).toBe(5);
      expect(report.failed).toBe(2);
      expect(report.errors).toEqual(['Row 2: SKU duplicate', 'Row 4: Invalid qty']);
    });

    it('handles missing report with success false', () => {
      const report = mapImportResultToReport({ success: false, message: 'Server error' });

      expect(report).toEqual({ total: 0, failed: 1, errors: ['Server error'] });
    });

    it('uses Unknown error when message and report.errors missing', () => {
      const report = mapImportResultToReport({ success: false });

      expect(report.errors).toEqual(['Unknown error']);
    });
  });

  describe('canDownload', () => {
    it('returns true when category is non-empty', () => {
      expect(canDownload('cat-1')).toBe(true);
      expect(canDownload('  x  ')).toBe(true);
    });

    it('returns false when category is empty', () => {
      expect(canDownload('')).toBe(false);
      expect(canDownload('   ')).toBe(false);
    });
  });

  describe('canUpload', () => {
    it('returns true when category and file are present', () => {
      const file = new File([], 'a.xlsx');
      expect(canUpload('cat-1', file)).toBe(true);
    });

    it('returns false when category is empty', () => {
      expect(canUpload('', new File([], 'a.xlsx'))).toBe(false);
    });

    it('returns false when file is null', () => {
      expect(canUpload('cat-1', null)).toBe(false);
    });
  });
});
