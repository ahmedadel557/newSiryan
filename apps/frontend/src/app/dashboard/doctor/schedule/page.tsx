'use client';

import { ChevronLeft, ChevronRight, Ban } from 'lucide-react';
import { useDoctorSchedule } from '@/hooks/doctor';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { WeekCalendarGrid } from '@/components/doctor/WeekCalendarGrid';
import { BlockTimeModal } from '@/components/doctor/BlockTimeModal';

export default function DoctorSchedulePage() {
  const {
    appointments,
    patients,
    blockedSlots,
    roomBookings,
    slots,
    weekDays,
    currentWeekStart,
    blockModalOpen,
    setBlockModalOpen,
    prevWeek,
    nextWeek,
    goToday,
    blockTime,
    unblockSlot,
  } = useDoctorSchedule();

  const weekEnd = weekDays[weekDays.length - 1] ?? currentWeekStart;
  const weekLabel = `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const confirmedCount = appointments.filter((a) => a.status === 'confirmed' || a.status === 'scheduled').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const cancelledCount = appointments.filter((a) => a.status === 'cancelled').length;
  const onlineCount = appointments.filter((a) => a.visit_type === 'online').length;

  const kpiCards = [
    { label: 'This week', value: appointments.length },
    { label: 'Confirmed', value: confirmedCount },
    { label: 'Completed', value: completedCount },
    { label: 'Online visits', value: onlineCount },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">My schedule</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {weekLabel} · {appointments.length} appointments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="btn btn-ghost p-[6px]">
            <ChevronLeft size={16} />
          </button>
          <button onClick={goToday} className="btn btn-ghost text-[13px] px-3">
            Today
          </button>
          <button onClick={nextWeek} className="btn btn-ghost p-[6px]">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setBlockModalOpen(true)} className="btn btn-primary text-[13px] flex items-center gap-1">
            <Ban size={14} /> Block time
          </button>
        </div>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <WeekCalendarGrid
        weekDays={weekDays}
        slots={slots}
        appointments={appointments}
        blockedSlots={blockedSlots}
        roomBookings={roomBookings}
        patients={patients}
        onEmptyClick={() => setBlockModalOpen(true)}
        onUnblock={unblockSlot}
      />

      <BlockTimeModal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        weekDays={weekDays}
        slots={slots}
        onBlock={blockTime}
      />
    </div>
  );
}
