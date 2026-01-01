'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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

export default function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ✅ Auto Stop: เมื่อเปลี่ยนหน้าเสร็จแล้ว ให้ปิด Loading อัตโนมัติ (กันค้าง)
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  return (
    <GlobalLoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {isLoading && <LoadingOverlay />}
      {children}
    </GlobalLoadingContext.Provider>
  );
}