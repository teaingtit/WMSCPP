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
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative border border-border">
        {/* Background Pattern Decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-muted rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors z-10"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm ring-8 ring-emerald-50">
            <CheckCircle2 size={40} className="animate-bounce-short" />
          </div>

          <h2 className="text-2xl font-black text-foreground mb-1">{title}</h2>
          <p className="text-muted-foreground text-sm mb-6">{dateStr}</p>

          {/* Ticket / Receipt Card */}
          {isSummary ? (
            <div className="bg-muted border border-border rounded-2xl p-5 space-y-3 text-left">
              {data.details?.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center border-b border-border last:border-0 pb-2 last:pb-0"
                >
                  <span className="text-muted-foreground text-sm">{item.label}</span>
                  <span className="font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted border border-border rounded-2xl p-5 text-left space-y-4 relative overflow-hidden">
              {/* Product Info */}
              {data.type !== 'AUDIT' && (
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    สินค้า
                  </div>
                  <div className="font-bold text-slate-800 text-lg leading-tight">
                    {data.productName || '-'}
                  </div>
                  {data.sku && (
                    <div className="text-xs font-mono text-muted-foreground mt-1">{data.sku}</div>
                  )}
                </div>
              )}

              {/* Audit Info */}
              {data.type === 'AUDIT' && (
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    รอบการนับ (Session)
                  </div>
                  <div className="font-bold text-slate-800 text-lg leading-tight">
                    {data.sessionName}
                  </div>
                </div>
              )}

              <div className="w-full h-px bg-border border-dashed border-b border-border" />

              {/* Dynamic Content based on Type */}
              <div className="grid grid-cols-2 gap-4">
                {/* QUANTITY (For Inventory Ops) */}
                {data.type !== 'AUDIT' && (
                  <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
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
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        ความแม่นยำ (Accuracy)
                      </div>
                      <div className="text-2xl font-black text-emerald-600">{data.accuracy}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        ผลต่าง (Variance)
                      </div>
                      <div className="text-2xl font-black text-amber-500">
                        {data.varianceCount}{' '}
                        <span className="text-sm text-muted-foreground font-bold">รายการ</span>
                      </div>
                    </div>
                  </>
                )}

                {/* LOCATION LOGIC */}
                <div>
                  {/* Case 1: Inbound / Outbound */}
                  {(data.type === 'INBOUND' || data.type === 'OUTBOUND') && (
                    <>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        {data.type === 'INBOUND' ? 'จัดเก็บที่' : 'เบิกจ่ายจาก'}
                      </div>
                      <div className="flex items-center gap-1 font-bold text-foreground bg-card border border-border px-2 py-1 rounded-lg w-fit">
                        <MapPin size={14} className="text-indigo-500" /> {data.locationCode}
                      </div>
                    </>
                  )}

                  {/* Case 2: Transfer */}
                  {(data.type === 'TRANSFER' || data.type === 'CROSS_TRANSFER') && (
                    <>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        ปลายทาง
                      </div>
                      <div className="font-bold text-foreground leading-tight">
                        {data.type === 'CROSS_TRANSFER' ? data.toWarehouse : data.toLocation}
                      </div>
                      {data.type === 'CROSS_TRANSFER' && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {data.toLocation}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Transfer Source Info (Optional) */}
              {(data.type === 'TRANSFER' || data.type === 'CROSS_TRANSFER') && (
                <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground justify-center bg-muted rounded-lg py-2 mt-2">
                  <span>{data.fromLocation}</span>
                  <ArrowRight size={12} />
                  <span className="text-emerald-600 font-bold">
                    {data.type === 'CROSS_TRANSFER' ? data.toWarehouse : data.toLocation}
                  </span>
                </div>
              )}

              {/* Audit Total (Optional) */}
              {data.type === 'AUDIT' && (
                <div className="pt-2 flex justify-between items-center text-sm bg-muted rounded-lg p-3 mt-2">
                  <span className="text-muted-foreground font-medium">นับแล้วทั้งหมด</span>
                  <span className="font-bold text-foreground">{data.totalCounted} รายการ</span>
                </div>
              )}

              {/* Note (Optional) */}
              {data.note && data.note !== '-' && (
                <div className="pt-3">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    หมายเหตุ
                  </div>
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded-lg">
                    {data.note}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <button
              onClick={onClose}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold shadow-lg transition-all active:scale-95"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
