'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Type, Hash, Calendar, List } from 'lucide-react';

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
      key: `field_${Date.now()}`, // Auto Gen Key ไปก่อน
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

  const updateField = (index: number, key: keyof SchemaField, value: any) => {
    const newFields = [...fields];
    // @ts-ignore
    newFields[index][key] = value;
    
    // Auto-generate key from label (ถ้าเป็นภาษาอังกฤษ)
    if (key === 'label') {
       newFields[index].key = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `field_${Date.now()}`;
    }
    
    setFields(newFields);
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
              />
           </div>

           {/* Type Select */}
           <div className="w-28">
              <select 
                className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-white"
                value={field.type}
                onChange={(e) => updateField(idx, 'type', e.target.value)}
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
              />
           </div>

           {/* Delete Button */}
           <button 
             type="button"
             onClick={() => removeField(idx)}
             className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
           >
             <Trash2 size={16} />
           </button>
        </div>
      ))}
    </div>
  );
}