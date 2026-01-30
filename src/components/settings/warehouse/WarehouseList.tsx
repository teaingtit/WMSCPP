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
            className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors">
                <Building2 size={20} />
              </div>
              <div>
                <div className="font-bold text-slate-700">{wh.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    {wh.code}
                  </span>
                  {wh.config && (
                    <span className="text-[10px] text-slate-400 flex gap-1 bg-slate-50 px-1 rounded">
                      <span>X:{wh.config.axis_x}</span>
                      <span>Y:{wh.config.axis_y}</span>
                      <span>Z:{wh.config.axis_z}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={wh.id} />
              <SubmitButton className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                <Trash2 size={18} />
              </SubmitButton>
            </form>
          </div>
        ))}
        {warehouses.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
            ยังไม่มีคลังสินค้า
          </div>
        )}
      </div>
    </div>
  );
};
