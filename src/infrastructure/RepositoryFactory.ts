/**
 * Repository Factory - Singleton Pattern
 *
 * @description
 * Factory that creates and returns the appropriate repository implementation
 * based on environment configuration. Uses Singleton pattern to ensure
 * only one instance exists per database provider.
 *
 * @architecture Clean Architecture - Infrastructure Layer (Factory)
 * @pattern Singleton + Factory Pattern
 *
 * @security Server-Side Only - Never import this in Client Components!
 */

import 'server-only'; // Ensures this file throws error if imported on client

import type { IInventoryRepository } from '@/core';
import { SupabaseInventoryRepository } from './repositories/SupabaseInventoryRepository';
import { MSSQLInventoryRepository } from './repositories/MSSQLInventoryRepository';
import { createClient } from '@/lib/supabase/server';

/**
 * Supported database providers
 */
type DBProvider = 'SUPABASE' | 'MSSQL';

/**
 * Repository Factory Configuration
 */
interface FactoryConfig {
  provider: DBProvider;
  forceNew?: boolean; // Force create new instance instead of using singleton
}

/**
 * Singleton Repository Factory
 *
 * @example
 * ```typescript
 * // In Server Action or Server Component
 * import { RepositoryFactory } from '@/infrastructure/RepositoryFactory';
 *
 * export async function getProductsAction() {
 *   const repo = await RepositoryFactory.getInstance();
 *   const products = await repo.getProducts();
 *   return { success: true, data: products };
 * }
 * ```
 */
export class RepositoryFactory {
  private static supabaseInstance: IInventoryRepository | null = null;
  private static mssqlInstance: IInventoryRepository | null = null;

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    throw new Error(
      'RepositoryFactory cannot be instantiated. Use RepositoryFactory.getInstance() instead.',
    );
  }

  /**
   * Get the current database provider from environment variables
   *
   * @returns DBProvider - defaults to 'SUPABASE' if not set
   */
  private static getProvider(): DBProvider {
    const provider = process.env['DB_PROVIDER'] as DBProvider;

    if (!provider) {
      console.warn('[RepositoryFactory] DB_PROVIDER not set, defaulting to SUPABASE');
      return 'SUPABASE';
    }

    if (provider !== 'SUPABASE' && provider !== 'MSSQL') {
      console.error(
        `[RepositoryFactory] Invalid DB_PROVIDER: ${provider}. Must be 'SUPABASE' or 'MSSQL'. Defaulting to SUPABASE.`,
      );
      return 'SUPABASE';
    }

    return provider;
  }

  /**
   * Get or create Supabase repository instance
   *
   * @returns Promise<IInventoryRepository>
   */
  private static async createSupabaseRepository(): Promise<IInventoryRepository> {
    if (!this.supabaseInstance) {
      const supabase = await createClient();
      this.supabaseInstance = new SupabaseInventoryRepository(supabase);
      console.log('[RepositoryFactory] Created new Supabase repository instance');
    }
    return this.supabaseInstance;
  }

  /**
   * Get or create MSSQL repository instance
   *
   * @returns IInventoryRepository
   */
  private static createMSSQLRepository(): IInventoryRepository {
    if (!this.mssqlInstance) {
      this.mssqlInstance = new MSSQLInventoryRepository();
      console.log('[RepositoryFactory] Created new MSSQL repository instance');
    }
    return this.mssqlInstance;
  }

  /**
   * Get repository instance based on configuration
   *
   * @param config - Optional factory configuration
   * @returns Promise<IInventoryRepository>
   *
   * @example
   * ```typescript
   * // Use default provider from env
   * const repo = await RepositoryFactory.getInstance();
   *
   * // Force specific provider
   * const supabaseRepo = await RepositoryFactory.getInstance({ provider: 'SUPABASE' });
   *
   * // Force new instance (bypass singleton)
   * const freshRepo = await RepositoryFactory.getInstance({ forceNew: true });
   * ```
   */
  static async getInstance(config?: FactoryConfig): Promise<IInventoryRepository> {
    const provider = config?.provider ?? this.getProvider();

    // Force new instance (bypass singleton cache)
    if (config?.forceNew) {
      console.log(
        `[RepositoryFactory] Creating fresh ${provider} repository instance (forceNew=true)`,
      );

      if (provider === 'MSSQL') {
        return new MSSQLInventoryRepository();
      }

      const supabase = await createClient();
      return new SupabaseInventoryRepository(supabase);
    }

    // Return singleton instance
    if (provider === 'MSSQL') {
      return this.createMSSQLRepository();
    }

    return this.createSupabaseRepository();
  }

  /**
   * Get repository instance by explicit provider name
   * Useful for multi-database scenarios where you need both
   *
   * @param provider - Database provider to use
   * @returns Promise<IInventoryRepository>
   *
   * @example
   * ```typescript
   * // Get Supabase repo
   * const supabaseRepo = await RepositoryFactory.getRepository('SUPABASE');
   *
   * // Get MSSQL repo
   * const mssqlRepo = await RepositoryFactory.getRepository('MSSQL');
   *
   * // Use both in same action (e.g., sync data)
   * const erpData = await mssqlRepo.getProducts();
   * await supabaseRepo.syncProducts(erpData);
   * ```
   */
  static async getRepository(provider: DBProvider): Promise<IInventoryRepository> {
    return this.getInstance({ provider });
  }

  /**
   * Reset singleton instances (useful for testing)
   *
   * @internal
   */
  static reset(): void {
    this.supabaseInstance = null;
    this.mssqlInstance = null;
    console.log('[RepositoryFactory] Singleton instances reset');
  }

  /**
   * Get current provider name (for debugging)
   *
   * @returns DBProvider
   */
  static getCurrentProvider(): DBProvider {
    return this.getProvider();
  }
}
