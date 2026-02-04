import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({ message = 'กำลังประมวลผล...' }: { message?: string }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-300"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="bg-card border border-border p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75" />
          <div className="relative bg-primary/10 p-3 rounded-full border border-primary/20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-foreground">{message}</h3>
          <p className="text-xs text-muted-foreground mt-1">กรุณารอสักครู่</p>
        </div>
      </div>
    </div>
  );
}
