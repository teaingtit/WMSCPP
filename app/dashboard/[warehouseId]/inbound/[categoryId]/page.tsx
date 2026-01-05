import React from 'react';
import { getCategoryDetail, getInboundOptions } from '@/actions/inbound-actions';
import DynamicInboundForm from '@/components/inbound/DynamicInboundForm';
import PageHeader from '@/components/ui/PageHeader';

export default async function DynamicInboundPage({
  params,
}: {
  params: Promise<{ warehouseId: string; categoryId: string }>;
}) {
  const { warehouseId, categoryId } = await params;

  // Parallel Data Fetching
  const [category, options] = await Promise.all([
    getCategoryDetail(categoryId),
    getInboundOptions(warehouseId, categoryId),
  ]);

  if (!category) {
    return (
      <div className="p-8 text-center text-slate-500">ไม่พบหมวดหมู่สินค้า (Category Not Found)</div>
    );
  }

  return (
    <div className="pb-20">
      <PageHeader
        title={`รับเข้า: ${category.name}`}
        subtitle="กรอกข้อมูลสินค้าเพื่อนำเข้าสต็อก (รองรับสินค้าใหม่)"
        warehouseId={warehouseId}
      />

      {/* ✅ FIX: ตัด locations props ออก เพราะ Form โหลดเองแบบ Dynamic แล้ว */}
      <DynamicInboundForm
        warehouseId={warehouseId}
        category={category}
        products={options.products}
      />
    </div>
  );
}
