'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { X, MapPin, Shield, Loader2, Check, AlertTriangle } from 'lucide-react';
import { StatusDefinition, STATUS_EFFECT_OPTIONS, createStatusStyle } from '@/types/status';
import { getLocationStatusDefinitions, setLotStatus, LotStatus } from '@/actions/status-actions';
import { notify } from '@/lib/ui-helpers';

interface LotStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseId: string;
  lot: string;
  currentStatus: LotStatus | null;
  onStatusChange?: () => void;
}

export default function LotStatusModal({
  isOpen,
  onClose,
  warehouseId,
  lot,
  currentStatus,
  onStatusChange,
}: LotStatusModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [statusDefinitions, setStatusDefinitions] = useState<StatusDefinition[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadStatusDefinitions();
      setSelectedStatusId(currentStatus?.status_id || null);
      setReason('');
    }
  }, [isOpen, currentStatus]);

  const loadStatusDefinitions = async () => {
    setIsLoading(true);
    try {
      const definitions = await getLocationStatusDefinitions();
      setStatusDefinitions(definitions);
    } catch (error) {
      console.error('Error loading status definitions:', error);
      notify.error('Failed to load status options');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('warehouse_id', warehouseId);
      formData.set('lot', lot);
      formData.set('status_id', selectedStatusId || '');
      formData.set('reason', reason);

      const result = await setLotStatus(formData);
      notify.ok(result);

      if (result.success) {
        onStatusChange?.();
        onClose();
      }
    });
  };

  const handleRemoveStatus = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('warehouse_id', warehouseId);
      formData.set('lot', lot);
      formData.set('status_id', '');
      formData.set('reason', reason || 'Status removed');

      const result = await setLotStatus(formData);
      notify.ok(result);

      if (result.success) {
        onStatusChange?.();
        onClose();
      }
    });
  };

  if (!isOpen) return null;

  const selectedStatus = statusDefinitions.find((s) => s.id === selectedStatusId);
  const isChanging = selectedStatusId !== currentStatus?.status_id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-cyan-600 to-cyan-700 p-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <MapPin size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Lot Status</h2>
              <p className="text-sm text-white/70">Lot: {lot}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-cyan-600" size={32} />
            </div>
          ) : (
            <>
              {/* Current Status */}
              {currentStatus?.status && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Current Status
                  </div>
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                      style={createStatusStyle(currentStatus.status)}
                    >
                      <Shield size={14} />
                      <span className="font-bold text-sm">{currentStatus.status.name}</span>
                    </div>
                    <button
                      onClick={handleRemoveStatus}
                      disabled={isPending}
                      className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
                    >
                      <X size={14} /> Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Status Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {currentStatus?.status ? 'Change to' : 'Apply Status'}
                </label>
                {statusDefinitions.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <MapPin size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No location status types defined</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Create location statuses in Settings → Status
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {statusDefinitions.map((status) => {
                      const isSelected = selectedStatusId === status.id;
                      const isCurrent = currentStatus?.status_id === status.id;
                      const effectOption = STATUS_EFFECT_OPTIONS.find(
                        (e) => e.value === status.effect,
                      );

                      return (
                        <button
                          key={status.id}
                          onClick={() => setSelectedStatusId(status.id)}
                          disabled={isCurrent}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-cyan-500 ring-2 ring-cyan-200'
                              : isCurrent
                              ? 'border-slate-200 opacity-50 cursor-not-allowed'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          style={isSelected ? createStatusStyle(status) : undefined}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                            <span className="font-bold text-sm">{status.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 ml-5">
                            {effectOption?.icon} {effectOption?.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reason */}
              {isChanging && selectedStatusId && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Quality inspection required..."
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none"
                    rows={2}
                  />
                </div>
              )}

              {/* Warning */}
              {isChanging && selectedStatus && selectedStatus.effect === 'CLOSED' && (
                <div className="animate-in slide-in-from-top-2 p-3 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <strong>Warning:</strong> This will close all operations for items in lot{' '}
                    <strong>{lot}</strong>. No inbound, outbound, or transfers will be allowed.
                  </div>
                </div>
              )}

              {/* Preview */}
              {isChanging && selectedStatus && (
                <div
                  className="p-4 rounded-xl border-2 animate-in slide-in-from-bottom-2"
                  style={{
                    backgroundColor: selectedStatus.bg_color,
                    borderColor: selectedStatus.color,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={18} style={{ color: selectedStatus.text_color }} />
                    <span className="font-bold" style={{ color: selectedStatus.text_color }}>
                      {selectedStatus.name}
                    </span>
                  </div>
                  <p className="text-sm opacity-80" style={{ color: selectedStatus.text_color }}>
                    {selectedStatus.description ||
                      STATUS_EFFECT_OPTIONS.find((e) => e.value === selectedStatus.effect)
                        ?.description}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          {isChanging && selectedStatusId && (
            <button
              onClick={handleSubmit}
              disabled={isPending || !selectedStatusId}
              className="flex-1 py-2.5 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              Apply Status
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
