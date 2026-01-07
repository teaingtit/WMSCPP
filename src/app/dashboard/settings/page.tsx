import React from 'react';
import { requireAdmin } from '@/lib/auth-service';
import { getAllWarehousesForAdmin, getCategories, getProducts } from '@/actions/settings-actions';
import { getAllStatusDefinitions } from '@/actions/status-actions';
import { getUsers } from '@/actions/user-actions';
import { Settings } from 'lucide-react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';

export default async function SettingsPage() {
  const user = await requireAdmin();

  // Fetch Data ทั้งหมดเตรียมไว้
  const [warehouses, categories, users, products, statuses] = await Promise.all([
    getAllWarehousesForAdmin(),
    getCategories(),
    getUsers(),
    getProducts(),
    getAllStatusDefinitions(),
  ]);

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-6 pt-6 md:pt-10">
      {/* Page Header */}
      <div className="mb-8 md:mb-12 border-b border-slate-200 pb-6 md:pb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl">
            <Settings size={28} className="md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              System Configuration
            </h1>
            <p className="text-slate-500 font-medium text-sm md:text-base">
              Admin Control Panel • {user.email}
            </p>
          </div>
        </div>
      </div>

      <SettingsTabs
        users={users}
        warehouses={warehouses}
        categories={categories}
        products={products}
        statuses={statuses}
      />
    </div>
  );
}
