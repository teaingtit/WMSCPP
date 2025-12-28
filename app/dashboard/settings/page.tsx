import React from 'react';
import { getWarehouses, getCategories } from '@/actions/settings-actions'; // ตรวจสอบว่า import action ถูกต้อง
// ✅ FIX: เปลี่ยนจาก WarehouseForm เป็น WarehouseManager และ CategoryForm เป็น CategoryManager
import { WarehouseManager, CategoryManager } from '@/components/settings/SettingsForms';
import { Settings, Boxes, Tags } from 'lucide-react';

export default async function SettingsPage() {
  // ดึงข้อมูลจาก Server Actions
  const warehouses = await getWarehouses();
  const categories = await getCategories();

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="mb-8 border-b border-slate-100 pb-6">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
           <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
               <Settings size={24}/>
           </div>
           ตั้งค่าระบบ (System Settings)
        </h1>
        <p className="text-slate-500 ml-12">จัดการข้อมูลพื้นฐาน คลังสินค้า และประเภทสินค้า</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Section 1: Warehouse Management */}
        <div>
            <div className="flex items-center gap-2 mb-6">
                <Boxes className="text-indigo-600"/>
                <h2 className="text-xl font-bold text-slate-800">จัดการคลังสินค้า</h2>
            </div>
            {/* ✅ FIX: เรียกใช้ Component ชื่อใหม่ */}
            <WarehouseManager warehouses={warehouses} />
        </div>

        {/* Section 2: Category Management */}
        <div>
            <div className="flex items-center gap-2 mb-6">
                <Tags className="text-indigo-600"/>
                <h2 className="text-xl font-bold text-slate-800">จัดการประเภทสินค้า</h2>
            </div>
            {/* ✅ FIX: เรียกใช้ Component ชื่อใหม่ */}
            <CategoryManager categories={categories} />
        </div>

      </div>
    </div>
  );
}