'use client';

import { useFormState } from 'react-dom';
import { createCategory } from '@/actions/settings-actions';
import { Plus, Info } from 'lucide-react';
import SchemaBuilder from './SchemaBuilder';
import UnitsBuilder from './UnitsBuilder';
import { SubmitButton } from '@/components/SubmitButton';
import { useState, useRef, useEffect } from 'react';
import { wrapFormAction, notify } from '@/lib/ui-helpers';

// Use helper wrapper for `useFormState` signature
const createCategoryWrapper = wrapFormAction(createCategory);

export default function CategoryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [schemaJson, setSchemaJson] = useState('[]');
  const [unitsJson, setUnitsJson] = useState('[]');

  const [state, action] = useFormState(createCategoryWrapper, { success: false, message: '' });

  useEffect(() => {
    if (state.message) {
      notify.ok(state);
      if (state.success) {
        formRef.current?.reset();
        setSchemaJson('[]');
        setUnitsJson('[]');
      }
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-5 animate-in fade-in">
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <label htmlFor="cat-id" className="text-xs font-bold text-slate-500 mb-1 block">
            ID *
          </label>
          <input
            id="cat-id"
            name="id"
            required
            className="w-full p-3 border rounded-xl bg-slate-50 uppercase font-bold text-indigo-900 outline-none"
            placeholder="RAW"
          />
        </div>
        <div className="col-span-3">
          <label htmlFor="cat-name" className="text-xs font-bold text-slate-500 mb-1 block">
            ชื่อหมวดหมู่ *
          </label>
          <input
            id="cat-name"
            name="name"
            required
            className="w-full p-3 border rounded-xl outline-none"
            placeholder="วัตถุดิบ..."
          />
        </div>
      </div>

      <input type="hidden" name="schema" value={schemaJson} />
      <input type="hidden" name="units" value={unitsJson} />

      {/* Units Builder */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <UnitsBuilder onUnitsChange={setUnitsJson} />
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Info size={16} className="text-indigo-500" /> More Detail (รายละเอียดเพิ่มเติม)
        </h4>
        <div className="bg-slate-50 p-1 rounded-xl border border-slate-200">
          <SchemaBuilder onSchemaChange={setSchemaJson} />
        </div>
      </div>

      <SubmitButton className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold flex justify-center gap-2 hover:bg-slate-800 shadow-lg transition-all">
        <Plus size={18} strokeWidth={3} /> สร้างหมวดหมู่สินค้า
      </SubmitButton>
    </form>
  );
}
