'use client';

import React, { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Plus, Grid3x3, Sparkles } from 'lucide-react';
import { createZone } from '@/actions/location-actions';
import { SubmitButton } from '@/components/SubmitButton';
import { wrapFormAction, notify } from '@/lib/ui-helpers';

interface CreateZoneFormProps {
  warehouseId: string;
  onSuccess?: () => void;
}

const initialState = { success: false, message: '' };

export function CreateZoneForm({ warehouseId, onSuccess }: CreateZoneFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [state, formAction] = useFormState(wrapFormAction(createZone), initialState);

  // Auto-generate code from zone name
  const autoCode = zoneName ? `ZONE-${zoneName.toUpperCase()}` : '';

  useEffect(() => {
    if (state.message) {
      notify.ok(state);
      if (state.success) {
        setIsOpen(false);
        setZoneName('');
        if (onSuccess) onSuccess();
      }
    }
  }, [state, onSuccess]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
      >
        <Plus size={16} />
        สร้างโซนจัดเก็บ
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Grid3x3 size={20} className="text-indigo-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">สร้างโซนจัดเก็บใหม่</h3>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="warehouse_id" value={warehouseId} />
        <input type="hidden" name="code" value={autoCode} />

        <div>
          <label htmlFor="zone" className="block text-sm font-medium text-slate-700 mb-1">
            ชื่อโซนจัดเก็บ <span className="text-red-500">*</span>
          </label>
          <input
            id="zone"
            name="zone"
            type="text"
            required
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            placeholder="เช่น A, B, COLD, DRY"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <p className="text-xs text-slate-500 mt-1">
            ตัวระบุสั้นๆ สำหรับโซนจัดเก็บ (เช่น A, B, COLD)
          </p>
        </div>

        {zoneName && (
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-2 border-indigo-300 rounded-xl p-4 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-indigo-600" />
              <p className="text-sm font-semibold text-indigo-800">รหัสที่สร้างอัตโนมัติ</p>
            </div>
            <p className="text-2xl font-mono font-bold text-indigo-900 tracking-wider">
              {autoCode}
            </p>
            <p className="text-xs text-indigo-600 mt-1">✓ พร้อมสร้าง</p>
          </div>
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
            คำอธิบาย (ไม่บังคับ)
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="เช่น พื้นที่เก็บหลัก, คลังเย็น, ฯลฯ"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <SubmitButton
            disabled={!zoneName}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            สร้างโซนจัดเก็บ
          </SubmitButton>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setZoneName('');
            }}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
}
