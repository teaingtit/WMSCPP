'use client';

import { useState, useEffect } from 'react';

interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean; // True if recently came back online
}

/**
 * Hook to track online/offline status
 * Provides reactive state for network connectivity
 */
export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial state from navigator
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Set wasOffline flag when coming back online
      setWasOffline(true);
      // Clear the flag after 5 seconds
      setTimeout(() => setWasOffline(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
  };
}

/**
 * Hook for checking connection quality (experimental)
 * Uses Network Information API where available
 */
export function useConnectionQuality() {
  const [quality, setQuality] = useState<'unknown' | 'slow' | 'good' | 'excellent'>('unknown');
  const [effectiveType, setEffectiveType] = useState<string>('unknown');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const connection = (navigator as any).connection;
    if (!connection) {
      setQuality('unknown');
      return;
    }

    const updateQuality = () => {
      const type = connection.effectiveType;
      setEffectiveType(type || 'unknown');

      switch (type) {
        case 'slow-2g':
        case '2g':
          setQuality('slow');
          break;
        case '3g':
          setQuality('good');
          break;
        case '4g':
          setQuality('excellent');
          break;
        default:
          setQuality('unknown');
      }
    };

    updateQuality();
    connection.addEventListener('change', updateQuality);

    return () => {
      connection.removeEventListener('change', updateQuality);
    };
  }, []);

  return { quality, effectiveType };
}
