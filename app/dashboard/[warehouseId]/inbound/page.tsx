// app/dashboard/[warehouseId]/inbound/page.tsx
import React from 'react';
import Link from 'next/link';
import { getProductCategories } from '@/actions/inbound-actions';
import { Box, Container, ArrowRight, AlertCircle } from 'lucide-react';

// ✅ FIX 1: Update params type to Promise
export default async function InboundMenuPage({ 
  params 
}: { 
  params: Promise<{ warehouseId: string }> 
}) {
  // ✅ FIX 2: Await params ก่อนใช้งาน
  const { warehouseId } = await params;

  // เรียก Server Action
  const categories = await getProductCategories();

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">รับสินค้าเข้าคลัง (Inbound)</h1>
      <p className="text-slate-500 mb-8">กรุณาเลือกประเภทสินค้าที่ต้องการรับเข้า</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.isArray(categories) && categories.length > 0 ? (
          categories.map((cat: any) => (
            <Link 
              key={cat.id} 
              // ✅ FIX 3: ใช้ตัวแปร warehouseId ที่ await มาแล้ว
              href={`/dashboard/${warehouseId}/inbound/${cat.id}`}
              className="flex items-center p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all group"
            >
              <div className={`p-4 rounded-xl mr-4 ${
                  cat.id === 'CHEMICAL' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {cat.id === 'CHEMICAL' ? <Container size={24} /> : <Box size={24} />}
              </div>
              
              <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {cat.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                      ID: {cat.id}
                  </p>
              </div>
              
              <ArrowRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </Link>
          ))
        ) : (
          <div className="col-span-2 p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 flex flex-col items-center gap-2">
            <AlertCircle size={32} />
            <p>ยังไม่มีประเภทสินค้าในระบบ กรุณาเพิ่มในหน้า Settings ก่อน</p>
          </div>
        )}
      </div>
    </div>
  );
}