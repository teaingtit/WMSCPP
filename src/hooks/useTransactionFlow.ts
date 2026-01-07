'use client';

import { useCallback, useState } from 'react';
import useSuccessReceipt from '@/hooks/useSuccessReceipt';

type ExecutorResult = {
  success: boolean;
  data?: any;
  message?: string;
  details?: any;
  redirect?: boolean;
};

// executor may accept arbitrary args and should return ExecutorResult
export default function useTransactionFlow<T extends any[] = any[]>(
  executor: (...args: T) => Promise<ExecutorResult>,
  getRedirectPath?: (info: { data?: any; redirect?: boolean } | null) => string | undefined,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { successInfo, setSuccessInfo, handleSuccessModalClose } =
    useSuccessReceipt(getRedirectPath);

  const openConfirm = useCallback(() => setIsOpen(true), []);
  const closeConfirm = useCallback(() => setIsOpen(false), []);

  const execute = useCallback(
    async (...args: T) => {
      setIsLoading(true);
      setIsOpen(false);
      try {
        const res = await executor(...args);
        if (res.success) {
          setSuccessInfo({
            data: res.data || { title: res.message || 'Success', details: res.details },
            redirect: !!res.redirect,
          });
        }
        return res;
      } finally {
        setIsLoading(false);
      }
    },
    [executor, setSuccessInfo],
  );

  return {
    isOpen,
    isLoading,
    openConfirm,
    closeConfirm,
    execute,
    successInfo,
    handleSuccessModalClose,
  } as const;
}
