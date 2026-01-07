// types/status.ts

/**
 * Status Type - Defines whether status applies to product or location (lot)
 * - PRODUCT: Affects specific quantity of products, can be partially removed
 * - LOCATION: Affects entire lot/location, all products in that location inherit this status
 */
export type StatusType = 'PRODUCT' | 'LOCATION';

/**
 * Status Type metadata for UI display
 */
export const STATUS_TYPE_OPTIONS: {
  value: StatusType;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'PRODUCT',
    label: 'Product Status',
    description:
      'Applies to a specific quantity of products. You can select how many units are affected and partially remove the status.',
    icon: '📦',
  },
  {
    value: 'LOCATION',
    label: 'Location Status',
    description:
      'Applies to the entire lot/location. All products in this location will inherit this status.',
    icon: '📍',
  },
];

/**
 * Status Effect Types
 * Defines the behavior/restrictions when a status is applied
 */
export type StatusEffect =
  | 'TRANSACTIONS_ALLOWED' // Normal operation - all transactions permitted
  | 'TRANSACTIONS_PROHIBITED' // No inbound/outbound allowed
  | 'CLOSED' // Fully closed - no operations
  | 'INBOUND_ONLY' // Only inbound transactions allowed
  | 'OUTBOUND_ONLY' // Only outbound transactions allowed
  | 'AUDIT_ONLY' // Only audit operations allowed
  | 'CUSTOM'; // Custom effect defined by user

/**
 * Status Effect metadata for UI display
 */
export const STATUS_EFFECT_OPTIONS: {
  value: StatusEffect;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'TRANSACTIONS_ALLOWED',
    label: 'Transactions Allowed',
    description: 'All inbound/outbound/transfer operations are permitted',
    icon: '✅',
  },
  {
    value: 'TRANSACTIONS_PROHIBITED',
    label: 'Transactions Prohibited',
    description: 'No transactions allowed - view only mode',
    icon: '🚫',
  },
  {
    value: 'CLOSED',
    label: 'Closed',
    description: 'Fully closed - no operations or modifications allowed',
    icon: '🔒',
  },
  {
    value: 'INBOUND_ONLY',
    label: 'Inbound Only',
    description: 'Only inbound/receiving operations allowed',
    icon: '📥',
  },
  {
    value: 'OUTBOUND_ONLY',
    label: 'Outbound Only',
    description: 'Only outbound/shipping operations allowed',
    icon: '📤',
  },
  {
    value: 'AUDIT_ONLY',
    label: 'Audit Only',
    description: 'Only audit/counting operations allowed',
    icon: '📋',
  },
  {
    value: 'CUSTOM',
    label: 'Custom',
    description: 'Custom behavior - define your own rules',
    icon: '⚙️',
  },
];

/**
 * Predefined color palette for statuses
 */
export const STATUS_COLOR_PALETTE = [
  { name: 'Green', value: '#22c55e', bg: '#dcfce7', text: '#166534' },
  { name: 'Blue', value: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
  { name: 'Yellow', value: '#eab308', bg: '#fef9c3', text: '#854d0e' },
  { name: 'Orange', value: '#f97316', bg: '#ffedd5', text: '#9a3412' },
  { name: 'Red', value: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
  { name: 'Purple', value: '#a855f7', bg: '#f3e8ff', text: '#6b21a8' },
  { name: 'Pink', value: '#ec4899', bg: '#fce7f3', text: '#9d174d' },
  { name: 'Cyan', value: '#06b6d4', bg: '#cffafe', text: '#155e75' },
  { name: 'Slate', value: '#64748b', bg: '#f1f5f9', text: '#334155' },
  { name: 'Indigo', value: '#6366f1', bg: '#e0e7ff', text: '#3730a3' },
] as const;

/**
 * Status Definition - Master record for status types
 * Corresponds to the 'status_definitions' table
 */
export interface StatusDefinition {
  id: string;
  name: string;
  code: string;
  description?: string;
  color: string; // Primary color (hex)
  bg_color: string; // Background color for badges
  text_color: string; // Text color for badges
  effect: StatusEffect;
  status_type: StatusType; // Whether this is a product or location status
  is_default: boolean; // If true, auto-applied to new items
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Entity type that can have status applied
 */
export type StatusEntityType = 'STOCK' | 'LOCATION' | 'WAREHOUSE' | 'PRODUCT';

/**
 * Status Application - Records status applied to an entity
 * Corresponds to the 'entity_statuses' table
 */
export interface EntityStatus {
  id: string;
  entity_type: StatusEntityType;
  entity_id: string;
  status_id: string;
  applied_at: string;
  applied_by: string;
  notes?: string;
  affected_quantity?: number; // For PRODUCT status: how many units have this status
  // Relations
  status?: StatusDefinition;
  applied_by_user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

/**
 * Note attached to an entity
 * Corresponds to the 'entity_notes' table
 */
export interface EntityNote {
  id: string;
  entity_type: StatusEntityType;
  entity_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  created_by: string;
  updated_at?: string;
  // Relations
  created_by_user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

/**
 * Status change history log
 */
export interface StatusChangeLog {
  id: string;
  entity_type: StatusEntityType;
  entity_id: string;
  from_status_id?: string;
  to_status_id?: string; // Nullable when status is removed
  changed_at: string;
  changed_by: string;
  reason?: string;
  affected_quantity?: number;
  total_quantity?: number;
  // Relations
  from_status?: StatusDefinition;
  to_status?: StatusDefinition;
  changed_by_user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

/**
 * Form input for creating/updating status definitions
 */
export interface StatusDefinitionInput {
  name: string;
  code: string;
  description?: string;
  color: string;
  bg_color: string;
  text_color: string;
  effect: StatusEffect;
  status_type: StatusType;
  is_default?: boolean;
  sort_order?: number;
}

/**
 * Form input for applying status to an entity
 */
export interface ApplyStatusInput {
  entity_type: StatusEntityType;
  entity_id: string;
  status_id: string;
  notes?: string;
}

/**
 * Form input for adding note to an entity
 */
export interface AddNoteInput {
  entity_type: StatusEntityType;
  entity_id: string;
  content: string;
  is_pinned?: boolean;
}

/**
 * Helper function to check if an effect allows transactions
 */
export function canPerformTransaction(
  effect: StatusEffect,
  transactionType: 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'AUDIT',
): boolean {
  switch (effect) {
    case 'TRANSACTIONS_ALLOWED':
      return true;
    case 'TRANSACTIONS_PROHIBITED':
      return false;
    case 'CLOSED':
      return false;
    case 'INBOUND_ONLY':
      return transactionType === 'INBOUND';
    case 'OUTBOUND_ONLY':
      return transactionType === 'OUTBOUND';
    case 'AUDIT_ONLY':
      return transactionType === 'AUDIT';
    case 'CUSTOM':
      return true; // Custom effects need to be handled separately
    default:
      return false;
  }
}

/**
 * Get effect badge color classes
 */
export function getEffectBadgeClasses(effect: StatusEffect): string {
  switch (effect) {
    case 'TRANSACTIONS_ALLOWED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'TRANSACTIONS_PROHIBITED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'CLOSED':
      return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'INBOUND_ONLY':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'OUTBOUND_ONLY':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'AUDIT_ONLY':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'CUSTOM':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Create dynamic style object for status colors
 * These styles must be inline as colors are user-defined and stored in DB
 */
export function createStatusStyle(status: StatusDefinition): React.CSSProperties {
  return {
    backgroundColor: status.bg_color,
    color: status.text_color,
  };
}

export function createStatusBorderStyle(status: StatusDefinition): React.CSSProperties {
  return {
    borderLeftColor: status.color,
  };
}

export function createColorStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: color,
  };
}
