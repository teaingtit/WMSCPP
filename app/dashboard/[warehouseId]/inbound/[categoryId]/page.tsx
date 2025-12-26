import React from 'react';
import { getCategoryDetail, getInboundOptions } from '@/actions/inbound-actions';
import DynamicInboundForm from '@/components/inbound/DynamicInboundForm';
import PageHeader from '@/components/ui/PageHeader'; // Import Header

export default async function DynamicInboundPage({ 
    params 
}: { 
    params: { warehouseId: string; categoryId: string } 
}) {
  const [category, options] = await Promise.all([
    getCategoryDetail(params.categoryId),
    getInboundOptions(params.warehouseId, params.categoryId)
  ]);

  if (!category) return <div>Category Not Found</div>;

  return (
    <div className="pb-20">
      {/* ใส่ Header พร้อมปุ่ม Back */}
      <PageHeader 
         title={`รับเข้า: ${category.name}`}
         subtitle="กรอกข้อมูลสินค้าเพื่อนำเข้าสต็อก (รองรับสินค้าใหม่)"
         warehouseId={params.warehouseId}
      />

      <DynamicInboundForm 
         warehouseId={params.warehouseId}
         category={category}
         products={options.products}
         locations={options.locations}
      />
    </div>
  );
}