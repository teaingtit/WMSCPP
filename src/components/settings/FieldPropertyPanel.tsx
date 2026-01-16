'use client';

import { X } from 'lucide-react';

interface FieldPropertyPanelProps {
  field: {
    id: string;
    key: string;
    label: string;
    type: 'text' | 'number' | 'date';
    required: boolean;
    scope: 'PRODUCT' | 'LOT';
  } | null;
  onUpdate: (id: string, updates: any) => void;
  onClose: () => void;
}

export default function FieldPropertyPanel({ field, onUpdate, onClose }: FieldPropertyPanelProps) {
  if (!field) return null;

  const generateKey = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  return (
    <div className="bg-white border-l border-slate-200 w-80 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800">คุณสมบัติฟิลด์</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          aria-label="ปิด"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Label */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อฟิลด์ (Label) *</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => {
              const newLabel = e.target.value;
              onUpdate(field.id, {
                label: newLabel,
                key: generateKey(newLabel),
              });
            }}
            className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="เช่น: ชื่อสินค้า"
          />
        </div>

        {/* Key */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Key (ชื่อตัวแปร)</label>
          <input
            type="text"
            value={field.key}
            onChange={(e) => onUpdate(field.id, { key: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="product_name"
          />
          <p className="text-xs text-slate-500 mt-1">สร้างอัตโนมัติจาก Label</p>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทข้อมูล</label>
          <select
            value={field.type}
            onChange={(e) => onUpdate(field.id, { type: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="text">ข้อความ (Text)</option>
            <option value="number">ตัวเลข (Number)</option>
            <option value="date">วันที่ (Date)</option>
          </select>
        </div>

        {/* Scope */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">ขอบเขต (Scope)</label>
          <select
            value={field.scope}
            onChange={(e) => onUpdate(field.id, { scope: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="PRODUCT">PRODUCT (ข้อมูลสินค้า)</option>
            <option value="LOT">LOT (ข้อมูลล็อต)</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">
            PRODUCT: บันทึกครั้งเดียว | LOT: บันทึกทุกครั้งที่รับเข้า
          </p>
        </div>

        {/* Required */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm font-bold text-slate-700">จำเป็นต้องกรอก (Required)</span>
          </label>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>คำแนะนำ:</strong> ดับเบิลคลิกที่ชื่อฟิลด์เพื่อแก้ไขแบบเร็ว
        </p>
      </div>
    </div>
  );
}
