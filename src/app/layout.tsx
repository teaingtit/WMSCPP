import type { Metadata, Viewport } from 'next';
import { Inter, Sarabun } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';
import GlobalLoadingProvider from '@/components/providers/GlobalLoadingProvider';
import BottomNav from '@/components/ui/BottomNav';
import { Toaster } from 'sonner';
import TableStacker from '@/components/ui/TableStacker';
import { SkipLink } from '@/components/ui/SkipLink';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
});

export const metadata: Metadata = {
  title: 'WMS คลังสินค้า',
  description: 'ระบบบริหารจัดการคลังสินค้า (Warehouse Management System)',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WMS คลังสินค้า',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#3b82f6',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body
        className={cn(
          'min-h-screen bg-slate-50 font-sans antialiased',
          inter.variable,
          sarabun.variable,
        )}
      >
        {/* ✅ ห่อ GlobalLoadingProvider ไว้ชั้นนอกสุด (แต่ใน body) */}
        <GlobalLoadingProvider>
          <SkipLink />
          {/* ARIA Live Region for Screen Readers */}
          <div
            id="aria-live-announcements"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          />
          <div
            id="aria-live-assertive"
            aria-live="assertive"
            aria-atomic="true"
            className="sr-only"
          />
          <div className="app-container" id="main-content">
            {children}
          </div>
          <BottomNav />
          <TableStacker />
          <Toaster position="top-center" richColors />
        </GlobalLoadingProvider>
      </body>
    </html>
  );
}
