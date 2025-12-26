import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { Package, MapPin } from 'lucide-react';

export default async function InventoryPage({ params }: { params: { warehouseId: string } }) {
  // 1. ดึงข้อมูลสต็อก + Join Product + Join Location
  const supabase = createClient();
  const { data: stocks, error } = await supabase
    .from('stocks')
    .select(`
      id, quantity, attributes, updated_at,
      products (sku, name, uom, category_id),
      locations (code, type),
      warehouses!inner (code) 
    `)
    .eq('warehouses.code', params.warehouseId)
    .gt('quantity', 0) // ไม่เอาของหมด
    .order('updated_at', { ascending: false });

  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
         <h1 className="text-2xl font-bold text-slate-800">สินค้าคงคลัง (Live Stock)</h1>
         <span className="text-slate-500 text-sm">{stocks?.length || 0} รายการ</span>
      </div>

      <div className="grid gap-4">
        {stocks?.map((item: any) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between hover:border-indigo-300 transition-all">
            
            {/* Left: Product Info */}
            <div className="flex items-start gap-4">
               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Package size={24} />
               </div>
               <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                        {item.products.category_id}
                     </span>
                     <h3 className="font-bold text-slate-800 text-lg">{item.products.name}</h3>
                  </div>
                  <p className="text-slate-400 text-sm font-mono">{item.products.sku}</p>
                  
                  {/* แสดง Attributes พิเศษ (Dynamic) */}
                  {item.attributes && Object.keys(item.attributes).length > 0 && (
                     <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(item.attributes).map(([key, val]: any) => (
                           <span key={key} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100">
                              <span className="font-bold opacity-70 mr-1">{key}:</span>{val}
                           </span>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            {/* Right: Location & Qty */}
            <div className="text-right flex flex-col items-end justify-center min-w-[120px]">
               <div className="text-3xl font-black text-slate-800">{item.quantity}</div>
               <div className="text-xs font-bold text-slate-400 uppercase mb-2">{item.products.uom}</div>
               <div className="flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                  <MapPin size={12} />
                  {item.locations.code}
               </div>
            </div>

          </div>
        ))}

        {stocks?.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                ยังไม่มีสินค้าในคลังนี้
            </div>
        )}
      </div>
    </div>
  );
}