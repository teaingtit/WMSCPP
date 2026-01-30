'use client';

import { CheckCircle2, X, ArrowRight, MapPin } from 'lucide-react';

export interface SuccessData {
  // Common / Summary Mode
  title?: string;
  details?: { label: string; value: string }[];

  // Single Transaction Mode (Optional)
  type?: 'INBOUND' | 'TRANSFER' | 'CROSS_TRANSFER' | 'OUTBOUND' | 'AUDIT';
  productName?: string;
  quantity?: number;
  uom?: string;
  timestamp?: string;
  // Fields ที่อาจจะมีหรือไม่มีตามประเภท
  locationCode?: string; // Inbound, Outbound
  fromLocation?: string; // Transfer
  toLocation?: string; // Transfer
  toWarehouse?: string; // Cross Transfer
  sku?: string;
  note?: string;

  // Audit Specific
  sessionName?: string;
  accuracy?: string;
  totalCounted?: number;
  varianceCount?: number;
}

interface SuccessReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SuccessData | null;
}

export default function SuccessReceiptModal({ isOpen, onClose, data }: SuccessReceiptModalProps) {
  if (!isOpen || !data) return null;

  const isSummary = !!data.details && data.details.length > 0;
  const title = data.title || 'ทำรายการสำเร็จ!';
  // Format Date
  const dateStr = data.timestamp
    ? new Date(data.timestamp).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-emerald-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
        {/* Background Pattern Decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors z-10"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm ring-8 ring-emerald-50">
            <CheckCircle2 size={40} className="animate-bounce-short" />
          </div>

          <h2 className="text-2xl font-black text-slate-800 mb-1">{title}</h2>
          <p className="text-slate-500 text-sm mb-6">{dateStr}</p>

          {/* Ticket / Receipt Card */}
          {isSummary ? (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 text-left">
              {data.details?.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center border-b border-slate-200 last:border-0 pb-2 last:pb-0"
                >
                  <span className="text-slate-500 text-sm">{item.label}</span>
                  <span className="font-bold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left space-y-4 relative overflow-hidden">
              {/* Product Info */}
              {data.type !== 'AUDIT' && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    สินค้า
                  </div>
                  <div className="font-bold text-slate-800 text-lg leading-tight">
                    {data.productName || '-'}
                  </div>
                  {data.sku && (
                    <div className="text-xs font-mono text-slate-400 mt-1">{data.sku}</div>
                  )}
                </div>
              )}

              {/* Audit Info */}
              {data.type === 'AUDIT' && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    รอบการนับ (Session)
                  </div>
                  <div className="font-bold text-slate-800 text-lg leading-tight">
                    {data.sessionName}
                  </div>
                </div>
              )}

              <div className="w-full h-px bg-slate-200 border-dashed border-b border-slate-200" />

              {/* Dynamic Content based on Type */}
              <div className="grid grid-cols-2 gap-4">
                {/* QUANTITY (For Inventory Ops) */}
                {data.type !== 'AUDIT' && (
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      จำนวน
                    </div>
                    <div className="text-2xl font-black text-emerald-600">
                      {data.quantity?.toLocaleString() || '0'}{' '}
                      <span className="text-sm font-bold text-emerald-800/60">{data.uom}</span>
                    </div>
                  </div>
                )}

                {/* AUDIT STATS */}
                {data.type === 'AUDIT' && (
                  <>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        ความแม่นยำ (Accuracy)
                      </div>
                      <div className="text-2xl font-black text-emerald-600">{data.accuracy}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        ผลต่าง (Variance)
                      </div>
                      <div className="text-2xl font-black text-amber-500">
                        {data.varianceCount}{' '}
                        <span className="text-sm text-slate-400 font-bold">รายการ</span>
                      </div>
                    </div>
                  </>
                )}

                {/* LOCATION LOGIC */}
                <div>
                  {/* Case 1: Inbound / Outbound */}
                  {(data.type === 'INBOUND' || data.type === 'OUTBOUND') && (
                    <>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {data.type === 'INBOUND' ? 'จัดเก็บที่' : 'เบิกจ่ายจาก'}
                      </div>
                      <div className="flex items-center gap-1 font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-lg w-fit">
                        <MapPin size={14} className="text-indigo-500" /> {data.locationCode}
                      </div>
                    </>
                  )}

                  {/* Case 2: Transfer */}
                  {(data.type === 'TRANSFER' || data.type === 'CROSS_TRANSFER') && (
                    <>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        ปลายทาง
                      </div>
                      <div className="font-bold text-slate-700 leading-tight">
                        {data.type === 'CROSS_TRANSFER' ? data.toWarehouse : data.toLocation}
                      </div>
                      {data.type === 'CROSS_TRANSFER' && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{data.toLocation}</div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Transfer Source Info (Optional) */}
              {(data.type === 'TRANSFER' || data.type === 'CROSS_TRANSFER') && (
                <div className="pt-2 flex items-center gap-2 text-xs text-slate-400 justify-center bg-slate-100 rounded-lg py-2 mt-2">
                  <span>{data.fromLocation}</span>
                  <ArrowRight size={12} />
                  <span className="text-emerald-600 font-bold">
                    {data.type === 'CROSS_TRANSFER' ? data.toWarehouse : data.toLocation}
                  </span>
                </div>
              )}

              {/* Audit Total (Optional) */}
              {data.type === 'AUDIT' && (
                <div className="pt-2 flex justify-between items-center text-sm bg-slate-100 rounded-lg p-3 mt-2">
                  <span className="text-slate-500 font-medium">นับแล้วทั้งหมด</span>
                  <span className="font-bold text-slate-800">{data.totalCounted} รายการ</span>
                </div>
              )}

              {/* Note (Optional) */}
              {data.note && data.note !== '-' && (
                <div className="pt-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    หมายเหตุ
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-100 p-2 rounded-lg">{data.note}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-95"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
