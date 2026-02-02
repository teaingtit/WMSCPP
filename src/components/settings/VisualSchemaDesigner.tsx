'use client';

import { useState, useEffect } from 'react';
import FieldPalette from './FieldPalette';
import SchemaFieldCard from './SchemaFieldCard';
import FieldPropertyPanel from './FieldPropertyPanel';
import { Package, Layers } from 'lucide-react';

interface SchemaField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
  required: boolean;
  scope: 'PRODUCT' | 'LOT';
}

interface VisualSchemaDesignerProps {
  onSchemaChange: (schemaJson: string) => void;
  initialSchema?: string;
}

export default function VisualSchemaDesigner({
  onSchemaChange,
  initialSchema = '[]',
}: VisualSchemaDesignerProps) {
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggedType, setDraggedType] = useState<'text' | 'number' | 'date' | null>(null);
  const [dragOverScope, setDragOverScope] = useState<'PRODUCT' | 'LOT' | null>(null);

  // Initialize from initial schema
  useEffect(() => {
    try {
      const parsed = JSON.parse(initialSchema);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const fieldsWithIds = parsed.map((f: any, idx: number) => ({
          ...f,
          id: f.id || `field-${Date.now()}-${idx}`,
        }));
        setFields(fieldsWithIds);
      }
    } catch (e) {
      console.error('Failed to parse initial schema:', e);
    }
  }, [initialSchema]);

  // Emit schema changes
  useEffect(() => {
    const schema = fields.map(({ id, ...field }) => field);
    onSchemaChange(JSON.stringify(schema));
  }, [fields, onSchemaChange]);

  const generateKey = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleDragStart = (type: 'text' | 'number' | 'date') => {
    setDraggedType(type);
  };

  const handleDragOver = (e: React.DragEvent, scope: 'PRODUCT' | 'LOT') => {
    e.preventDefault();
    setDragOverScope(scope);
  };

  const handleDragLeave = () => {
    setDragOverScope(null);
  };

  const handleDrop = (e: React.DragEvent, scope: 'PRODUCT' | 'LOT') => {
    e.preventDefault();
    setDragOverScope(null);

    if (!draggedType) return;

    const typeLabels = {
      text: 'ฟิลด์ข้อความ',
      number: 'ฟิลด์ตัวเลข',
      date: 'ฟิลด์วันที่',
    };

    const newField: SchemaField = {
      id: `field-${Date.now()}`,
      key: generateKey(typeLabels[draggedType]),
      label: typeLabels[draggedType],
      type: draggedType,
      required: false,
      scope,
    };

    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
    setDraggedType(null);
  };

  const handleUpdateField = (id: string, updates: Partial<SchemaField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleDeleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
  };

  const productFields = fields.filter((f) => f.scope === 'PRODUCT');
  const lotFields = fields.filter((f) => f.scope === 'LOT');
  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;

  return (
    <div className="flex gap-4">
      {/* Main Area */}
      <div className="flex-1 space-y-4">
        {/* Field Palette */}
        <FieldPalette onDragStart={handleDragStart} />

        {/* PRODUCT Scope Drop Zone */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package size={18} className="text-indigo-600" />
            <h4 className="font-bold text-slate-700">PRODUCT Scope</h4>
            <span className="text-xs text-slate-500">(ข้อมูลสินค้า - บันทึกครั้งเดียว)</span>
          </div>

          <div
            data-testid="drop-zone-PRODUCT"
            onDragOver={(e) => handleDragOver(e, 'PRODUCT')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'PRODUCT')}
            className={`
              min-h-32 p-4 rounded-lg border-2 border-dashed transition-all
              ${
                dragOverScope === 'PRODUCT'
                  ? 'bg-indigo-50 border-indigo-300'
                  : 'bg-slate-50 border-slate-300'
              }
            `}
          >
            {productFields.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">ลากฟิลด์มาวางที่นี่...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {productFields.map((field) => (
                  <SchemaFieldCard
                    key={field.id}
                    field={field}
                    onUpdate={handleUpdateField}
                    onDelete={handleDeleteField}
                    onClick={setSelectedFieldId}
                    isSelected={selectedFieldId === field.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LOT Scope Drop Zone */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={18} className="text-emerald-600" />
            <h4 className="font-bold text-slate-700">LOT Scope</h4>
            <span className="text-xs text-slate-500">(ข้อมูลล็อต - บันทึกทุกครั้งที่รับเข้า)</span>
          </div>

          <div
            data-testid="drop-zone-LOT"
            onDragOver={(e) => handleDragOver(e, 'LOT')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'LOT')}
            className={`
              min-h-32 p-4 rounded-lg border-2 border-dashed transition-all
              ${
                dragOverScope === 'LOT'
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-slate-50 border-slate-300'
              }
            `}
          >
            {lotFields.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <Layers size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">ลากฟิลด์มาวางที่นี่...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lotFields.map((field) => (
                  <SchemaFieldCard
                    key={field.id}
                    field={field}
                    onUpdate={handleUpdateField}
                    onDelete={handleDeleteField}
                    onClick={setSelectedFieldId}
                    isSelected={selectedFieldId === field.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property Panel */}
      {selectedField && (
        <FieldPropertyPanel
          field={selectedField}
          onUpdate={handleUpdateField}
          onClose={() => setSelectedFieldId(null)}
        />
      )}
    </div>
  );
}
