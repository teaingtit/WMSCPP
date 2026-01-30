'use client';

import { useFormState } from 'react-dom';
import { updateCategory } from '@/actions/settings-actions';
import { Save, Info, History, Eye, Code } from 'lucide-react';
import SchemaBuilder from './SchemaBuilder';
import VisualSchemaDesigner from './VisualSchemaDesigner';
import UnitsBuilder from './UnitsBuilder';
import SchemaVersionHistory from './SchemaVersionHistory';
import { SubmitButton } from '@/components/ui/submit-button';
import { useState, useRef, useEffect } from 'react';
import { wrapFormAction, notify } from '@/lib/ui-helpers';
import { Button } from '@/components/ui/button';

const updateCategoryWrapper = wrapFormAction(updateCategory);

interface EditCategoryFormProps {
  category: {
    id: string;
    name: string;
    form_schema?: any;
    units?: string[];
  };
  onClose?: () => void;
}

export default function EditCategoryForm({ category, onClose }: EditCategoryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [schemaJson, setSchemaJson] = useState(JSON.stringify(category.form_schema || []));
  const [unitsJson, setUnitsJson] = useState(JSON.stringify(category.units || []));
  const [showHistory, setShowHistory] = useState(false);
  const [useVisualMode, setUseVisualMode] = useState(true);

  const [state, action] = useFormState(updateCategoryWrapper, { success: false, message: '' });

  useEffect(() => {
    if (state.message) {
      notify.ok(state);
      if (state.success && onClose) {
        onClose();
      }
    }
  }, [state, onClose]);

  return (
    <div className="space-y-6">
      {/* Toggle between Form and History */}
      <div className="flex gap-2 border-b border-slate-200 pb-4">
        <Button
          type="button"
          variant={!showHistory ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowHistory(false)}
          className="flex-1"
        >
          <Info size={16} className="mr-2" />
          แก้ไขข้อมูล
        </Button>
        <Button
          type="button"
          variant={showHistory ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowHistory(true)}
          className="flex-1"
        >
          <History size={16} className="mr-2" />
          ประวัติ Schema
        </Button>
      </div>

      {showHistory ? (
        <SchemaVersionHistory categoryId={category.id} categoryName={category.name} />
      ) : (
        <form ref={formRef} action={action} className="space-y-5 animate-in fade-in">
          <input type="hidden" name="id" value={category.id} />

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1">
              <label htmlFor="cat-id" className="text-xs font-bold text-slate-500 mb-1 block">
                ID *
              </label>
              <input
                id="cat-id"
                value={category.id}
                disabled
                className="w-full p-3 border rounded-xl bg-slate-100 uppercase font-bold text-slate-500 cursor-not-allowed"
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
                defaultValue={category.name}
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="วัตถุดิบ..."
              />
            </div>
          </div>

          <input type="hidden" name="schema" value={schemaJson} />
          <input type="hidden" name="units" value={unitsJson} />

          {/* Optional change notes */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
            <label htmlFor="change-notes" className="text-xs font-bold text-amber-700 mb-2 block">
              หมายเหตุการเปลี่ยนแปลง (ถ้ามีการแก้ไข Schema)
            </label>
            <input
              id="change-notes"
              name="change_notes"
              className="w-full p-2 border border-amber-300 rounded-lg text-sm"
              placeholder="เช่น: เพิ่มฟิลด์วันหมดอายุ"
            />
          </div>

          {/* Units Builder */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <UnitsBuilder onUnitsChange={setUnitsJson} initialUnits={unitsJson} />
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
                <VisualSchemaDesigner onSchemaChange={setSchemaJson} initialSchema={schemaJson} />
              ) : (
                <SchemaBuilder onSchemaChange={setSchemaJson} initialSchema={schemaJson} />
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                ยกเลิก
              </Button>
            )}
            <SubmitButton className="flex-1 bg-indigo-600 text-white p-4 rounded-xl font-bold flex justify-center gap-2 hover:bg-indigo-700 shadow-lg transition-all">
              <Save size={18} strokeWidth={3} /> บันทึกการเปลี่ยนแปลง
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
