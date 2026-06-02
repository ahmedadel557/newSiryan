'use client';

import { useState } from 'react';
import { StickyNote, Pencil, Trash2, Check, X } from 'lucide-react';
import { useDoctorNotes } from '@/hooks/doctor';
import { Skeleton } from '@/components/ui/Skeleton';

interface NoteEditorProps {
  patientId: string;
  appointmentId?: string;
}

export function NoteEditor({ patientId, appointmentId }: NoteEditorProps) {
  const { notes, isLoading, createNote, updateNote, deleteNote, saving } = useDoctorNotes(patientId);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const handleAdd = async () => {
    const content = draft.trim();
    if (!content) return;
    await createNote(content, appointmentId);
    setDraft('');
  };

  const saveEdit = async (id: string) => {
    const content = editDraft.trim();
    if (content) await updateNote(id, content);
    setEditingId(null);
  };

  const inputClass =
    'w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-1)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]';

  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <StickyNote size={16} style={{ color: 'var(--fg-3)' }} />
        <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Private notes</p>
        <span className="text-[11px] text-[var(--fg-4)]">Only visible to you</span>
      </div>

      <div className="p-5 flex flex-col gap-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a private note about this patient…"
          rows={3}
          className={inputClass}
        />
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={saving || !draft.trim()}
            className="btn btn-primary text-[12px] py-[5px] px-4 disabled:opacity-50"
          >
            Add note
          </button>
        </div>

        {isLoading ? (
          <Skeleton height="48px" className="w-full" />
        ) : notes.length === 0 ? (
          <p className="text-[13px] text-[var(--fg-3)]">No private notes yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-[var(--radius-md)] bg-[var(--sand-50)] p-3">
                {editingId === n.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={2} className={inputClass} />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="btn-ghost text-[12px] py-[3px] px-2 inline-flex items-center gap-1">
                        <X size={13} /> Cancel
                      </button>
                      <button onClick={() => saveEdit(n.id)} className="btn btn-primary text-[12px] py-[3px] px-3 inline-flex items-center gap-1">
                        <Check size={13} /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <p className="text-[13px] text-[var(--fg-1)] flex-1 min-w-0 whitespace-pre-wrap">{n.content}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditingId(n.id); setEditDraft(n.content); }} className="btn-ghost p-1" aria-label="Edit note">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteNote(n.id)} className="btn-ghost p-1" aria-label="Delete note">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-[var(--fg-4)] mt-2">
                  {new Date(n.updated_at || n.created_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
