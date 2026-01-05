// สร้างไฟล์ใหม่ที่: app/dashboard/[warehouseId]/audit/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function AuditLoading() {
  return (
    <div className="space-y-6">
      {/* Skeleton for PageHeader. We can't use the real component 
          because loading.tsx doesn't receive URL params like 'warehouseId'. */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">ประวัติการตรวจนับ (Audit History)</h2>
          <Skeleton className="h-10 w-[150px]" /> {/* Skeleton for the "เปิดรอบนับใหม่" button */}
        </div>
        <div className="grid gap-4">
          {/* Skeleton for 3 session list items */}
          <Skeleton className="h-[98px] w-full rounded-lg" />
          <Skeleton className="h-[98px] w-full rounded-lg" />
          <Skeleton className="h-[98px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
