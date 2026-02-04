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
      <div className="flex items-center justify-between p-2 bg-card rounded-lg border border-border hover:shadow-sm transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center">
            {stock.product.image_url ? (
              <img
                src={stock.product.image_url}
                alt={stock.product.name}
                className="w-full h-full object-cover rounded-md"
              />
            ) : (
              <Package size={14} className="text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground truncate text-sm">
                {stock.product.sku}
              </span>
              {currentStatus?.status && <StatusBadge status={currentStatus.status} size="sm" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">{stock.product.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">
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
      <tr className="group hover:bg-accent transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {stock.product.image_url ? (
                <img
                  src={stock.product.image_url}
                  alt={stock.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package size={16} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{stock.product.sku}</span>
                {currentStatus?.status && <StatusBadge status={currentStatus.status} size="sm" />}
                {notes.length > 0 && (
                  <NotesBadge count={notes.length} hasPinned={pinnedNotesCount > 0} />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{stock.product.name}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin size={12} className="text-muted-foreground" />
            {stock.location.code}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="font-semibold text-foreground">{stock.quantity}</span>
          <span className="text-muted-foreground text-sm ml-1">{stock.product.uom}</span>
        </td>
        {showActions && (
          <td className="px-4 py-3">
            <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all group">
      {/* Header with Status */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              {stock.product.image_url ? (
                <img
                  src={stock.product.image_url}
                  alt={stock.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package size={24} className="text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground">{stock.product.sku}</span>
                {currentStatus?.status && (
                  <StatusBadge status={currentStatus.status} size="sm" showEffect />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{stock.product.name}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
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
            <p className="text-2xl font-bold text-foreground">{stock.quantity}</p>
            <p className="text-xs text-muted-foreground">{stock.product.uom}</p>
          </div>
        </div>
      </div>

      {/* Status and Notes Actions */}
      {showActions && (
        <div className="px-4 py-3 bg-muted flex items-center justify-between gap-2">
          <StatusSelector
            entityType={entityType}
            entityId={entityId}
            currentStatus={currentStatus}
            statuses={statuses}
            onStatusChange={onStatusChange}
          />
          <div className="flex items-center gap-2">
            {notes.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
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
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-100 dark:border-amber-800/50">
          <p className="text-xs text-amber-800 dark:text-amber-200 italic line-clamp-2">
            📝 {currentStatus.notes}
          </p>
        </div>
      )}

      {/* Pinned Notes Preview */}
      {pinnedNotesCount > 0 && (
        <div className="px-4 py-2 bg-muted border-t border-border">
          {notes
            .filter((n) => n.is_pinned)
            .slice(0, 2)
            .map((note) => (
              <p key={note.id} className="text-xs text-muted-foreground truncate">
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
    lot?: string | null;
    cart?: string | null;
    level?: string | null;
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
    <div className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            <span className="font-bold text-foreground">{location.code}</span>
            {currentStatus?.status && <StatusBadge status={currentStatus.status} size="sm" />}
          </div>
          {(location.lot || location.cart || location.level) && (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {location.lot && <span>Lot: {location.lot}</span>}
              {location.cart && <span>Cart: {location.cart}</span>}
              {location.level && <span>Level: {location.level}</span>}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-foreground">{stockCount}</p>
          <p className="text-xs text-muted-foreground">items</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
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
