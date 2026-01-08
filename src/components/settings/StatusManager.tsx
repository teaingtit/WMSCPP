'use client';

import { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import {
  createStatusDefinition,
  updateStatusDefinition,
  deleteStatusDefinition,
} from '@/actions/status-actions';
import {
  StatusDefinition,
  STATUS_EFFECT_OPTIONS,
  STATUS_COLOR_PALETTE,
  STATUS_TYPE_OPTIONS,
  StatusEffect,
  StatusType,
  getEffectBadgeClasses,
} from '@/types/status';
import { wrapFormAction, notify } from '@/lib/ui-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SubmitButton } from '@/components/SubmitButton';
import {
  Plus,
  Trash2,
  Edit2,
  Palette,
  Tag,
  Shield,
  Star,
  GripVertical,
  Check,
  X,
} from 'lucide-react';

interface StatusManagerProps {
  statuses: StatusDefinition[];
}

const createStatusWrapper = wrapFormAction(createStatusDefinition);
const updateStatusWrapper = wrapFormAction(updateStatusDefinition);
const deleteStatusWrapper = wrapFormAction(deleteStatusDefinition);

type ColorOption = {
  name: string;
  value: string;
  bg: string;
  text: string;
};

export function StatusManager({ statuses }: StatusManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusDefinition | null>(null);
  const [selectedColor, setSelectedColor] = useState<ColorOption>(STATUS_COLOR_PALETTE[0]);
  const [selectedEffect, setSelectedEffect] = useState<StatusEffect>('TRANSACTIONS_ALLOWED');
  const [selectedStatusType, setSelectedStatusType] = useState<StatusType>('PRODUCT');

  const [createState, createAction] = useFormState(createStatusWrapper, {
    success: false,
    message: '',
  });

  const [updateState, updateAction] = useFormState(updateStatusWrapper, {
    success: false,
    message: '',
  });

  const [deleteState, deleteAction] = useFormState(deleteStatusWrapper, {
    success: false,
    message: '',
  });

  // Handle form submission results
  useEffect(() => {
    if (createState.message) {
      notify.ok(createState);
      if (createState.success) {
        setIsCreateOpen(false);
        resetForm();
      }
    }
  }, [createState]);

  useEffect(() => {
    if (updateState.message) {
      notify.ok(updateState);
      if (updateState.success) {
        setEditingStatus(null);
        resetForm();
      }
    }
  }, [updateState]);

  useEffect(() => {
    if (deleteState.message) {
      notify.ok(deleteState);
    }
  }, [deleteState]);

  const resetForm = () => {
    setSelectedColor(STATUS_COLOR_PALETTE[0]);
    setSelectedEffect('TRANSACTIONS_ALLOWED');
    setSelectedStatusType('PRODUCT');
  };

  const handleEditClick = (status: StatusDefinition) => {
    setEditingStatus(status);
    const color = STATUS_COLOR_PALETTE.find((c) => c.value === status.color) || {
      name: 'Custom',
      value: status.color,
      bg: status.bg_color,
      text: status.text_color,
    };
    setSelectedColor(color as any);
    setSelectedEffect(status.effect);
    setSelectedStatusType(status.status_type || 'PRODUCT');
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Status Definitions</h3>
          <p className="text-sm text-slate-500">
            Define status types with colors and transaction effects
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
              <Plus size={16} />
              New Status
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag size={20} className="text-amber-600" />
                Create New Status
              </DialogTitle>
            </DialogHeader>
            <StatusForm
              action={createAction}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              selectedEffect={selectedEffect}
              setSelectedEffect={setSelectedEffect}
              selectedStatusType={selectedStatusType}
              setSelectedStatusType={setSelectedStatusType}
              isSubmitting={false}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Status List */}
      <div className="grid gap-3">
        {statuses.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Tag size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">No statuses defined yet</p>
            <p className="text-sm text-slate-400">Create your first status to get started</p>
          </div>
        ) : (
          statuses.map((status) => (
            <StatusCard
              key={status.id}
              status={status}
              onEdit={() => handleEditClick(status)}
              deleteAction={deleteAction}
            />
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingStatus} onOpenChange={(open) => !open && setEditingStatus(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 size={20} className="text-amber-600" />
              Edit Status
            </DialogTitle>
          </DialogHeader>
          {editingStatus && (
            <StatusForm
              action={updateAction}
              initialData={editingStatus}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              selectedEffect={selectedEffect}
              setSelectedEffect={setSelectedEffect}
              selectedStatusType={selectedStatusType}
              setSelectedStatusType={setSelectedStatusType}
              isSubmitting={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Status Card Component ---
interface StatusCardProps {
  status: StatusDefinition;
  onEdit: () => void;
  deleteAction: (formData: FormData) => void;
}

function StatusCard({ status, onEdit, deleteAction }: StatusCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const effectOption = STATUS_EFFECT_OPTIONS.find((e) => e.value === status.effect);
  const statusTypeOption = STATUS_TYPE_OPTIONS.find((t) => t.value === status.status_type);

  return (
    <div
      className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all border-l-4"
      style={{ borderLeftColor: status.color }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <GripVertical size={16} className="text-slate-300 cursor-grab" />
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm"
              style={{ backgroundColor: status.bg_color, color: status.text_color }}
            >
              {status.name.substring(0, 2).toUpperCase()}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-800 truncate">{status.name}</h4>
              {status.is_default && (
                <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  <Star size={10} fill="currentColor" />
                  Default
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {status.code}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded border ${
                  status.status_type === 'LOCATION'
                    ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                    : 'bg-violet-100 text-violet-800 border-violet-200'
                }`}
              >
                {statusTypeOption?.icon} {statusTypeOption?.label || 'Product'}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded border ${getEffectBadgeClasses(
                  status.effect,
                )}`}
              >
                {effectOption?.icon} {effectOption?.label}
              </span>
            </div>
            {status.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-1">{status.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
            <Edit2 size={14} className="text-slate-500" />
          </Button>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <form action={deleteAction}>
                <input type="hidden" name="id" value={status.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                >
                  <Check size={14} />
                </Button>
              </form>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Status Form Component ---
interface StatusFormProps {
  action: (formData: FormData) => void;
  initialData?: StatusDefinition;
  selectedColor: ColorOption;
  setSelectedColor: (color: ColorOption) => void;
  selectedEffect: StatusEffect;
  setSelectedEffect: (effect: StatusEffect) => void;
  selectedStatusType: StatusType;
  setSelectedStatusType: (type: StatusType) => void;
  isSubmitting: boolean;
}

function StatusForm({
  action,
  initialData,
  selectedColor,
  setSelectedColor,
  selectedEffect,
  setSelectedEffect,
  selectedStatusType,
  setSelectedStatusType,
}: StatusFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isDefault, setIsDefault] = useState(initialData?.is_default || false);
  const [sortOrder, setSortOrder] = useState(initialData?.sort_order || 0);
  const [autoCode, setAutoCode] = useState(!initialData);

  // Auto-generate code from name
  useEffect(() => {
    if (autoCode && name) {
      setCode(name.trim().toUpperCase().replace(/\s+/g, '_'));
    }
  }, [name, autoCode]);

  return (
    <form action={action} className="space-y-4">
      {initialData && <input type="hidden" name="id" value={initialData.id} />}
      <input type="hidden" name="color" value={selectedColor.value} />
      <input type="hidden" name="bg_color" value={selectedColor.bg} />
      <input type="hidden" name="text_color" value={selectedColor.text} />
      <input type="hidden" name="effect" value={selectedEffect} />
      <input type="hidden" name="status_type" value={selectedStatusType} />
      <input type="hidden" name="is_default" value={isDefault.toString()} />
      <input type="hidden" name="sort_order" value={sortOrder.toString()} />

      {/* Status Type Selection */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <Tag size={14} />
          Status Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {STATUS_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedStatusType(option.value)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${
                selectedStatusType === option.value
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{option.icon}</span>
                <span className="font-medium text-slate-800">{option.label}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 ml-7">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Name & Code */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status Name *</label>
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., On Hold"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Code *
            {!initialData && (
              <button
                type="button"
                className="ml-2 text-xs text-amber-600 hover:underline"
                onClick={() => setAutoCode(!autoCode)}
              >
                {autoCode ? 'Edit manually' : 'Auto-generate'}
              </button>
            )}
          </label>
          <Input
            name="code"
            value={code}
            onChange={(e) => {
              setAutoCode(false);
              setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'));
            }}
            placeholder="ON_HOLD"
            required
            className="font-mono"
            disabled={autoCode && !initialData}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <Input
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description of when to use this status"
        />
      </div>

      {/* Color Selection */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <Palette size={14} />
          Status Color
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_COLOR_PALETTE.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${
                selectedColor.value === color.value
                  ? 'border-slate-800 ring-2 ring-slate-300 scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-slate-500">Preview:</span>
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: selectedColor.bg,
              color: selectedColor.text,
            }}
          >
            {name || 'Status Name'}
          </span>
        </div>
      </div>

      {/* Effect Selection */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <Shield size={14} />
          Transaction Effect
        </label>
        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
          {STATUS_EFFECT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedEffect(option.value)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${
                selectedEffect === option.value
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{option.icon}</span>
                <span className="font-medium text-slate-800">{option.label}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 ml-7">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Options Row */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm text-slate-700">Set as default status for new items</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Order:</label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-16 h-8 text-center"
            min={0}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <SubmitButton className="bg-amber-600 hover:bg-amber-700 px-6">
          {initialData ? 'Update Status' : 'Create Status'}
        </SubmitButton>
      </div>
    </form>
  );
}
