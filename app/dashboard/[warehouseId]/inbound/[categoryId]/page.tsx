import React from 'react';
import { getCategoryDetail, getInboundOptions } from '@/actions/inbound-actions';
import DynamicInboundForm from '@/components/inbound/DynamicInboundForm';
import PageHeader from '@/components/ui/PageHeader'; 

// ✅ FIX 1: เปลี่ยน Type ของ params เป็น Promise
export default async function DynamicInboundPage({ 
    params 
}: { 
    params: Promise<{ warehouseId: string; categoryId: string }> 
}) {
  // ✅ FIX 2: Await params เพื่อดึงค่าออกมาก่อน
  const { warehouseId, categoryId } = await params;

  // เรียกใช้โดยส่งตัวแปรที่ await มาแล้ว
  const [category, options] = await Promise.all([
    getCategoryDetail(categoryId),
    getInboundOptions(warehouseId, categoryId)
  ]);

  if (!category) return <div>Category Not Found</div>;

  return (
    <div className="pb-20">
      <PageHeader 
         title={`รับเข้า: ${category.name}`}
         subtitle="กรอกข้อมูลสินค้าเพื่อนำเข้าสต็อก (รองรับสินค้าใหม่)"
         warehouseId={warehouseId} // ✅ ใช้ตัวแปรที่ await แล้ว
      />

      <DynamicInboundForm 
         warehouseId={warehouseId} // ✅ ใช้ตัวแปรที่ await แล้ว
         category={category}
         products={options.products}
         locations={options.locations}
      />
    </div>
  );
}