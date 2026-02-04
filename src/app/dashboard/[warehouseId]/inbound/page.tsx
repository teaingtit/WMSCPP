import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProductCategories } from '@/actions/inbound-actions';
import BulkInboundManager from '@/components/inbound/BulkInboundManager';
import { Box, Container, ArrowRight } from 'lucide-react';

interface PageProps {
  params: Promise<{ warehouseId: string }>;
}

export default async function InboundMenuPage({ params }: PageProps) {
  const { warehouseId } = await params;
  const categories = await getProductCategories();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-10 px-4 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground mb-8">รับสินค้าเข้าคลัง (Inbound)</h1>

      {/* 1. Bulk Import Section (Context-Aware) */}
      <BulkInboundManager
        warehouseId={warehouseId}
        categories={categories}
        userId={user?.id || 'system'}
      />

      <div className="relative flex items-center py-8">
        <div className="flex-grow border-t border-border"></div>
        <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs font-bold uppercase tracking-wider">
          หรือรับเข้าทีละรายการ (Manual)
        </span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      {/* 2. Manual Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.isArray(categories) && categories.length > 0 ? (
          categories.map((cat: any) => (
            <Link
              key={cat.id}
              href={`/dashboard/${warehouseId}/inbound/${cat.id}`}
              className="flex items-center p-6 bg-card rounded-2xl border border-border hover:border-indigo-500 hover:shadow-lg transition-all group"
            >
              <div
                className={`p-4 rounded-xl mr-4 ${
                  cat.id === 'CHEMICAL'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                {cat.id === 'CHEMICAL' ? <Container size={24} /> : <Box size={24} />}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground group-hover:text-indigo-600 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-sm text-muted-foreground">Manual Entry</p>
              </div>

              <ArrowRight className="text-muted-foreground group-hover:text-indigo-500 transition-colors" />
            </Link>
          ))
        ) : (
          <div className="col-span-2 p-8 text-center bg-muted rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">ยังไม่มีหมวดหมู่สินค้าในระบบ</p>
          </div>
        )}
      </div>
    </div>
  );
}
