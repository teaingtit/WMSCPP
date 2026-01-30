/**
 * Test Mocking Utilities - Main Export
 *
 * Import mocks from this file:
 * ```ts
 * import { createMockSupabaseClient, mockFactories } from '../mocks';
 * ```
 */

// Database mocking
export {
  // Classes
  MockDatabase,
  // Query builders
  createMockQueryBuilder,
  createConfigurableQueryBuilder,
  // Supabase client
  createMockSupabaseClient,
  // Factories
  mockFactories,
  mockErrors,
  // Helpers
  successResult,
  errorResult,
  createTableMock,
  // Types
  type MockQueryResult,
  type MockDatabaseError,
  type MockTableData,
  type MockSupabaseConfig,
} from './database';

// Re-export from test-helpers for convenience
export { createMockFormData, createMockUser } from '../utils/test-helpers';
