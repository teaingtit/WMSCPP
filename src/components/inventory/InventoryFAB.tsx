'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import FloatingActionButton from '@/components/ui/FloatingActionButton';

interface InventoryFABProps {
  warehouseId: string;
}

/**
 * Inventory FAB - Quick action to add new stock
 * Client component wrapper for FloatingActionButton
 */
export default function InventoryFAB({ warehouseId }: InventoryFABProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleAddStock = () => {
    setIsNavigating(true);
    router.push(`/dashboard/${warehouseId}/inbound`);
  };

  return (
    <FloatingActionButton
      onClick={handleAddStock}
      label="เพิ่มสินค้าเข้าคลัง"
      icon={Plus}
      variant="success"
      disabled={isNavigating}
    />
  );
}
