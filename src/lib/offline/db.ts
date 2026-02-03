/**
 * Offline Database using IndexedDB
 * Provides local storage for offline capabilities
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema definition
interface WMSOfflineDB extends DBSchema {
  // Cached inventory data
  inventory: {
    key: string; // stock id
    value: {
      id: string;
      warehouseId: string;
      productId: string;
      productName: string;
      productSku: string;
      locationCode: string;
      quantity: number;
      uom: string;
      attributes: Record<string, any>;
      cachedAt: number; // timestamp
    };
    indexes: {
      'by-warehouse': string;
      'by-cached': number;
    };
  };

  // Pending operations (queued when offline)
  pendingOperations: {
    key: string; // operation id
    value: {
      id: string;
      type: 'OUTBOUND' | 'TRANSFER' | 'ADJUST';
      payload: any;
      createdAt: number;
      retryCount: number;
      lastError?: string;
    };
    indexes: {
      'by-type': string;
      'by-created': number;
    };
  };

  // Sync metadata
  syncMeta: {
    key: string;
    value: {
      key: string;
      lastSyncedAt: number;
      status: 'idle' | 'syncing' | 'error';
      errorMessage?: string;
    };
  };
}

const DB_NAME = 'wms-offline-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<WMSOfflineDB>> | null = null;

/**
 * Get or create the IndexedDB database
 */
export async function getDB(): Promise<IDBPDatabase<WMSOfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<WMSOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Inventory store
        if (!db.objectStoreNames.contains('inventory')) {
          const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' });
          inventoryStore.createIndex('by-warehouse', 'warehouseId');
          inventoryStore.createIndex('by-cached', 'cachedAt');
        }

        // Pending operations store
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const opsStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
          opsStore.createIndex('by-type', 'type');
          opsStore.createIndex('by-created', 'createdAt');
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains('syncMeta')) {
          db.createObjectStore('syncMeta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// ==========================================
// Inventory Cache Operations
// ==========================================

/**
 * Cache inventory items for offline access
 */
export async function cacheInventory(
  warehouseId: string,
  items: Array<{
    id: string;
    products: { id: string; name: string; sku: string; uom: string };
    locations: { code: string };
    quantity: number;
    attributes?: Record<string, any>;
  }>,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('inventory', 'readwrite');
  const now = Date.now();

  await Promise.all(
    items.map((item) =>
      tx.store.put({
        id: item.id,
        warehouseId,
        productId: item.products.id,
        productName: item.products.name,
        productSku: item.products.sku,
        locationCode: item.locations.code,
        quantity: item.quantity,
        uom: item.products.uom,
        attributes: item.attributes || {},
        cachedAt: now,
      }),
    ),
  );

  await tx.done;

  // Update sync metadata
  await updateSyncMeta(`inventory:${warehouseId}`, 'idle');
}

/**
 * Get cached inventory for a warehouse
 */
export async function getCachedInventory(warehouseId: string) {
  const db = await getDB();
  return db.getAllFromIndex('inventory', 'by-warehouse', warehouseId);
}

/**
 * Clear old cached inventory (older than specified hours)
 */
export async function clearOldCache(maxAgeHours = 24): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('inventory', 'readwrite');
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;

  let deleted = 0;
  const index = tx.store.index('by-cached');

  let cursor = await index.openCursor();
  while (cursor) {
    if (cursor.value.cachedAt < cutoff) {
      await cursor.delete();
      deleted++;
    }
    cursor = await cursor.continue();
  }

  await tx.done;
  return deleted;
}

// ==========================================
// Pending Operations (Offline Queue)
// ==========================================

/**
 * Add an operation to the offline queue
 */
export async function queueOperation(
  type: 'OUTBOUND' | 'TRANSFER' | 'ADJUST',
  payload: any,
): Promise<string> {
  const db = await getDB();
  const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.add('pendingOperations', {
    id,
    type,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
  });

  return id;
}

/**
 * Get all pending operations
 */
export async function getPendingOperations() {
  const db = await getDB();
  return db.getAllFromIndex('pendingOperations', 'by-created');
}

/**
 * Get pending operation count
 */
export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count('pendingOperations');
}

/**
 * Remove a completed operation from the queue
 */
export async function removeOperation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingOperations', id);
}

/**
 * Update operation after failed retry
 */
export async function markOperationFailed(id: string, error: string): Promise<void> {
  const db = await getDB();
  const op = await db.get('pendingOperations', id);
  if (op) {
    await db.put('pendingOperations', {
      ...op,
      retryCount: op.retryCount + 1,
      lastError: error,
    });
  }
}

/**
 * Clear all pending operations (use with caution)
 */
export async function clearPendingOperations(): Promise<void> {
  const db = await getDB();
  await db.clear('pendingOperations');
}

// ==========================================
// Sync Metadata
// ==========================================

/**
 * Update sync metadata
 */
export async function updateSyncMeta(
  key: string,
  status: 'idle' | 'syncing' | 'error',
  errorMessage?: string,
): Promise<void> {
  const db = await getDB();
  const record: {
    key: string;
    lastSyncedAt: number;
    status: 'idle' | 'syncing' | 'error';
    errorMessage?: string;
  } = {
    key,
    lastSyncedAt:
      status === 'idle' ? Date.now() : (await db.get('syncMeta', key))?.lastSyncedAt || 0,
    status,
  };
  if (errorMessage !== undefined) record.errorMessage = errorMessage;
  await db.put('syncMeta', record);
}

/**
 * Get sync metadata
 */
export async function getSyncMeta(key: string) {
  const db = await getDB();
  return db.get('syncMeta', key);
}

/**
 * Check if database is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}
