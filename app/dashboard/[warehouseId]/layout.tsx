// app/dashboard/[warehouseId]/layout.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server'; // 1. Import createClient แทน supabase
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top Bar (Global Navigation for Warehouse Context) */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          {/* 1. ปุ่มย้อนกลับ Global (แบบ Smart) */}
          <Link 
             href={`/dashboard/${params.warehouseId}`} 
             className="p-2 -ml-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
             title="กลับหน้าหลักคลังสินค้า"
           >
              <ArrowLeft size={20} />
           </Link>
           <Link href={`/dashboard/${params.warehouseId}`} className="group">
              <h2 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                {warehouse.name}
              </h2>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">{warehouse.code}</span>
                  <span>•</span>
                  <span className={warehouse.is_active ? "text-emerald-500" : "text-rose-500"}>
                    {warehouse.is_active ? 'Online' : 'Maintenance'}
                  </span>
              </div>
           </Link>
        </div>

        {/* User Profile / Logout (คงเดิม) */}
        <div>...</div>
      </header>

      {/* เนื้อหาภายใน */}
     <div className="flex-1 p-6 overflow-auto">
        {children}
      </div>
    </div>
  );
}