// app/dashboard/settings/page.tsx
import React from 'react';
import { Settings, Plus } from 'lucide-react';
import { WarehouseForm, CategoryForm } from '@/components/settings/SettingsForms';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 space-y-10">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
        <Settings className="text-indigo-600" /> ตั้งค่าระบบ (System Config)
      </h1>

      {/* 1. Create Warehouse Form */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus size={20} /> เพิ่มคลังสินค้าใหม่
        </h2>
        <WarehouseForm />
      </section>

      {/* 2. Create Category Form */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus size={20} /> เพิ่มประเภทสินค้า (Dynamic Category)
        </h2>
        <CategoryForm />
      </section>
    </div>
  );
}