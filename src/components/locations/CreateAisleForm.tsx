'use client';

import React, { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Plus, Layers } from 'lucide-react';
import { createAisle } from '@/actions/location-actions';
import { SubmitButton } from '@/components/SubmitButton';
import { wrapFormAction, notify } from '@/lib/ui-helpers';
import { Location } from '@/types/inventory';

interface CreateAisleFormProps {
  zones: Location[];
  onSuccess?: () => void;
}

const initialState = { success: false, message: '' };

export function CreateAisleForm({ zones, onSuccess }: CreateAisleFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState('');
  const [aisleName, setAisleName] = useState('');
  const [state, formAction] = useFormState(wrapFormAction(createAisle), initialState);

  // Find selected zone object
  const zoneObj = zones.find((z) => z.id === selectedZone);

  // Auto-generate code from zone and aisle
  const autoCode = zoneObj && aisleName ? `${zoneObj.zone}-${aisleName.toUpperCase()}` : '';

  useEffect(() => {
    if (state.message) {
      notify.ok(state);
      if (state.success) {
        setIsOpen(false);
        setSelectedZone('');
        setAisleName('');
        if (onSuccess) onSuccess();
      }
    }
  }, [state, onSuccess]);

  if (zones.length === 0) {
    return <div className="text-sm text-slate-500 italic">กรุณาสร้างโซนก่อนเพิ่มทางเดิน</div>;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
      >
        <Plus size={16} />
        สร้างทางเดิน
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Layers size={20} className="text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">สร้างทางเดินใหม่</h3>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="code" value={autoCode} />

        <div>
          <label htmlFor="parent_id" className="block text-sm font-medium text-slate-700 mb-1">
            เลือกโซน <span className="text-red-500">*</span>
          </label>
          <select
            id="parent_id"
            name="parent_id"
            required
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            <option value="">-- เลือกโซน --</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.zone} ({zone.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="aisle" className="block text-sm font-medium text-slate-700 mb-1">
            ชื่อทางเดิน <span className="text-red-500">*</span>
          </label>
          <input
            id="aisle"
            name="aisle"
            type="text"
            required
            value={aisleName}
            onChange={(e) => setAisleName(e.target.value)}
            placeholder="เช่น A1, A2, B1"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <p className="text-xs text-slate-500 mt-1">ตัวระบุทางเดินภายในโซน</p>
        </div>

        {autoCode && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-xs font-medium text-emerald-700 mb-1">รหัสที่จะถูกสร้างอัตโนมัติ:</p>
            <p className="text-sm font-mono font-bold text-emerald-900">{autoCode}</p>
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
            placeholder="คำอธิบายทางเดิน..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <SubmitButton
            disabled={!selectedZone || !aisleName}
            className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            สร้างทางเดิน
          </SubmitButton>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setSelectedZone('');
              setAisleName('');
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
