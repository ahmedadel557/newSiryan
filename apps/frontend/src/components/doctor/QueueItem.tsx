'use client';

import { Video, ArrowRight } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { getStatusVariant } from '@/lib/statusBadge';
import type { DoctorQueueItem } from '@/types';

const VIDEO_WINDOW_MS = 5 * 60 * 1000;

interface QueueItemProps {
  item: DoctorQueueItem;
  onOpen: (patientId: string) => void;
  onStartVideo: (appointmentId: string) => void;
}

export function QueueItem({ item, onOpen, onStartVideo }: QueueItemProps) {
  const time = new Date(item.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const open = Date.now() >= new Date(item.scheduled_at).getTime() - VIDEO_WINDOW_MS;
  const showVideo = item.type === 'online' && open && !['cancelled', 'completed'].includes(item.status);

  return (
    <div
      onClick={() => onOpen(item.patient_id)}
      className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-[var(--border-1)] last:border-0 cursor-pointer hover:bg-[var(--sand-50)] transition-colors"
    >
      <span className="font-mono text-[12px] text-[var(--fg-3)] w-[56px] sm:w-[64px] shrink-0">{time}</span>
      <Avatar name={item.patient_name} size="sm" />

      {/* Mobile: name + badges stacked; Desktop: name + badges inline */}
      <div className="flex-1 min-w-0 flex flex-col gap-[3px] sm:flex-row sm:items-center sm:gap-3">
        <p className="font-semibold text-[13px] text-[var(--fg-1)] truncate sm:flex-1">{item.patient_name}</p>
        <div className="flex items-center gap-[6px]">
          <Badge variant={item.type === 'online' ? 'info' : 'neutral'}>{item.type}</Badge>
          <Badge variant={getStatusVariant(item.status)} dot>
            {item.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {showVideo && (
        <button
          onClick={(e) => { e.stopPropagation(); onStartVideo(item.appointment_id); }}
          className="btn btn-primary text-[12px] py-[5px] px-3 inline-flex items-center gap-1 shrink-0"
        >
          <Video size={14} />
          <span className="hidden sm:inline">Start video call</span>
          <span className="sm:hidden">Video</span>
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onOpen(item.patient_id); }}
        className="hidden sm:inline-flex rounded-md px-[14px] h-[36px] btn-ghost text-[12px] py-[4px] items-center gap-1 shrink-0"
      >
        Open <ArrowRight size={14} />
      </button>
      <ArrowRight size={14} className="sm:hidden shrink-0 text-[var(--fg-3)]" />
    </div>
  );
}
