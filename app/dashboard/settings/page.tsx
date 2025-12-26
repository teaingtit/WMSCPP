// app/dashboard/settings/page.tsx
import React from 'react';
import { Settings, Building2, Package } from 'lucide-react';
import { getProductCategories } from '@/actions/inbound-actions'; // Reuse Action เดิมเพื่อดึงข้อมูล
import { WarehouseForm, CategoryManager } from '@/components/settings/SettingsForms';

export default async function SettingsPage() {
  // 1. Fetch Data (Server Side)
  // ดึงข้อมูล Categories ทั้งหมดเพื่อส่งไปแสดงรายการใน CategoryManager
  const categories = await getProductCategories();

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-10 pb-20">
      
      {/* --- Page Header --- */}
      <div>
         <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                <Settings size={32} />
            </div>
            ตั้งค่าระบบ (System Configuration)
         </h1>
         <p className="text-slate-500 mt-3 ml-1 md:ml-20 text-lg font-medium">
            จัดการโครงสร้างคลังสินค้า และกำหนดประเภทสินค้าแบบ Dynamic
         </p>
      </div>

      {/* --- Section 1: Warehouse Management --- */}
      <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Building2 size={24} />
               </div>
               <div>
                   <h2 className="text-xl font-bold text-slate-800">คลังสินค้า (Warehouses)</h2>
                   <p className="text-sm text-slate-400">สร้างคลังสินค้าใหม่เพื่อเริ่มจัดเก็บสต็อก</p>
               </div>
            </div>

            {/* Form Component */}
            <div className="max-w-3xl">
                <WarehouseForm />
            </div>
        </div>
      </section>

      {/* --- Section 2: Category Management --- */}
      <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>

        <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
               <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                  <Package size={24} />
               </div>
               <div>
                   <h2 className="text-xl font-bold text-slate-800">ประเภทสินค้า (Product Categories)</h2>
                   <p className="text-sm text-slate-400">กำหนดโครงสร้างข้อมูลสินค้า (Schema) ให้สอดคล้องกับสินค้าแต่ละชนิด</p>
               </div>
            </div>

            {/* Manager Component (รวม Form และ List ไว้ในตัวเดียว) */}
            <CategoryManager categories={categories} />
        </div>
      </section>

    </div>
  );
}