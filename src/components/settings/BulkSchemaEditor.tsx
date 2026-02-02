'use client';

import { useState } from 'react';
import { bulkEditSchemas, previewBulkEdit, type BulkEditMode } from '@/actions/bulk-schema-actions';
import { Layers, Eye, Save, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SchemaBuilder from './SchemaBuilder';
import { notify } from '@/lib/ui-helpers';

interface BulkSchemaEditorProps {
  categories: Array<{ id: string; name: string; form_schema?: any }>;
  onClose?: () => void;
}

export default function BulkSchemaEditor({ categories, onClose }: BulkSchemaEditorProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [mode, setMode] = useState<BulkEditMode>('merge');
  const [schemaJson, setSchemaJson] = useState('[]');
  const [changeNotes, setChangeNotes] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    if (selectedCategories.length === 0) {
      notify.ok({ success: false, message: 'กรุณาเลือกหมวดหมู่อย่างน้อย 1 รายการ' });
      return;
    }

    setLoading(true);
    const fields = JSON.parse(schemaJson);
    const result = await previewBulkEdit(selectedCategories, mode, fields);
    setLoading(false);

    if (result.success) {
      setPreview(result);
    } else {
      notify.ok({ success: false, message: result.message });
    }
  };

  const handleApply = async () => {
    if (!preview) {
      notify.ok({ success: false, message: 'กรุณาดูตัวอย่างก่อน' });
      return;
    }

    if (
      !confirm(
        `ต้องการแก้ไข Schema ของ ${preview.categoriesAffected} หมวดหมู่หรือไม่?\n\nการกระทำนี้จะสร้าง version ใหม่สำหรับแต่ละหมวดหมู่`,
      )
    ) {
      return;
    }

    setLoading(true);
    const fields = JSON.parse(schemaJson);
    const result = await bulkEditSchemas(selectedCategories, mode, fields, changeNotes);
    setLoading(false);

    if (result.success) {
      notify.ok({
        success: true,
        message: `อัปเดตสำเร็จ ${result.updated} หมวดหมู่${
          result.failed ? `, ล้มเหลว ${result.failed} รายการ` : ''
        }`,
      });
      setPreview(null);
      if (onClose) onClose();
    } else {
      notify.ok({ success: false, message: result.message });
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
    setPreview(null); // Reset preview when selection changes
  };

  const selectAll = () => {
    setSelectedCategories(categories.map((c) => c.id));
    setPreview(null);
  };

  const deselectAll = () => {
    setSelectedCategories([]);
    setPreview(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
          <Layers size={18} />
          แก้ไข Schema หลายหมวดหมู่พร้อมกัน
        </h3>
        <p className="text-sm text-indigo-600 mt-1">
          เลือกหมวดหมู่และโหมดการแก้ไข จากนั้นกำหนดฟิลด์ที่ต้องการเปลี่ยนแปลง
        </p>
      </div>

      {/* Category Selection */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-bold text-slate-700">เลือกหมวดหมู่</h4>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={selectAll}>
              เลือกทั้งหมด
            </Button>
            <Button size="sm" variant="outline" onClick={deselectAll}>
              ยกเลิกทั้งหมด
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCategories.includes(cat.id)
                  ? 'bg-indigo-50 border-indigo-300'
                  : 'bg-white border-slate-200 hover:border-indigo-200'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.id)}
                onChange={() => toggleCategory(cat.id)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">{cat.name}</span>
            </label>
          ))}
        </div>

        <p className="text-xs text-slate-500 mt-2">
          เลือกแล้ว: {selectedCategories.length}/{categories.length} หมวดหมู่
        </p>
      </div>

      {/* Edit Mode Selection */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h4 className="font-bold text-slate-700 mb-3">โหมดการแก้ไข</h4>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => {
              setMode('merge');
              setPreview(null);
            }}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              mode === 'merge'
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-white border-slate-200 hover:border-emerald-200'
            }`}
          >
            <div className="font-bold text-sm">Merge (ผสาน)</div>
            <div className="text-xs text-slate-600 mt-1">เพิ่มฟิลด์ใหม่ หรือ อัปเดตฟิลด์เดิม</div>
          </button>

          <button
            onClick={() => {
              setMode('replace');
              setPreview(null);
            }}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              mode === 'replace'
                ? 'bg-amber-50 border-amber-300'
                : 'bg-white border-slate-200 hover:border-amber-200'
            }`}
          >
            <div className="font-bold text-sm">Replace (แทนที่)</div>
            <div className="text-xs text-slate-600 mt-1">แทนที่ Schema ทั้งหมด</div>
          </button>

          <button
            onClick={() => {
              setMode('remove');
              setPreview(null);
            }}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              mode === 'remove'
                ? 'bg-rose-50 border-rose-300'
                : 'bg-white border-slate-200 hover:border-rose-200'
            }`}
          >
            <div className="font-bold text-sm">Remove (ลบ)</div>
            <div className="text-xs text-slate-600 mt-1">ลบฟิลด์ที่ระบุ</div>
          </button>
        </div>
      </div>

      {/* Schema Builder */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h4 className="font-bold text-slate-700 mb-3">
          {mode === 'remove' ? 'ฟิลด์ที่ต้องการลบ' : 'ฟิลด์ที่ต้องการเพิ่ม/แก้ไข'}
        </h4>
        <div className="bg-slate-50 p-1 rounded-xl border border-slate-200">
          <SchemaBuilder onSchemaChange={setSchemaJson} />
        </div>
      </div>

      {/* Change Notes */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
        <label className="text-xs font-bold text-amber-700 mb-2 block">
          หมายเหตุการเปลี่ยนแปลง
        </label>
        <input
          value={changeNotes}
          onChange={(e) => setChangeNotes(e.target.value)}
          className="w-full p-2 border border-amber-300 rounded-lg text-sm"
          placeholder="เช่น: เพิ่มฟิลด์วันหมดอายุสำหรับทุกหมวดหมู่"
        />
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white border-2 border-indigo-300 rounded-xl p-4">
          <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
            <Eye size={18} />
            ตัวอย่างการเปลี่ยนแปลง
          </h4>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {preview.preview.map((item: any) => (
              <div
                key={item.categoryId}
                className={`p-3 rounded-lg border ${
                  item.changed ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.changed ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : (
                      <XCircle size={16} className="text-slate-500" />
                    )}
                    <span className="font-bold text-sm">{item.categoryName}</span>
                  </div>
                  <span className="text-xs text-slate-600">
                    {item.currentFieldCount} → {item.newFieldCount} ฟิลด์
                  </span>
                </div>
                {item.changed && (
                  <div className="text-xs text-slate-600 mt-1">
                    {mode === 'merge' && 'จะเพิ่ม/อัปเดตฟิลด์'}
                    {mode === 'replace' && 'จะแทนที่ Schema ทั้งหมด'}
                    {mode === 'remove' && 'จะลบฟิลด์ที่ระบุ'}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
            <div className="text-sm font-bold text-indigo-900">
              สรุป: จะมีการเปลี่ยนแปลง {preview.categoriesAffected}/{preview.totalCategories}{' '}
              หมวดหมู่
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onClose && (
          <Button variant="outline" onClick={onClose} className="flex-1">
            ยกเลิก
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handlePreview}
          disabled={loading || selectedCategories.length === 0}
          className="flex-1"
        >
          <Eye size={16} className="mr-2" />
          ดูตัวอย่าง
        </Button>
        <Button
          onClick={handleApply}
          disabled={loading || !preview || preview.categoriesAffected === 0}
          className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {loading ? (
            'กำลังประมวลผล...'
          ) : (
            <>
              <Save size={16} className="mr-2" />
              บันทึกการเปลี่ยนแปลง
            </>
          )}
        </Button>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          การแก้ไขแบบ Bulk จะสร้าง version ใหม่สำหรับทุกหมวดหมู่ที่มีการเปลี่ยนแปลง
          คุณสามารถย้อนกลับได้ในภายหลัง
        </span>
      </div>
    </div>
  );
}
