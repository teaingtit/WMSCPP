'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, Plus, ArrowRight, FileCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createAuditSession } from '@/actions/audit-actions';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AuditSession } from '@/types/inventory';
import { useUser } from '@/components/providers/UserProvider';
interface AuditSessionListProps {
  warehouseId: string;
  
  sessions: AuditSession[]; // ปรับปรุง: ใช้ Type ที่เฉพาะเจาะจงเพื่อความปลอดภัย
}

export default function AuditSessionList({ warehouseId, sessions }: AuditSessionListProps) {
  const router = useRouter();
  const user = useUser(); // ✅ ดึง user
  const isManager = user?.role === 'admin';
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  const handleCreate = async () => {
    if (!newSessionName) return;
    setIsCreating(true);

    // แก้ไข: สร้าง FormData object เพื่อส่งให้ Server Action
    const formData = new FormData();
    formData.append('warehouseId', warehouseId);
    formData.append('name', newSessionName);
    const res = await createAuditSession(formData);
    setIsCreating(false);

    if (res.success) {
      toast.success("เปิดรอบการนับเรียบร้อย");
      setIsDialogOpen(false);
      setNewSessionName('');
      router.refresh(); // Refresh เพื่อแสดงรายการใหม่
    } else {
      toast.error(res.message);
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (viewMode === 'ACTIVE') return session.status === 'OPEN';
    return session.status !== 'OPEN';
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">ประวัติการตรวจนับ (Audit History)</h2>
        {isManager && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isCreating} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              เปิดรอบนับใหม่
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เปิดรอบการนับใหม่</DialogTitle>
              <DialogDescription>ตั้งชื่อรอบการนับเพื่อเริ่มการตรวจสอบสต็อก (เช่น 'Cycle Count ประจำสัปดาห์')</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input 
                value={newSessionName} 
                onChange={(e) => setNewSessionName(e.target.value)} 
                placeholder="ระบุชื่อรอบการนับ..." 
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={isCreating || !newSessionName}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                ยืนยัน
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      </div>

      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg w-full sm:w-fit">
        <button
          onClick={() => setViewMode('ACTIVE')}
          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all text-center ${
            viewMode === 'ACTIVE' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          กำลังดำเนินการ ({sessions.filter(s => s.status === 'OPEN').length})
        </button>
        <button
          onClick={() => setViewMode('HISTORY')}
          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all text-center ${
            viewMode === 'HISTORY' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          ประวัติย้อนหลัง ({sessions.filter(s => s.status !== 'OPEN').length})
        </button>
      </div>

      <div className="grid gap-4">
        {filteredSessions.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed rounded-lg text-slate-400">
            {viewMode === 'ACTIVE' ? 'ไม่มีรายการที่กำลังดำเนินการ' : 'ยังไม่มีประวัติการนับสต็อก'}
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div 
              key={session.id} 
              className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                    session.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {session.status}
                  </span>
                  <span className="text-sm text-slate-500">
                    {session.created_at
                    ? format(new Date(session.created_at), 'dd/MM/yyyy HH:mm')
                    : '-'}
                  </span>
                </div>
                <h3 className="font-semibold text-lg">{session.name}</h3>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => router.push(session.status === 'OPEN' 
                  ? `/dashboard/${warehouseId}/audit/${session.id}` 
                  : `/dashboard/${warehouseId}/audit/${session.id}?tab=report`
                )}
                className="w-full md:w-auto"
              >
                {session.status === 'OPEN' ? 'จัดการ / ตรวจสอบ' : 'ดูสรุปผล'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}