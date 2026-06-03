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
      className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border-1)] last:border-0 cursor-pointer hover:bg-[var(--sand-50)] transition-colors"
    >
      <span className="font-mono text-[12px] text-[var(--fg-3)] w-[64px] shrink-0">{time}</span>
      <Avatar name={item.patient_name} size="sm" />
      <p className="font-semibold text-[13px] text-[var(--fg-1)] flex-1 min-w-0 truncate">{item.patient_name}</p>
      <Badge variant={item.type === 'online' ? 'info' : 'neutral'}>{item.type}</Badge>
      <Badge variant={getStatusVariant(item.status)} dot>
        {item.status.replace('_', ' ')}
      </Badge>
      {showVideo && (
        <button
          onClick={(e) => { e.stopPropagation(); onStartVideo(item.appointment_id); }}
          className="btn btn-primary text-[12px] py-[5px] px-3 inline-flex items-center gap-1"
        >
          <Video size={14} /> Start video call
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onOpen(item.patient_id); }}
        className="btn-ghost text-[12px] py-[4px] inline-flex items-center gap-1"
      >
        Open <ArrowRight size={14} />
      </button>
    </div>
  );
}
