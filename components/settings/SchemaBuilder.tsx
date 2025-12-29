'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Layers, Tag, Info } from 'lucide-react';

interface SchemaField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
  required: boolean;
  scope: 'PRODUCT' | 'LOT'; // ✅ แยกประเภทข้อมูล
}

interface SchemaBuilderProps {
  onSchemaChange: (json: string) => void;
  initialSchema?: string;
}

export default function SchemaBuilder({ onSchemaChange, initialSchema }: SchemaBuilderProps) {
  const [fields, setFields] = useState<SchemaField[]>([]);

  // Init Data
  useEffect(() => {
    if (initialSchema) {
      try {
        const parsed = JSON.parse(initialSchema);
        // Migration: ข้อมูลเก่าที่ไม่มี scope ให้ถือว่าเป็น PRODUCT
        const migrated = parsed.map((f: any) => ({
           ...f,
           scope: f.scope || 'PRODUCT' 
        }));
        setFields(migrated);
      } catch (e) { console.error("Schema Parse Error", e); }
    }
  }, [initialSchema]);

  // Sync to Parent
  useEffect(() => {
    onSchemaChange(JSON.stringify(fields));
  }, [fields, onSchemaChange]);

  const addField = () => {
    const newField: SchemaField = {
      key: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      scope: 'PRODUCT' // Default
    };
    setFields([...fields, newField]);
  };

  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof SchemaField, value: any) => {
    setFields(prev => prev.map((field, i) => {
      if (i !== index) return field;
      
      const updated = { ...field, [key]: value };

      // Auto-generate Key from Label
      if (key === 'label' && typeof value === 'string') {
         let baseKey = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
         if (!baseKey) baseKey = `field_${Date.now()}`;
         const isDuplicate = prev.some((f, fIdx) => fIdx !== index && f.key === baseKey);
         updated.key = isDuplicate ? `${baseKey}_${index}` : baseKey;
      }
      return updated;
    }));
  };

  return (
    <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-2">
         <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-700">ออกแบบโครงสร้างข้อมูล (Dynamic Fields)</h4>
            <div className="group relative">
                <Info size={14} className="text-slate-400 cursor-help"/>
                <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-800 text-white text-xs p-2 rounded hidden group-hover:block z-10">
                    กำหนดช่องกรอกข้อมูลพิเศษสำหรับหมวดหมู่นี้
                </div>
            </div>
         </div>
         <button 
           type="button" // ✅ Best Practice: Prevent Form Submission
           onClick={addField}
           className="text-xs flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
         >
           <Plus size={14} /> เพิ่มช่องกรอก
         </button>
      </div>

      {fields.length === 0 && (
         <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
            ยังไม่มีข้อมูลจำเพาะ
         </div>
      )}

      {fields.map((field, idx) => (
        <div key={idx} className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-lg shadow-sm animate-in slide-in-from-left-2 duration-300">
           
           <div className="flex gap-3 items-start">
               {/* Label */}
               <div className="flex-1">
                  <label className="sr-only">ชื่อช่องข้อมูล</label> {/* Accessibility */}
                  <input 
                    placeholder="ชื่อช่อง (เช่น สี, วันหมดอายุ)" 
                    className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    value={field.label}
                    onChange={(e) => updateField(idx, 'label', e.target.value)}
                    required
                  />
               </div>

               {/* Type */}
               <div className="w-28">
                  <label className="sr-only">ประเภทข้อมูล</label>
                  <select 
     aria-label={`ชนิดข้อมูลของ ${field.label || 'รายการนี้'}`}
     className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100"
     value={field.type}
     onChange={(e) => updateField(idx, 'type', e.target.value)}
   >
      <option value="text">ข้อความ</option>
      <option value="number">ตัวเลข</option>
      <option value="date">วันที่</option>
   </select>
               </div>

               {/* Delete */}
               <button 
                 type="button" 
                 onClick={() => removeField(idx)}
                 className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                 title="ลบรายการนี้"
               >
                 <Trash2 size={18} />
               </button>
           </div>

           {/* Row 2: Settings & Scope */}
           <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
               
               {/* Scope Selector */}
               <div className="flex items-center gap-3 border-r border-slate-200 pr-4 mr-2">
                  <span className="font-bold text-slate-500">ระดับข้อมูล:</span>
                  
                  <label className={`flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded transition-colors ${field.scope === 'PRODUCT' ? 'bg-indigo-100 text-indigo-700 font-bold ring-1 ring-indigo-200' : 'hover:bg-slate-200 text-slate-500'}`}>
                      <input 
                        type="radio" 
                        name={`scope-${idx}`}
                        checked={field.scope === 'PRODUCT'}
                        onChange={() => updateField(idx, 'scope', 'PRODUCT')}
                        className="hidden" // Custom Radio Style
                      />
                      <Tag size={12}/> สินค้า (Spec)
                  </label>

                  <label className={`flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded transition-colors ${field.scope === 'LOT' ? 'bg-emerald-100 text-emerald-700 font-bold ring-1 ring-emerald-200' : 'hover:bg-slate-200 text-slate-500'}`}>
                      <input 
                        type="radio" 
                        name={`scope-${idx}`}
                        checked={field.scope === 'LOT'}
                        onChange={() => updateField(idx, 'scope', 'LOT')}
                        className="hidden"
                      />
                      <Layers size={12}/> ล็อต (Inbound)
                  </label>
               </div>

               {/* Required Toggle */}
               <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 select-none">
                  <input 
                    type="checkbox" 
                    checked={field.required}
                    onChange={(e) => updateField(idx, 'required', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>จำเป็นต้องกรอก</span>
               </label>
           </div>
        </div>
      ))}
    </div>
  );
}