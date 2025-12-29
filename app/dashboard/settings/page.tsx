// app/dashboard/settings/page.tsx
import React from 'react';
import { requireAdmin } from '@/lib/auth-service';
// ✅ Import เพิ่ม
import { getAllWarehousesForAdmin, getCategories, getProducts } from '@/actions/settings-actions';
import { getUsers } from '@/actions/user-actions';

import { WarehouseManager, CategoryManager } from '@/components/settings/SettingsForms';
import UserManager from '@/components/settings/UserManager';
import ProductManager from '@/components/settings/ProductManager'; // ✅ Component ใหม่
import { Settings, Boxes, Tags, Users, Package } from 'lucide-react';

export default async function SettingsPage() {
  const user = await requireAdmin();

  // ✅ Fetch Products เพิ่มมาด้วย
  const [warehouses, categories, users, products] = await Promise.all([
    getAllWarehousesForAdmin(),
    getCategories(),
    getUsers(),
    getProducts()
  ]);

  return (
    <div className="max-w-7xl mx-auto pb-20 px-6 pt-10">
      
      {/* ... Header เดิม ... */}
      <div className="mb-12 border-b border-slate-200 pb-8">
        <div className="flex items-center gap-4 mb-2">
             <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl">
                <Settings size={32}/>
             </div>
             <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Configuration</h1>
                <p className="text-slate-500 font-medium">Admin Control Panel • {user.email}</p>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-16">
        
        {/* Section 1: User Management */}
        <section>
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shadow-sm">
                    <Users size={20}/>
                </div>
                <h2 className="text-xl font-bold text-slate-800">User Management</h2>
            </div>
            <UserManager users={users} warehouses={warehouses} />
        </section>

        <div className="h-px bg-slate-200 w-full"></div>

        {/* ✅ Section 2 (New): Product Master */}
        <section>
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shadow-sm">
                    <Package size={20}/>
                </div>
                <h2 className="text-xl font-bold text-slate-800">Product Master Data</h2>
            </div>
            <ProductManager products={products} categories={categories} />
        </section>

        <div className="h-px bg-slate-200 w-full"></div>

        {/* Section 3 & 4 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shadow-sm">
                        <Boxes size={20}/>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Warehouse Structure</h2>
                </div>
                <WarehouseManager warehouses={warehouses} />
            </section>

            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shadow-sm">
                        <Tags size={20}/>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Product Categories</h2>
                </div>
                <CategoryManager categories={categories} />
            </section>
        </div>

      </div>
    </div>
  );
}