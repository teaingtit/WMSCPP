/**
 * Core Module - Master Barrel Export
 *
 * @description
 * Central export point for all core domain entities and interfaces.
 * This layer is completely independent of frameworks and external libraries.
 *
 * @architecture Clean Architecture - Core Layer
 *
 * @principles
 * - Dependencies flow INWARD (Infrastructure -> Core, NEVER Core -> Infrastructure)
 * - No imports from: Supabase, MSSQL, Next.js, React, or any framework
 * - Pure TypeScript types and interfaces only
 *
 * @usage
 * ```typescript
 * // ✅ CORRECT: Infrastructure imports from Core
 * import { IInventoryRepository, Product } from '@/core';
 *
 * class SupabaseInventoryRepository implements IInventoryRepository {
 *   // Implementation uses Supabase
 * }
 *
 * // ❌ WRONG: Core should NEVER import from Infrastructure
 * // import { createClient } from '@supabase/ssr'; // NOT ALLOWED IN CORE!
 * ```
 */

// Entities (Domain Models)
export * from './entities';

// Interfaces (Ports)
export * from './interfaces';
