'use client';

import { useState, useEffect, useTransition } from 'react';
import { X, Shield, StickyNote, Loader2, History } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { StatusDefinition, EntityStatus, EntityNote, StatusEntityType } from '@/types/status';
import {
  getStatusDefinitions,
  getEntityStatus,
  getEntityNotes,
  applyEntityStatus,
  removeEntityStatus,
  removePartialStatus,
  addEntityNote,
  deleteEntityNote,
  toggleNotePin,
  getStatusChangeHistory,
} from '@/actions/status-actions';
import { notify } from '@/lib/ui-helpers';
import { StatusWarningBanner } from './StatusBadge';
import { StatusTab, NotesTab, HistoryTab } from './tabs';

interface StatusAndNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockWithDetails | null;
  entityType?: StatusEntityType;
  onStatusChange?: () => void;
}

type TabType = 'status' | 'notes' | 'history';

const TABS: { id: TabType; icon: typeof Shield; label: string }[] = [
  { id: 'status', icon: Shield, label: 'สถานะ' },
  { id: 'notes', icon: StickyNote, label: 'บันทึก' },
  { id: 'history', icon: History, label: 'ประวัติ' },
];

export default function StatusAndNotesModal({
  isOpen,
  onClose,
  item,
  entityType = 'STOCK',
  onStatusChange,
}: StatusAndNotesModalProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [statusDefinitions, setStatusDefinitions] = useState<StatusDefinition[]>([]);
  const [currentStatus, setCurrentStatus] = useState<EntityStatus | null>(null);
  const [notes, setNotes] = useState<EntityNote[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Form states
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [affectedQuantity, setAffectedQuantity] = useState(0);

  useEffect(() => {
    if (isOpen && item) {
      loadData();
      setAffectedQuantity(item.quantity);
    }
  }, [isOpen, item?.id]);

  const loadData = async () => {
    if (!item) return;
    setIsLoading(true);
    try {
      const [definitions, entityStatus, entityNotes, changeHistory] = await Promise.all([
        getStatusDefinitions(),
        getEntityStatus(entityType, item.id),
        getEntityNotes(entityType, item.id),
        getStatusChangeHistory(entityType, item.id),
      ]);
      setStatusDefinitions(definitions);
      setCurrentStatus(entityStatus);
      setNotes(entityNotes);
      setHistory(changeHistory);
      setSelectedStatusId(entityStatus?.status_id || '');
    } catch (error) {
      console.error('Error loading status data:', error);
      notify.error('Failed to load status data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyStatus = () => {
    if (!item || !selectedStatusId) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('entity_type', entityType);
      formData.set('entity_id', item.id);
      formData.set('status_id', selectedStatusId);
      formData.set('reason', statusReason);
      formData.set('affected_quantity', String(affectedQuantity));
      formData.set('total_quantity', String(item.quantity));
      const result = await applyEntityStatus(formData);
      notify.ok(result);
      if (result.success) {
        await loadData();
        setStatusReason('');
        setAffectedQuantity(item.quantity);
        onStatusChange?.();
      }
    });
  };

  const handleRemoveStatus = () => {
    if (!item || !currentStatus) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('entity_type', entityType);
      formData.set('entity_id', item.id);
      const result = await removeEntityStatus(formData);
      notify.ok(result);
      if (result.success) {
        // Clear state immediately for instant UI feedback
        setCurrentStatus(null);
        setSelectedStatusId('');
        // Reload history to show the removal in logs
        const changeHistory = await getStatusChangeHistory(entityType, item.id);
        setHistory(changeHistory);
        // Notify parent to refresh inventory list
        onStatusChange?.();
      }
    });
  };

  const handlePartialRemove = (quantity: number, reason: string) => {
    if (!item || !currentStatus) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('entity_type', entityType);
      formData.set('entity_id', item.id);
      formData.set('quantity_to_remove', String(quantity));
      formData.set('total_quantity', String(item.quantity)); // Fallback for legacy statuses without affected_quantity
      formData.set('reason', reason);
      const result = await removePartialStatus(formData);
      notify.ok(result);
      if (result.success) {
        await loadData();
        onStatusChange?.();
      }
    });
  };

  const handleAddNote = () => {
    if (!item || !newNoteContent.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('entity_type', entityType);
      formData.set('entity_id', item.id);
      formData.set('content', newNoteContent.trim());
      formData.set('is_pinned', String(newNotePinned));
      const result = await addEntityNote(formData);
      notify.ok(result);
      if (result.success) {
        setNewNoteContent('');
        setNewNotePinned(false);
        await loadData();
      }
    });
  };

  const handleDeleteNote = (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('id', noteId);
      const result = await deleteEntityNote(formData);
      notify.ok(result);
      if (result.success) await loadData();
    });
  };

  const handleTogglePin = (noteId: string, currentPinned: boolean) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('id', noteId);
      formData.set('is_pinned', String(!currentPinned));
      const result = await toggleNotePin(formData);
      if (result.success) await loadData();
    });
  };

  if (!isOpen || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-2xl max-h-dvh-90 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Status & Notes Management</h2>
              <p className="text-sm text-white/70">
                {item.product?.name} • {item.location?.code}
              </p>
            </div>
          </div>
          {currentStatus?.status && (
            <div className="mt-4">
              <StatusWarningBanner status={currentStatus.status} />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${
                activeTab === id
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {label}
              {id === 'notes' && notes.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                  {notes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : (
            <>
              {activeTab === 'status' && (
                <StatusTab
                  currentStatus={currentStatus}
                  statusDefinitions={statusDefinitions}
                  selectedStatusId={selectedStatusId}
                  statusReason={statusReason}
                  isPending={isPending}
                  totalQuantity={item.quantity}
                  affectedQuantity={affectedQuantity}
                  uom={item.product?.uom || 'unit'}
                  setSelectedStatusId={setSelectedStatusId}
                  setStatusReason={setStatusReason}
                  setAffectedQuantity={setAffectedQuantity}
                  handleApplyStatus={handleApplyStatus}
                  handleRemoveStatus={handleRemoveStatus}
                  handlePartialRemove={handlePartialRemove}
                />
              )}
              {activeTab === 'notes' && (
                <NotesTab
                  notes={notes}
                  newNoteContent={newNoteContent}
                  newNotePinned={newNotePinned}
                  isPending={isPending}
                  setNewNoteContent={setNewNoteContent}
                  setNewNotePinned={setNewNotePinned}
                  handleAddNote={handleAddNote}
                  handleDeleteNote={handleDeleteNote}
                  handleTogglePin={handleTogglePin}
                />
              )}
              {activeTab === 'history' && <HistoryTab history={history} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 active:scale-[0.98] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
