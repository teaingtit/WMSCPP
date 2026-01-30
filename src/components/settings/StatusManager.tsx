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
  StatusType,
  getEffectBadgeClasses,
} from '@/types/status';
import { wrapFormAction, notify } from '@/lib/ui-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SubmitButton } from '@/components/ui/submit-button';
import { EffectSelector } from './EffectSelector';
import {
  Plus,
  Trash2,
  Edit2,
  Palette,
  Tag,
  Star,
  GripVertical,
  Check,
  X,
  Package,
  MapPin,
  Info,
} from 'lucide-react';
import styles from './StatusManager.module.css';

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
  const [selectedEffect, setSelectedEffect] = useState<string>('TRANSACTIONS_ALLOWED');
  const [selectedStatusType, setSelectedStatusType] = useState<StatusType>('PRODUCT');
  const [activeTab, setActiveTab] = useState<StatusType>('PRODUCT');

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
    // Don't reset status type here, keep it aligned with the active tab or user choice
    setSelectedStatusType(activeTab);
  };

  const handleEditClick = (status: StatusDefinition) => {
    setEditingStatus(status);
    const color = STATUS_COLOR_PALETTE.find((c) => c.value === status.color) || {
      name: 'Custom',
      value: status.color,
      bg: status.bg_color,
      text: status.text_color,
    };
    setSelectedColor(color as ColorOption);
    setSelectedEffect(status.effect);
    setSelectedStatusType(status.status_type || 'PRODUCT');
  };

  const handleCreateClick = () => {
    resetForm();
    setSelectedStatusType(activeTab);
    setIsCreateOpen(true);
  };

  const productStatuses = statuses.filter((s) => s.status_type === 'PRODUCT');
  const locationStatuses = statuses.filter((s) => s.status_type === 'LOCATION');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Tag className="text-indigo-600" />
            Status Design System
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            จัดการรูปแบบสถานะสำหรับสินค้า (Items) และจุดเก็บ (Location/Lot)
          </p>
        </div>
        <Button
          onClick={handleCreateClick}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Plus size={18} />
          สร้างสถานะใหม่
        </Button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag size={20} className="text-indigo-600" />
              สร้างสถานะใหม่
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
          />
        </DialogContent>
      </Dialog>

      <Tabs
        defaultValue="PRODUCT"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as StatusType)}
        className="space-y-6"
      >
        <div className="border-b border-slate-200">
          <TabsList className="bg-transparent p-0 h-auto gap-6">
            <TabsTrigger
              value="PRODUCT"
              className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-slate-500 hover:text-slate-700 transition-colors gap-2"
            >
              <Package size={18} />
              สถานะสินค้า (Item)
              <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                {productStatuses.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="LOCATION"
              className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-600 data-[state=active]:text-cyan-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-slate-500 hover:text-slate-700 transition-colors gap-2"
            >
              <MapPin size={18} />
              สถานะ Lot (Location)
              <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                {locationStatuses.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="PRODUCT" className="space-y-4 focus-visible:outline-none">
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 flex items-start gap-3 text-sm text-indigo-900">
            <Info className="shrink-0 text-indigo-500 mt-0.5" size={18} />
            <div>
              <p className="font-semibold mb-1">เกี่ยวกับสถานะรายสินค้า (Item Statuses)</p>
              <p className="opacity-90 leading-relaxed">
                สถานะรายสินค้า (Item Statuses) ใช้สำหรับระบุสถานะของสินค้าในระดับจำนวน (Quantity)
                เช่น สินค้าเสียหาย, ถูกจอง, หรือรอตรวจสอบคุณภาพ (QC)
                การใช้งานสถานะนี้จะมีผลเฉพาะกับจำนวนสินค้าที่เลือกเท่านั้น ไม่ส่งผลทั้ง Location
              </p>
            </div>
          </div>
          <StatusList
            statuses={productStatuses}
            onEdit={handleEditClick}
            deleteAction={deleteAction}
            emptyMessage="ไม่พบสถานะรายสินค้า"
            emptyIcon={<Package size={48} className="text-slate-300" />}
          />
        </TabsContent>

        <TabsContent value="LOCATION" className="space-y-4 focus-visible:outline-none">
          <div className="bg-cyan-50/50 border border-cyan-100 rounded-lg p-4 flex items-start gap-3 text-sm text-cyan-900">
            <Info className="shrink-0 text-cyan-500 mt-0.5" size={18} />
            <div>
              <p className="font-semibold mb-1">เกี่ยวกับสถานะราย Lot (Lot Statuses)</p>
              <p className="opacity-90 leading-relaxed">
                สถานะราย Lot (Lot/Location Statuses) ใช้สำหรับระบุสถานะของทั้ง Location หรือ Zone
                เมื่อมีการใช้งานสถานะนี้ (เช่น "Quarantine") จะมีผลครอบคลุมสินค้าทุกชิ้นใน Lot
                นั้นทันที เหมาะสำหรับการบล็อกสินค้ายก Lot หรือปิด Zone ชั่วคราว
              </p>
            </div>
          </div>
          <StatusList
            statuses={locationStatuses}
            onEdit={handleEditClick}
            deleteAction={deleteAction}
            emptyMessage="No lot statuses defined."
            emptyIcon={<MapPin size={48} className="text-slate-300" />}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingStatus} onOpenChange={(open) => !open && setEditingStatus(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 size={20} className="text-amber-600" />
              แก้ไขสถานะ
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
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusList({
  statuses,
  onEdit,
  deleteAction,
  emptyMessage,
  emptyIcon,
}: {
  statuses: StatusDefinition[];
  onEdit: (s: StatusDefinition) => void;
  deleteAction: (formData: FormData) => void;
  emptyMessage: string;
  emptyIcon: React.ReactNode;
}) {
  if (statuses.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <div className="mx-auto mb-4 flex justify-center">{emptyIcon}</div>
        <p className="text-slate-500 font-medium">{emptyMessage}</p>
        <p className="text-sm text-slate-400">Create a new status to get started</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {statuses.map((status) => (
        <StatusCard
          key={status.id}
          status={status}
          onEdit={() => onEdit(status)}
          deleteAction={deleteAction}
        />
      ))}
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
      className={`group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all border-l-4 ${styles['statusCardBorder']}`}
      style={{ '--status-color': status.color } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <GripVertical size={16} className="text-slate-300 cursor-grab" />
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm ${styles['statusAvatar']}`}
              style={
                {
                  '--status-bg-color': status.bg_color,
                  '--status-text-color': status.text_color,
                } as React.CSSProperties
              }
            >
              {status.name.substring(0, 2).toUpperCase()}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-800 truncate">{status.name}</h4>
              {status.is_default && (
                <span className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  <Star size={10} fill="currentColor" />
                  Default
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                {status.code}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded border ${
                  status.status_type === 'LOCATION'
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {statusTypeOption?.icon} {statusTypeOption?.label || 'Product'}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded border ${getEffectBadgeClasses(
                  status.effect,
                )}`}
              >
                {effectOption?.icon || '⚙️'} {effectOption?.label || status.effect}
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
  selectedEffect: string;
  setSelectedEffect: (effect: string) => void;
  selectedStatusType: StatusType;
  setSelectedStatusType: (type: StatusType) => void;
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

      {/* Status Type Selection */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <Tag size={14} />
          ประเภทสถานะ (Status Type)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {STATUS_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedStatusType(option.value)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${
                selectedStatusType === option.value
                  ? 'border-indigo-500 bg-indigo-50'
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
          <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อสถานะ *</label>
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ตัวอย่างเช่น, รอตรวจสอบ"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            รหัส (Code) *
            {!initialData && (
              <button
                type="button"
                className="ml-2 text-xs text-indigo-600 hover:underline"
                onClick={() => setAutoCode(!autoCode)}
              >
                {autoCode ? 'แก้ไขเอง' : 'สร้างอัตโนมัติ'}
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
            readOnly={autoCode && !initialData}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย</label>
        <Input
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="คำอธิบายเพิ่มเติมสำหรับการใช้งานสถานะนี้"
        />
      </div>

      {/* Color Selection */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <Palette size={14} />
          สีสถานะ (Color)
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_COLOR_PALETTE.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${styles['colorButton']} ${
                selectedColor.value === color.value
                  ? 'border-slate-800 ring-2 ring-slate-300 scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ '--color-value': color.value } as React.CSSProperties}
              title={color.name}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-slate-500">Preview:</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${styles['statusPreview']}`}
            style={
              {
                '--preview-bg-color': selectedColor.bg,
                '--preview-text-color': selectedColor.text,
              } as React.CSSProperties
            }
          >
            {name || 'Status Name'}
          </span>
        </div>
      </div>

      {/* Effect Selection - Using new EffectSelector */}
      <EffectSelector value={selectedEffect} onChange={setSelectedEffect} />

      {/* Options Row */}
      <div className="pt-4 border-t border-slate-100">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none w-full">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-800 block">
                สถานะเริ่มต้น (Default)
              </span>
              <span className="text-xs text-slate-500 block">
                ใช้สถานะนี้อัตโนมัติเมื่อมีการรับเข้าสินค้าใหม่
              </span>
            </div>
          </label>
        </div>
        {/* Hidden sort_order field to satisfy backend requirement */}
        <input type="hidden" name="sort_order" value="0" />
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <SubmitButton className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-sm">
          {initialData ? 'บันทึกแก้ไข' : 'สร้างสถานะ'}
        </SubmitButton>
      </div>
    </form>
  );
}
