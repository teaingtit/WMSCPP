'use client';

import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { WifiOff, RefreshCw, CloudOff, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Offline status indicator that shows in the header/nav
 * Displays connection status and pending sync operations
 */
export default function OfflineIndicator() {
  const { isOnline, isOffline, wasOffline } = useOfflineStatus();
  const { pendingCount, isSyncing, syncAll } = useOfflineSync();

  // Don't show anything if online with no pending operations
  if (isOnline && pendingCount === 0 && !wasOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 tablet:bottom-4 left-4 right-4 tablet:left-auto tablet:right-4 tablet:w-auto z-50',
        'transition-all duration-300 animate-slide-up',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm',
          isOffline
            ? 'bg-amber-500/90 dark:bg-amber-600/90 border-amber-400 text-white'
            : wasOffline
            ? 'bg-success/90 border-success/50 text-white'
            : 'bg-card/95 border-border',
        )}
      >
        {/* Status Icon */}
        <div
          className={cn(
            'p-2 rounded-lg',
            isOffline ? 'bg-white/20' : wasOffline ? 'bg-white/20' : 'bg-muted',
          )}
        >
          {isOffline ? (
            <WifiOff size={18} />
          ) : wasOffline ? (
            <Check size={18} />
          ) : (
            <CloudOff size={18} className="text-muted-foreground" />
          )}
        </div>

        {/* Status Text */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">
            {isOffline
              ? 'ออฟไลน์'
              : wasOffline
              ? 'กลับมาออนไลน์แล้ว'
              : `${pendingCount} รายการรอซิงค์`}
          </div>
          {isOffline && (
            <div className="text-xs opacity-80">รายการที่บันทึกจะถูกซิงค์เมื่อกลับมาออนไลน์</div>
          )}
          {pendingCount > 0 && !isOffline && (
            <div className="text-xs text-muted-foreground">
              {isSyncing ? 'กำลังซิงค์...' : 'คลิกเพื่อซิงค์ตอนนี้'}
            </div>
          )}
        </div>

        {/* Sync Button */}
        {pendingCount > 0 && isOnline && (
          <button
            onClick={syncAll}
            disabled={isSyncing}
            className={cn(
              'p-2 rounded-lg transition-all',
              'hover:bg-primary/10 active:scale-95',
              isSyncing && 'animate-spin',
            )}
            title="ซิงค์ข้อมูล"
          >
            <RefreshCw size={18} />
          </button>
        )}

        {/* Pending Badge */}
        {pendingCount > 0 && (
          <div
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-bold',
              isOffline ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary',
            )}
          >
            {pendingCount}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact offline indicator for the header
 */
export function OfflineIndicatorCompact() {
  const { isOffline } = useOfflineStatus();
  const { pendingCount } = useOfflineSync();

  if (!isOffline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
        isOffline
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'bg-primary/10 text-primary',
      )}
    >
      {isOffline ? (
        <>
          <WifiOff size={14} />
          <span>ออฟไลน์</span>
        </>
      ) : (
        <>
          <CloudOff size={14} />
          <span>{pendingCount}</span>
        </>
      )}
    </div>
  );
}
