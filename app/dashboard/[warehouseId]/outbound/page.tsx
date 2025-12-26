import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { submitOutbound } from '@/actions/outbound-actions';
import { Package, LogOut, ArrowRight, AlertTriangle } from 'lucide-react';

export default async function OutboundPage({ params }: { params: { warehouseId: string } }) {
  // ดึงสินค้าที่มีของ (>0)
  const supabase = createClient();
  const { data: stocks } = await supabase
    .from('stocks')
    .select(`
      id, quantity, attributes,
      products (sku, name, uom),
      locations (code),
      warehouses!inner (code)
    `)
    .eq('warehouses.code', params.warehouseId)
    .gt('quantity', 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
         <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
            <LogOut size={24} />
         </div>
         <div>
            <h1 className="text-2xl font-bold text-slate-800">เบิกจ่าย / ตัดสต็อก</h1>
            <p className="text-slate-500">เลือกสินค้าที่ต้องการทำรายการ</p>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {stocks?.map((item: any) => (
          <form key={item.id} action={async (formData) => {
              "use server";
              const qty = Number(formData.get('qty'));
              if(qty <= 0) return;
              
              const res = await submitOutbound({
                  warehouseId: params.warehouseId,
                  itemId: item.id,
                  qty: qty,
                  type: 'ISSUE', // Hardcode เป็น ISSUE ก่อน (ถ้าจะ Transfer ต้องทำ Modal แยก)
                  note: formData.get('note') as string
              });
              
              // Note: ใน Production ควรจัดการ UI Feedback ดีกว่านี้ (เช่น Toast)
          }} 
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6"
          >
            {/* Info */}
            <div className="flex-1">
               <div className="flex items-center gap-2 mb-1">
                   <h3 className="font-bold text-lg text-slate-800">{item.products.name}</h3>
                   <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{item.products.sku}</span>
               </div>
               
               <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><Package size={14}/> {item.locations.code}</span>
                  {item.attributes.batch_no && <span className="text-amber-600">Batch: {item.attributes.batch_no}</span>}
               </div>
            </div>

            {/* Input Action */}
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
               <div className="text-right mr-2">
                  <div className="text-xs font-bold text-slate-400">คงเหลือ</div>
                  <div className="font-black text-slate-800">{item.quantity} <span className="text-[10px] font-normal">{item.products.uom}</span></div>
               </div>

               <input 
                  type="number" name="qty" placeholder="จำนวน" max={item.quantity} min="1" required
                  className="w-24 p-2 rounded-lg border border-slate-300 text-center font-bold outline-none focus:border-rose-500"
               />
               <input 
                  type="text" name="note" placeholder="หมายเหตุ..." 
                  className="w-32 p-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-rose-500"
               />
               <button className="bg-rose-600 text-white p-2.5 rounded-lg hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all">
                  <LogOut size={18} />
               </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}