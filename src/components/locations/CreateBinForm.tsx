'use client';

import React, { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Plus, Package, Sparkles } from 'lucide-react';
import { createBin } from '@/actions/location-actions';
import { SubmitButton } from '@/components/SubmitButton';
import { wrapFormAction, notify } from '@/lib/ui-helpers';
import { Location } from '@/types/inventory';

interface CreateBinFormProps {
  aisles: Location[];
  onSuccess?: () => void;
}

const initialState = { success: false, message: '' };

export function CreateBinForm({ aisles, onSuccess }: CreateBinFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAisle, setSelectedAisle] = useState('');
  const [binName, setBinName] = useState('');
  const [state, formAction] = useFormState(wrapFormAction(createBin), initialState);

  // Find selected aisle object
  const aisleObj = aisles.find((a) => a.id === selectedAisle);

  // Auto-generate code from aisle and bin
  const autoCode =
    aisleObj && binName ? `${aisleObj.zone}-${aisleObj.aisle}-${binName.toUpperCase()}` : '';

  useEffect(() => {
    if (state.message) {
      notify.ok(state);
      if (state.success) {
        setIsOpen(false);
        setSelectedAisle('');
        setBinName('');
        if (onSuccess) onSuccess();
      }
    }
  }, [state, onSuccess]);

  if (aisles.length === 0) {
    return <div className="text-sm text-slate-500 italic">กรุณาสร้าง LOT ก่อนเพิ่มพื้นที่เก็บ</div>;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
      >
        <Plus size={16} />
        สร้างพื้นที่เก็บ
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Package size={20} className="text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">สร้างพื้นที่เก็บใหม่ (มุมมองบน)</h3>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="code" value={autoCode} />

        <div>
          <label htmlFor="parent_id" className="block text-sm font-medium text-slate-700 mb-1">
            เลือก LOT <span className="text-red-500">*</span>
          </label>
          <select
            id="parent_id"
            name="parent_id"
            required
            value={selectedAisle}
            onChange={(e) => setSelectedAisle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          >
            <option value="">-- เลือก LOT --</option>
            {aisles.map((aisle) => (
              <option key={aisle.id} value={aisle.id}>
                {aisle.zone}/{aisle.aisle} ({aisle.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bin_code" className="block text-sm font-medium text-slate-700 mb-1">
            ชื่อพื้นที่เก็บ <span className="text-red-500">*</span>
          </label>
          <input
            id="bin_code"
            name="bin_code"
            type="text"
            required
            value={binName}
            onChange={(e) => setBinName(e.target.value)}
            placeholder="เช่น L1, L2, SHELF-01"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
          <p className="text-xs text-slate-500 mt-1">ตัวระบุพื้นที่เก็บภายใน LOT</p>
        </div>

        {autoCode && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-xl p-4 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">รหัสที่สร้างอัตโนมัติ</p>
            </div>
            <p className="text-2xl font-mono font-bold text-amber-900 tracking-wider">{autoCode}</p>
            <p className="text-xs text-amber-600 mt-1">✓ พร้อมสร้าง</p>
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
            placeholder="คำอธิบายพื้นที่เก็บ..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <SubmitButton
            disabled={!selectedAisle || !binName}
            className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            สร้างพื้นที่เก็บ
          </SubmitButton>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setSelectedAisle('');
              setBinName('');
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
