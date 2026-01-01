import LoadingOverlay from '@/components/ui/LoadingOverlay';

export default function Loading() {
  // ไฟล์นี้จะทำงานอัตโนมัติเมื่อ Next.js กำลังโหลดหน้าใหม่
  return <LoadingOverlay message="กำลังโหลดข้อมูล..." />;
}