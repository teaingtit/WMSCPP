'use client';

import { useState } from 'react';
import { downloadInboundTemplate, importInboundStock } from '@/actions/bulk-import-actions';
import { Button } from '@/components/ui/button';
import { FileDown, Upload, Loader2, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  warehouseId: string;
  categories: any[];
  userId: string;
}

export default function BulkInboundManager({ warehouseId, categories, userId }: Props) {
  const [selectedCat, setSelectedCat] = useState('');
  const [loading, setLoading] = useState(false);

  // State สำหรับเก็บผลลัพธ์ Report
  const [report, setReport] = useState<{ total: number; failed: number; errors: string[] } | null>(
    null,
  );

  const handleDownload = async (): Promise<void> => {
    if (!selectedCat) {
      toast.error('กรุณาเลือกหมวดหมู่สินค้าก่อน');
      return;
    }
    try {
      setLoading(true);
      const res = await downloadInboundTemplate(warehouseId, selectedCat);
      if (res?.base64) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.base64}`;
        link.download = res.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('ดาวน์โหลด Template สำเร็จ');
      } else {
        toast.error('ไม่สามารถสร้าง Template ได้');
      }
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการดาวน์โหลด');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCat) return;

    setLoading(true);
    setReport(null); // Reset Report ก่อนเริ่ม

    const formData = new FormData();
    formData.append('file', file);
    formData.append('warehouseId', warehouseId);
    formData.append('categoryId', selectedCat);
    formData.append('userId', userId);

    const res = await importInboundStock(formData);
    setLoading(false);

    // Reset Input File ให้เลือกไฟล์เดิมซ้ำได้ถ้าแก้แล้ว
    e.target.value = '';

    if (res.success) {
      toast.success(res.message);
      setReport({ total: res.report?.total || 0, failed: 0, errors: [] });
    } else {
      toast.error('การนำเข้าข้อมูลไม่สำเร็จ');
      if (res.report) {
        setReport(res.report);
      } else {
        // Fallback กรณี Error ทั่วไป
        setReport({ total: 0, failed: 1, errors: [res.message] });
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm space-y-6">
      {/* Header Section */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
          <FileSpreadsheet size={28} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Bulk Inbound (นำเข้าแบบไฟล์)</h3>
          <p className="text-sm text-slate-500">
            ระบบจะตรวจสอบความถูกต้องของข้อมูลทุกบรรทัดก่อนบันทึก (All-or-Nothing)
          </p>
        </div>
      </div>

      {/* Control Section */}
      <div className="flex flex-col md:flex-row gap-5 items-end p-4 bg-slate-50/50 rounded-lg border border-slate-100">
        <div className="flex-1 w-full">
          <label
            htmlFor="category-select"
            className="text-xs font-bold text-slate-600 mb-1.5 block"
          >
            1. เลือกหมวดหมู่สินค้า
          </label>
          <select
            id="category-select"
            value={selectedCat}
            onChange={(e) => {
              setSelectedCat(e.target.value);
              setReport(null);
            }}
            className="w-full p-3 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
          >
            <option value="">-- กรุณาเลือกหมวดหมู่ --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            disabled={!selectedCat || loading}
            onClick={handleDownload}
            className="flex-1 bg-white hover:bg-slate-50 h-[46px]"
          >
            <FileDown size={16} className="mr-2 text-emerald-600" /> โหลด Template
          </Button>

          <div className="relative flex-1">
            <input
              type="file"
              disabled={!selectedCat || loading}
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              accept=".xlsx"
              title="Upload Excel"
              aria-label="Upload Excel"
            />
            <Button
              disabled={!selectedCat || loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white h-[46px]"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <Upload size={16} className="mr-2" />
              )}
              อัปโหลดไฟล์
            </Button>
          </div>
        </div>
      </div>

      {/* Report Section (แสดงเมื่อมีผลลัพธ์) */}
      {report && (
        <div
          className={`rounded-lg border p-4 ${
            report.failed > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            {report.failed > 0 ? (
              <XCircle className="text-red-600" size={24} />
            ) : (
              <CheckCircle2 className="text-green-600" size={24} />
            )}
            <div>
              <h4 className={`font-bold ${report.failed > 0 ? 'text-red-800' : 'text-green-800'}`}>
                {report.failed > 0 ? 'นำเข้าล้มเหลว' : 'นำเข้าสำเร็จ'}
              </h4>
              <p className="text-xs opacity-80">
                ตรวจสอบ {report.total} รายการ | ผ่าน {report.total - report.failed} | ไม่ผ่าน{' '}
                {report.failed}
              </p>
            </div>
          </div>

          {report.failed > 0 && report.errors.length > 0 && (
            <div className="mt-2 bg-white rounded border border-red-200 overflow-hidden">
              <div className="px-3 py-2 bg-red-100/50 text-xs font-bold text-red-700 border-b border-red-100">
                รายการข้อผิดพลาด (กรุณาแก้ไขแล้วอัปโหลดใหม่)
              </div>
              <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                {report.errors.map((err, idx) => (
                  <div key={idx} className="text-xs text-red-600 flex gap-2">
                    <span className="font-mono text-red-400 select-none">•</span>
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
