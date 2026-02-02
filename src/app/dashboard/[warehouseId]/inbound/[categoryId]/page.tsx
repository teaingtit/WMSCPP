import { getCategoryDetail } from '@/actions/inbound-actions';
import DynamicInboundForm from '@/components/inbound/DynamicInboundForm';
import PageHeader from '@/components/ui/PageHeader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export default async function DynamicInboundPage({
  params,
}: {
  params: Promise<{ warehouseId: string; categoryId: string }>;
}) {
  const { warehouseId, categoryId } = await params;

  // Fetch category detail
  const category = await getCategoryDetail(categoryId);

  if (!category) {
    return (
      <div className="p-8 text-center text-slate-500">ไม่พบหมวดหมู่สินค้า (Category Not Found)</div>
    );
  }

  return (
    <div className="pb-20">
      <Breadcrumb
        items={[
          { label: 'หน้าหลัก', href: '/dashboard' },
          { label: 'รับเข้า', href: `/dashboard/${warehouseId}/inbound` },
          { label: category.name },
        ]}
        className="mb-4"
      />
      <PageHeader
        title={`รับเข้า: ${category.name}`}
        subtitle="กรอกข้อมูลสินค้าเพื่อนำเข้าสต็อก (รองรับสินค้าใหม่)"
        warehouseId={warehouseId}
      />

      {/* ✅ FIX: Removed products prop - ProductAutocomplete now uses server-side search */}
      <DynamicInboundForm warehouseId={warehouseId} category={category} />
    </div>
  );
}
