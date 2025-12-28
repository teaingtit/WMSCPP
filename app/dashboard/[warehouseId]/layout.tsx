// app/dashboard/[warehouseId]/layout.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import WarehouseHeader from '@/components/ui/WarehouseHeader';

export default async function WarehouseContextLayout({ 
  children, params 
}: { 
  children: React.ReactNode;
  params: { warehouseId: string };
}) {
  // ✅ FIX: เติม await ตรงนี้
  const supabase = await createClient();

  // Validate Warehouse
  const { data: warehouse } = await supabase
    .from('warehouses')
    .select('*')
    .eq('code', params.warehouseId)
    .single();

  if (!warehouse) {
    return notFound();
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <WarehouseHeader warehouse={warehouse} />
      <div className="flex-1 p-6 overflow-auto">
        {children}
      </div>
    </div>
  );
}