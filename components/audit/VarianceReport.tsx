'use client';
import { AuditItem } from '@/types/inventory';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, BarChart3, Target } from 'lucide-react';

interface VarianceReportProps {
  items: AuditItem[];
}

export default function VarianceReport({ items }: VarianceReportProps) {
  // กรองเฉพาะรายการที่นับเสร็จแล้ว (status === 'COUNTED') และมีผลต่าง
  const varianceItems = items.filter(
    (item) => item.status === 'COUNTED' && item.system_qty !== (item.counted_qty ?? 0)
  );

  const totalCounted = items.filter(i => i.status === 'COUNTED').length;
  const totalItems = items.length;
  const matchedCount = totalCounted - varianceItems.length;
  const accuracy = totalCounted > 0 ? (matchedCount / totalCounted) * 100 : 0;
  const progress = totalItems > 0 ? (totalCounted / totalItems) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-2xl text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Accuracy Dashboard
          </h3>
          <p className="text-slate-500 text-sm">สรุปภาพรวมความแม่นยำและผลต่างของการตรวจนับ</p>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ความคืบหน้า (Progress)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(progress)}%</div>
            <Progress value={progress} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">นับแล้ว {totalCounted} จาก {totalItems} รายการ</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ความแม่นยำ (Accuracy)</CardTitle>
            <CheckCircle className={`h-4 w-4 ${accuracy >= 98 ? 'text-emerald-500' : 'text-amber-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${accuracy >= 98 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {accuracy.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">ตรงกัน {matchedCount} รายการ</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รายการที่มีผลต่าง (Variance)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{varianceItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">รายการที่ต้องปรับปรุงสต็อก</p>
          </CardContent>
        </Card>
      </div>

      {varianceItems.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed rounded-lg text-slate-400 flex flex-col items-center gap-2">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <p>ไม่พบผลต่างของสต็อก หรือยังไม่มีการนับ</p>
        </div>
      ) : (
        <div className="space-y-2">
        <h4 className="font-semibold text-slate-800">รายการผลต่าง (Variance Items)</h4>
        <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">System Qty</TableHead>
              <TableHead className="text-right">Counted Qty</TableHead>
              <TableHead className="text-right">Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {varianceItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.product?.name} ({item.product?.sku})</TableCell>
                <TableCell>{item.location?.code}</TableCell>
                <TableCell className="text-right">{item.system_qty}</TableCell>
                <TableCell className="text-right font-semibold">{item.counted_qty}</TableCell>
                <TableCell className={`text-right font-bold ${(item.counted_qty ?? 0) > (item.system_qty ?? 0) ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(item.counted_qty ?? 0) > (item.system_qty ?? 0) ? '+' : ''}
                  {(item.counted_qty ?? 0) - (item.system_qty ?? 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        </div>
      )}
    </div>
  );
}