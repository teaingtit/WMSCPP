import type { Metadata } from 'next';
import { Inter, Sarabun } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';
import { Toaster } from 'sonner';
import GlobalLoadingProvider from '@/components/providers/GlobalLoadingProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const sarabun = Sarabun({ 
  weight: ['300', '400', '500', '600', '700'], 
  subsets: ['thai', 'latin'], 
  variable: '--font-sarabun' 
});

export const metadata: Metadata = {
  title: 'WMS Pro - Stable Edition',
  description: 'Warehouse Management System v.01',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={cn("min-h-screen bg-slate-50 font-sans antialiased", inter.variable, sarabun.variable)}>
        {/* ✅ ห่อ GlobalLoadingProvider ไว้ชั้นนอกสุด (แต่ใน body) */}
        <GlobalLoadingProvider>
            {children}
            <Toaster position="top-center" richColors />
        </GlobalLoadingProvider>
      </body>
    </html>
  );
}
