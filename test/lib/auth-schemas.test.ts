// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { loginSchema } from '@/lib/validations/auth-schemas';

describe('auth-schemas', () => {
  describe('loginSchema', () => {
    it('should parse valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@wms.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@wms.com');
        expect(result.data.password).toBe('password123');
      }
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 6', () => {
      const result = loginSchema.safeParse({
        email: 'user@wms.com',
        password: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'user@wms.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
