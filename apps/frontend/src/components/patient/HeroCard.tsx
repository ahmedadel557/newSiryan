import Link from 'next/link';
import { CalendarPlus, Sparkles } from 'lucide-react';

interface HeroCardProps {
  patientName: string;
  nextAppointment?: {
    date: string;
    doctorName: string;
    type: 'physical' | 'online';
  };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HeroCard({ patientName, nextAppointment }: HeroCardProps) {
  const sub = nextAppointment
    ? `Your next visit is on ${nextAppointment.date} with ${nextAppointment.doctorName}.`
    : 'You have no upcoming visits. Book one below.';

  return (
    <section
      className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between overflow-hidden rounded-[var(--radius-xl)] p-6 md:p-[32px_36px] text-white"
      style={{
        background: 'linear-gradient(135deg, var(--forest-700), var(--forest-900))',
      }}
    >
      {/* Orb glow (replicates ::after) */}
      <div
        className="pointer-events-none absolute right-[-80px] top-[-80px] aspect-square w-[280px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(164,214,221,0.25), transparent 60%)',
        }}
      />

      <div className="relative z-[1] flex flex-col">
        <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[rgba(255,255,255,0.7)]">{getGreeting()}</p>
        <h1 className="my-1 text-[28px] md:text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-white">Hello, {patientName}.</h1>
        <p className="text-[14px] text-[rgba(255,255,255,0.8)] max-w-[50ch]">{sub}</p>
      </div>

      <div className="relative z-[1] flex flex-wrap shrink-0 gap-2 md:flex-nowrap md:gap-[10px]">
        <Link
          href="/dashboard/patient/appointments/new"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-[var(--radius-md)] text-[15px] font-medium bg-[rgba(255,255,255,0.1)] text-[var(--forest-800)] hover:bg-[rgba(255,255,255,0.18)] transition-colors "
        >
          <CalendarPlus size={18} strokeWidth={1.75} />
          Book a visit
        </Link>
        <Link
          href="/dashboard/patient/assistant"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-[var(--radius-md)] text-[15px] font-medium bg-[rgba(255,255,255,0.1)] text-white border border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.18)] transition-colors"
        >
          <Sparkles size={18} strokeWidth={1.75} />
          Ask Siryan Assistant
        </Link>
      </div>
    </section>
  );
}
