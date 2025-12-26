// components/settings/SettingsForms.tsx
'use client';

import React, { useRef, useState } from 'react'; // ✅ ต้องมี useState ตรงนี้
import { createWarehouse, createCategory, deleteWarehouse, deleteCategory } from '@/actions/settings-actions';
import { Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import SchemaBuilder from './SchemaBuilder';

// --- Wrapper Function ---
const handleAction = async (
  action: (formData: FormData) => Promise<{ success: boolean; message: string }>,
  formData: FormData,
  formRef: React.RefObject<HTMLFormElement>
) => {
  const result = await action(formData);
  if (result.success) {
    alert(`✅ สำเร็จ: ${result.message}`);
    formRef.current?.reset();
  } else {
    alert(`❌ ผิดพลาด: ${result.message}`);
  }
};

// --- Warehouse Form ---
export const WarehouseForm = () => {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form 
      ref={formRef}
      action={(formData) => handleAction(createWarehouse, formData, formRef)} 
      className="space-y-4"
    >
      <div className="flex gap-4 items-end">
        <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">รหัสคลัง (Code)</label>
            <input name="code" placeholder="WH-Main" required className="w-full p-2 border rounded-lg bg-slate-50 uppercase" />
        </div>
        <div className="flex-[2]">
            <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อคลังสินค้า</label>
            <input name="name" placeholder="คลังสินค้าหลัก..." required className="w-full p-2 border rounded-lg bg-slate-50" />
        </div>
      </div>

      {/* ส่วนกำหนดโครงสร้าง (Structure Config) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
         <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">จำนวน LOT สูงสุด</label>
            <input type="number" name="max_lots" defaultValue="5" min="1" max="50" required className="w-full p-2 border rounded-lg" />
            <span className="text-[10px] text-slate-400">โซน/แถว (L01, L02...)</span>
         </div>
         <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">จำนวน Cart/Lot</label>
            <input type="number" name="max_carts" defaultValue="10" min="1" max="100" required className="w-full p-2 border rounded-lg" />
            <span className="text-[10px] text-slate-400">แคร่ในแต่ละแถว (C01, C02...)</span>
         </div>
      </div>

      <button type="submit" className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg font-bold hover:bg-slate-800 flex items-center justify-center gap-2">
        <Save size={16} /> สร้างคลังสินค้าและ Generate Locations
      </button>
    </form>
  );
};

// --- Category Manager (รวม Form + List) ---
export const CategoryManager = ({ categories }: { categories: any[] }) => {
  const formRef = useRef<HTMLFormElement>(null);
  // ✅ เรียกใช้ useState ได้แล้ว เพราะ import มาถูกต้อง
  const [schemaJson, setSchemaJson] = useState('[]'); 

  return (
    <div className="space-y-8">
      {/* 1. Form สร้างใหม่ */}
      <form 
        ref={formRef}
        action={(formData) => handleAction(createCategory, formData, formRef)} 
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">ID ประเภท (ภาษาอังกฤษ)</label>
              <input name="id" placeholder="FROZEN" required className="w-full p-2 border rounded-lg bg-slate-50 uppercase" />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อประเภท (ภาษาไทย)</label>
              <input name="name" placeholder="อาหารแช่แข็ง" required className="w-full p-2 border rounded-lg bg-slate-50" />
           </div>
        </div>
        
        {/* Schema Builder */}
        <input type="hidden" name="schema" value={schemaJson} />
        <SchemaBuilder onSchemaChange={setSchemaJson} />

        <button type="submit" className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
          <Save size={16} /> สร้างประเภทสินค้า
        </button>
      </form>

      {/* 2. รายการที่มีอยู่ (List & Delete) */}
      <div className="border-t border-slate-100 pt-6">
        <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
            ประเภทสินค้าที่มีอยู่ 
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{categories.length}</span>
        </h3>
        
        {categories.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-sm">
                ยังไม่มีประเภทสินค้าในระบบ
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map((cat) => (
                    <div key={cat.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 transition-all group">
                        <div>
                            <div className="font-bold text-slate-700">{cat.name}</div>
                            <div className="text-xs text-slate-400 font-mono bg-slate-50 px-1 rounded inline-block mt-1">{cat.id}</div>
                        </div>
                        
                        <form action={(formData) => handleAction(deleteCategory, formData, { current: null } as any)}>
                            <input type="hidden" name="id" value={cat.id} />
                            <button 
                                type="submit"
                                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100" 
                                title="ลบรายการ"
                                onClick={(e) => {
                                    if(!confirm(`ยืนยันการลบประเภท "${cat.name}"?`)) e.preventDefault();
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </form>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};