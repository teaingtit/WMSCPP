import { EntityStatus } from '@/types/status';

/**
 * Status effect classification constants
 */
export const RESTRICTED_EFFECTS = ['TRANSACTIONS_PROHIBITED', 'CLOSED'] as const;
export const WARNING_EFFECTS = ['INBOUND_ONLY', 'OUTBOUND_ONLY', 'AUDIT_ONLY'] as const;

/**
 * Check if status effect restricts all transactions
 */
export const isRestricted = (status: EntityStatus | null | undefined): boolean =>
  !!(status?.status?.effect && RESTRICTED_EFFECTS.includes(status.status.effect as any));

/**
 * Check if status has a warning effect (partial restriction)
 */
export const hasWarning = (status: EntityStatus | null | undefined): boolean =>
  !!(status?.status?.effect && WARNING_EFFECTS.includes(status.status.effect as any));

/**
 * Get status classification for styling
 */
export type StatusClassification = 'restricted' | 'warning' | 'normal';

export const getStatusClassification = (
  status: EntityStatus | null | undefined,
): StatusClassification => {
  if (isRestricted(status)) return 'restricted';
  if (hasWarning(status)) return 'warning';
  return 'normal';
};

/**
 * Calculate quantity breakdown based on status
 */
export interface QuantityBreakdown {
  total: number;
  normal: number;
  affected: number;
}

export const calculateQuantityBreakdown = (
  totalQuantity: number,
  status: EntityStatus | null | undefined,
): QuantityBreakdown => {
  const hasStatus = !!status?.status;
  const affectedQty = status?.affected_quantity ?? (hasStatus ? totalQuantity : 0);

  return {
    total: totalQuantity,
    affected: hasStatus ? affectedQty : 0,
    normal: hasStatus ? Math.max(0, totalQuantity - affectedQty) : totalQuantity,
  };
};

/**
 * Get gradient class based on status
 */
export const getStatusGradient = (status: EntityStatus | null | undefined): string => {
  if (isRestricted(status)) return 'bg-gradient-to-br from-red-600 to-red-700';
  if (hasWarning(status)) return 'bg-gradient-to-br from-amber-500 to-amber-600';
  return 'bg-gradient-to-br from-indigo-600 to-indigo-700';
};

/**
 * Get status icon props (for Lucide icons)
 */
export const getStatusIconName = (
  status: EntityStatus | null | undefined,
): 'Lock' | 'AlertTriangle' | 'Shield' => {
  if (isRestricted(status)) return 'Lock';
  if (hasWarning(status)) return 'AlertTriangle';
  return 'Shield';
};
