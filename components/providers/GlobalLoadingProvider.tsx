'use client';

import React, { createContext, useContext, useState, useEffect, Suspense } from 'react';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import { usePathname, useSearchParams } from 'next/navigation';
import { Toaster } from 'sonner';

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

// แยก Logic การเช็ค Pathname/SearchParams ออกมาเพื่อ Wrap Suspense
function RouteChangeHandler({ setIsLoading }: { setIsLoading: (v: boolean) => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ✅ Auto Stop: เมื่อเปลี่ยนหน้าเสร็จแล้ว ให้ปิด Loading อัตโนมัติ (กันค้าง)
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams, setIsLoading]);

  return null;
}

export default function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <GlobalLoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {/* Global Toaster: รองรับการแจ้งเตือนจาก Server Actions / Database */}
      <Toaster position="top-center" richColors closeButton theme="light" />
      
      {isLoading && <LoadingOverlay />}
      
      {/* Wrap useSearchParams in Suspense to avoid de-opting static generation */}
      <Suspense fallback={null}>
        <RouteChangeHandler setIsLoading={setIsLoading} />
      </Suspense>
      
      {children}
    </GlobalLoadingContext.Provider>
  );
}