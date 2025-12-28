'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface SchemaField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
  required: boolean;
}

interface SchemaBuilderProps {
  onSchemaChange: (json: string) => void;
}

export default function SchemaBuilder({ onSchemaChange }: SchemaBuilderProps) {
  const [fields, setFields] = useState<SchemaField[]>([]);

  // อัปเดต JSON กลับไปให้ Form หลักทุกครั้งที่ fields เปลี่ยน
  useEffect(() => {
    onSchemaChange(JSON.stringify(fields));
  }, [fields, onSchemaChange]);

  const addField = () => {
    const newField: SchemaField = {
      key: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false
    };
    setFields([...fields, newField]);
  };

  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  // ✅ Fix TypeScript: ใช้ .map เพื่อ update state แบบ Immutable และ Type-safe
  const updateField = (index: number, key: keyof SchemaField, value: any) => {
    setFields(prev => prev.map((field, i) => {
      if (i !== index) return field; // คืนค่าเดิมถ้าไม่ใช่ index ที่แก้ไข

      // 1. สร้าง object ใหม่ (Clone) เพื่อแก้ไข
      const updatedField = { ...field, [key]: value };

      // 2. Logic: Auto-generate key เมื่อ Label เปลี่ยน
      if (key === 'label' && typeof value === 'string') {
         // สร้าง baseKey จาก Label (ตัดอักขระพิเศษ, เปลี่ยนเว้นวรรคเป็น _)
         let baseKey = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
         
         // ถ้าว่าง (เช่นใส่แต่ space) ให้ใช้ timestamp กันเหนียว
         if (!baseKey) baseKey = `field_${Date.now()}`;
         
         // 3. Duplicate Check: ตรวจสอบว่า Key ซ้ำกับ Field อื่นหรือไม่
         const isDuplicate = prev.some((f, fIdx) => fIdx !== index && f.key === baseKey);
         
         // ถ้าซ้ำ ให้เติม _index ต่อท้าย
         updatedField.key = isDuplicate ? `${baseKey}_${index}` : baseKey;
      }
      
      return updatedField;
    }));
  };

  return (
    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-2">
         <h4 className="text-sm font-bold text-slate-700">ออกแบบฟอร์มรับเข้า (Form Fields)</h4>
         <button 
           type="button" 
           onClick={addField}
           className="text-xs flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors"
         >
           <Plus size={14} /> เพิ่มช่องกรอก
         </button>
      </div>

      {fields.length === 0 && (
         <div className="text-center py-6 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-lg">
            ยังไม่มีข้อมูลจำเพาะ (กดปุ่มเพิ่มเพื่อสร้างฟอร์ม)
         </div>
      )}

      {fields.map((field, idx) => (
        <div key={idx} className="flex gap-2 items-start animate-in slide-in-from-left-2 fade-in duration-200">
           {/* Label Input */}
           <div className="flex-1">
              <input 
                placeholder="ชื่อช่อง (เช่น วันหมดอายุ)" 
                className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                value={field.label}
                onChange={(e) => updateField(idx, 'label', e.target.value)}
                required
                aria-label={`ชื่อช่องรายการที่ ${idx + 1}`} // ✅ A11y Fix
              />
           </div>

           {/* Type Select */}
           <div className="w-28">
              <select 
                className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-white"
                value={field.type}
                onChange={(e) => updateField(idx, 'type', e.target.value)}
                aria-label={`ชนิดข้อมูลรายการที่ ${idx + 1}`} // ✅ A11y Fix (Select Name)
              >
                 <option value="text">ข้อความ</option>
                 <option value="number">ตัวเลข</option>
                 <option value="date">วันที่</option>
              </select>
           </div>

           {/* Required Checkbox */}
           <div className="flex items-center h-9 px-2 bg-white border border-slate-200 rounded-lg" title="จำเป็นต้องกรอก">
              <input 
                type="checkbox" 
                checked={field.required}
                onChange={(e) => updateField(idx, 'required', e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
                aria-label={`จำเป็นต้องกรอกรายการที่ ${idx + 1}`} // ✅ A11y Fix (Label)
              />
           </div>

           {/* Delete Button */}
           <button 
             type="button"
             onClick={() => removeField(idx)}
             className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
             aria-label={`ลบรายการที่ ${idx + 1}`} // ✅ A11y Fix (Button Text)
             title="ลบรายการ"
           >
             <Trash2 size={16} />
           </button>
        </div>
      ))}
    </div>
  );
}