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
import { CheckCircle, AlertTriangle, BarChart3, Target, Box, MapPin } from 'lucide-react';

interface VarianceReportProps {
  items: AuditItem[];
}

export default function VarianceReport({ items }: VarianceReportProps) {
  // กรองเฉพาะรายการที่นับเสร็จแล้ว (status === 'COUNTED') และมีผลต่าง
  const varianceItems = items.filter(
    (item) => item.status === 'COUNTED' && item.system_qty !== (item.counted_qty ?? 0),
  );

  const totalCounted = items.filter((i) => i.status === 'COUNTED').length;
  const totalItems = items.length;
  const matchedCount = totalCounted - varianceItems.length;
  const accuracy = totalCounted > 0 ? (matchedCount / totalCounted) * 100 : 0;
  const progress = totalItems > 0 ? (totalCounted / totalItems) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
            <p className="text-xs text-muted-foreground mt-1">
              นับแล้ว {totalCounted} จาก {totalItems} รายการ
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ความแม่นยำ (Accuracy)</CardTitle>
            <CheckCircle
              className={`h-4 w-4 ${accuracy >= 98 ? 'text-emerald-500' : 'text-amber-500'}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                accuracy >= 98 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
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
        <div className="text-center p-8 border-2 border-dashed rounded-lg text-slate-500 flex flex-col items-center gap-2">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <p>ไม่พบผลต่างของสต็อก หรือยังไม่มีการนับ</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-800">รายการผลต่าง (Variance Items)</h4>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {varianceItems.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                      <Box size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{item.product?.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{item.product?.sku}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600 text-xs font-medium bg-slate-100 px-2 py-1 rounded-md">
                    <MapPin size={12} /> {item.location?.code}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50 text-sm">
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-bold">System</div>
                    <div className="font-mono text-slate-600">{item.system_qty}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-bold">Counted</div>
                    <div className="font-mono font-bold text-slate-800">{item.counted_qty}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase font-bold">Diff</div>
                    <div
                      className={`font-mono font-bold ${
                        (item.counted_qty ?? 0) > (item.system_qty ?? 0)
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {(item.counted_qty ?? 0) > (item.system_qty ?? 0) ? '+' : ''}
                      {(item.counted_qty ?? 0) - (item.system_qty ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar border rounded-xl shadow-sm bg-white">
            <Table data-stack="true">
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">System Qty</TableHead>
                  <TableHead className="text-right">Counted Qty</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varianceItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-slate-800">{item.product?.name}</span>
                        <span className="text-xs text-slate-500 font-mono">
                          {item.product?.sku}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit text-xs font-medium">
                        <MapPin size={12} /> {item.location?.code}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600">
                      {item.system_qty}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-800">
                      {item.counted_qty}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-bold ${
                        (item.counted_qty ?? 0) > (item.system_qty ?? 0)
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
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
