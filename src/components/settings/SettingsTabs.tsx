'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, Tags, Boxes, Palette, Calendar } from 'lucide-react';
import UserManager from '@/components/settings/UserManager';
import CategoryManager from '@/components/settings/CategoryManager';
import { WarehouseManager } from '@/components/settings/WarehouseManager';
import { StatusManager } from '@/components/settings/StatusManager';
import ReportScheduleManager from '@/components/settings/ReportScheduleManager';
import { User, Warehouse, Category, Product } from '@/types/settings';
import { StatusDefinition } from '@/types/status';

function ReportsTabContent({ warehouses }: { warehouses: Warehouse[] }) {
  const [selectedId, setSelectedId] = useState<string>(warehouses[0]?.id ?? '');
  const selected = warehouses.find((w) => w.id === selectedId);

  // Keep selectedId in sync when warehouses list changes (e.g. warehouse deleted)
  useEffect(() => {
    const hasSelected = warehouses.some((w) => w.id === selectedId);
    if (!hasSelected && warehouses.length > 0) {
      setSelectedId(warehouses[0]!.id);
    } else if (warehouses.length === 0) {
      setSelectedId('');
    }
  }, [warehouses, selectedId]);

  if (warehouses.length === 0) {
    return (
      <div className="flex items-center gap-3 mb-6 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
        <p className="text-slate-600">ไม่มีคลังสินค้า กรุณาสร้างคลังก่อน</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
        <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shadow-sm">
          <Calendar size={20} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800">รายงานอัตโนมัติ</h2>
          <p className="text-sm text-slate-500">
            ตั้งค่าการส่งรายงานทางอีเมลตามกำหนด (สรุปสินค้าคงคลัง, สรุปการเคลื่อนไหว)
          </p>
        </div>
        <label
          htmlFor="reports-warehouse"
          className="flex items-center gap-2 text-sm font-medium text-slate-700"
        >
          <span>คลัง:</span>
          <select
            id="reports-warehouse"
            aria-label="เลือกคลังสินค้า"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </label>
      </div>
      {selected && (
        <ReportScheduleManager warehouseId={selected.id} warehouseName={selected.name} />
      )}
    </>
  );
}

interface SettingsTabsProps {
  users: User[];
  warehouses: Warehouse[];
  categories: Category[];
  products: Product[];
  statuses: StatusDefinition[];
}

export function SettingsTabs({
  users,
  warehouses,
  categories,
  products,
  statuses,
}: SettingsTabsProps) {
  return (
    <Tabs defaultValue="users" className="w-full space-y-6">
      <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        <TabsList className="h-auto p-1 bg-slate-100/80 backdrop-blur rounded-xl border border-slate-200 inline-flex min-w-full md:min-w-fit justify-start md:justify-center gap-1">
          <TabsTrigger
            value="users"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
          >
            <Users size={16} />
            <span>User Management</span>
          </TabsTrigger>

          <TabsTrigger
            value="products"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all"
          >
            <Tags size={16} />
            <span>Product Master</span>
          </TabsTrigger>

          <TabsTrigger
            value="warehouses"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
          >
            <Boxes size={16} />
            <span>Warehouses</span>
          </TabsTrigger>

          <TabsTrigger
            value="statuses"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm transition-all"
          >
            <Palette size={16} />
            <span>Status Design</span>
          </TabsTrigger>

          <TabsTrigger
            value="reports"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all"
          >
            <Calendar size={16} />
            <span>รายงานอัตโนมัติ</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="min-h-[600px] animate-fade-in">
        <TabsContent value="users" className="space-y-6 outline-none">
          <div className="flex items-center gap-3 mb-6 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shadow-sm">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">User Management</h2>
              <p className="text-sm text-slate-500">
                Manage system access, roles, and permissions.
              </p>
            </div>
          </div>
          <UserManager users={users} warehouses={warehouses} />
        </TabsContent>

        <TabsContent value="products" className="space-y-6 outline-none">
          <div className="flex items-center gap-3 mb-6 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shadow-sm">
              <Tags size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Product Categories & Master Data</h2>
              <p className="text-sm text-slate-500">
                Configure product categories, attributes, and global SKU list.
              </p>
            </div>
          </div>
          <CategoryManager categories={categories} products={products} />
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-6 outline-none">
          <div className="flex items-center gap-3 mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shadow-sm">
              <Boxes size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Warehouse Structure</h2>
              <p className="text-sm text-slate-500">
                Manage warehouse locations, zones, and shelving configurations.
              </p>
            </div>
          </div>
          <WarehouseManager warehouses={warehouses} />
        </TabsContent>

        <TabsContent value="statuses" className="space-y-6 outline-none">
          <div className="flex items-center gap-3 mb-6 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shadow-sm">
              <Palette size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Status Design System</h2>
              <p className="text-sm text-slate-500">
                Define custom statuses with colors and transaction effects for inventory items.
              </p>
            </div>
          </div>
          <StatusManager statuses={statuses} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 outline-none">
          <ReportsTabContent warehouses={warehouses} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
