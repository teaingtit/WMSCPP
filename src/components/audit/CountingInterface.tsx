'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { AuditItem } from '@/types/inventory';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateAuditItemCount } from '@/actions/audit-actions';
import { notify } from '@/lib/ui-helpers';
import { Loader2, Check, Pencil, MapPin, Search, Box, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface CountingInterfaceProps {
  items: AuditItem[];
  isFinalized?: boolean;
  onDashboardClick?: () => void;
  onItemChange?: (id: string, qty: number) => void;
}

function AuditItemCard({
  item,
  onUpdate,
}: {
  item: AuditItem;
  onUpdate: (id: string, qty: number) => void;
}) {
  const router = useTransitionRouter();
  // ใช้ status เป็นเกณฑ์หลักในการตรวจสอบว่านับเสร็จหรือยัง (ป้องกันกรณี DB default 0)
  const isItemCounted = item.status === 'COUNTED';

  const [savedQty, setSavedQty] = useState<number | null>(
    isItemCounted ? item.counted_qty ?? null : null,
  );
  const [isEditing, setIsEditing] = useState(!isItemCounted);
  const [inputValue, setInputValue] = useState(
    isItemCounted ? item.counted_qty?.toString() ?? '' : '',
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when props change
  useEffect(() => {
    if (item.status === 'COUNTED' && item.counted_qty !== undefined && item.counted_qty !== null) {
      setSavedQty(item.counted_qty);
      if (!isEditing) {
        setInputValue(item.counted_qty.toString());
      }
    }
  }, [item.counted_qty, item.status, isEditing]);

  const handleSave = async () => {
    if (inputValue === '') return;

    const qty = parseInt(inputValue, 10);
    if (isNaN(qty) || qty < 0) {
      notify.error('กรุณาระบุจำนวนที่ถูกต้อง');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateAuditItemCount(item.id, qty);
      if (res.success) {
        notify.success('บันทึกเรียบร้อย');
        setSavedQty(qty);
        setIsEditing(false);
        onUpdate(item.id, qty); // อัปเดต Progress Bar ทันที (Optimistic Update)
        router.refresh(); // อัปเดตข้อมูลทั้งหน้าเพื่อให้ Variance Report เห็นข้อมูลล่าสุดทันที
      } else {
        notify.error(`บันทึกไม่สำเร็จ: ${res.message}`);
      }
    } catch (error) {
      notify.error('เกิดข้อผิดพลาด');
    } finally {
      setIsSaving(false);
    }
  };

  const isCounted = savedQty !== null;

  return (
    <div
      className={`group transition-all duration-300 border rounded-2xl p-5 shadow-sm hover:shadow-md ${
        isCounted
          ? 'bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-100'
          : 'bg-white border-slate-200 hover:border-blue-200'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-1">
          <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
            <MapPin className="w-3 h-3 mr-1" />
            {item.location?.code}
          </div>
          <h4 className="font-semibold text-slate-900 leading-tight">{item.product?.name}</h4>
          <div className="flex items-center text-xs text-slate-500 font-mono">
            <Box className="w-3 h-3 mr-1" />
            {item.product?.sku}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            System
          </label>
          <div className="font-mono font-bold text-lg h-12 flex items-center justify-center bg-slate-100 rounded-lg text-slate-500">
            {item.system_qty}
          </div>
        </div>
        <div className="space-y-1.5">
          <label
            className={`text-[10px] uppercase tracking-wider font-semibold ${
              isCounted ? 'text-emerald-600' : 'text-slate-100'
            }`}
          >
            Counted
          </label>

          {isEditing ? (
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="numeric"
                name={`qty-${item.id}`}
                data-testid={`qty-input-${item.id}`}
                pattern="[0-9]*"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
                className="text-center font-bold text-lg h-12 bg-white border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all"
                placeholder="0"
                disabled={isSaving}
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={isSaving}
                data-testid={`save-qty-btn-${item.id}`}
                className="bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 min-w-[48px] h-12 flex items-center justify-center shadow-md shadow-blue-200 active:scale-95 transition-transform"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <div className="flex-1 font-mono font-bold text-lg h-12 flex items-center justify-center bg-white border-2 border-emerald-500/20 rounded-xl text-emerald-600 shadow-sm">
                {savedQty}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                data-testid={`edit-qty-btn-${item.id}`}
                className="h-12 w-12 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors active:scale-95"
                aria-label="แก้ไข"
              >
                <Pencil className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CountingInterface({
  items,
  isFinalized,
  onDashboardClick,
  onItemChange,
}: CountingInterfaceProps) {
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [filter, setFilter] = useState('');
  const [localItems, setLocalItems] = useState<AuditItem[]>(items);

  // Sync localItems with props (เมื่อ Server ตอบกลับมาแล้ว หรือโหลดหน้าใหม่)
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleItemUpdate = (id: string, qty: number) => {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'COUNTED', counted_qty: qty } : item,
      ),
    );
    onItemChange?.(id, qty);
  };

  // ใช้ useMemo เพื่อไม่ให้คำนวณใหม่ทุกครั้งที่ Component Re-render
  const availableZones = useMemo(
    () => Array.from(new Set(localItems.map((item) => item.location?.lot).filter(Boolean))),
    [localItems],
  );

  const filteredItems = useMemo(
    () =>
      localItems.filter((item: AuditItem) => {
        const lowerFilter = filter.toLowerCase();
        const matchesSearch =
          (item.product?.name ?? '').toLowerCase().includes(lowerFilter) ||
          (item.product?.sku ?? '').toLowerCase().includes(lowerFilter) ||
          (item.location?.code ?? '').toLowerCase().includes(lowerFilter);

        const matchesZone = selectedZone === 'ALL' || item.location?.lot === selectedZone;

        return matchesSearch && matchesZone;
      }),
    [localItems, filter, selectedZone],
  );

  // ซ่อนเนื้อหาถ้าปิดรอบแล้ว (ระหว่างรอ Redirect)
  if (isFinalized) {
    return null;
  }

  if (localItems.length === 0) {
    return (
      <div className="text-center text-slate-500 p-8">No items found for this audit session.</div>
    );
  }
  const totalItems = localItems.length;
  const countedItems = localItems.filter((i) => i.status === 'COUNTED').length;
  const progressPercent = totalItems > 0 ? (countedItems / totalItems) * 100 : 0;
  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-500">
      {/* Sticky Header for Mobile/Tablet */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b shadow-sm -mx-4 px-4 py-4 sm:mx-0 sm:rounded-2xl sm:border sm:top-4 transition-all">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-xs font-medium text-slate-600">
              Progress:{' '}
              <span className="text-slate-900 font-bold">{Math.round(progressPercent)}%</span> (
              {countedItems}/{totalItems})
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onDashboardClick}
              className="h-8 text-xs rounded-lg hover:bg-slate-50"
            >
              <BarChart3 className="w-3 h-3 mr-2" />
              Dashboard
            </Button>
          </div>
          <Progress
            value={progressPercent}
            data-testid="progress-bar"
            className="h-2 [&>div]:bg-emerald-500 bg-slate-100"
          />

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                name="searchItems"
                placeholder="ค้นหา SKU, ชื่อสินค้า, Location..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white rounded-xl h-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 items-center">
              <button
                onClick={() => setSelectedZone('ALL')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedZone === 'ALL'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Zones
              </button>
              {availableZones.sort().map((zone) => (
                <button
                  key={zone}
                  onClick={() => setSelectedZone(zone as string)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedZone === zone
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <AuditItemCard key={item.id} item={item} onUpdate={handleItemUpdate} />
        ))}
        {filteredItems.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>ไม่พบรายการสินค้าที่ค้นหา</p>
          </div>
        )}
      </div>
    </div>
  );
}
