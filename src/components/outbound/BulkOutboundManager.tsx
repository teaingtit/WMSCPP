'use client';

import { useState } from 'react';
import { downloadOutboundTemplate, importBulkOutbound } from '@/actions/bulk-outbound-actions';
import { Button } from '@/components/ui/button';
import {
  FileDown,
  Upload,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  LogOut,
} from 'lucide-react';
import { notify } from '@/lib/ui-helpers';

interface Props {
  warehouseId: string;
}

interface ReportState {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export default function BulkOutboundManager({ warehouseId }: Props) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportState | null>(null);

  const handleDownload = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await downloadOutboundTemplate(warehouseId);

      if (res.success && res.base64) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.base64}`;
        link.download = res.fileName || 'Outbound_Template.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        notify.success('ดาวน์โหลด Template สำเร็จ');
      } else {
        notify.error(res.message || 'ไม่สามารถสร้าง Template ได้');
      }
    } catch (error: any) {
      notify.error(error.message || 'เกิดข้อผิดพลาดในการดาวน์โหลด');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setReport(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('warehouseId', warehouseId);

      const res = await importBulkOutbound(formData);

      // Reset file input
      e.target.value = '';

      if (res.success) {
        notify.success(res.message ?? '');
        setReport({
          total: res.report?.total || 0,
          success: res.report?.success || 0,
          failed: 0,
          errors: [],
        });
      } else {
        notify.error(res.message || 'การเบิกจ่ายไม่สำเร็จ');
        if (res.report) {
          setReport(res.report);
        } else {
          setReport({ total: 0, success: 0, failed: 1, errors: [res.message ?? ''] });
        }
      }
    } catch (error: any) {
      notify.error(error.message || 'เกิดข้อผิดพลาด');
      setReport({ total: 0, success: 0, failed: 1, errors: [error.message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
      {/* Header Section */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400">
          <FileSpreadsheet size={28} />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
            <LogOut size={20} className="text-rose-500" />
            Bulk Outbound (เบิกจ่ายแบบไฟล์)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            นำเข้าไฟล์ Excel เพื่อเบิกจ่ายสินค้าหลายรายการพร้อมกัน
          </p>
        </div>
      </div>

      {/* Control Section */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch p-4 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex-1">
          <div className="text-xs font-bold text-muted-foreground mb-2">วิธีใช้งาน:</div>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>ดาวน์โหลด Template แล้วกรอกข้อมูล</li>
            <li>ระบุ SKU และจำนวนที่ต้องการเบิก</li>
            <li>ระบุตำแหน่ง (ถ้าไม่ระบุจะเบิกจากตำแหน่งแรกที่มี)</li>
            <li>อัปโหลดไฟล์เพื่อดำเนินการ</li>
          </ol>
        </div>

        <div className="flex gap-3 items-end">
          <Button
            variant="outline"
            disabled={loading}
            onClick={handleDownload}
            className="bg-card hover:bg-accent h-11"
          >
            <FileDown size={16} className="mr-2 text-emerald-600" />
            โหลด Template
          </Button>

          <div className="relative">
            <input
              type="file"
              disabled={loading}
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              accept=".xlsx,.xls"
              title="Upload Excel"
              aria-label="Upload Excel"
            />
            <Button disabled={loading} className="h-11 bg-rose-600 hover:bg-rose-700 text-white">
              {loading ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <Upload size={16} className="mr-2" />
              )}
              อัปโหลดไฟล์
            </Button>
          </div>
        </div>
      </div>

      {/* Report Section */}
      {report && (
        <div
          className={`rounded-lg border p-4 ${
            report.failed > 0
              ? 'bg-destructive/5 border-destructive/20'
              : 'bg-success/5 border-success/20'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            {report.failed > 0 ? (
              <XCircle className="text-destructive" size={24} />
            ) : (
              <CheckCircle2 className="text-success" size={24} />
            )}
            <div>
              <h4
                className={`font-bold ${report.failed > 0 ? 'text-destructive' : 'text-success'}`}
              >
                {report.failed > 0 ? 'เบิกจ่ายไม่สำเร็จบางรายการ' : 'เบิกจ่ายสำเร็จ'}
              </h4>
              <p className="text-xs text-muted-foreground">
                ทั้งหมด {report.total} รายการ | สำเร็จ {report.success} | ไม่สำเร็จ {report.failed}
              </p>
            </div>
          </div>

          {report.failed > 0 && report.errors.length > 0 && (
            <div className="mt-2 bg-card rounded border border-destructive/20 overflow-hidden">
              <div className="px-3 py-2 bg-destructive/5 text-xs font-bold text-destructive border-b border-destructive/10">
                รายการข้อผิดพลาด (กรุณาตรวจสอบและแก้ไข)
              </div>
              <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {report.errors.map((err, idx) => (
                  <div key={idx} className="text-xs text-destructive flex gap-2">
                    <span className="font-mono text-destructive/50 select-none">•</span>
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
