import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ออฟไลน์ - WMS คลังสินค้า',
  description: 'คุณกำลังออฟไลน์ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
  robots: 'noindex, nofollow',
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
