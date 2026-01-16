'use client';

import React from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Offline Page - Shown when the app is offline
 *
 * This page is displayed when:
 * - User is offline and tries to access a page
 * - Service worker detects no network connection
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-primary/10 p-6 rounded-full">
              <WifiOff className="w-16 h-16 text-primary" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">คุณออฟไลน์</h1>
          <p className="text-muted-foreground text-lg">ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้</p>
          <p className="text-sm text-muted-foreground/80">
            กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณและลองใหม่อีกครั้ง
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            ลองใหม่อีกครั้ง
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:from-primary/95 hover:to-primary/85 border border-primary/20 h-12 px-8 text-base active:scale-[0.98] select-none"
          >
            <Home className="w-4 h-4" />
            กลับหน้าหลัก
          </Link>
        </div>

        {/* Help Text */}
        <div className="pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground">ข้อมูลบางส่วนอาจยังใช้งานได้จากแคช</p>
        </div>
      </div>
    </div>
  );
}
