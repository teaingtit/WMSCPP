import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { Package, MapPin, AlertCircle } from 'lucide-react';

// ✅ FIX 1: เปลี่ยน Type params เป็น Promise
export default async function InventoryPage({ 
  params 
}: { 
  params: Promise<{ warehouseId: string }> 
}) {
  // ✅ FIX 2: Await params ก่อนใช้งาน
  const { warehouseId } = await params;

  // 1. ดึงข้อมูลสต็อก + Join Product + Join Location
  const supabase = await createClient();
  
  const { data: stocks, error } = await supabase
    .from('stocks')
    .select(`
      id, quantity, attributes, updated_at,
      products (sku, name, uom, category_id),
      locations (code, type),
      warehouses!inner (code) 
    `)
    .eq('warehouses.code', warehouseId) // ✅ ใช้ตัวแปรที่ await แล้ว
    .gt('quantity', 0)
    .order('updated_at', { ascending: false });

  if (error) {
      return (
        <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-200 flex items-center gap-3">
            <AlertCircle />
            <span>Error Loading Inventory: {error.message}</span>
        </div>
      );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="text-indigo-600"/> สินค้าคงคลัง (Live Stock)
            </h1>
            <p className="text-slate-500 text-sm mt-1">รายการสินค้าทั้งหมดที่มีอยู่ในระบบจริง</p>
         </div>
         <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm">
            {stocks?.length || 0} รายการ
         </span>
      </div>

      <div className="grid gap-4">
        {stocks?.map((item: any) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between hover:border-indigo-300 hover:shadow-md transition-all group">
            
            {/* Left: Product Info */}
            <div className="flex items-start gap-4">
               <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Package size={24} />
               </div>
               <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${
                        item.products.category_id === 'CHEMICAL' 
                            ? 'bg-amber-50 text-amber-700 border-amber-100' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                     }`}>
                        {item.products.category_id}
                     </span>
                     <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">{item.products.name}</h3>
                  </div>
                  <p className="text-slate-400 text-sm font-mono flex items-center gap-1">
                    <span className="opacity-50">SKU:</span> {item.products.sku}
                  </p>
                  
                  {/* แสดง Attributes พิเศษ (Dynamic) */}
                  {item.attributes && Object.keys(item.attributes).length > 0 && (
                     <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(item.attributes).map(([key, val]: any) => (
                           <span key={key} className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                              <span className="font-bold text-slate-400 text-[10px] uppercase">{key}:</span>
                              <span className="font-medium">{String(val)}</span>
                           </span>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            {/* Right: Location & Qty */}
            <div className="text-right flex flex-col items-end justify-center min-w-[120px] pl-4 md:border-l border-slate-100">
               <div className="text-3xl font-black text-slate-800">{item.quantity.toLocaleString()}</div>
               <div className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">{item.products.uom}</div>
               <div className="flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100">
                  <MapPin size={14} />
                  {item.locations.code}
               </div>
            </div>

          </div>
        ))}

        {stocks?.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                <Package size={48} className="mx-auto mb-4 opacity-20" />
                <p>ยังไม่มีสินค้าในคลังนี้</p>
            </div>
        )}
      </div>
    </div>
  );
}