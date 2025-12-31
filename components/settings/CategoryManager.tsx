'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { createCategory, deleteCategory } from '@/actions/settings-actions';
import { Plus, Trash2 } from 'lucide-react';
import SchemaBuilder from './SchemaBuilder';
import { SubmitButton } from '@/components/SubmitButton';

const initialState = { success: false, message: '' };

export const CategoryManager = ({ categories }: { categories: any[] }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [schemaJson, setSchemaJson] = useState('[]'); 

  const [createState, createAction] = useFormState(async (_prev: any, formData: FormData) => {
    return await createCategory(formData);
  }, initialState);

  const [deleteState, deleteAction] = useFormState(async (_prev: any, formData: FormData) => {
    return await deleteCategory(formData);
  }, initialState);

  useEffect(() => {
    if (createState.message) {
      if(createState.success) {
        alert(`✅ ${createState.message}`);
        formRef.current?.reset();
        setSchemaJson('[]');
      } else {
        alert(`❌ ${createState.message}`);
      }
    }
  }, [createState]);

  useEffect(() => {
    if (deleteState.message) {
        alert(deleteState.success ? `✅ ${deleteState.message}` : `❌ ${deleteState.message}`);
    }
  }, [deleteState]);

  return (
    <div className="space-y-8">
      <form ref={formRef} action={createAction} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid grid-cols-3 gap-4">
           <div className="col-span-1">
                <label htmlFor="cat-id" className="text-xs font-bold text-slate-500 mb-1 block">ID (เช่น RAW, FG)</label>
                <input id="cat-id" name="id" required className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 uppercase font-bold text-indigo-900 focus:ring-2 ring-indigo-500/20 outline-none" placeholder="RAW" />
           </div>
           <div className="col-span-2">
                <label htmlFor="cat-name" className="text-xs font-bold text-slate-500 mb-1 block">ชื่อประเภท</label>
                <input id="cat-name" name="name" required className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 ring-indigo-500/20 outline-none" placeholder="วัตถุดิบ..." />
           </div>
        </div>
        
        <input type="hidden" name="schema" value={schemaJson} />
        
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Dynamic Fields (Schema)</h4>
            <SchemaBuilder onSchemaChange={setSchemaJson} />
        </div>

        <SubmitButton className="w-full bg-indigo-600 text-white px-4 py-4 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]">
            <Plus size={18} strokeWidth={3} /> สร้างประเภทสินค้า
        </SubmitButton>
      </form>

      {/* List Categories */}
      <div className="border-t border-slate-100 pt-6">
        <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center justify-between">
            <span>ประเภทสินค้า</span>
            <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-1 rounded-md font-bold">{categories.length}</span>
        </h3>
        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {categories.map((cat) => (
                <div key={cat.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-all">
                    <div>
                        <div className="font-bold text-slate-700">{cat.name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {cat.id}</div>
                    </div>
                    <form action={deleteAction}>
                        <input type="hidden" name="id" value={cat.id} />
                        <SubmitButton className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                            <Trash2 size={18} />
                        </SubmitButton>
                    </form>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};