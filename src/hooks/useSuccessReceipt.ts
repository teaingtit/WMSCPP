'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SuccessData } from '@/components/shared/SuccessReceiptModal';

type SuccessInfo = { data: SuccessData; redirect: boolean } | null;

// getRedirectPath: optional function to derive a redirect path from SuccessInfo
export default function useSuccessReceipt(
  getRedirectPath?: (info: SuccessInfo) => string | undefined,
) {
  const router = useRouter();
  const [successInfo, setSuccessInfo] = useState<SuccessInfo>(null);

  const handleSuccessModalClose = () => {
    if (!successInfo) return;
    try {
      const path = getRedirectPath ? getRedirectPath(successInfo) : undefined;
      if (path) router.push(path);
      else router.refresh();
    } finally {
      setSuccessInfo(null);
    }
  };

  return { successInfo, setSuccessInfo, handleSuccessModalClose } as const;
}
