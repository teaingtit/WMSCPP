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
import {
  StatusDefinition,
  StatusEffect,
  createStatusStyle,
  PREDEFINED_EFFECTS,
} from '@/types/status';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: StatusDefinition;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showEffect?: boolean;
  showType?: boolean;
  className?: string;
}

// Helper function to get effect icon with fallback for custom effects
const getEffectIcon = (effect: StatusEffect, iconSize: number = 12): React.ReactNode => {
  const effectIconMap: Record<string, React.ReactNode> = {
    [PREDEFINED_EFFECTS.TRANSACTIONS_ALLOWED]: <Package size={iconSize} />,
    [PREDEFINED_EFFECTS.TRANSACTIONS_PROHIBITED]: <AlertTriangle size={iconSize} />,
    [PREDEFINED_EFFECTS.CLOSED]: <Lock size={iconSize} />,
    [PREDEFINED_EFFECTS.INBOUND_ONLY]: <ArrowDownToLine size={iconSize} />,
    [PREDEFINED_EFFECTS.OUTBOUND_ONLY]: <ArrowUpFromLine size={iconSize} />,
    [PREDEFINED_EFFECTS.AUDIT_ONLY]: <ClipboardList size={iconSize} />,
    [PREDEFINED_EFFECTS.CUSTOM]: <Settings size={iconSize} />,
  };
  // Return mapped icon or fallback Settings icon for custom effects
  return effectIconMap[effect] || <Settings size={iconSize} />;
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
      className={`inline-flex items-center font-bold rounded-md border ${sizeClasses[size]} ${styles['statusBadge']} ${className}`}
      style={
        {
          ...style,
          '--status-border-color': status.color + '40',
        } as React.CSSProperties
      }
    >
      {showIcon && getEffectIcon(status.effect)}
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
      className={`relative inline-block rounded-full ${dotSize} ${styles['statusDot']} ${className}`}
      style={{ '--status-color': status.color } as React.CSSProperties}
      title={`${status.name}: ${status.description || status.effect}`}
    >
      {pulse && (
        <span
          className={`absolute inset-0 rounded-full animate-ping opacity-75 ${styles['statusDotPulse']}`}
          style={{ '--status-color': status.color } as React.CSSProperties}
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
            styles['statusIndicatorBadge']
          } ${isRestricted ? 'animate-pulse' : ''}`}
          style={
            {
              '--status-bg-color': status.bg_color,
              '--status-text-color': status.text_color,
              '--status-border-color': status.color + '40',
            } as React.CSSProperties
          }
        >
          {getEffectIcon(status.effect)}
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

  // Get message for effect - use predefined message or fall back to status description for custom effects
  const messages: Record<string, string> = {
    TRANSACTIONS_PROHIBITED: `รายการนี้ถูกระบุสถานะ "${status.name}" - ไม่สามารถทำรายการได้`,
    CLOSED: `รายการนี้ถูกปิด - ห้ามดำเนินการใดๆ`,
    TRANSACTIONS_ALLOWED: '',
    INBOUND_ONLY: `รายการนี้อนุญาตเฉพาะการรับเข้าเท่านั้น`,
    OUTBOUND_ONLY: `รายการนี้อนุญาตเฉพาะการเบิกจ่ายเท่านั้น`,
    AUDIT_ONLY: `รายการนี้อยู่ในโหมดตรวจสอบสต็อก - อนุญาตเฉพาะการนับจำนวนเท่านั้น`,
    CUSTOM: '',
  };

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg border ${styles['statusWarningBanner']} ${className}`}
      style={
        {
          '--status-bg-color': status.bg_color,
          '--status-color': status.color,
        } as React.CSSProperties
      }
    >
      <AlertTriangle
        size={18}
        className={`shrink-0 ${styles['statusWarningIcon']}`}
        style={{ '--status-color': status.color } as React.CSSProperties}
      />
      <div>
        <div
          className={`font-bold text-sm ${styles['statusWarningTitle']}`}
          style={{ '--status-text-color': status.text_color } as React.CSSProperties}
        >
          {status.name}
        </div>
        <div
          className={`text-xs opacity-80 ${styles['statusWarningMessage']}`}
          style={{ '--status-text-color': status.text_color } as React.CSSProperties}
        >
          {messages[status.effect] || status.description}
        </div>
      </div>
    </div>
  );
};

export default StatusBadge;
