'use client';

import { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { addEntityNote, updateEntityNote, deleteEntityNote } from '@/actions/status-actions';
import { EntityNote, StatusEntityType } from '@/types/status';
import { wrapFormAction, notify } from '@/lib/ui-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  StickyNote,
  Plus,
  Trash2,
  Edit2,
  Pin,
  PinOff,
  MessageSquare,
  Check,
  X,
  Clock,
  User,
} from 'lucide-react';

interface NotesManagerProps {
  entityType: StatusEntityType;
  entityId: string;
  notes: EntityNote[];
  onNotesChange?: (() => void) | undefined;
  compact?: boolean;
}

const addNoteWrapper = wrapFormAction(addEntityNote);
const updateNoteWrapper = wrapFormAction(updateEntityNote);
const deleteNoteWrapper = wrapFormAction(deleteEntityNote);

/**
 * Component for viewing and managing notes on an entity
 */
export function NotesManager({
  entityType,
  entityId,
  notes,
  onNotesChange,
  compact = false,
}: NotesManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [editContent, setEditContent] = useState('');

  const [addState, addAction] = useFormState(addNoteWrapper, {
    success: false,
    message: '',
  });

  const [updateState, updateAction] = useFormState(updateNoteWrapper, {
    success: false,
    message: '',
  });

  const [deleteState, deleteAction] = useFormState(deleteNoteWrapper, {
    success: false,
    message: '',
  });

  // Handle add note result
  useEffect(() => {
    if (addState.message) {
      notify.ok(addState);
      if (addState.success) {
        setIsAddingNote(false);
        setNewNoteContent('');
        setNewNotePinned(false);
        onNotesChange?.();
      }
    }
  }, [addState, onNotesChange]);

  // Handle update note result
  useEffect(() => {
    if (updateState.message) {
      notify.ok(updateState);
      if (updateState.success) {
        setEditingNoteId(null);
        onNotesChange?.();
      }
    }
  }, [updateState, onNotesChange]);

  // Handle delete note result
  useEffect(() => {
    if (deleteState.message) {
      notify.ok(deleteState);
      if (deleteState.success) {
        onNotesChange?.();
      }
    }
  }, [deleteState, onNotesChange]);

  const pinnedNotes = notes.filter((n) => n.is_pinned);
  const unpinnedNotes = notes.filter((n) => !n.is_pinned);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const NoteCard = ({ note }: { note: EntityNote }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEditing = editingNoteId === note.id;

    return (
      <div
        className={`p-3 rounded-lg border transition-all ${
          note.is_pinned
            ? 'bg-amber-50 border-amber-200'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        {isEditing ? (
          <form action={updateAction} className="space-y-2">
            <input type="hidden" name="id" value={note.id} />
            <input type="hidden" name="is_pinned" value={note.is_pinned.toString()} />
            <textarea
              name="content"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg resize-none text-sm"
              rows={3}
              autoFocus
              placeholder="Edit your note..."
              title="Note content"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingNoteId(null)}
              >
                Cancel
              </Button>
              <SubmitButton className="h-8 px-3 text-sm bg-amber-600 hover:bg-amber-700">
                Save
              </SubmitButton>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-slate-700 flex-1 whitespace-pre-wrap">{note.content}</p>
              {note.is_pinned && <Pin size={14} className="text-amber-600 shrink-0" />}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={10} />
                {formatDate(note.created_at)}
                {note.created_by_user && (
                  <>
                    <User size={10} />
                    {note.created_by_user.first_name || note.created_by_user.email}
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Toggle Pin */}
                <form action={updateAction}>
                  <input type="hidden" name="id" value={note.id} />
                  <input type="hidden" name="content" value={note.content} />
                  <input type="hidden" name="is_pinned" value={(!note.is_pinned).toString()} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title={note.is_pinned ? 'Unpin' : 'Pin'}
                  >
                    {note.is_pinned ? (
                      <PinOff size={12} className="text-amber-600" />
                    ) : (
                      <Pin size={12} className="text-slate-400" />
                    )}
                  </Button>
                </form>

                {/* Edit */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    setEditingNoteId(note.id);
                    setEditContent(note.content);
                  }}
                >
                  <Edit2 size={12} className="text-slate-400" />
                </Button>

                {/* Delete */}
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-1">
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={note.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                      >
                        <Check size={12} />
                      </Button>
                    </form>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors">
            <MessageSquare size={12} />
            {notes.length > 0 && <span>{notes.length}</span>}
          </button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <StickyNote size={14} />
            Notes
            {notes.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                {notes.length}
              </span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <StickyNote size={20} className="text-amber-600" />
              Notes
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingNote(true)}
              className="gap-1"
            >
              <Plus size={14} />
              Add Note
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Add Note Form */}
          {isAddingNote && (
            <form action={addAction} className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <input type="hidden" name="entity_type" value={entityType} />
              <input type="hidden" name="entity_id" value={entityId} />
              <input type="hidden" name="is_pinned" value={newNotePinned.toString()} />

              <textarea
                name="content"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write your note here..."
                className="w-full p-3 border border-amber-200 rounded-lg resize-none text-sm bg-white"
                rows={3}
                autoFocus
                required
              />

              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={newNotePinned}
                    onChange={(e) => setNewNotePinned(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <Pin size={14} className="text-amber-600" />
                  Pin this note
                </label>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingNote(false);
                      setNewNoteContent('');
                      setNewNotePinned(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <SubmitButton className="h-8 px-3 text-sm bg-amber-600 hover:bg-amber-700">
                    Add Note
                  </SubmitButton>
                </div>
              </div>
            </form>
          )}

          {/* Notes List */}
          {notes.length === 0 && !isAddingNote ? (
            <div className="text-center py-8">
              <MessageSquare size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500">No notes yet</p>
              <p className="text-sm text-slate-400">
                Add a note to keep track of important information
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                    <Pin size={12} />
                    Pinned
                  </h4>
                  {pinnedNotes.map((note) => (
                    <div key={note.id} className="group">
                      <NoteCard note={note} />
                    </div>
                  ))}
                </div>
              )}

              {/* Other Notes */}
              {unpinnedNotes.length > 0 && (
                <div className="space-y-2">
                  {pinnedNotes.length > 0 && (
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Other Notes
                    </h4>
                  )}
                  {unpinnedNotes.map((note) => (
                    <div key={note.id} className="group">
                      <NoteCard note={note} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface NotesBadgeProps {
  count: number;
  hasPinned?: boolean;
  onClick?: () => void;
}

/**
 * Simple badge showing note count
 */
export function NotesBadge({ count, hasPinned = false, onClick }: NotesBadgeProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
        hasPinned
          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {hasPinned && <Pin size={10} />}
      <MessageSquare size={10} />
      {count}
    </button>
  );
}

interface QuickNoteInputProps {
  entityType: StatusEntityType;
  entityId: string;
  onNoteAdded?: () => void;
  placeholder?: string;
}

/**
 * Quick inline input for adding notes
 */
export function QuickNoteInput({
  entityType,
  entityId,
  onNoteAdded,
  placeholder = 'Add a quick note...',
}: QuickNoteInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addState, addAction] = useFormState(addNoteWrapper, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (addState.message) {
      setIsSubmitting(false);
      if (addState.success) {
        setContent('');
        onNoteAdded?.();
      } else {
        notify.ok(addState);
      }
    }
  }, [addState, onNoteAdded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('entity_type', entityType);
    formData.append('entity_id', entityId);
    formData.append('content', content);
    formData.append('is_pinned', 'false');
    addAction(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="flex-1 h-8 text-sm"
        disabled={isSubmitting}
      />
      <Button
        type="submit"
        size="sm"
        disabled={!content.trim() || isSubmitting}
        className="h-8 px-3 bg-amber-600 hover:bg-amber-700"
      >
        <Plus size={14} />
      </Button>
    </form>
  );
}
