'use client';

import { useRouter as useNextRouter } from 'next/navigation';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';

export function useTransitionRouter() {
  const router = useNextRouter();
  const { setIsLoading } = useGlobalLoading();

  const push = (href: string) => {
    setIsLoading(true);
    router.push(href);
  };

  const replace = (href: string) => {
    setIsLoading(true);
    router.replace(href);
  };

  const back = () => {
    setIsLoading(true);
    router.back();
  };

  return { ...router, push, replace, back };
}
