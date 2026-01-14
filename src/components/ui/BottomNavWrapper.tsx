'use client';

import { useParams } from 'next/navigation';
import BottomNavV2 from './BottomNavV2';

/**
 * Wrapper for BottomNavV2 that extracts warehouseId from URL params
 */
export default function BottomNavWrapper() {
  const params = useParams();
  const warehouseId = params?.['warehouseId'] as string | undefined;

  return <BottomNavV2 {...(warehouseId ? { warehouseId } : {})} />;
}
