'use client';

import React from 'react';
import { X, Save, CheckCircle2, Loader2, PackagePlus, ArrowRightLeft, Truck } from 'lucide-react';
import { string } from 'zod';

interface TransactionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void; // สำหรับปุ่ม "ยืนยัน" (Redirect)
  onSaveAndContinue?: () => void; // Suggestion 1: ทำให้เป็น optional เพื่อความยืดหยุ่น
  title: string;
  details: React.ReactNode; // ข้อมูลสรุปที่จะแสดง (เช่น สินค้าอะไร จำนวนเท่าไหร่)
  isLoading: boolean;
  confirmLabel?: string;
  confirmText?: string; // Alias for confirmLabel to match usage in some components
  type?: 'INBOUND' | 'TRANSFER' | 'OUTBOUND';
}

export default function TransactionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  onSaveAndContinue,
  title,
  details,
  isLoading,
  confirmLabel = 'ยืนยันรายการ',
  confirmText,
  type = 'INBOUND',
}: TransactionConfirmModalProps) {
  if (!isOpen) return null;

  // Suggestion 2: ใช้ Theme ที่มีไอคอนแบบไดนามิกเพื่อ UX ที่ดีขึ้น
  const themes = {
    INBOUND: {
      bg: 'bg-emerald-600',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
      bgLight: 'bg-emerald-50',
      Icon: PackagePlus,
    },
    TRANSFER: {
      bg: 'bg-indigo-600',
      text: 'text-indigo-600',
      border: 'border-indigo-100',
      bgLight: 'bg-indigo-50',
      Icon: ArrowRightLeft,
    },
    OUTBOUND: {
      bg: 'bg-rose-600',
      text: 'text-rose-600',
      border: 'border-rose-100',
      bgLight: 'bg-rose-50',
      Icon: Truck,
    },
  };
  const theme = themes[type];
  const HeaderIcon = theme.Icon;

  const finalConfirmLabel = confirmText || confirmLabel;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      // Suggestion 3: เพิ่ม ARIA roles เพื่อการเข้าถึงที่ดีขึ้น
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-confirm-modal-title"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        {/* Header */}
        <div className={`${theme.bg} p-6 text-white flex justify-between items-start`}>
          <div className="flex gap-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <HeaderIcon size={28} className="text-white" />
            </div>
            <div>
              <h3 id="transaction-confirm-modal-title" className="text-xl font-bold">
                ยืนยันการทำรายการ
              </h3>
              <p className="text-white/80 text-sm">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close modal"
            className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-6">
          <div className={`p-5 rounded-2xl ${theme.bgLight} border ${theme.border} mb-6`}>
            {details}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* 1. Confirm & Redirect */}
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full py-4 ${theme.bg} hover:opacity-90 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]`}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              <span>{finalConfirmLabel}</span>
            </button>

            {/* Suggestion 1: แสดงปุ่มนี้เมื่อมี prop onSaveAndContinue เท่านั้น */}
            {onSaveAndContinue && (
              <button
                onClick={onSaveAndContinue}
                disabled={isLoading}
                className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin text-slate-400" />
                ) : (
                  <Save className="text-slate-500" />
                )}
                <span>บันทึกและทำรายการต่อ</span>
              </button>
            )}

            {/* 3. Cancel */}
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-2 text-slate-400 font-bold text-sm hover:text-slate-600"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
