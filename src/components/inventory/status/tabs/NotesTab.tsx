'use client';

import { StickyNote, Plus, Trash2, Pin, PinOff, Loader2 } from 'lucide-react';
import { EntityNote } from '@/types/status';

interface NotesTabProps {
  notes: EntityNote[];
  newNoteContent: string;
  newNotePinned: boolean;
  isPending: boolean;
  setNewNoteContent: (content: string) => void;
  setNewNotePinned: (pinned: boolean) => void;
  handleAddNote: () => void;
  handleDeleteNote: (noteId: string) => void;
  handleTogglePin: (noteId: string, currentPinned: boolean) => void;
}

export default function NotesTab({
  notes,
  newNoteContent,
  newNotePinned,
  isPending,
  setNewNoteContent,
  setNewNotePinned,
  handleAddNote,
  handleDeleteNote,
  handleTogglePin,
}: NotesTabProps) {
  return (
    <div className="space-y-5">
      {/* Add Note Form */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          เพิ่มบันทึกใหม่
        </label>
        <textarea
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          placeholder="เพิ่มบันทึกเกี่ยวกับสินค้านี้... (เช่น ข้อควรระวัง, รายงานความเสียหาย, หรือเงื่อนไขพิเศษ)"
          className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none bg-white"
          rows={3}
        />
        <div className="flex items-center justify-between mt-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={newNotePinned}
              onChange={(e) => setNewNotePinned(e.target.checked)}
              className="rounded border-slate-300"
            />
            <Pin size={14} />
            ปักหมุดบันทึกนี้
          </label>
          <button
            onClick={handleAddNote}
            disabled={isPending || !newNoteContent.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 text-sm"
          >
            {isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            บันทึกข้อความ
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <StickyNote size={32} className="mx-auto mb-2 opacity-50" />
            <p>ยังไม่มีบันทึก</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={`p-4 rounded-xl border ${
                note.is_pinned ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {note.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mb-2">
                      <Pin size={10} /> ปักหมุด
                    </span>
                  )}
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  <div className="mt-2 text-[10px] text-slate-400">
                    {new Date(note.created_at).toLocaleString('th-TH')} •{' '}
                    {note.created_by_user?.email || 'Unknown'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTogglePin(note.id, note.is_pinned)}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                    title={note.is_pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
                  >
                    {note.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="ลบ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
