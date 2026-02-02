'use client';

import { useState } from 'react';
import { X, AlertTriangle, Check, Loader2, Hash, MapPin, Package, Minus } from 'lucide-react';
import {
  StatusDefinition,
  EntityStatus,
  STATUS_EFFECT_OPTIONS,
  createStatusStyle,
} from '@/types/status';
import { StatusBadge } from '../StatusBadge';

interface StatusTabProps {
  currentStatus: EntityStatus | null;
  statusDefinitions: StatusDefinition[];
  selectedStatusId: string;
  statusReason: string;
  isPending: boolean;
  totalQuantity: number;
  affectedQuantity: number;
  uom: string;
  setSelectedStatusId: (id: string) => void;
  setStatusReason: (reason: string) => void;
  setAffectedQuantity: (qty: number) => void;
  handleApplyStatus: () => void;
  handleRemoveStatus: () => void;
  handlePartialRemove?: (quantity: number, reason: string) => void;
}

export default function StatusTab({
  currentStatus,
  statusDefinitions,
  selectedStatusId,
  statusReason,
  isPending,
  totalQuantity,
  affectedQuantity,
  uom,
  setSelectedStatusId,
  setStatusReason,
  setAffectedQuantity,
  handleApplyStatus,
  handleRemoveStatus,
  handlePartialRemove,
}: StatusTabProps) {
  const selectedStatus = statusDefinitions.find((s) => s.id === selectedStatusId);
  const isNewStatus = selectedStatusId && selectedStatusId !== currentStatus?.status_id;

  // For partial removal of product status
  const [showPartialRemove, setShowPartialRemove] = useState(false);
  const [quantityToRemove, setQuantityToRemove] = useState(1);
  const [removeReason, setRemoveReason] = useState('');

  const currentStatusType = currentStatus?.status?.status_type || 'PRODUCT';
  const currentAffectedQty = currentStatus?.affected_quantity || totalQuantity;
  const isProductStatus = currentStatusType === 'PRODUCT';

  const handlePartialRemoveClick = () => {
    if (handlePartialRemove && quantityToRemove > 0) {
      handlePartialRemove(quantityToRemove, removeReason);
      setShowPartialRemove(false);
      setQuantityToRemove(1);
      setRemoveReason('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Current Status Display */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          สถานะปัจจุบัน
        </div>
        {currentStatus?.status ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={currentStatus.status} size="lg" showEffect />
                <span
                  className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isProductStatus ? 'bg-violet-100 text-violet-700' : 'bg-cyan-100 text-cyan-700'
                  }`}
                >
                  {isProductStatus ? <Package size={12} /> : <MapPin size={12} />}
                  {isProductStatus ? 'รายชิ้น' : 'ทั้ง Location'}
                </span>
              </div>
            </div>

            {/* Show affected quantity for product status */}
            {isProductStatus && currentAffectedQty < totalQuantity && (
              <div className="text-sm text-slate-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <span className="font-bold text-amber-700">{currentAffectedQty}</span> จาก{' '}
                <span className="font-bold">{totalQuantity}</span> {uom} ที่ติดสถานะนี้
              </div>
            )}

            {/* Location status info */}
            {!isProductStatus && (
              <div className="text-sm text-slate-600 bg-cyan-50 p-2 rounded-lg border border-cyan-200 flex items-center gap-2">
                <MapPin size={14} className="text-cyan-600" />
                สถานะนี้มีผลกับทั้ง Location สินค้าทั้งหมด {totalQuantity} {uom} จะถูกติดสถานะ
              </div>
            )}

            {/* Remove Status Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              {isProductStatus && handlePartialRemove && currentAffectedQty > 1 ? (
                <>
                  <button
                    onClick={() => setShowPartialRemove(!showPartialRemove)}
                    disabled={isPending}
                    className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-amber-50"
                  >
                    <Minus size={14} /> นำออกบางส่วน
                  </button>
                  <button
                    onClick={handleRemoveStatus}
                    disabled={isPending}
                    className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
                  >
                    <X size={14} /> นำออกทั้งหมด
                  </button>
                </>
              ) : (
                <button
                  onClick={handleRemoveStatus}
                  disabled={isPending}
                  className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                >
                  <X size={14} /> ลบสถานะ
                </button>
              )}
            </div>

            {/* Partial Remove UI */}
            {showPartialRemove && isProductStatus && (
              <div className="animate-in slide-in-from-top-2 p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Minus size={16} className="text-amber-600" />
                  <span className="text-sm font-bold text-slate-700">
                    ระบุจำนวนที่ต้องการปลดสถานะ
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={quantityToRemove}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(currentAffectedQty, Number(e.target.value)));
                      setQuantityToRemove(val);
                    }}
                    min="1"
                    max={currentAffectedQty}
                    aria-label="Quantity to remove status from"
                    className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-lg font-bold text-center focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                  <span className="text-sm text-slate-500">จาก</span>
                  <span className="text-lg font-bold text-slate-700">{currentAffectedQty}</span>
                  <span className="text-sm text-slate-500">{uom}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantityToRemove(currentAffectedQty)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      quantityToRemove === currentAffectedQty
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ทั้งหมด ({currentAffectedQty})
                  </button>
                  {currentAffectedQty > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuantityToRemove(Math.ceil(currentAffectedQty / 2))}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        quantityToRemove === Math.ceil(currentAffectedQty / 2)
                          ? 'bg-amber-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      ครึ่งหนึ่ง ({Math.ceil(currentAffectedQty / 2)})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setQuantityToRemove(1)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      quantityToRemove === 1
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    1 ชิ้น
                  </button>
                </div>
                <input
                  type="text"
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  placeholder="เหตุผล (ไม่บังคับ)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handlePartialRemoveClick}
                    disabled={isPending}
                    className="flex-1 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Check size={16} />
                    )}
                    นำออกจาก {quantityToRemove} {uom}
                  </button>
                  <button
                    onClick={() => setShowPartialRemove(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-400 text-sm">ปกติ (ไม่มีสถานะ)</span>
        )}
      </div>

      {/* Status Selection */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          เลือกสถานะใหม่
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {statusDefinitions.map((status) => {
            const isSelected = selectedStatusId === status.id;
            const effectOption = STATUS_EFFECT_OPTIONS.find((e) => e.value === status.effect);
            const isLocationStatus = status.status_type === 'LOCATION';

            return (
              <button
                key={status.id}
                onClick={() => setSelectedStatusId(status.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                style={isSelected ? createStatusStyle(status) : undefined}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="font-bold text-sm truncate">{status.name}</span>
                  {isLocationStatus ? (
                    <MapPin size={12} className="text-cyan-500 flex-shrink-0" />
                  ) : (
                    <Package size={12} className="text-violet-500 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  {effectOption?.icon} {effectOption?.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity Selector - Only show for PRODUCT status types */}
      {isNewStatus && selectedStatus?.status_type === 'PRODUCT' && (
        <div className="animate-in slide-in-from-top-2 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Hash size={16} className="text-amber-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ระบุจำนวนที่ต้องการติดสถานะ
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={affectedQuantity}
              onChange={(e) => {
                const val = Math.max(1, Math.min(totalQuantity, Number(e.target.value)));
                setAffectedQuantity(val);
              }}
              min="1"
              max={totalQuantity}
              aria-label="Affected quantity"
              className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-lg font-bold text-center focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
            />
            <span className="text-sm text-slate-500">จาก</span>
            <span className="text-lg font-bold text-slate-700">
              {totalQuantity.toLocaleString()}
            </span>
            <span className="text-sm text-slate-500">{uom}</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setAffectedQuantity(totalQuantity)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                affectedQuantity === totalQuantity
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              ทั้งหมด ({totalQuantity})
            </button>
            {totalQuantity > 1 && (
              <button
                type="button"
                onClick={() => setAffectedQuantity(Math.ceil(totalQuantity / 2))}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  affectedQuantity === Math.ceil(totalQuantity / 2)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                ครึ่งหนึ่ง ({Math.ceil(totalQuantity / 2)})
              </button>
            )}
            <button
              type="button"
              onClick={() => setAffectedQuantity(1)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                affectedQuantity === 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              1 ชิ้น
            </button>
          </div>
          {affectedQuantity < totalQuantity && (
            <div className="mt-3 text-xs text-amber-700 bg-amber-100 p-2 rounded-lg flex items-center gap-2">
              <AlertTriangle size={12} />
              {totalQuantity - affectedQuantity} {uom} จะยังคงสถานะปกติ
            </div>
          )}
        </div>
      )}

      {/* Location Status Info - Show when location status is selected */}
      {isNewStatus && selectedStatus?.status_type === 'LOCATION' && (
        <div className="animate-in slide-in-from-top-2 p-4 bg-cyan-50 rounded-xl border border-cyan-200">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-cyan-600" />
            <span className="text-sm font-bold text-cyan-800">สถานะแบบ Location</span>
          </div>
          <p className="text-sm text-cyan-700">
            สถานะนี้จะมีผลกับทั้ง Lot/Location สินค้าทั้งหมด{' '}
            <span className="font-bold">{totalQuantity}</span> {uom}
            จะถูกติดสถานะ หากต้องการลบสถานะ ต้องลบออกจากทั้ง Location
          </p>
        </div>
      )}

      {/* Reason Input */}
      {isNewStatus && (
        <div className="animate-in slide-in-from-top-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            เหตุผลการเปลี่ยนสถานะ (ไม่บังคับ)
          </label>
          <textarea
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            placeholder="เช่น พบความเสียหายจากการขนส่ง, รอตรวจสอบคุณภาพ..."
            className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
            rows={3}
          />
        </div>
      )}

      {/* Selected Status Preview */}
      {selectedStatus && isNewStatus && (
        <div
          className="p-4 rounded-xl border-2 animate-in slide-in-from-bottom-2"
          style={{ backgroundColor: selectedStatus.bg_color, borderColor: selectedStatus.color }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} style={{ color: selectedStatus.text_color }} />
            <span className="font-bold" style={{ color: selectedStatus.text_color }}>
              {selectedStatus.name}
            </span>
          </div>
          <p className="text-sm opacity-80" style={{ color: selectedStatus.text_color }}>
            {selectedStatus.description ||
              STATUS_EFFECT_OPTIONS.find((e) => e.value === selectedStatus.effect)?.description}
          </p>
        </div>
      )}

      {/* Apply Button */}
      {isNewStatus && (
        <button
          onClick={handleApplyStatus}
          disabled={isPending}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
          บันทึกสถานะ
        </button>
      )}
    </div>
  );
}
