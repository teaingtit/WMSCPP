'use client';
import { useState } from 'react';
import { useUser } from '@/components/providers/UserProvider';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AuditItem } from '@/types/inventory';
import { finalizeAuditSession } from '@/actions/audit-actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface VarianceReportProps {
  items: AuditItem[];
  sessionId: string;
  warehouseId: string;
  isFinalized: boolean;
}

export default function VarianceReport({ items, sessionId, warehouseId, isFinalized }: VarianceReportProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
const user = useUser(); // ✅ ดึง user
const isManager = user?.role === 'admin';

  // กรองเฉพาะรายการที่นับเสร็จแล้ว (status === 'COUNTED') และมีผลต่าง
  const varianceItems = items.filter(
    (item) => item.status === 'COUNTED' && item.system_qty !== (item.counted_qty ?? 0)
  );

  const totalCounted = items.filter(i => i.status === 'COUNTED').length;
  const matchedCount = totalCounted - varianceItems.length;

  const handleFinalize = () => {
    startTransition(async () => {
      const res = await finalizeAuditSession(sessionId, warehouseId);
      if (res.success) {
        toast.success('ปรับปรุงยอดสต็อกเรียบร้อยแล้ว');
        setIsConfirmOpen(false);
        router.refresh(); // Refresh the page to get the new finalized status
      } else {
        toast.error(`เกิดข้อผิดพลาด: ${res.message}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">รายงานผลต่าง (Variance Report)</h3>
          <p className="text-sm text-slate-600">
            นับแล้ว {totalCounted} รายการ | <span className="text-emerald-600">ตรงกัน {matchedCount}</span> | <span className="text-red-600">มีผลต่าง {varianceItems.length}</span>
          </p>
        </div>


        {!isFinalized && isManager && ( // ✅ เพิ่มเงื่อนไข isManager ตรงนี้
        <div className="flex justify-end w-full sm:w-auto">
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogTrigger asChild>
            <Button disabled={isPending || isFinalized} className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">
              {isFinalized ? 'ปิดรอบการนับแล้ว' : 'ยืนยันและปรับสต็อก'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ยืนยันการปิดรอบการนับ</DialogTitle>
              <DialogDescription>คุณต้องการปิดรอบการนับและปรับปรุงยอดสต็อกใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>ยกเลิก</Button>
              <Button onClick={handleFinalize} disabled={isPending} className="bg-amber-600 hover:bg-amber-700">
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                ยืนยัน
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
)}      

      </div>
      {varianceItems.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed rounded-lg text-slate-400 flex flex-col items-center gap-2">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <p>ไม่พบผลต่างของสต็อก หรือยังไม่มีการนับ</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
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
      )}
    </div>
  );
}