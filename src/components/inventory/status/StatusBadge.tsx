'use client';

import React from 'react';
import {
  AlertTriangle,
  Lock,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Settings,
  MapPin,
} from 'lucide-react';
import { StatusDefinition, StatusEffect, createStatusStyle } from '@/types/status';

interface StatusBadgeProps {
  status: StatusDefinition;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showEffect?: boolean;
  showType?: boolean;
  className?: string;
}

const effectIcons: Record<StatusEffect, React.ReactNode> = {
  TRANSACTIONS_ALLOWED: <Package size={12} />,
  TRANSACTIONS_PROHIBITED: <AlertTriangle size={12} />,
  CLOSED: <Lock size={12} />,
  INBOUND_ONLY: <ArrowDownToLine size={12} />,
  OUTBOUND_ONLY: <ArrowUpFromLine size={12} />,
  AUDIT_ONLY: <ClipboardList size={12} />,
  CUSTOM: <Settings size={12} />,
};

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
};

export const StatusBadge = ({
  status,
  size = 'sm',
  showIcon = true,
  showEffect = false,
  showType = false,
  className = '',
}: StatusBadgeProps) => {
  const style = createStatusStyle(status);
  const isLocationStatus = status.status_type === 'LOCATION';

  return (
    <span
      className={`inline-flex items-center font-bold rounded-md border ${sizeClasses[size]} ${className}`}
      style={{
        ...style,
        borderColor: status.color + '40', // Add transparency to border
      }}
    >
      {showIcon && effectIcons[status.effect]}
      <span className="truncate">{status.name}</span>
      {showType &&
        (isLocationStatus ? (
          <MapPin size={size === 'lg' ? 14 : 10} className="opacity-70" />
        ) : (
          <Package size={size === 'lg' ? 14 : 10} className="opacity-70" />
        ))}
      {showEffect && <span className="opacity-70 text-[10px] font-normal">({status.effect})</span>}
    </span>
  );
};

// Mini version for tight spaces (just colored dot + optional tooltip)
interface StatusDotProps {
  status: StatusDefinition;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusDot = ({
  status,
  size = 'sm',
  pulse = false,
  className = '',
}: StatusDotProps) => {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  return (
    <span
      className={`relative inline-block rounded-full ${dotSize} ${className}`}
      style={{ backgroundColor: status.color }}
      title={`${status.name}: ${status.description || status.effect}`}
    >
      {pulse && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-75"
          style={{ backgroundColor: status.color }}
        />
      )}
    </span>
  );
};

// Compact indicator for card views
interface StatusIndicatorProps {
  status: StatusDefinition | null;
  hasNotes?: boolean;
  noteCount?: number;
  onClick?: () => void;
  className?: string;
}

export const StatusIndicator = ({
  status,
  hasNotes = false,
  noteCount = 0,
  onClick,
  className = '',
}: StatusIndicatorProps) => {
  if (!status && !hasNotes) return null;

  const isRestricted =
    status?.effect && ['TRANSACTIONS_PROHIBITED', 'CLOSED'].includes(status.effect);
  const isLocationStatus = status?.status_type === 'LOCATION';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`flex items-center gap-1.5 ${
        onClick ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-all' : ''
      } ${className}`}
    >
      {status && (
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            isRestricted ? 'animate-pulse' : ''
          }`}
          style={{
            backgroundColor: status.bg_color,
            color: status.text_color,
            borderColor: status.color + '40',
          }}
        >
          {effectIcons[status.effect]}
          <span className="max-w-[60px] truncate">{status.name}</span>
          {isLocationStatus && <MapPin size={10} className="opacity-70" />}
        </span>
      )}
      {hasNotes && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full border border-amber-200">
          📝{noteCount > 0 && noteCount}
        </span>
      )}
    </div>
  );
};

// Warning banner for restricted items
interface StatusWarningBannerProps {
  status: StatusDefinition;
  entityType: 'stock' | 'location' | 'product';
  className?: string;
}

export const StatusWarningBanner = ({
  status,
  entityType,
  className = '',
}: StatusWarningBannerProps) => {
  const isRestricted = ['TRANSACTIONS_PROHIBITED', 'CLOSED'].includes(status.effect);

  if (!isRestricted) return null;

  const messages: Record<StatusEffect, string> = {
    TRANSACTIONS_PROHIBITED: `This ${entityType} is marked as "${status.name}" - all transactions are prohibited`,
    CLOSED: `This ${entityType} is closed - no operations allowed`,
    TRANSACTIONS_ALLOWED: '',
    INBOUND_ONLY: `This ${entityType} allows inbound transactions only`,
    OUTBOUND_ONLY: `This ${entityType} allows outbound transactions only`,
    AUDIT_ONLY: `This ${entityType} is in audit mode - only counting operations allowed`,
    CUSTOM: '',
  };

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg border ${className}`}
      style={{
        backgroundColor: status.bg_color,
        borderColor: status.color,
      }}
    >
      <AlertTriangle size={18} style={{ color: status.color }} className="shrink-0" />
      <div>
        <div className="font-bold text-sm" style={{ color: status.text_color }}>
          {status.name}
        </div>
        <div className="text-xs opacity-80" style={{ color: status.text_color }}>
          {messages[status.effect] || status.description}
        </div>
      </div>
    </div>
  );
};

export default StatusBadge;
