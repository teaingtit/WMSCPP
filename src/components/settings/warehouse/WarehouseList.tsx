'use client';

import { Building2, Trash2 } from 'lucide-react';
import { SubmitButton } from '@/components/ui/submit-button';

interface WarehouseListProps {
  warehouses: any[];
  deleteAction: (payload: FormData) => void;
}

export const WarehouseList = ({ warehouses, deleteAction }: WarehouseListProps) => {
  return (
    <div className="border-t border-slate-100 pt-6">
      <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center justify-between">
        <span>คลังสินค้าที่มีอยู่</span>
        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md">
          {warehouses.length}
        </span>
      </h3>
      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
        {warehouses.map((wh) => (
          <div
            key={wh.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform">
                <Building2 size={24} />
              </div>
              <div>
                <div className="font-bold text-slate-800 text-base">{wh.name}</div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    {wh.code}
                  </span>
                  {wh.config && (
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                      <span title="X Axis">X:{wh.config.axis_x}</span>
                      <span className="w-px h-3 bg-slate-200" />
                      <span title="Y Axis">Y:{wh.config.axis_y}</span>
                      <span className="w-px h-3 bg-slate-200" />
                      <span title="Z Axis">Z:{wh.config.axis_z}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <form action={deleteAction} className="flex sm:block shrink-0">
              <input type="hidden" name="id" value={wh.id} />
              <SubmitButton className="w-full sm:w-auto p-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center gap-2">
                <Trash2 size={18} />
                <span className="sm:hidden text-sm font-medium">ลบรายการ</span>
              </SubmitButton>
            </form>
          </div>
        ))}
        {warehouses.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
            ยังไม่มีคลังสินค้า
          </div>
        )}
      </div>
    </div>
  );
};
