'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 * Registers the PWA service worker on mount
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[PWA] Service worker registered:', registration.scope);

        // Check for updates on page load
        registration.update();

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              console.log('[PWA] New version available');
              // Optionally show update prompt to user
            }
          });
        });
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    // Delay registration until page is loaded
    if (document.readyState === 'complete') {
      registerSW();
      return;
    }
    window.addEventListener('load', registerSW);
    return () => window.removeEventListener('load', registerSW);
  }, []);

  // Listen for messages from service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'SYNC_REQUESTED') {
        // Trigger sync from the app
        window.dispatchEvent(new CustomEvent('sw-sync-requested'));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  return null;
}
