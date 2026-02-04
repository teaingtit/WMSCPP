'use client';

import { Button } from '@/components/ui/button';
import { FileDown, Upload, Loader2, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';
import { useBulkInbound } from '@/hooks/useBulkInbound';

interface BulkInboundManagerProps {
  warehouseId: string;
  categories: Array<{ id: string; name: string }>;
  userId: string;
}

export default function BulkInboundManager({
  warehouseId,
  categories,
  userId,
}: BulkInboundManagerProps) {
  const { selectedCat, setSelectedCat, report, loading, handleDownload, handleUpload } =
    useBulkInbound({ warehouseId, userId });

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm space-y-6">
      {/* Header Section */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <FileSpreadsheet size={28} />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg">Bulk Inbound (นำเข้าแบบไฟล์)</h3>
          <p className="text-sm text-muted-foreground">
            ระบบจะตรวจสอบความถูกต้องของข้อมูลทุกบรรทัดก่อนบันทึก (All-or-Nothing)
          </p>
        </div>
      </div>

      {/* Control Section */}
      <div className="flex flex-col md:flex-row gap-5 items-end p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex-1 w-full">
          <label
            htmlFor="category-select"
            className="text-xs font-bold text-foreground mb-1.5 block"
          >
            1. เลือกหมวดหมู่สินค้า
          </label>
          <select
            id="category-select"
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full p-3 rounded-lg border border-border text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
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
            className="flex-1 bg-card hover:bg-accent h-[46px]"
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
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-[46px]"
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
            <div className="mt-2 bg-card rounded border border-red-200 dark:border-red-800 overflow-hidden">
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
