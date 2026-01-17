import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getWarehouseId } from '@/lib/warehouse-helpers';
import { WarehouseLayoutDesigner } from '@/components/warehouse-layout/WarehouseLayoutDesigner';
import { saveWarehouseLayout, generateLocationsFromLayout } from '@/actions/layout-actions';
import { ArrowLeft, Wand2 } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: {
    warehouseId: string;
  };
}

export default async function LayoutDesignerPage({ params }: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const whId = await getWarehouseId(supabase, params.warehouseId);
  if (!whId) redirect('/dashboard');

  // Type assertion: whId is guaranteed to be string after the redirect check
  const warehouseId: string = whId;

  const { data: warehouse } = await supabase
    .from('warehouses')
    .select('*')
    .eq('id', warehouseId)
    .single();

  if (!warehouse) redirect('/dashboard');

  const { data: layoutData } = await supabase
    .from('warehouse_layouts')
    .select('layout_data')
    .eq('warehouse_id', warehouseId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const initialLayout = layoutData?.layout_data?.components || [];

  async function handleSave(components: any[]) {
    'use server';
    await saveWarehouseLayout(warehouseId, components);
  }

  async function handleGenerate() {
    'use server';
    await generateLocationsFromLayout(warehouseId);
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/${params.warehouseId}/locations`}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">ออกแบบผังคลัง: {warehouse.name}</h1>
              <p className="text-sm text-slate-500">ลากและวางส่วนประกอบเพื่อสร้างผังคลังของคุณ</p>
            </div>
          </div>

          <form action={handleGenerate}>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
            >
              <Wand2 size={16} />
              สร้างพิกัดจากผัง
            </button>
          </form>
        </div>
      </div>

      <div className="flex-1">
        <WarehouseLayoutDesigner
          warehouseId={warehouseId}
          initialLayout={initialLayout}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
