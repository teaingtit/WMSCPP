/**
 * Unit Tests for Error Sanitizer
 *
 * @description
 * Tests for error message sanitization to prevent sensitive data exposure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeError,
  sanitizedFail,
  getErrorMessage,
  isErrorCode,
  isDuplicateError,
  isForeignKeyError,
  isNotNullError,
} from '@/lib/error-sanitizer';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('Error Sanitizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeError', () => {
    describe('Known Error Patterns', () => {
      it('should map connection refused to user-friendly message', () => {
        const error = new Error('ECONNREFUSED: Connection refused');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBe('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      });

      it('should map timeout errors', () => {
        const error = new Error('ETIMEDOUT: Request timed out');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBe('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง');
      });

      it('should map duplicate key errors (23505)', () => {
        const error = { code: '23505', message: 'duplicate key value violates unique constraint' };
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBe('ข้อมูลนี้มีอยู่ในระบบแล้ว');
      });

      it('should map foreign key errors (23503)', () => {
        const error = { code: '23503', message: 'violates foreign key constraint' };
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBe('ไม่สามารถดำเนินการได้เนื่องจากมีข้อมูลที่เกี่ยวข้อง');
      });

      it('should map not null errors (23502)', () => {
        const error = { code: '23502', message: 'null value in column' };
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBe('กรุณากรอกข้อมูลให้ครบถ้วน');
      });

      it('should map rate limit errors', () => {
        const error = new Error('rate limit exceeded');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBe('คำขอถูกจำกัด กรุณารออีกสักครู่แล้วลองใหม่');
      });

      it('should map insufficient stock errors', () => {
        const error = new Error('Insufficient stock. Current: 10');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBe('สินค้าคงคลังไม่เพียงพอ');
      });

      it('should map race condition errors', () => {
        const error = new Error('Race Condition detected: Stock has changed');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBe('ข้อมูลถูกเปลี่ยนแปลงโดยผู้อื่น กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง');
      });
    });

    describe('Sensitive Data Stripping', () => {
      it('should redact stack traces', () => {
        const error = new Error('Error at SomeFunction (/app/src/file.ts:123:45)');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).not.toContain('/app/src/file.ts');
        expect(result).not.toContain('123:45');
      });

      it('should redact file paths', () => {
        const error = new Error('Failed at /Users/dev/project/src/service.ts:50');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).not.toContain('/Users/dev');
        expect(result).not.toContain('service.ts');
      });

      it('should redact column names', () => {
        const error = new Error('null value in column "password_hash" violates constraint');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).not.toContain('password_hash');
      });

      it('should redact table names', () => {
        const error = new Error('relation table "user_secrets" does not exist');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).not.toContain('user_secrets');
      });

      it('should redact IP addresses', () => {
        const error = new Error('Connection failed to 192.168.1.100');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).not.toContain('192.168.1.100');
      });

      it('should redact connection strings', () => {
        const error = new Error('Failed: postgresql://user:pass@host:5432/db');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).not.toContain('postgresql://');
        expect(result).not.toContain('user:pass');
      });

      it('should redact environment variable prefixes', () => {
        const error = new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).not.toContain('SUPABASE_');
      });
    });

    describe('Generic Fallback', () => {
      it('should return generic message for heavily redacted errors', () => {
        const error = new Error('Error in column "secret" of table "users" at /app/src/db.ts:10');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBe(
          'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่กรุณาติดต่อผู้ดูแลระบบ',
        );
      });

      it('should return generic message for technical errors', () => {
        const error = new Error('TypeError: undefined is not a function');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBe(
          'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่กรุณาติดต่อผู้ดูแลระบบ',
        );
      });

      it('should return generic message for very long errors', () => {
        const longError = 'A'.repeat(250);
        const result = sanitizeError(new Error(longError), {
          logOriginal: false,
          reportToSentry: false,
        });

        expect(result).toBe(
          'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่กรุณาติดต่อผู้ดูแลระบบ',
        );
      });
    });

    describe('Input Types', () => {
      it('should handle Error objects', () => {
        const error = new Error('Test error');
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBeTruthy();
      });

      it('should handle string errors', () => {
        const result = sanitizeError('not found', { logOriginal: false, reportToSentry: false });

        expect(result).toBe('ไม่พบข้อมูลที่ต้องการ');
      });

      it('should handle object errors with message', () => {
        const error = { message: 'rate limit exceeded', code: 429 };
        const result = sanitizeError(error, { logOriginal: false, reportToSentry: false });

        expect(result).toBe('คำขอถูกจำกัด กรุณารออีกสักครู่แล้วลองใหม่');
      });

      it('should handle null/undefined', () => {
        const result1 = sanitizeError(null, { logOriginal: false, reportToSentry: false });
        const result2 = sanitizeError(undefined, { logOriginal: false, reportToSentry: false });

        expect(result1).toBeTruthy();
        expect(result2).toBeTruthy();
      });
    });
  });

  describe('sanitizedFail', () => {
    it('should return fail response with sanitized message', () => {
      const result = sanitizedFail(new Error('ECONNREFUSED'), {
        logOriginal: false,
        reportToSentry: false,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error object', () => {
      expect(getErrorMessage(new Error('Test'))).toBe('Test');
    });

    it('should return string as-is', () => {
      expect(getErrorMessage('Direct string')).toBe('Direct string');
    });

    it('should extract message from object', () => {
      expect(getErrorMessage({ message: 'Object message' })).toBe('Object message');
    });

    it('should return fallback for unknown types', () => {
      expect(getErrorMessage(12345)).toBe('Unknown error');
      expect(getErrorMessage(null)).toBe('Unknown error');
    });
  });

  describe('Error Code Helpers', () => {
    describe('isErrorCode', () => {
      it('should match error code', () => {
        expect(isErrorCode({ code: '23505' }, '23505')).toBe(true);
        expect(isErrorCode({ code: '23503' }, '23505')).toBe(false);
      });

      it('should handle non-object errors', () => {
        expect(isErrorCode('error', '23505')).toBe(false);
        expect(isErrorCode(null, '23505')).toBe(false);
      });
    });

    describe('isDuplicateError', () => {
      it('should identify duplicate key errors', () => {
        expect(isDuplicateError({ code: '23505' })).toBe(true);
        expect(isDuplicateError({ code: '23503' })).toBe(false);
      });
    });

    describe('isForeignKeyError', () => {
      it('should identify foreign key errors', () => {
        expect(isForeignKeyError({ code: '23503' })).toBe(true);
        expect(isForeignKeyError({ code: '23505' })).toBe(false);
      });
    });

    describe('isNotNullError', () => {
      it('should identify not null errors', () => {
        expect(isNotNullError({ code: '23502' })).toBe(true);
        expect(isNotNullError({ code: '23505' })).toBe(false);
      });
    });
  });
});
