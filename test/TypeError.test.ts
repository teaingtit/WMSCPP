import { describe, it, expect } from 'vitest';
import { validateFormData, extractFormFields } from '../src/lib/action-utils';
import { z } from 'zod';

describe('TypeError handling', () => {
  describe('validateFormData', () => {
    const TestSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
      email: z.string().email(),
    });

    it('should handle TypeError when schema is not a Zod schema', () => {
      expect(() => {
        validateFormData(null as any, { name: 'test', age: 25, email: 'test@test.com' });
      }).toThrow();
    });

    it('should handle TypeError when rawData is null', () => {
      const result = validateFormData(TestSchema, null as any);
      expect(result.success).toBe(false);
      expect(result.response.message).toBeDefined();
    });

    it('should handle TypeError when rawData is undefined', () => {
      const result = validateFormData(TestSchema, undefined as any);
      expect(result.success).toBe(false);
      expect(result.response.message).toBeDefined();
    });

    it('should handle TypeError when rawData is not an object', () => {
      const result = validateFormData(TestSchema, 'not an object' as any);
      expect(result.success).toBe(false);
      expect(result.response.message).toBeDefined();
    });

    it('should handle TypeError when rawData contains wrong types', () => {
      const result = validateFormData(TestSchema, {
        name: 123, // should be string
        age: 'not a number', // should be number
        email: 'invalid-email', // should be valid email
      });
      expect(result.success).toBe(false);
      expect(result.response.errors).toBeDefined();
    });

    it('should handle TypeError when accessing properties on null/undefined', () => {
      const invalidData = {
        name: null,
        age: undefined,
        email: null,
      };
      const result = validateFormData(TestSchema, invalidData as any);
      expect(result.success).toBe(false);
      expect(result.response.errors).toBeDefined();
    });
  });

  describe('extractFormFields', () => {
    it('should handle TypeError when formData is null', () => {
      expect(() => {
        extractFormFields(null as any, ['field1', 'field2']);
      }).toThrow();
    });

    it('should handle TypeError when formData is undefined', () => {
      expect(() => {
        extractFormFields(undefined as any, ['field1', 'field2']);
      }).toThrow();
    });

    it('should handle TypeError when fields is not an array', () => {
      const formData = new FormData();
      formData.append('field1', 'value1');
      
      expect(() => {
        extractFormFields(formData, null as any);
      }).toThrow();
    });

    it('should handle TypeError when fields contains non-string values', () => {
      const formData = new FormData();
      formData.append('field1', 'value1');
      
      // TypeScript allows this with 'as any', but runtime behavior may vary
      // The function should still work, just with type coercion
      const result = extractFormFields(formData, [123, 'field2'] as any);
      expect(result).toBeDefined();
      // The number 123 will be coerced to string '123' as a key
      expect(result['123']).toBeDefined();
    });
  });

  describe('TypeError in type coercion', () => {
    it('should handle TypeError when trying to call method on null', () => {
      const obj: any = null;
      expect(() => {
        obj.someMethod();
      }).toThrow(TypeError);
    });

    it('should handle TypeError when trying to call method on undefined', () => {
      const obj: any = undefined;
      expect(() => {
        obj.someMethod();
      }).toThrow(TypeError);
    });

    it('should handle TypeError when accessing property on null', () => {
      const obj: any = null;
      // In strict mode, accessing properties on null throws TypeError
      expect(() => {
        const value = obj.property;
      }).toThrow(TypeError);
      
      // Calling a method on the result would also throw
      expect(() => {
        obj.property.toString();
      }).toThrow(TypeError);
    });

    it('should handle TypeError when trying to read property of undefined', () => {
      const obj: any = undefined;
      // In strict mode, accessing properties on undefined throws TypeError
      expect(() => {
        const value = obj.property;
      }).toThrow(TypeError);
      
      // Calling a method on the result would also throw
      expect(() => {
        obj.property.toString();
      }).toThrow(TypeError);
    });
  });

  describe('TypeError in array operations', () => {
    it('should handle TypeError when calling array method on non-array', () => {
      const notAnArray: any = 'not an array';
      expect(() => {
        notAnArray.map((x: any) => x);
      }).toThrow(TypeError);
    });

    it('should handle TypeError when calling array method on null', () => {
      const arr: any = null;
      expect(() => {
        arr.map((x: any) => x);
      }).toThrow(TypeError);
    });

    it('should handle TypeError when calling array method on undefined', () => {
      const arr: any = undefined;
      expect(() => {
        arr.map((x: any) => x);
      }).toThrow(TypeError);
    });
  });

  describe('TypeError in function calls', () => {
    it('should handle TypeError when calling non-function as function', () => {
      const notAFunction: any = 'not a function';
      expect(() => {
        notAFunction();
      }).toThrow(TypeError);
    });

    it('should handle TypeError when calling null as function', () => {
      const fn: any = null;
      expect(() => {
        fn();
      }).toThrow(TypeError);
    });

    it('should handle TypeError when calling undefined as function', () => {
      const fn: any = undefined;
      expect(() => {
        fn();
      }).toThrow(TypeError);
    });
  });

  describe('TypeError in object operations', () => {
    it('should handle TypeError when using Object.keys on null', () => {
      expect(() => {
        Object.keys(null as any);
      }).toThrow(TypeError);
    });

    it('should handle TypeError when using Object.keys on undefined', () => {
      expect(() => {
        Object.keys(undefined as any);
      }).toThrow(TypeError);
    });

    it('should handle TypeError when using Object.getOwnPropertyNames on null', () => {
      // Object.getOwnPropertyNames throws TypeError on null/undefined
      expect(() => {
        Object.getOwnPropertyNames(null as any);
      }).toThrow(TypeError);
    });
  });

  describe('TypeError in string operations', () => {
    it('should handle TypeError when calling string method on null', () => {
      const str: any = null;
      expect(() => {
        str.toUpperCase();
      }).toThrow(TypeError);
    });

    it('should handle TypeError when calling string method on undefined', () => {
      const str: any = undefined;
      expect(() => {
        str.toLowerCase();
      }).toThrow(TypeError);
    });

    it('should handle TypeError when calling string method on number', () => {
      const num: any = 123;
      // This actually works because numbers have toString, but let's test a string-specific method
      expect(() => {
        num.match(/test/);
      }).toThrow(TypeError);
    });
  });
});
