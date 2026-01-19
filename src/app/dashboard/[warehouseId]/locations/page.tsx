import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getWarehouseId } from '@/lib/warehouse-helpers';
import { WarehouseLayoutDesigner } from '@/components/warehouse-layout/WarehouseLayoutDesigner';
import { saveWarehouseLayout, generateLocationsFromLayout } from '@/actions/layout-actions';
import { Wand2 } from 'lucide-react';

interface PageProps {
  params: {
    warehouseId: string;
  };
}

export default async function LocationManagerPage({ params }: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const whId = await getWarehouseId(supabase, params.warehouseId);
  if (!whId) redirect('/dashboard');

  // Type assertion
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
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Visual Layout Designer</h1>
            <p className="text-sm text-slate-500">
              Design your warehouse layout and generate locations automatically
            </p>
          </div>

          <form action={handleGenerate}>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm shadow-sm"
            >
              <Wand2 size={16} />
              Generate Locations
            </button>
          </form>
        </div>
      </div>

      <div className="flex-1 bg-white border-x border-b border-slate-200 rounded-b-xl overflow-hidden">
        <WarehouseLayoutDesigner
          warehouseId={warehouseId}
          initialLayout={initialLayout}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
