'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, Plus, ArrowRight, Search, CheckSquare, Square, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createAuditSession, getInventoryItems, updateAuditSession } from '@/actions/audit-actions';
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
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  
  // Selection State
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit State
  const [editingSession, setEditingSession] = useState<AuditSession | null>(null);
  const [editName, setEditName] = useState('');


  const handleCreate = async () => {
    if (!newSessionName) return;
    setIsCreating(true);

    const formData = new FormData();
    formData.append('warehouseId', warehouseId);
    formData.append('name', newSessionName);
    
    if (selectedIds.size > 0) {
      const itemsArray = Array.from(selectedIds).map(id => ({ inventory_id: id }));
      formData.append('items', JSON.stringify(itemsArray));
    }

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

  // Fetch items when dialog opens
  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      setIsLoadingItems(true);
      getInventoryItems(warehouseId).then((data) => {
        setInventoryItems(data);
        setIsLoadingItems(false);
      });
    } else {
      setNewSessionName('');
      setSelectedIds(new Set());
      setSearchTerm('');
    }
  };

  const filteredItems = inventoryItems.filter(item => 
    item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const areAllFilteredSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.has(item.id));

  const toggleItem = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    const newSet = new Set(selectedIds);
    if (areAllFilteredSelected) {
      filteredItems.forEach(item => newSet.delete(item.id));
    } else {
      filteredItems.forEach(item => newSet.add(item.id));
    }
    setSelectedIds(newSet);
  };

  const handleUpdateSession = async () => {
    if (!editingSession || !editName) return;
    
    const res = await updateAuditSession(editingSession.id, warehouseId, { name: editName });
    
    if (res.success) {
      toast.success('แก้ไขข้อมูลสำเร็จ');
      setEditingSession(null);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (viewMode === 'ACTIVE') return session.status === 'OPEN';
    return session.status !== 'OPEN';
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">ประวัติการตรวจนับ (Audit History)</h2>
        {isManager && (
        <>
        {/* Edit Dialog */}
        <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>แก้ไขข้อมูลรอบการนับ</DialogTitle>
              <DialogDescription>แก้ไขชื่อรอบการนับ (สำหรับประวัติ)</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="ชื่อรอบการนับ" />
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateSession}>บันทึก</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild className="w-full sm:w-auto">
            <Button disabled={isCreating} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto shadow-md shadow-blue-200 transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" />
              เปิดรอบนับใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>เปิดรอบการนับใหม่</DialogTitle>
              <DialogDescription>
                ตั้งชื่อรอบการนับและเลือกสินค้าที่ต้องการตรวจสอบ (ไม่เลือก = นับทั้งหมด)
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
              <Input 
                value={newSessionName} 
                onChange={(e) => setNewSessionName(e.target.value)} 
                placeholder="ระบุชื่อรอบการนับ..." 
              />

              <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  className="flex-1 outline-none text-sm bg-transparent"
                  placeholder="ค้นหาสินค้า, SKU, หรือ Location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex-1 border rounded-md overflow-hidden flex flex-col min-h-[300px]">
                <div className="bg-slate-50 p-2 border-b flex items-center justify-between text-sm font-medium text-slate-600">
                  <div className="flex items-center gap-2 cursor-pointer hover:text-slate-900" onClick={toggleAll}>
                    {areAllFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span>เลือกรายการ ({selectedIds.size})</span>
                  </div>
                  <span>{filteredItems.length} รายการ</span>
                </div>
                
                <div className="overflow-y-auto p-2 space-y-1 flex-1">
                  {isLoadingItems ? (
                    <div className="flex justify-center items-center h-full text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังโหลดข้อมูล...
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">ไม่พบสินค้า</div>
                  ) : (
                    filteredItems.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => toggleItem(item.id)}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-colors ${
                          selectedIds.has(item.id) ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'
                        }`}
                      >
                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                          selectedIds.has(item.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                        }`}>
                          {selectedIds.has(item.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                          <div className="font-medium truncate">{item.product.name}</div>
                          <div className="text-slate-500 text-xs sm:text-sm">SKU: {item.product.sku}</div>
                          <div className="text-slate-500 text-xs sm:text-sm flex items-center gap-2">
                            <span className="bg-slate-100 px-1.5 rounded text-slate-700">{item.location.code}</span>
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={isCreating || !newSessionName}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                ยืนยัน
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </>
      )}
      
      </div>

      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-xl w-full sm:w-fit backdrop-blur-sm">
        <button
          onClick={() => setViewMode('ACTIVE')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-center ${
            viewMode === 'ACTIVE' 
              ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          กำลังดำเนินการ ({sessions.filter(s => s.status === 'OPEN').length})
        </button>
        <button
          onClick={() => setViewMode('HISTORY')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-center ${
            viewMode === 'HISTORY' 
              ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' 
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
              className="group bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
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
              
              <div className="flex items-center gap-2 w-full md:w-auto">
              {isManager && session.status !== 'OPEN' && (
                <Button variant="ghost" size="icon" onClick={() => {
                  setEditingSession(session);
                  setEditName(session.name);
                }}>
                  <Pencil className="w-4 h-4 text-slate-500" />
                </Button>
              )}

              <Button 
                variant="outline" 
                onClick={() => router.push(session.status === 'OPEN' 
                  ? `/dashboard/${warehouseId}/audit/${session.id}` 
                  : `/dashboard/${warehouseId}/audit/${session.id}?tab=report`
                )}
                className="w-full md:w-auto active:scale-95 transition-transform"
              >
                {session.status === 'OPEN' ? 'จัดการ / ตรวจสอบ' : 'ดูสรุปผล'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}