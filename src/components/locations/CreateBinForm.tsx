'use client';

import React, { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Plus, Package } from 'lucide-react';
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
    return <div className="text-sm text-slate-500 italic">กรุณาสร้างทางเดินก่อนเพิ่มช่องเก็บ</div>;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
      >
        <Plus size={16} />
        สร้างช่องเก็บ
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Package size={20} className="text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">สร้างช่องเก็บใหม่</h3>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="code" value={autoCode} />

        <div>
          <label htmlFor="parent_id" className="block text-sm font-medium text-slate-700 mb-1">
            เลือกทางเดิน <span className="text-red-500">*</span>
          </label>
          <select
            id="parent_id"
            name="parent_id"
            required
            value={selectedAisle}
            onChange={(e) => setSelectedAisle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          >
            <option value="">-- เลือกทางเดิน --</option>
            {aisles.map((aisle) => (
              <option key={aisle.id} value={aisle.id}>
                {aisle.zone}/{aisle.aisle} ({aisle.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bin_code" className="block text-sm font-medium text-slate-700 mb-1">
            ชื่อช่องเก็บ <span className="text-red-500">*</span>
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
          <p className="text-xs text-slate-500 mt-1">ตัวระบุช่องเก็บภายในทางเดิน</p>
        </div>

        {autoCode && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-700 mb-1">รหัสที่จะถูกสร้างอัตโนมัติ:</p>
            <p className="text-sm font-mono font-bold text-amber-900">{autoCode}</p>
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
            placeholder="คำอธิบายช่องเก็บ..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <SubmitButton
            disabled={!selectedAisle || !binName}
            className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            สร้างช่องเก็บ
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
