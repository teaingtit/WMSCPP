'use client';

import { StockWithDetails } from '@/types/inventory';
import { StatusDefinition, EntityStatus, EntityNote, StatusEntityType } from '@/types/status';
import { StatusBadge, StatusSelector } from './StatusSelector';
import { NotesManager, NotesBadge } from './NotesManager';
import { Package, MapPin, Layers, MessageSquare } from 'lucide-react';

interface StockItemCardProps {
  stock: StockWithDetails;
  statuses: StatusDefinition[];
  currentStatus?: EntityStatus | null | undefined;
  notes?: EntityNote[];
  onStatusChange?: (() => void) | undefined;
  onNotesChange?: (() => void) | undefined;
  showActions?: boolean;
  variant?: 'card' | 'row' | 'compact';
}

/**
 * Enhanced stock item display with status and notes support
 */
export function StockItemCard({
  stock,
  statuses,
  currentStatus,
  notes = [],
  onStatusChange,
  onNotesChange,
  showActions = true,
  variant = 'card',
}: StockItemCardProps) {
  const entityType: StatusEntityType = 'STOCK';
  const entityId = stock.id;

  const pinnedNotesCount = notes.filter((n) => n.is_pinned).length;

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 hover:shadow-sm transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center">
            {stock.product.image_url ? (
              <img
                src={stock.product.image_url}
                alt={stock.product.name}
                className="w-full h-full object-cover rounded-md"
              />
            ) : (
              <Package size={14} className="text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800 truncate text-sm">
                {stock.product.sku}
              </span>
              {currentStatus?.status && <StatusBadge status={currentStatus.status} size="sm" />}
            </div>
            <p className="text-xs text-slate-500 truncate">{stock.product.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">
            {stock.quantity} {stock.product.uom}
          </span>
          {showActions && (
            <div className="flex items-center gap-1">
              <StatusSelector
                entityType={entityType}
                entityId={entityId}
                currentStatus={currentStatus}
                statuses={statuses}
                onStatusChange={onStatusChange}
                compact
              />
              <NotesManager
                entityType={entityType}
                entityId={entityId}
                notes={notes}
                onNotesChange={onNotesChange}
                compact
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <tr className="group hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
              {stock.product.image_url ? (
                <img
                  src={stock.product.image_url}
                  alt={stock.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package size={16} className="text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{stock.product.sku}</span>
                {currentStatus?.status && <StatusBadge status={currentStatus.status} size="sm" />}
                {notes.length > 0 && (
                  <NotesBadge count={notes.length} hasPinned={pinnedNotesCount > 0} />
                )}
              </div>
              <p className="text-sm text-slate-500">{stock.product.name}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin size={12} className="text-slate-400" />
            {stock.location.code}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="font-semibold text-slate-800">{stock.quantity}</span>
          <span className="text-slate-500 text-sm ml-1">{stock.product.uom}</span>
        </td>
        {showActions && (
          <td className="px-4 py-3">
            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <StatusSelector
                entityType={entityType}
                entityId={entityId}
                currentStatus={currentStatus}
                statuses={statuses}
                onStatusChange={onStatusChange}
                compact
              />
              <NotesManager
                entityType={entityType}
                entityId={entityId}
                notes={notes}
                onNotesChange={onNotesChange}
                compact
              />
            </div>
          </td>
        )}
      </tr>
    );
  }

  // Default card variant
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group">
      {/* Header with Status */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              {stock.product.image_url ? (
                <img
                  src={stock.product.image_url}
                  alt={stock.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package size={24} className="text-slate-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800">{stock.product.sku}</span>
                {currentStatus?.status && (
                  <StatusBadge status={currentStatus.status} size="sm" showEffect />
                )}
              </div>
              <p className="text-sm text-slate-600 truncate">{stock.product.name}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {stock.location.code}
                </span>
                {stock.product.category && (
                  <span className="flex items-center gap-1">
                    <Layers size={10} />
                    {stock.product.category}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-slate-800">{stock.quantity}</p>
            <p className="text-xs text-slate-500">{stock.product.uom}</p>
          </div>
        </div>
      </div>

      {/* Status and Notes Actions */}
      {showActions && (
        <div className="px-4 py-3 bg-slate-50 flex items-center justify-between gap-2">
          <StatusSelector
            entityType={entityType}
            entityId={entityId}
            currentStatus={currentStatus}
            statuses={statuses}
            onStatusChange={onStatusChange}
          />
          <div className="flex items-center gap-2">
            {notes.length > 0 && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <MessageSquare size={12} />
                {notes.length} note{notes.length !== 1 ? 's' : ''}
                {pinnedNotesCount > 0 && ` (${pinnedNotesCount} pinned)`}
              </span>
            )}
            <NotesManager
              entityType={entityType}
              entityId={entityId}
              notes={notes}
              onNotesChange={onNotesChange}
            />
          </div>
        </div>
      )}

      {/* Status Notes Preview */}
      {currentStatus?.notes && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
          <p className="text-xs text-amber-800 italic line-clamp-2">📝 {currentStatus.notes}</p>
        </div>
      )}

      {/* Pinned Notes Preview */}
      {pinnedNotesCount > 0 && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
          {notes
            .filter((n) => n.is_pinned)
            .slice(0, 2)
            .map((note) => (
              <p key={note.id} className="text-xs text-slate-600 truncate">
                📌 {note.content}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

interface LocationStatusCardProps {
  location: {
    id: string;
    code: string;
    zone?: string | null;
    aisle?: string | null;
    bin_code?: string | null;
  };
  statuses: StatusDefinition[];
  currentStatus?: EntityStatus | null | undefined;
  notes?: EntityNote[];
  stockCount?: number;
  onStatusChange?: (() => void) | undefined;
  onNotesChange?: (() => void) | undefined;
}

/**
 * Location card with status and notes
 */
export function LocationStatusCard({
  location,
  statuses,
  currentStatus,
  notes = [],
  stockCount = 0,
  onStatusChange,
  onNotesChange,
}: LocationStatusCardProps) {
  const entityType: StatusEntityType = 'LOCATION';
  const entityId = location.id;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            <span className="font-bold text-slate-800">{location.code}</span>
            {currentStatus?.status && <StatusBadge status={currentStatus.status} size="sm" />}
          </div>
          {(location.zone || location.aisle || location.bin_code) && (
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              {location.zone && <span>Zone: {location.zone}</span>}
              {location.aisle && <span>Aisle: {location.aisle}</span>}
              {location.bin_code && <span>Bin: {location.bin_code}</span>}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-slate-700">{stockCount}</p>
          <p className="text-xs text-slate-500">items</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <StatusSelector
          entityType={entityType}
          entityId={entityId}
          currentStatus={currentStatus}
          statuses={statuses}
          onStatusChange={onStatusChange}
          compact
        />
        <NotesManager
          entityType={entityType}
          entityId={entityId}
          notes={notes}
          onNotesChange={onNotesChange}
          compact
        />
      </div>
    </div>
  );
}
