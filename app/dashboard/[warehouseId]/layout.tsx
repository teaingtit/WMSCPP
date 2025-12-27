// app/dashboard/[warehouseId]/layout.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import WarehouseHeader from '@/components/ui/WarehouseHeader'; // ✅ Import ตัวใหม่

export default async function WarehouseContextLayout({ 
  children, params 
}: { 
  children: React.ReactNode;
  params: { warehouseId: string };
}) {
  const supabase = createClient();

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
      {/* เรียกใช้ Smart Header ที่จัดการปุ่มย้อนกลับให้เอง */}
      <WarehouseHeader warehouse={warehouse} />

      {/* เนื้อหาภายใน */}
      <div className="flex-1 p-6 overflow-auto">
        {children}
      </div>
    </div>
  );
}