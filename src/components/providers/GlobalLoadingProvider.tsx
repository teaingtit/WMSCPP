'use client';

import React, { createContext, useContext, useState, useEffect, useRef, Suspense } from 'react';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import { usePathname, useSearchParams } from 'next/navigation';

interface GlobalLoadingContextType {
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export function useGlobalLoading() {
  const context = useContext(GlobalLoadingContext);
  if (!context) throw new Error('useGlobalLoading must be used within GlobalLoadingProvider');
  return context;
}

// Single component using usePathname/useSearchParams so one Suspense boundary is enough.
// Renders nothing; keeps loading logic and nav-click trigger. Placed after children to avoid hydration mismatch.
function LoadingRouterHandler({ setIsLoading }: { setIsLoading: (v: boolean) => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setIsLoadingRef = useRef(setIsLoading);
  setIsLoadingRef.current = setIsLoading;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Turn off overlay when route/search change
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams, setIsLoading]);

  // Show overlay on in-app link click (same-origin, not current page)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!target || !document.body.contains(target)) return;
      const anchor = (target as HTMLElement).closest?.('a[href]');
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      )
        return;
      if (!href.startsWith('/') && typeof window !== 'undefined') {
        try {
          if (new URL(href, window.location.origin).origin !== window.location.origin) return;
        } catch {
          return;
        }
      }
      const nextPath = href.startsWith('/') ? href : new URL(href, window.location.origin).pathname;
      if (nextPath === pathnameRef.current) return;
      setIsLoadingRef.current(true);
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}

const GLOBAL_LOADING_MESSAGE = 'กำลังโหลดข้อมูล...';

export default function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <GlobalLoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {isLoading && <LoadingOverlay message={GLOBAL_LOADING_MESSAGE} />}
      {children}
      <Suspense fallback={null}>
        <LoadingRouterHandler setIsLoading={setIsLoading} />
      </Suspense>
    </GlobalLoadingContext.Provider>
  );
}
