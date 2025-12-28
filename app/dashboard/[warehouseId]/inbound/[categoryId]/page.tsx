import React from 'react';
import { getCategoryDetail, getInboundOptions } from '@/actions/inbound-actions';
import DynamicInboundForm from '@/components/inbound/DynamicInboundForm';
import PageHeader from '@/components/ui/PageHeader';

export default async function DynamicInboundPage({ 
  params 
}: { 
  // ✅ FIX 1: ปรับ Type เป็น Promise เพื่อรองรับ Next.js 15
  params: Promise<{ warehouseId: string; categoryId: string }> 
}) {
  // ✅ FIX 2: Await params ก่อนใช้งาน
  const { warehouseId, categoryId } = await params;

  // ดึงข้อมูลพร้อมกัน (Parallel Data Fetching) -> ดีมากครับจุดนี้
  const [category, options] = await Promise.all([
    getCategoryDetail(categoryId),              // ใช้ตัวแปรที่ await แล้ว
    getInboundOptions(warehouseId, categoryId)  // ใช้ตัวแปรที่ await แล้ว
  ]);

  if (!category) {
      // เพิ่ม UI กรณีไม่พบข้อมูลให้ดูดีขึ้นนิดนึงครับ
      return (
        <div className="p-8 text-center text-slate-500">
          ไม่พบหมวดหมู่สินค้า (Category Not Found)
        </div>
      );
  }

  return (
    <div className="pb-20">
      <PageHeader 
         title={`รับเข้า: ${category.name}`}
         subtitle="กรอกข้อมูลสินค้าเพื่อนำเข้าสต็อก (รองรับสินค้าใหม่)"
         warehouseId={warehouseId} // ใช้ตัวแปรที่ await แล้ว
      />

      <DynamicInboundForm 
         warehouseId={warehouseId} // ใช้ตัวแปรที่ await แล้ว
         category={category}
         products={options.products}
         locations={options.locations}
      />
    </div>
  );
}