'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="th">
      <body className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Error Card */}
          <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h1 className="text-xl font-bold">เกิดข้อผิดพลาด</h1>
                  <p className="text-white/80 text-sm mt-1">Something went wrong</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                ขออภัย ระบบเกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่
                กรุณาติดต่อผู้ดูแลระบบ
              </p>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-muted rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                    <Bug size={14} />
                    รายละเอียดข้อผิดพลาด
                  </div>
                  <p className="text-xs font-mono text-rose-600 dark:text-rose-400 break-all">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="text-xs text-muted-foreground">
                      Error ID: <code className="font-mono">{error.digest}</code>
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors active:scale-[0.98]"
                >
                  <RefreshCw size={18} />
                  ลองใหม่อีกครั้ง
                </button>
                <a
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-muted text-foreground rounded-xl font-semibold text-sm hover:bg-accent transition-colors active:scale-[0.98]"
                >
                  <Home size={18} />
                  หน้าหลัก
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                ข้อผิดพลาดนี้ถูกบันทึกและส่งให้ทีมพัฒนาแล้วโดยอัตโนมัติ
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
