export type HistoryMode = 'simple' | 'detailed';

export type HistoryType =
  | 'INBOUND'
  | 'OUTBOUND'
  | 'TRANSFER'
  | 'TRANSFER_OUT'
  | 'ADJUST'
  | 'AUDIT'
  | 'STATUS_CHANGE'
  | 'SYSTEM';

export interface HistoryFilter {
  search?: string; // Search in product name, sku, user, details
  type?: string; // Filter by specific type
  startDate?: string;
  endDate?: string;
}

export interface BaseHistoryEntry {
  id: string;
  date: string; // ISO string
  type: HistoryType;
  user: string; // email or name
  details?: string;
}

export interface TransactionEntry extends BaseHistoryEntry {
  category: 'TRANSACTION';
  product: string;
  sku: string;
  quantity: number;
  uom: string;
  from: string; // formatted location or source
  to: string; // formatted location or destination
  attributes?: Record<string, any>;
}

export interface SystemLogEntry extends BaseHistoryEntry {
  category: 'SYSTEM';
  entityType?: string; // 'product', 'location', etc.
  entityName?: string; // 'Product A', 'Zone A'
  entityId?: string; // For linking
  action: string; // 'Status Change', 'Update'
  oldValue?: string;
  newValue?: string;
  reason?: string;
  attributes?: Record<string, any>; // In case logs have extra data
}

export type HistoryEntry = TransactionEntry | SystemLogEntry;
