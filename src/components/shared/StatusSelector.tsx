'use client';

import { useState, useEffect } from 'react';

import { useFormState } from 'react-dom';
import { applyEntityStatus, removeEntityStatus } from '@/actions/status-actions';
import {
  StatusDefinition,
  EntityStatus,
  StatusEntityType,
  getEffectBadgeClasses,
  STATUS_EFFECT_OPTIONS,
  getStatusBadgeClasses,
  getStatusTypeIcon,
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
import { Tag, ChevronDown, X, History, Shield, Check } from 'lucide-react';

interface StatusBadgeProps {
  status?: StatusDefinition | null;
  size?: 'sm' | 'md' | 'lg';
  showEffect?: boolean;
  className?: string;
}

/**
 * Display a status badge
 */
export function StatusBadge({
  status,
  size = 'md',
  showEffect = false,
  className = '',
}: StatusBadgeProps) {
  if (!status) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs ${className}`}
      >
        <Tag size={10} />
        ไม่มีสถานะ
      </span>
    );
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const effectOption = STATUS_EFFECT_OPTIONS.find((e) => e.value === status.effect);

  // Get visual style based on status type
  const shapeClasses = getStatusBadgeClasses(status.status_type);
  const typeIcon = getStatusTypeIcon(status.status_type);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border-2 ${shapeClasses} ${sizeClasses[size]} ${className}`}
      style={
        {
          ['--status-bg' as string]: status.bg_color,
          ['--status-text' as string]: status.text_color,
          ['--status-border' as string]: status.color + '40',
          ['--status-dot' as string]: status.color,
          backgroundColor: 'var(--status-bg)',
          color: 'var(--status-text)',
          borderColor: 'var(--status-border)',
        } as React.CSSProperties
      }
    >
      <span className="text-xs opacity-80">{typeIcon}</span>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--status-dot)' }} />
      {status.name}
      {showEffect && effectOption && <span className="opacity-70">{effectOption.icon}</span>}
    </span>
  );
}

interface StatusSelectorProps {
  entityType: StatusEntityType;
  entityId: string;
  currentStatus?: EntityStatus | null | undefined;
  statuses: StatusDefinition[];
  onStatusChange?: (() => void) | undefined;
  compact?: boolean;
}

const applyStatusWrapper = wrapFormAction(applyEntityStatus);
const removeStatusWrapper = wrapFormAction(removeEntityStatus);

/**
 * Dropdown selector for applying status to an entity
 */
export function StatusSelector({
  entityType,
  entityId,
  currentStatus,
  statuses,
  onStatusChange,
  compact = false,
}: StatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusDefinition | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [applyState, applyAction] = useFormState(applyStatusWrapper, {
    success: false,
    message: '',
  });

  const [removeState, removeAction] = useFormState(removeStatusWrapper, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (applyState.message) {
      notify.ok(applyState);
      if (applyState.success) {
        setIsOpen(false);
        setShowReasonInput(false);
        setSelectedStatus(null);
        setReason('');
        setNotes('');
        onStatusChange?.();
      }
    }
  }, [applyState, onStatusChange]);

  useEffect(() => {
    if (removeState.message) {
      notify.ok(removeState);
      if (removeState.success) {
        onStatusChange?.();
      }
    }
  }, [removeState, onStatusChange]);

  const handleSelectStatus = (status: StatusDefinition) => {
    setSelectedStatus(status);
    setShowReasonInput(true);
  };

  // Filter statuses based on entity type and status_type
  const activeStatuses = statuses.filter((s) => {
    if (!s.is_active) return false;

    // Filter by status_type to match entity_type
    // STOCK and PRODUCT entities should only see PRODUCT statuses
    if (entityType === 'STOCK' || entityType === 'PRODUCT') {
      return s.status_type === 'PRODUCT';
    }
    // LOCATION entities should only see LOCATION statuses
    if (entityType === 'LOCATION') {
      return s.status_type === 'LOCATION';
    }

    // Fallback: show all active statuses
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            {currentStatus?.status ? (
              <StatusBadge status={currentStatus.status} size="sm" />
            ) : (
              <span className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <Tag size={12} />
                ตั้งสถานะ
              </span>
            )}
            <ChevronDown size={12} className="text-slate-400" />
          </button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            {currentStatus?.status ? (
              <>
                <StatusBadge status={currentStatus.status} size="sm" />
                <ChevronDown size={14} />
              </>
            ) : (
              <>
                <Tag size={14} />
                ตั้งสถานะ
                <ChevronDown size={14} />
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield size={20} className="text-amber-600" />
            {showReasonInput ? 'ยืนยันการเปลี่ยนสถานะ' : 'เลือกสถานะ'}
          </DialogTitle>
        </DialogHeader>

        {showReasonInput && selectedStatus ? (
          <form action={applyAction} className="space-y-4">
            <input type="hidden" name="entity_type" value={entityType} />
            <input type="hidden" name="entity_id" value={entityId} />
            <input type="hidden" name="status_id" value={selectedStatus.id} />

            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">เปลี่ยนเป็น:</span>
                <StatusBadge status={selectedStatus} showEffect />
              </div>
              {currentStatus?.status && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                  <span className="text-sm text-slate-500">จาก:</span>
                  <StatusBadge status={currentStatus.status} size="sm" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                เหตุผลการเปลี่ยน
              </label>
              <Input
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุเหตุผล (ไม่บังคับ)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                หมายเหตุเพิ่มเติม
              </label>
              <Input
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุหมายเหตุ (ไม่บังคับ)"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowReasonInput(false);
                  setSelectedStatus(null);
                }}
              >
                ย้อนกลับ
              </Button>
              <SubmitButton className="bg-amber-600 hover:bg-amber-700">บันทึกสถานะ</SubmitButton>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {/* Current Status Display */}
            {currentStatus?.status && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">สถานะปัจจุบัน</span>
                    <StatusBadge status={currentStatus.status} showEffect />
                  </div>
                  <form action={removeAction}>
                    <input type="hidden" name="entity_type" value={entityType} />
                    <input type="hidden" name="entity_id" value={entityId} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <X size={14} className="mr-1" />
                      ลบสถานะ
                    </Button>
                  </form>
                </div>
                {currentStatus.notes && (
                  <p className="text-xs text-slate-500 mt-2 italic">{currentStatus.notes}</p>
                )}
              </div>
            )}

            {/* Status Options */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeStatuses.length === 0 ? (
                <p className="text-center text-slate-500 py-4">
                  ไม่พบสถานะที่กำหนดไว้ กรุณาสร้างสถานะในหน้าตั้งค่า
                </p>
              ) : (
                activeStatuses.map((status) => {
                  const isCurrentStatus = currentStatus?.status?.id === status.id;
                  const effectOption = STATUS_EFFECT_OPTIONS.find((e) => e.value === status.effect);

                  return (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => handleSelectStatus(status)}
                      disabled={isCurrentStatus}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        isCurrentStatus
                          ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                      style={
                        {
                          ...(!isCurrentStatus && {
                            ['--status-border-left' as string]: status.color,
                            borderLeftColor: 'var(--status-border-left)',
                            borderLeftWidth: '4px',
                          }),
                        } as React.CSSProperties
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={
                              {
                                ['--status-color' as string]: status.color,
                                backgroundColor: 'var(--status-color)',
                              } as React.CSSProperties
                            }
                          />
                          <span className="font-medium text-slate-800">{status.name}</span>
                          {isCurrentStatus && <Check size={14} className="text-green-600" />}
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${getEffectBadgeClasses(
                            status.effect,
                          )}`}
                        >
                          {effectOption?.icon} {effectOption?.label}
                        </span>
                      </div>
                      {status.description && (
                        <p className="text-xs text-slate-500 mt-1 ml-5">{status.description}</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface StatusHistoryButtonProps {
  entityType: StatusEntityType;
  entityId: string;
}

/**
 * Button to view status change history
 */
export function StatusHistoryButton(_props: StatusHistoryButtonProps) {
  // TODO: Implement status history modal
  return (
    <Button variant="ghost" size="sm" className="gap-1 text-slate-500">
      <History size={14} />
      ประวัติ
    </Button>
  );
}
