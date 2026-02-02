'use client';

import { useRef, useEffect, useActionState } from 'react';
import { createWarehouse, deleteWarehouse } from '@/actions/settings-actions';
import { Save } from 'lucide-react';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { DimensionConfig } from './warehouse/DimensionConfig';
import { WarehouseList } from './warehouse/WarehouseList';
import { wrapFormAction, notify } from '@/lib/ui-helpers';
import { useFormErrors } from '@/hooks/useFormErrors';

const initialState = { success: false, message: '' };

export const WarehouseManager = ({ warehouses }: { warehouses: any[] }) => {
  const formRef = useRef<HTMLFormElement>(null);

  const [createState, createAction] = useActionState(wrapFormAction(createWarehouse), initialState);
  const { getError } = useFormErrors(createState);

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
            <Input
              id="wh-code"
              name="code"
              placeholder="WH-MAIN"
              required
              className="bg-slate-50 uppercase font-bold text-indigo-900"
              errorMessage={getError('code')}
            />
          </div>
          <div className="flex-[2]">
            <label htmlFor="wh-name" className="block text-xs font-bold text-slate-500 mb-1">
              ชื่อคลังสินค้า
            </label>
            <Input
              id="wh-name"
              name="name"
              placeholder="คลังสินค้าหลัก..."
              required
              className="bg-slate-50"
              errorMessage={getError('name')}
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
