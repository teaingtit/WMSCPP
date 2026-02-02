import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-400 font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );
}
