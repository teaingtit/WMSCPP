// app/dashboard/page.tsx
import Link from 'next/link';
import { getDashboardWarehouses } from '@/actions/dashboard-actions';
import { Building2, ArrowRight, ShieldCheck, Sparkles, Boxes } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth-service';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const warehouses = await getDashboardWarehouses();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24 lg:pb-8">
      {/* Welcome Banner - Modern Glass Design */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-6 sm:p-8 lg:p-10 text-white animate-fade-in">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-indigo-400/10 rounded-full blur-xl" />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-blue-200" />
            <span className="text-sm font-medium text-blue-100/80">
              {user?.role === 'admin' ? 'ผู้ดูแลระบบ (Administrator)' : 'พนักงาน (Staff)'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 tracking-tight">
            ยินดีต้อนรับกลับ 👋
          </h1>

          <p className="text-blue-100/90 text-sm sm:text-base max-w-lg leading-relaxed">
            {user?.role === 'admin'
              ? 'คุณสามารถควบคุมและจัดการระบบคลังสินค้าทั้งหมดได้จากที่นี่'
              : 'เลือกคลังสินค้าที่คุณได้รับมอบหมายเพื่อเริ่มต้นการทำงาน'}
          </p>

          {/* User Badge */}
          <div className="mt-6 inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-white/20">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
            <div>
              <div className="text-xs text-blue-100/70">เข้าสู่ระบบโดย</div>
              <div className="text-sm font-semibold truncate max-w-[200px]">{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">คลังสินค้าของคุณ</h2>
            <p className="text-sm text-muted-foreground">{warehouses.length} คลังสินค้า</p>
          </div>
        </div>
      </div>

      {/* Warehouse Grid - Responsive & Touch-Friendly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 stagger-children">
        {warehouses.map((wh, index) => (
          <Link
            key={wh.id}
            href={`/dashboard/${wh.code}`}
            className="group relative bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 block overflow-hidden"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {/* Hover Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-600/5 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />

            {/* Header */}
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="p-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-500 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-primary/25">
                <Building2 size={24} />
              </div>
              {wh.is_active && (
                <span className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  ออนไลน์
                </span>
              )}
            </div>

            {/* Content */}
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                {wh.name}
              </h3>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  CODE: {wh.code}
                </span>
              </div>
            </div>

            {/* Action */}
            <div className="flex items-center justify-between text-sm font-bold text-primary relative z-10 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span>เข้าสู่ระบบจัดการ</span>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </div>
            </div>
          </Link>
        ))}

        {/* Empty State */}
        {warehouses.length === 0 && (
          <div className="col-span-full">
            <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-700 text-center">
              <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-5 text-slate-500">
                <Boxes size={36} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ไม่มีคลังสินค้า</h3>
              <p className="text-slate-500 text-sm max-w-sm">
                คุณยังไม่มีสิทธิ์เข้าถึงคลังสินค้าใดๆ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การเข้าถึง
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
