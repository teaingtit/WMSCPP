import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a mock Supabase client for testing
 */
export function createMockSupabaseClient(): Partial<SupabaseClient> {
  // Create a chainable query builder that supports multiple method calls
  const createQueryBuilder = (defaultResult: any = { data: null, error: null }) => {
    const builder: any = {};
    
    // Chainable methods that return the builder itself (allowing infinite chaining)
    const chainableMethods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'gt', 'gte', 'lte', 'or', 'not', 'order', 'limit'];
    chainableMethods.forEach(method => {
      builder[method] = vi.fn(function(...args: any[]) {
        return builder; // Always return builder for chaining
      });
    });
    
    // Terminal methods that return promises
    builder.single = vi.fn().mockResolvedValue(defaultResult);
    builder.maybeSingle = vi.fn().mockResolvedValue(defaultResult);
    
    // Make it thenable (Promise-like) - this allows the query to be awaited
    const promise = defaultResult.error 
      ? Promise.reject(defaultResult.error)
      : Promise.resolve(defaultResult);
    
    builder.then = promise.then.bind(promise);
    builder.catch = promise.catch.bind(promise);
    builder.finally = promise.finally?.bind(promise);
    
    return builder;
  };

  const mockFrom = vi.fn(() => createQueryBuilder());

  return {
    from: mockFrom as any,
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    } as any,
    rpc: vi.fn(),
  } as any;
}

/**
 * Creates a mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a mock FormData object
 */
export function createMockFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

/**
 * Mock Next.js navigation functions
 */
export function mockNextNavigation() {
  const pushMock = vi.fn();
  const redirectMock = vi.fn();
  
  vi.mock('next/navigation', () => ({
    redirect: redirectMock,
    revalidatePath: vi.fn(),
  }));

  return { pushMock, redirectMock };
}
