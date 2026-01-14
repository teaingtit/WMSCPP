'use client';

import React, { useState, useEffect } from 'react';
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

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockWithDetails | null;
  warehouseId?: string; // Kept for compatibility but no longer used
}

export default function StockDetailModal({
  isOpen,
  onClose,
  item,
  warehouseId: _warehouseId,
}: StockDetailModalProps) {
  const [status, setStatus] = useState<EntityStatus | null>(null);
  const [notes, setNotes] = useState<EntityNote[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [_isLoading, setIsLoading] = useState(false);

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

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-detail-modal-title"
      >
        <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col">
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
              style={{
                backgroundColor: status.status.bg_color,
                borderColor: status.status.color + '40',
              }}
            >
              {restricted ? (
                <AlertTriangle size={18} style={{ color: status.status.color }} />
              ) : (
                <Shield size={18} style={{ color: status.status.color }} />
              )}
              <div className="flex-1 min-w-0">
                <div
                  className="font-bold text-sm truncate"
                  style={{ color: status.status.text_color }}
                >
                  {status.status.name}
                </div>
                {status.status.description && (
                  <div
                    className="text-[10px] opacity-80 truncate"
                    style={{ color: status.status.text_color }}
                  >
                    {status.status.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowStatusModal(true)}
                className="text-[10px] font-bold px-2 py-1 rounded-md bg-white/50 hover:bg-white/80 transition-colors"
                style={{ color: status.status.text_color }}
              >
                จัดการ
              </button>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Product Details Card */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Box size={12} /> ข้อมูลสินค้า
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">SKU</span>
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {item.product?.sku || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">หมวดหมู่</span>
                  <span className="font-bold text-slate-700 text-sm">
                    {item.product?.category_id || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">หน่วย</span>
                  <span className="font-bold text-slate-700 text-sm">
                    {item.product?.uom || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">อัปเดตล่าสุด</span>
                  <span className="font-bold text-slate-700 text-sm flex items-center gap-1">
                    <Clock size={10} className="text-slate-400" />
                    {new Date(item.updated_at).toLocaleDateString('th-TH')}
                  </span>
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin size={12} /> ข้อมูลตำแหน่ง
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 flex flex-col items-center min-w-[4.5rem]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">ตำแหน่ง</span>
                  <span className="font-bold text-slate-700">{item.location?.code || '-'}</span>
                </div>
                <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 flex flex-col items-center min-w-[4rem]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Lot</span>
                  <span className="font-bold text-slate-700">{item.lot || '-'}</span>
                </div>
                <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 flex flex-col items-center min-w-[4rem]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Position</span>
                  <span className="font-bold text-slate-700">{item.cart || '-'}</span>
                </div>
                {item.level && (
                  <div className="px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-200 flex flex-col items-center min-w-[4rem]">
                    <span className="text-[9px] font-bold text-indigo-400 uppercase flex items-center gap-0.5">
                      <Layers size={9} /> ชั้น
                    </span>
                    <span className="font-bold text-indigo-700">{item.level}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Status Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Tag size={12} /> รายละเอียดจำนวน
              </div>

              {/* Total Quantity */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-600 font-medium">รวมทั้งหมด</span>
                <span
                  className={`text-2xl font-black ${
                    restricted ? 'text-red-600' : 'text-slate-800'
                  }`}
                >
                  {totalQuantity.toLocaleString()}
                  <span className="text-sm font-medium text-slate-400 ml-1">
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
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        !status?.status ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    ></div>
                    <span
                      className={`text-sm font-medium ${
                        !status?.status ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      สถานะปกติ
                    </span>
                  </div>
                  <span
                    className={`font-bold text-lg ${
                      !status?.status ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {normalQuantity.toLocaleString()}
                  </span>
                </div>

                {/* Affected Quantity */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    status?.status ? 'border' : 'bg-slate-50 border border-slate-100'
                  }`}
                  style={
                    status?.status
                      ? {
                          backgroundColor: status.status.bg_color,
                          borderColor: status.status.color + '40',
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status?.status?.color || '#e2e8f0' }}
                    ></div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: status?.status?.text_color || '#64748b' }}
                    >
                      {status?.status?.name || 'ไม่มีสถานะ'}
                    </span>
                  </div>
                  <span
                    className="font-bold text-lg"
                    style={{ color: status?.status?.text_color || '#94a3b8' }}
                  >
                    {affectedQuantity.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status Action Button */}
              <button
                onClick={() => setShowStatusModal(true)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-100 active:scale-[0.98] transition-all touch-manipulation"
              >
                <Shield size={16} />
                {status?.status ? 'จัดการสถานะ' : 'เพิ่มสถานะ'}
              </button>
            </div>

            {/* Custom Attributes */}
            {item.attributes && Object.keys(item.attributes).length > 0 && (
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  คุณสมบัติเพิ่มเติม (Attributes)
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(item.attributes).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
                    >
                      <span className="text-slate-400 mr-1">{key}:</span>
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
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                    <StickyNote size={12} /> หมายเหตุ ({notes.length})
                  </div>
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline"
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
                          className="flex items-start gap-2 bg-white/60 rounded-lg p-2"
                        >
                          <span className="text-amber-500 mt-0.5">📌</span>
                          <p className="text-xs text-amber-800 line-clamp-2 flex-1">
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
              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4 text-center">
                <Shield size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500 mb-3">
                  ยังไม่มีสถานะหรือหมายเหตุสำหรับรายการนี้
                </p>
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all touch-manipulation"
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
