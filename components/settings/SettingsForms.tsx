// components/settings/SettingsForms.tsx
'use client';

import React, { useRef } from 'react';
import { createWarehouse, createCategory } from '@/actions/settings-actions';
import { Save, Plus } from 'lucide-react';

// --- Wrapper Function เพื่อจัดการ Response ---
// ฟังก์ชันนี้จะทำหน้าที่เป็น "ตัวกลาง" รับข้อมูลจาก Form -> ส่งให้ Server -> รับผลลัพธ์มาแจ้งเตือน
const handleAction = async (
  action: (formData: FormData) => Promise<{ success: boolean; message: string }>,
  formData: FormData,
  formRef: React.RefObject<HTMLFormElement>
) => {
  const result = await action(formData);
  if (result.success) {
    alert(`✅ สำเร็จ: ${result.message}`); // หรือใช้ Toast Library ในอนาคต
    formRef.current?.reset(); // ล้างฟอร์มเมื่อสำเร็จ
  } else {
    alert(`❌ ผิดพลาด: ${result.message}`);
  }
};

export const WarehouseForm = () => {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form 
      ref={formRef}
      action={(formData) => handleAction(createWarehouse, formData, formRef)} 
      className="flex gap-4 items-end"
    >
      <div className="flex-1">
        <label className="block text-xs font-bold text-slate-500 mb-1">รหัสคลัง (Code)</label>
        <input name="code" placeholder="WH-NEW" required className="w-full p-2 border rounded-lg bg-slate-50 uppercase" />
      </div>
      <div className="flex-[2]">
        <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อคลังสินค้า</label>
        <input name="name" placeholder="คลังสินค้าใหม่..." required className="w-full p-2 border rounded-lg bg-slate-50" />
      </div>
      <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 flex items-center gap-2">
        <Save size={16} /> บันทึก
      </button>
    </form>
  );
};

export const CategoryForm = () => {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form 
      ref={formRef}
      action={(formData) => handleAction(createCategory, formData, formRef)} 
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
         <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ID ประเภท</label>
            <input name="id" placeholder="FROZEN" required className="w-full p-2 border rounded-lg bg-slate-50 uppercase" />
         </div>
         <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อประเภท</label>
            <input name="name" placeholder="อาหารแช่แข็ง" required className="w-full p-2 border rounded-lg bg-slate-50" />
         </div>
      </div>
      
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">Form Schema (JSON)</label>
        <textarea 
            name="schema" 
            rows={5}
            className="w-full p-3 border rounded-lg bg-slate-900 text-green-400 font-mono text-xs"
            defaultValue={`[
  { "key": "temp_c", "label": "อุณหภูมิ (°C)", "type": "number", "required": true },
  { "key": "exp_date", "label": "วันหมดอายุ", "type": "date", "required": true }
]`}
        />
        <p className="text-xs text-slate-400 mt-1">กำหนด Field รับข้อมูลพิเศษสำหรับสินค้านี้</p>
      </div>

      <button type="submit" className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
        <Save size={16} /> สร้างประเภทสินค้า
      </button>
    </form>
  );
};