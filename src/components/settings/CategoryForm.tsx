'use client';

import { createCategory } from '@/actions/settings-actions';
import { Plus, Info, Eye, Code } from 'lucide-react';
import SchemaBuilder from './SchemaBuilder';
import VisualSchemaDesigner from './VisualSchemaDesigner';
import UnitsBuilder from './UnitsBuilder';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { useState, useRef, useEffect, useActionState } from 'react';
import { wrapFormAction, notify } from '@/lib/ui-helpers';
import { useFormErrors } from '@/hooks/useFormErrors';

const createCategoryWrapper = wrapFormAction(createCategory);
const initialState = { success: false, message: '' };

export default function CategoryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [schemaJson, setSchemaJson] = useState('[]');
  const [unitsJson, setUnitsJson] = useState('[]');
  const [useVisualMode, setUseVisualMode] = useState(true);

  const [state, action] = useActionState(createCategoryWrapper, initialState);
  const { getError } = useFormErrors(state ?? initialState);

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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-1">
          <label htmlFor="cat-id" className="text-xs font-bold text-slate-500 mb-1 block">
            ID *
          </label>
          <Input
            id="cat-id"
            name="id"
            required
            className="bg-slate-50 uppercase font-bold text-indigo-900 touch-manipulation"
            placeholder="RAW"
            errorMessage={getError('id')}
          />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="cat-name" className="text-xs font-bold text-slate-500 mb-1 block">
            ชื่อหมวดหมู่ *
          </label>
          <Input
            id="cat-name"
            name="name"
            required
            className="touch-manipulation"
            placeholder="วัตถุดิบ..."
            errorMessage={getError('name')}
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
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Info size={16} className="text-indigo-500" /> More Detail (รายละเอียดเพิ่มเติม)
          </h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUseVisualMode(true)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                useVisualMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Eye size={14} className="inline mr-1" />
              Visual
            </button>
            <button
              type="button"
              onClick={() => setUseVisualMode(false)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                !useVisualMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Code size={14} className="inline mr-1" />
              Advanced
            </button>
          </div>
        </div>
        <div className="bg-slate-50 p-1 rounded-xl border border-slate-200">
          {useVisualMode ? (
            <VisualSchemaDesigner onSchemaChange={setSchemaJson} />
          ) : (
            <SchemaBuilder onSchemaChange={setSchemaJson} />
          )}
        </div>
      </div>

      <SubmitButton className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold flex justify-center gap-2 hover:bg-indigo-700 shadow-lg transition-all">
        <Plus size={18} strokeWidth={3} /> สร้างหมวดหมู่สินค้า
      </SubmitButton>
    </form>
  );
}
