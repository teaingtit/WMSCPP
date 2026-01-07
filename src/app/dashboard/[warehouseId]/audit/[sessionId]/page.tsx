'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { getAuditSessionById, getAuditItems, finalizeAuditSession } from '@/actions/audit-actions';
import {
  ArrowLeft,
  Search,
  Loader2,
  MapPin,
  Box,
  ScanBarcode,
  CheckCircle2,
  Clock,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CountingInterface from '@/components/audit/CountingInterface';
import { AuditItem, AuditSession } from '@/types/inventory';
import VarianceReport from '@/components/audit/VarianceReport';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/ui-helpers';
import { useUser } from '@/components/providers/UserProvider';
import { supabaseBrowser } from '@/lib/supabase/client';
import AuditLoadingSkeleton from '@/components/audit/AuditLoadingSkeleton';
import SuccessReceiptModal from '@/components/shared/SuccessReceiptModal';
import useSuccessReceipt from '@/hooks/useSuccessReceipt';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AuditDetailPage() {
  const params = useParams();
  const router = useTransitionRouter();
  const sessionId = params['sessionId'] as string;
  const user = useUser();
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const [session, setSession] = useState<AuditSession | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // View State
  const [isCountingMode, setIsCountingMode] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Success modal state handled by shared hook
  const { successInfo, setSuccessInfo, handleSuccessModalClose } = useSuccessReceipt();
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionData, itemsData] = await Promise.all([
          getAuditSessionById(sessionId),
          getAuditItems(sessionId),
        ]);
        setSession(sessionData);
        setItems(itemsData);
      } catch (error) {
        notify.error('ไม่สามารถโหลดข้อมูลรอบการนับได้');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [sessionId]);

  // Realtime Subscription
  useEffect(() => {
    const channel = supabaseBrowser
      .channel('audit-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audit_items',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedItem = payload.new as any;
          setItems((prev) =>
            prev.map((item) =>
              item.id === updatedItem.id
                ? {
                    ...item,
                    ...updatedItem,
                    // Preserve joined fields (product, location) which are not in payload
                    product: item.product,
                    location: item.location,
                  }
                : item,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [sessionId]);

  // Force exit counting mode if session is completed
  useEffect(() => {
    if (session?.status === 'COMPLETED') {
      setIsCountingMode(false);
    }
  }, [session?.status]);

  const handleFinalize = async () => {
    if (!session) return;
    setShowFinalizeConfirm(false);

    setIsFinalizing(true);
    try {
      const res = await finalizeAuditSession(session.id, session.warehouse_id);
      if (res.success) {
        // Calculate stats for modal
        const totalCounted = items.filter((i) => i.status === 'COUNTED').length;
        const varianceCount = items.filter(
          (i) => i.status === 'COUNTED' && i.system_qty !== i.counted_qty,
        ).length;
        const matched = totalCounted - varianceCount;
        const accuracy = totalCounted > 0 ? (matched / totalCounted) * 100 : 0;

        setSuccessInfo({
          data: {
            type: 'AUDIT',
            title: 'ปิดรอบการนับสำเร็จ',
            sessionName: session.name,
            accuracy: accuracy.toFixed(1) + '%',
            totalCounted: totalCounted,
            varianceCount: varianceCount,
            timestamp: new Date().toISOString(),
          },
          redirect: false,
        });

        const [sessionData, itemsData] = await Promise.all([
          getAuditSessionById(sessionId),
          getAuditItems(sessionId),
        ]);
        setSession(sessionData);
        setItems(itemsData);
        router.refresh();
      } else {
        notify.error(res.message);
      }
    } catch (error) {
      notify.error('เกิดข้อผิดพลาด');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleItemChange = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'COUNTED', counted_qty: qty } : item,
      ),
    );
  };

  // 1. Filter by Search Term first
  const searchFilteredItems = items.filter(
    (item) =>
      item.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // 2. Split into categories
  const pendingItems = searchFilteredItems.filter((i) => i.status !== 'COUNTED');
  const completedItems = searchFilteredItems.filter((i) => i.status === 'COUNTED');

  // Determine current list based on active tab
  const currentList = activeTab === 'pending' ? pendingItems : completedItems;

  if (isLoading) {
    return <AuditLoadingSkeleton />;
  }

  if (!session) {
    return <div className="p-8 text-center">ไม่พบข้อมูลรอบการนับ</div>;
  }

  if (isCountingMode) {
    return (
      <div className="max-w-7xl mx-auto pb-20 p-4 sm:p-6 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setIsCountingMode(false)}
            aria-label="ย้อนกลับ"
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full transition-colors shadow-sm"
          >
            <ArrowLeft className="text-slate-600" size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800">โหมดการนับสินค้า</h1>
            <p className="text-sm text-slate-500">{session.name}</p>
          </div>
        </div>
        <CountingInterface
          items={items}
          isFinalized={session.status === 'COMPLETED'}
          onDashboardClick={() => setIsCountingMode(false)}
          onItemChange={handleItemChange}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 p-4 sm:p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            aria-label="ย้อนกลับ"
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{session.name}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  session.status === 'OPEN'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {session.status}
              </span>
              <span>• {items.length} รายการ</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCountingMode(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
        >
          <ScanBarcode size={20} />
          <span>เริ่มนับสินค้า (Counting Mode)</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            name="searchAuditItems"
            placeholder="ค้นหา SKU, ชื่อสินค้า, Location..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Dashboard Section */}
      <div className="mb-8">
        <VarianceReport items={items} />
      </div>

      {/* Tabs & Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-auto">
          <TabsTrigger
            value="pending"
            className="flex-1 sm:flex-none rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <Clock className="w-4 h-4 mr-2 text-amber-500" />
            รอการนับ ({pendingItems.length})
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="flex-1 sm:flex-none rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
            นับเสร็จแล้ว ({completedItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Mobile Card View */}
        <div className="block md:hidden space-y-3">
          {currentList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="flex flex-col items-center gap-2">
                <Box className="w-10 h-10 opacity-20" />
                <span>ไม่พบรายการสินค้า</span>
              </div>
            </div>
          ) : (
            currentList.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                      <Box size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{item.product?.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{item.product?.sku}</div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      item.status === 'COUNTED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.status === 'COUNTED' ? 'นับแล้ว' : 'รอการนับ'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1 text-slate-600 text-xs font-medium bg-slate-100 px-2 py-1 rounded-md">
                    <MapPin size={12} /> {item.location?.code}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 mr-2">Counted:</span>
                    {item.status === 'COUNTED' ? (
                      <span className="font-bold text-emerald-600 text-lg">{item.counted_qty}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table data-stack="true" className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-600">สินค้า</th>
                  <th className="p-4 font-bold text-slate-600">Location</th>
                  <th className="p-4 font-bold text-slate-600 text-center">สถานะ</th>
                  <th className="p-4 font-bold text-slate-600 text-right">จำนวนที่นับ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Box className="w-10 h-10 opacity-20" />
                        <span>ไม่พบรายการสินค้าในหมวดหมู่นี้</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <Box size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{item.product?.name}</div>
                            <div className="text-xs text-slate-500 font-mono">
                              {item.product?.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded-lg w-fit text-xs">
                          <MapPin size={14} /> {item.location?.code}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                            item.status === 'COUNTED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {item.status === 'COUNTED' ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          {item.status === 'COUNTED' ? 'นับแล้ว' : 'รอการนับ'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {item.status === 'COUNTED' ? (
                          <span className="font-bold text-emerald-600 text-lg">
                            {item.counted_qty}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Tabs>

      {/* Finalize Button Section */}
      {session.status === 'OPEN' && isManager && (
        <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800">ปิดรอบการนับ (Finalize Audit)</h3>
            <p className="text-sm text-slate-500 max-w-md">
              เมื่อยืนยันการปิดรอบ ระบบจะทำการปรับยอดสต็อก (Adjustment) ตามผลต่างที่นับได้ทันที
              และจะไม่สามารถแก้ไขข้อมูลได้อีก
            </p>
          </div>
          <Button
            onClick={() => setShowFinalizeConfirm(true)}
            disabled={isFinalizing}
            className="bg-slate-900 hover:bg-slate-800 text-white min-w-[200px] h-12 rounded-xl shadow-lg shadow-slate-200 active:scale-95 transition-all"
          >
            {isFinalizing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            ยืนยันปิดรอบและปรับสต็อก
          </Button>
        </div>
      )}

      {/* Success Modal */}
      <SuccessReceiptModal
        isOpen={!!successInfo}
        onClose={handleSuccessModalClose}
        data={successInfo?.data ?? null}
      />

      {/* Finalize Confirmation Dialog */}
      <Dialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-xl">ยืนยันการปิดรอบการนับ?</DialogTitle>
            <DialogDescription className="text-center pt-2">
              เมื่อยืนยันแล้ว ระบบจะทำการ{' '}
              <span className="font-bold text-slate-700">ปรับยอดสต็อก (Adjustment)</span>{' '}
              ตามผลต่างที่นับได้ทันที
              <br />
              <br />
              <span className="text-red-500 font-medium">
                ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowFinalizeConfirm(false)}
              className="w-full sm:w-auto h-11 rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleFinalize}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white h-11 rounded-xl shadow-md shadow-red-100"
            >
              ยืนยันปิดรอบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
