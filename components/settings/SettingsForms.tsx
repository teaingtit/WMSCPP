// components/settings/SettingsForms.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { createWarehouse, createCategory, deleteWarehouse, deleteCategory } from '@/actions/settings-actions';
import { Save, Trash2, Building2, Plus, Box } from 'lucide-react';
import SchemaBuilder from './SchemaBuilder';
import { SubmitButton } from '../SubmitButton';

// Initial State
const initialState = { success: false, message: '' };

// --- Warehouse Manager ---
export const WarehouseManager = ({ warehouses }: { warehouses: any[] }) => {
  const formRef = useRef<HTMLFormElement>(null);

  // ✅ FIX: สร้าง Wrapper รับ (prevState, formData) เพื่อให้ตรงกับ Type ของ useFormState
  const [createState, createAction] = useFormState(async (_prev: any, formData: FormData) => {
    return await createWarehouse(formData);
  }, initialState);

  const [deleteState, deleteAction] = useFormState(async (_prev: any, formData: FormData) => {
    return await deleteWarehouse(formData);
  }, initialState);

  // Effect Handle Result
  useEffect(() => {
    if (createState.message) {
      if (createState.success) {
        alert(`✅ ${createState.message}`);
        formRef.current?.reset();
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
      {/* 1. Form Create */}
      <form 
        ref={formRef}
        action={createAction} 
        className="space-y-6 animate-in fade-in slide-in-from-bottom-4"
      >
        <div className="flex gap-4 items-end">
            <div className="flex-1">
                <label htmlFor="wh-code" className="block text-xs font-bold text-slate-500 mb-1">รหัสคลัง</label>
                <input id="wh-code" name="code" placeholder="WH-MAIN" required className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 uppercase font-bold text-indigo-900 focus:ring-2 ring-indigo-500/20 outline-none" />
            </div>
            <div className="flex-[2]">
                <label htmlFor="wh-name" className="block text-xs font-bold text-slate-500 mb-1">ชื่อคลังสินค้า</label>
                <input id="wh-name" name="name" placeholder="คลังสินค้าหลัก..." required className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 ring-indigo-500/20 outline-none" />
            </div>
        </div>

        {/* 3D Config */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
             <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Box size={16} className="text-indigo-500"/>
                โครงสร้างพิกัด (Grid Structure)
             </h4>
             <div className="grid grid-cols-3 gap-6">
                <div>
                   {/* ✅ FIX: เพิ่ม htmlFor และ id แก้ปัญหา Accessibility */}
                   <label htmlFor="max_lots" className="block text-xs font-bold text-slate-400 mb-1 text-center">LOT (แถว)</label>
                   <input id="max_lots" type="number" name="max_lots" defaultValue="5" min="1" max="50" required className="w-full p-3 border rounded-xl text-center font-bold text-slate-700" />
                </div>
                <div>
                   <label htmlFor="max_carts" className="block text-xs font-bold text-slate-400 mb-1 text-center">CART (ตะกร้า)</label>
                   <input id="max_carts" type="number" name="max_carts" defaultValue="10" min="1" max="100" required className="w-full p-3 border rounded-xl text-center font-bold text-slate-700" />
                </div>
                <div>
                   <label htmlFor="max_levels" className="block text-xs font-bold text-indigo-500 mb-1 text-center">LEVEL (ชั้น)</label>
                   <input id="max_levels" type="number" name="max_levels" defaultValue="3" min="1" max="10" required className="w-full p-3 border-2 border-indigo-100 bg-white rounded-xl text-center font-bold text-indigo-700 shadow-sm" />
                </div>
             </div>
        </div>

        <SubmitButton className="w-full bg-slate-900 text-white px-4 py-4 rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
            <Save size={18} /> สร้างคลังและ Generate Locations
        </SubmitButton>
      </form>

      {/* 2. List & Delete */}
      <div className="border-t border-slate-100 pt-6">
         <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center justify-between">
            <span>คลังสินค้าที่มีอยู่</span>
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md">{warehouses.length}</span>
         </h3>
         <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {warehouses.map((wh) => (
                <div key={wh.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors">
                            <Building2 size={20}/>
                        </div>
                        <div>
                            <div className="font-bold text-slate-700">{wh.name}</div>
                            <div className="text-xs text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded inline-block mt-1 border border-slate-100">{wh.code}</div>
                        </div>
                    </div>
                    <form action={deleteAction}>
                        <input type="hidden" name="id" value={wh.id} />
                        <SubmitButton 
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
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
    </div>
  );
};

// --- Category Manager ---
export const CategoryManager = ({ categories }: { categories: any[] }) => {
  // ✅ FIX: Wrapper เหมือนด้านบน
  const [createState, createAction] = useFormState(async (_prev: any, formData: FormData) => {
    return await createCategory(formData);
  }, initialState);

  const [deleteState, deleteAction] = useFormState(async (_prev: any, formData: FormData) => {
    return await deleteCategory(formData);
  }, initialState);
  
  const formRef = useRef<HTMLFormElement>(null);
  const [schemaJson, setSchemaJson] = useState('[]'); 

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