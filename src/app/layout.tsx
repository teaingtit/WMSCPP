import type { Metadata } from 'next';
import { Inter, Sarabun } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';
import GlobalLoadingProvider from '@/components/providers/GlobalLoadingProvider';
import BottomNav from '@/components/ui/BottomNav';
import { Toaster } from 'sonner';
import TableStacker from '@/components/ui/TableStacker';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
});

export const metadata: Metadata = {
  title: 'WMS DEMO',
  description: 'Warehouse Management System v.01',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-slate-50 font-sans antialiased',
          inter.variable,
          sarabun.variable,
        )}
      >
        {/* ✅ ห่อ GlobalLoadingProvider ไว้ชั้นนอกสุด (แต่ใน body) */}
        <GlobalLoadingProvider>
          <div className="app-container">{children}</div>
          <BottomNav />
          <TableStacker />
          <Toaster position="top-center" richColors />
        </GlobalLoadingProvider>
      </body>
    </html>
  );
}
