// Re-export status and notes components for convenient importing

// Status components
export { StatusBadge, StatusSelector, StatusHistoryButton } from './StatusSelector';

// Notes components
export { NotesManager, NotesBadge, QuickNoteInput } from './NotesManager';

// Combined stock/location cards with status
export { StockItemCard, LocationStatusCard } from './StockStatusCard';

// Re-export types for convenience
export type {
  StatusDefinition,
  EntityStatus,
  EntityNote,
  StatusEntityType,
  StatusEffect,
  StatusChangeLog,
} from '@/types/status';
