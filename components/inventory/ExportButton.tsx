'use client';

import { useState } from 'react';
import { exportInventoryToExcel } from '@/actions/export-actions';
import { Button } from '@/components/ui/button';
import { Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';


export default function ExportButton({ warehouseId }: { warehouseId: string }) {
  const [loading] = useState(false);
const { setIsLoading } = useGlobalLoading();
  const handleExport = async () => {
    setIsLoading(true);
    const toastId = toast.loading('กำลังสร้างไฟล์ Excel...');

    try {
      const result = await exportInventoryToExcel(warehouseId);

      if (result.success && result.data) {
        // แปลง Base64 กลับเป็น Blob เพื่อดาวน์โหลด
        const binaryString = window.atob(result.data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // สร้าง Link ชั่วคราวเพื่อกด Download
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = result.fileName || 'inventory-export.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('ดาวน์โหลดสำเร็จ', { id: toastId });
      } else {
        toast.error(result.error || 'Export ล้มเหลว', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleExport} 
      disabled={loading}
      className="bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200 transition-all gap-2 shadow-sm"
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
      <span className="hidden md:inline font-medium">Export Excel</span>
    </Button>
  );
}