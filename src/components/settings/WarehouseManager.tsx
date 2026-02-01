'use client';

import { useRef, useEffect, useActionState } from 'react';
import { createWarehouse, deleteWarehouse } from '@/actions/settings-actions';
import { Save } from 'lucide-react';
import { SubmitButton } from '@/components/ui/submit-button';
import { DimensionConfig } from './warehouse/DimensionConfig'; // Import ที่แยกมา
import { WarehouseList } from './warehouse/WarehouseList'; // Import ที่แยกมา
import { wrapFormAction, notify } from '@/lib/ui-helpers';

const initialState = { success: false, message: '' };

export const WarehouseManager = ({ warehouses }: { warehouses: any[] }) => {
  const formRef = useRef<HTMLFormElement>(null);

  const [createState, createAction] = useActionState(wrapFormAction(createWarehouse), initialState);

  const [deleteState, deleteAction] = useActionState(wrapFormAction(deleteWarehouse), initialState);

  useEffect(() => {
    if (createState.message) {
      notify.ok(createState);
      if (createState.success) formRef.current?.reset();
    }
  }, [createState]);

  useEffect(() => {
    if (deleteState.message) {
      notify.ok(deleteState);
    }
  }, [deleteState]);

  return (
    <div className="space-y-8">
      {/* Form Create */}
      <form
        ref={formRef}
        action={createAction}
        className="space-y-6 animate-in fade-in slide-in-from-bottom-4"
      >
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="wh-code" className="block text-xs font-bold text-slate-500 mb-1">
              รหัสคลัง
            </label>
            <input
              id="wh-code"
              name="code"
              placeholder="WH-MAIN"
              required
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 uppercase font-bold text-indigo-900 focus:ring-2 ring-indigo-500/20 outline-none"
            />
          </div>
          <div className="flex-[2]">
            <label htmlFor="wh-name" className="block text-xs font-bold text-slate-500 mb-1">
              ชื่อคลังสินค้า
            </label>
            <input
              id="wh-name"
              name="name"
              placeholder="คลังสินค้าหลัก..."
              required
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 ring-indigo-500/20 outline-none"
            />
          </div>
        </div>

        {/* เรียกใช้ Component ที่แยกไป */}
        <DimensionConfig />

        <SubmitButton className="w-full bg-slate-900 text-white px-4 py-4 rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
          <Save size={18} /> สร้างคลังและ สร้าง Locations อัตโนมัติ
        </SubmitButton>
      </form>

      {/* เรียกใช้ List Component */}
      <WarehouseList warehouses={warehouses} deleteAction={deleteAction} />
    </div>
  );
};
