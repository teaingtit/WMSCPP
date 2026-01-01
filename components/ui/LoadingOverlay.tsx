import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({ message = 'กำลังประมวลผล...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] transition-all duration-300">
      <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-white p-2 rounded-full border border-indigo-100">
             <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          </div>
        </div>
        <div className="text-center">
            <h3 className="text-sm font-bold text-slate-800">{message}</h3>
            <p className="text-xs text-slate-500 mt-1">กรุณารอสักครู่ ห้ามปิดหน้าต่างนี้</p>
        </div>
      </div>
    </div>
  );
}