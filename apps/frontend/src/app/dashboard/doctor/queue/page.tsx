'use client';

import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { useDoctorQueue } from '@/hooks/doctor';
import { QueueItem } from '@/components/doctor/QueueItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DoctorQueuePage() {
  const router = useRouter();
  const { queue, isLoading } = useDoctorQueue();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Today&rsquo;s queue</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
          {today} · {queue.length} appointments
        </p>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-5 flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height="44px" className="w-full" />
            ))}
          </div>
        ) : queue.length === 0 ? (
          <EmptyState icon={<ClipboardList />} title="No appointments today" description="Your queue is clear for the day." />
        ) : (
          queue.map((item) => (
            <QueueItem
              key={item.appointment_id}
              item={item}
              onOpen={(patientId) => router.push(`/dashboard/doctor/patients/${patientId}`)}
              onStartVideo={(appointmentId) => router.push(`/dashboard/doctor/video/${appointmentId}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
