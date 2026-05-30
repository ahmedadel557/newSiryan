import { Stethoscope, Share2 } from 'lucide-react';
import type { MedicalRecord } from '@/types';

interface VisitCardProps {
  record: MedicalRecord;
  onShare?: (id: string) => void;
}

export function VisitCard({ record, onShare }: VisitCardProps) {
  const date = new Date(record.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const doctorLabel =
    typeof record.doctor_id === 'object' && record.doctor_id !== null
      ? `Dr. ${(record.doctor_id as any).username ?? 'Unknown'}`
      : record.doctor_id
      ? `Dr. #${String(record.doctor_id).slice(0, 8)}`
      : 'Doctor unassigned';

  return (
    <li className="flex gap-3 px-5 py-4 border-t border-[var(--border-1)] first:border-t-0 items-start">
      <div className="w-8 h-8 rounded-[8px] bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] flex items-center justify-center shrink-0 mt-[2px]">
        <Stethoscope size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-[var(--fg-1)] leading-snug">
          {record.chief_complaint}
          {record.diagnosis && (
            <span className="text-[var(--fg-3)] font-normal"> — {record.diagnosis}</span>
          )}
        </p>
        <p className="text-[12px] text-[var(--fg-3)] mt-[3px]">
          {doctorLabel} · {date}
        </p>
        {record.notes && (
          <p className="text-[13px] text-[var(--fg-2)] mt-[6px] line-clamp-2">{record.notes}</p>
        )}
      </div>
      {onShare && (
        <button
          onClick={() => onShare(record.id)}
          className="btn btn-ghost text-[12px] flex items-center gap-1 shrink-0"
        >
          <Share2 size={12} /> Share
        </button>
      )}
    </li>
  );
}
