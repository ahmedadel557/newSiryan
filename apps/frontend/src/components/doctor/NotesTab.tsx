'use client';

import { useState } from 'react';
import { FileText, Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { NoteEditor } from './NoteEditor';
import type { MedicalRecord } from '@/types';

interface NotesTabProps {
  record: MedicalRecord | null;
  records: MedicalRecord[];
  onSaveNote: (notes: string) => void;
  patientId: string;
  appointmentId?: string;
}

export function NotesTab({ record, records, onSaveNote, patientId, appointmentId }: NotesTabProps) {
  const [draft, setDraft] = useState(record?.notes ?? '');

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
          <FileText size={16} style={{ color: 'var(--fg-3)' }} />
          <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Clinical notes</p>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add clinical notes for this visit…"
            rows={6}
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-1)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-0"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => onSaveNote(draft)} className="btn-secondary text-[12px] py-[4px] px-3">
              Save draft
            </button>
            <button onClick={() => onSaveNote(draft)} className="btn-primary text-[12px] py-[4px] px-3">
              Sign & save
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
          <Clock size={16} style={{ color: 'var(--fg-3)' }} />
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">Past visits</p>
        </div>

        {records.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Clock />} title="No past visits" description="No previous visit records found for this patient." />
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-4">
            {records.map((rec) => (
              <div key={rec.id} className="p-3 rounded-[var(--radius-md)] bg-[var(--sand-50)] flex gap-3">
                <p className="font-mono text-[11px] text-[var(--fg-3)] shrink-0 pt-[2px]">
                  {new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <div className="flex-1 min-w-0">
                  {rec.chief_complaint && <p className="text-[13px] font-medium text-[var(--fg-1)] truncate">{rec.chief_complaint}</p>}
                  {rec.diagnosis && <p className="text-[12px] text-[var(--fg-2)] truncate mt-[2px]">{rec.diagnosis}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NoteEditor patientId={patientId} appointmentId={appointmentId} />
    </div>
  );
}
