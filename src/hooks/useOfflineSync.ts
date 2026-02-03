'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOfflineStatus } from './useOfflineStatus';
import {
  getPendingOperations,
  removeOperation,
  markOperationFailed,
  getPendingCount,
  isIndexedDBAvailable,
} from '@/lib/offline/db';
import { submitOutbound } from '@/actions/outbound-actions';
import { notify } from '@/lib/ui-helpers';

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  error: string | null;
}

/**
 * Hook to manage offline sync operations
 * Automatically syncs pending operations when coming back online
 */
export function useOfflineSync() {
  const { isOnline, wasOffline } = useOfflineStatus();
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    error: null,
  });

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    if (!isIndexedDBAvailable()) return;

    try {
      const count = await getPendingCount();
      setSyncState((prev) => ({ ...prev, pendingCount: count }));
    } catch (err) {
      console.error('Failed to get pending count:', err);
    }
  }, []);

  // Sync a single operation
  const syncOperation = async (op: any): Promise<boolean> => {
    try {
      switch (op.type) {
        case 'OUTBOUND': {
          const result = await submitOutbound(op.payload);
          return result.success;
        }
        // Add more operation types as needed
        default:
          console.warn(`Unknown operation type: ${op.type}`);
          return false;
      }
    } catch (err: any) {
      console.error('Sync operation failed:', err);
      await markOperationFailed(op.id, err.message);
      return false;
    }
  };

  // Sync all pending operations
  const syncAll = useCallback(async () => {
    if (!isIndexedDBAvailable() || !isOnline) return;

    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const operations = await getPendingOperations();

      if (operations.length === 0) {
        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: new Date(),
        }));
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const op of operations) {
        // Skip operations that have failed too many times
        if (op.retryCount >= 3) {
          failCount++;
          continue;
        }

        const success = await syncOperation(op);
        if (success) {
          await removeOperation(op.id);
          successCount++;
        } else {
          failCount++;
        }
      }

      await updatePendingCount();

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date(),
        error: failCount > 0 ? `${failCount} รายการซิงค์ไม่สำเร็จ` : null,
      }));

      if (successCount > 0) {
        notify.success(`ซิงค์ข้อมูลสำเร็จ ${successCount} รายการ`);
      }
      if (failCount > 0) {
        notify.error(`ซิงค์ไม่สำเร็จ ${failCount} รายการ`);
      }
    } catch (err: any) {
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message,
      }));
    }
  }, [isOnline, updatePendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!wasOffline || !isOnline) return;
    const timer = setTimeout(() => {
      syncAll();
    }, 2000);
    return () => clearTimeout(timer);
  }, [wasOffline, isOnline, syncAll]);

  // Update pending count on mount and periodically
  useEffect(() => {
    updatePendingCount();

    // Poll for changes every 30 seconds
    const interval = setInterval(updatePendingCount, 30000);
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  return {
    ...syncState,
    isOnline,
    syncAll,
    updatePendingCount,
  };
}
