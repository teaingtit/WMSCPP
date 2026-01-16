'use client';

import { GripVertical, Type, Hash, Calendar, Trash2, Check } from 'lucide-react';
import { useState } from 'react';

interface SchemaFieldCardProps {
  field: {
    id: string;
    key: string;
    label: string;
    type: 'text' | 'number' | 'date';
    required: boolean;
    scope: 'PRODUCT' | 'LOT';
  };
  onUpdate: (id: string, updates: Partial<SchemaFieldCardProps['field']>) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
  isSelected: boolean;
}

export default function SchemaFieldCard({
  field,
  onUpdate,
  onDelete,
  onClick,
  isSelected,
}: SchemaFieldCardProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(field.label);

  const handleLabelSave = () => {
    if (labelValue.trim()) {
      onUpdate(field.id, { label: labelValue.trim() });
    }
    setIsEditingLabel(false);
  };

  const getIcon = () => {
    switch (field.type) {
      case 'text':
        return <Type size={16} className="text-blue-600" />;
      case 'number':
        return <Hash size={16} className="text-emerald-600" />;
      case 'date':
        return <Calendar size={16} className="text-purple-600" />;
    }
  };

  const getTypeColor = () => {
    switch (field.type) {
      case 'text':
        return 'blue';
      case 'number':
        return 'emerald';
      case 'date':
        return 'purple';
    }
  };

  const color = getTypeColor();

  return (
    <div
      onClick={() => onClick(field.id)}
      className={`
        group relative p-3 rounded-lg border-2 transition-all cursor-pointer
        ${
          isSelected
            ? `bg-${color}-50 border-${color}-300 shadow-md`
            : 'bg-white border-slate-200 hover:border-slate-300'
        }
      `}
    >
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        <div className="cursor-move text-slate-400 hover:text-slate-600">
          <GripVertical size={16} />
        </div>

        {/* Type Icon */}
        {getIcon()}

        {/* Label */}
        {isEditingLabel ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleLabelSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLabelSave();
                if (e.key === 'Escape') {
                  setLabelValue(field.label);
                  setIsEditingLabel(false);
                }
              }}
              autoFocus
              className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleLabelSave}
              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div
            className="flex-1 flex items-center gap-2"
            onDoubleClick={() => setIsEditingLabel(true)}
          >
            <span className="text-sm font-medium text-slate-700">{field.label}</span>
            {field.required && (
              <span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                *
              </span>
            )}
          </div>
        )}

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(field.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Key Display */}
      <div className="mt-1 ml-8 text-xs text-slate-400 font-mono">key: {field.key}</div>
    </div>
  );
}
