// app/dashboard/[warehouseId]/layout.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server'; // 1. Import createClient แทน supabase

export default async function WarehouseContextLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode;
  params: { warehouseId: string };
}) {
  // 2. สร้าง Client ใหม่ในทุก Request
  const supabase = createClient();

  // 3. Validate: ตรวจสอบว่ามีคลังนี้จริงหรือไม่?
  const { data: warehouse } = await supabase
    .from('warehouses')
    .select('*')
    .eq('code', params.warehouseId)
    .single();

  if (!warehouse) {
    return notFound();
  }

  // 4. Render Children
  return (
    <div className="flex flex-col h-full">
      {/* Top Bar เฉพาะของคลังนี้ */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-10">
        <div>
           <h2 className="text-xl font-bold text-slate-800">{warehouse.name}</h2>
           <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">{warehouse.code}</span>
              <span>•</span>
              <span className={warehouse.is_active ? "text-emerald-500" : "text-rose-500"}>
                {warehouse.is_active ? 'Online' : 'Maintenance'}
              </span>
           </div>
        </div>
      </header>

      {/* เนื้อหาภายใน */}
      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  );
}