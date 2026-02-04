'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Package,
  MapPin,
  Shield,
  StickyNote,
  AlertTriangle,
  Hash,
  Layers,
  Tag,
  Box,
  Clock,
} from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { EntityStatus, EntityNote } from '@/types/status';
import { getEntityStatus, getEntityNotes } from '@/actions/status-actions';
import StatusAndNotesModal from './status/StatusAndNotesModal';
import { isRestricted, calculateQuantityBreakdown, getStatusGradient } from './utils';

import { Category } from '@/components/inbound/DynamicInboundForm';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockWithDetails | null;
  warehouseId?: string;
  categoryFormSchemas?: Record<string, any[]>;
  categories?: Category[]; // NEW: Categories list for lookup
}

export default function StockDetailModal({
  isOpen,
  onClose,
  item,
  warehouseId: _warehouseId,
  categoryFormSchemas,
  categories,
}: StockDetailModalProps) {
  const [status, setStatus] = useState<EntityStatus | null>(null);
  const [notes, setNotes] = useState<EntityNote[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [_isLoading, setIsLoading] = useState(false);

  // Helper: Get attribute label from schema
  const getAttributeLabel = (key: string, categoryId: string, scope?: 'PRODUCT' | 'LOT') => {
    const schema = categoryFormSchemas?.[categoryId] || [];
    const field = schema.find((f) => f.key === key && (!scope || f.scope === scope));
    return field?.label || key;
  };

  // Helper: Get category name
  const getCategoryName = (id: string) => {
    if (!categories) return id;
    const cat = categories.find((c) => c.id === id);
    return cat ? cat.name : id;
  };

  useEffect(() => {
    if (isOpen && item) {
      loadStatusData();
    }
  }, [isOpen, item?.id]);

  const loadStatusData = async () => {
    if (!item) return;
    setIsLoading(true);
    try {
      const [entityStatus, entityNotes] = await Promise.all([
        getEntityStatus('STOCK', item.id),
        getEntityNotes('STOCK', item.id),
      ]);
      setStatus(entityStatus);
      setNotes(entityNotes);
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  const restricted = isRestricted(status);
  const pinnedNotes = notes.filter((n) => n.is_pinned);
  const {
    total: totalQuantity,
    affected: affectedQuantity,
    normal: normalQuantity,
  } = calculateQuantityBreakdown(item.quantity, status);
  const headerGradient = getStatusGradient(status);

  // Style helpers to avoid inline style warnings
  const bannerStyle = status?.status
    ? {
        backgroundColor: status.status.bg_color,
        borderColor: status.status.color + '40',
      }
    : undefined;

  const statusColorStyle = status?.status ? { color: status.status.color } : undefined;
  const statusTextStyle = status?.status ? { color: status.status.text_color } : undefined;
  const statusDotStyle = status?.status
    ? { backgroundColor: status.status.color }
    : { backgroundColor: '#e2e8f0' };

  const affectedQtyStyle = status?.status
    ? {
        backgroundColor: status.status.bg_color,
        borderColor: status.status.color + '40',
      }
    : undefined;

  const affectedLabelStyle = status?.status
    ? { color: status.status.text_color }
    : { color: '#64748b' };

  const affectedValueStyle = status?.status
    ? { color: status.status.text_color }
    : { color: '#94a3b8' };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-detail-modal-title"
      >
        <div className="bg-card w-full max-w-lg max-h-dvh-90 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col">
          {/* Header */}
          <div
            className={`relative h-28 flex items-center justify-center overflow-hidden shrink-0 ${headerGradient}`}
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10 text-center text-white px-4">
              <Package size={36} className="mx-auto mb-1 opacity-90" />
              <h2 id="stock-detail-modal-title" className="text-lg font-bold truncate max-w-xs">
                {item.product?.name || 'สินค้าไม่ระบุชื่อ'}
              </h2>
              <div className="flex items-center justify-center gap-1 text-white/80 text-xs mt-0.5">
                <Hash size={10} /> {item.product?.sku || '-'}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="ปิดหน้าต่าง"
              className="absolute top-3 right-3 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90 touch-manipulation"
            >
              <X size={20} />
            </button>
          </div>

          {/* Status Banner (if affected) */}
          {status?.status && (
            <div
              className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0"
              style={bannerStyle}
            >
              {restricted ? (
                <AlertTriangle size={18} style={statusColorStyle} />
              ) : (
                <Shield size={18} style={statusColorStyle} />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate" style={statusTextStyle}>
                  {status.status.name}
                </div>
                {status.status.description && (
                  <div className="text-xs opacity-90 truncate" style={statusTextStyle}>
                    {status.status.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowStatusModal(true)}
                className="text-xs font-bold px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 transition-colors"
                style={statusTextStyle}
              >
                จัดการ
              </button>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Product Details Card */}
            <div className="bg-muted rounded-xl border border-border p-4">
              <div className="text-label text-muted-foreground mb-3 flex items-center gap-1.5">
                <Box size={12} /> ข้อมูลสินค้า
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-caption-subtle block">SKU</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {item.product?.sku || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-caption-subtle block">หมวดหมู่</span>
                  <span className="font-bold text-foreground text-sm">
                    {item.product?.category_id ? getCategoryName(item.product.category_id) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-caption-subtle block">หน่วย</span>
                  <span className="font-bold text-foreground text-sm">
                    {item.product?.uom || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-caption-subtle block">อัปเดตล่าสุด</span>
                  <span className="font-bold text-foreground text-sm flex items-center gap-1">
                    <Clock size={10} className="text-muted-foreground" />
                    {new Date(item.updated_at).toLocaleDateString('th-TH')}
                  </span>
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div className="bg-muted rounded-xl border border-border p-4">
              <div className="text-label text-muted-foreground mb-3 flex items-center gap-1.5">
                <MapPin size={12} /> ข้อมูลตำแหน่ง
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-2 bg-card rounded-lg border border-border flex flex-col items-center min-w-[4.5rem]">
                  <span className="text-label text-muted-foreground">ตำแหน่ง</span>
                  <span className="font-bold text-foreground">
                    {item.location?.code || 'ไม่ระบุ'}
                  </span>
                </div>
                <div className="px-3 py-2 bg-card rounded-lg border border-border flex flex-col items-center min-w-[4rem]">
                  <span className="text-label text-muted-foreground">ล็อต</span>
                  <span className="font-bold text-foreground">{item.lot || 'ไม่ระบุ'}</span>
                </div>
                <div className="px-3 py-2 bg-card rounded-lg border border-border flex flex-col items-center min-w-[4rem]">
                  <span className="text-label text-muted-foreground">ตำแหน่งย่อย</span>
                  <span className="font-bold text-foreground">{item.cart || 'ไม่ระบุ'}</span>
                </div>
                {item.level && (
                  <div className="px-3 py-2 bg-primary/10 rounded-lg border border-primary/20 flex flex-col items-center min-w-[4rem]">
                    <span className="text-label text-primary flex items-center gap-0.5">
                      <Layers size={9} /> ชั้น
                    </span>
                    <span className="font-bold text-primary">{item.level}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Status Breakdown */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="text-label text-muted-foreground mb-3 flex items-center gap-1.5">
                <Tag size={12} /> รายละเอียดจำนวน
              </div>

              {/* Total Quantity */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <span className="text-sm text-muted-foreground font-medium">รวมทั้งหมด</span>
                <span
                  className={`text-2xl font-black ${
                    restricted ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                  }`}
                >
                  {totalQuantity.toLocaleString()}
                  <span className="text-sm font-medium text-muted-foreground ml-1">
                    {item.product?.uom}
                  </span>
                </span>
              </div>

              {/* Status Breakdown */}
              <div className="space-y-2">
                {/* Normal Quantity */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    !status?.status
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-muted border border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        !status?.status ? 'bg-emerald-500' : 'bg-muted-foreground'
                      }`}
                    ></div>
                    <span
                      className={`text-sm font-medium ${
                        !status?.status
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-muted-foreground'
                      }`}
                    >
                      สถานะปกติ
                    </span>
                  </div>
                  <span
                    className={`font-bold text-lg ${
                      !status?.status
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {normalQuantity.toLocaleString()}
                  </span>
                </div>

                {/* Affected Quantity */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    status?.status ? 'border' : 'bg-muted border border-border'
                  }`}
                  style={affectedQtyStyle}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={statusDotStyle}></div>
                    <span className="text-sm font-medium" style={affectedLabelStyle}>
                      {status?.status?.name || 'ไม่มีสถานะ'}
                    </span>
                  </div>
                  <span className="font-bold text-lg" style={affectedValueStyle}>
                    {affectedQuantity.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status Action Button */}
              <button
                onClick={() => setShowStatusModal(true)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-primary/30 bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 active:scale-[0.98] transition-all touch-manipulation"
              >
                <Shield size={16} />
                {status?.status ? 'จัดการสถานะ' : 'เพิ่มสถานะ'}
              </button>
            </div>

            {/* Product Specifications (PRODUCT Scope) */}
            {item.product?.attributes && Object.keys(item.product.attributes).length > 0 && (
              <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
                <div className="text-label text-primary mb-3 flex items-center gap-1.5">
                  <Tag size={12} /> สเปคสินค้า (Product Spec)
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(item.product.attributes).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded-md bg-card border border-border px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      <span className="text-primary font-bold mr-1">
                        {getAttributeLabel(key, item.product?.category_id || '', 'PRODUCT')}:
                      </span>
                      {String(value)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Lot Attributes (LOT Scope) */}
            {item.attributes && Object.keys(item.attributes).length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800 p-4">
                <div className="text-label text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-1.5">
                  <Layers size={12} /> ข้อมูลล็อต (Lot Details)
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(item.attributes).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded-md bg-card border border-border px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold mr-1">
                        {getAttributeLabel(key, item.product?.category_id || '', 'LOT')}:
                      </span>
                      {String(value)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            {notes.length > 0 && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-label text-amber-600 flex items-center gap-1.5">
                    <StickyNote size={12} /> หมายเหตุ ({notes.length})
                  </div>
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    ดูทั้งหมด
                  </button>
                </div>
                <div className="space-y-2">
                  {pinnedNotes.length > 0 && (
                    <div className="space-y-2">
                      {pinnedNotes.slice(0, 2).map((note) => (
                        <div
                          key={note.id}
                          className="flex items-start gap-2 bg-card/60 rounded-lg p-2"
                        >
                          <span className="text-amber-500 mt-0.5">📌</span>
                          <p className="text-xs text-amber-800 dark:text-amber-200 line-clamp-2 flex-1">
                            {note.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {pinnedNotes.length === 0 && notes.length > 0 && notes[0] && (
                    <p className="text-xs text-amber-700">
                      {notes[0].content.length > 100
                        ? notes[0].content.substring(0, 100) + '...'
                        : notes[0].content}
                    </p>
                  )}
                  {(notes.length > 2 || (pinnedNotes.length === 0 && notes.length > 1)) && (
                    <button
                      onClick={() => setShowStatusModal(true)}
                      className="text-xs text-amber-600 font-bold hover:underline"
                    >
                      +
                      {notes.length -
                        (pinnedNotes.length > 0 ? Math.min(pinnedNotes.length, 2) : 1)}{' '}
                      รายการ
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* No Status - Quick Apply */}
            {!status?.status && notes.length === 0 && (
              <div className="bg-muted rounded-xl border border-dashed border-border p-4 text-center">
                <Shield size={24} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  ยังไม่มีสถานะหรือหมายเหตุสำหรับรายการนี้
                </p>
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all touch-manipulation"
                >
                  <Shield size={16} />
                  เพิ่มสถานะหรือหมายเหตุ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status & Notes Modal */}
      <StatusAndNotesModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        item={item}
        entityType="STOCK"
        onStatusChange={loadStatusData}
      />
    </>
  );
}
