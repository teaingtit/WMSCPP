'use client';

import React, { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Plus, Layers, Sparkles } from 'lucide-react';
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
    return <div className="text-sm text-slate-500 italic">กรุณาสร้างโซนจัดเก็บก่อนเพิ่ม LOT</div>;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
      >
        <Plus size={16} />
        สร้าง LOT
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Layers size={20} className="text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">สร้าง LOT</h3>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="code" value={autoCode} />

        <div>
          <label htmlFor="parent_id" className="block text-sm font-medium text-slate-700 mb-1">
            เลือกโซนจัดเก็บ <span className="text-red-500">*</span>
          </label>
          <select
            id="parent_id"
            name="parent_id"
            required
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            <option value="">-- เลือกโซนจัดเก็บ --</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.zone} ({zone.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="aisle" className="block text-sm font-medium text-slate-700 mb-1">
            ชื่อ LOT <span className="text-red-500">*</span>
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
          <p className="text-xs text-slate-500 mt-1">ตัวระบุ LOT (เช่น A1, RACK-01)</p>
        </div>

        <div>
          <label htmlFor="levels" className="block text-sm font-medium text-slate-700 mb-1">
            จำนวนชั้น (Levels) <span className="text-red-500">*</span>
          </label>
          <input
            id="levels"
            name="levels"
            type="number"
            min="1"
            max="20"
            required
            defaultValue="1"
            placeholder="1"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <p className="text-xs text-slate-500 mt-1">
            ระบบจะสร้าง พื้นที่เก็บ(มุมมองบน) ให้อัตโนมัติตามจำนวนที่ระบุ
          </p>
        </div>

        {autoCode && (
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-300 rounded-xl p-4 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">รหัสที่สร้างอัตโนมัติ</p>
            </div>
            <p className="text-2xl font-mono font-bold text-emerald-900 tracking-wider">
              {autoCode}
            </p>
            <p className="text-xs text-emerald-600 mt-1">✓ พร้อมสร้าง</p>
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
            placeholder="คำอธิบาย LOT..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <SubmitButton
            disabled={!selectedZone || !aisleName}
            className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            สร้าง LOT
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
