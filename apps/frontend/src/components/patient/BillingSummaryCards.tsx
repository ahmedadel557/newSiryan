import { Clock, CheckCircle, ShieldCheck } from 'lucide-react';

interface BillingSummaryCardsProps {
  totalDue: number;
  totalPaid: number;
}

export function BillingSummaryCards({ totalDue, totalPaid }: BillingSummaryCardsProps) {
  const cards = [
    {
      label: 'Outstanding',
      value: `${totalDue.toLocaleString()} LBP`,
      icon: <Clock size={20} />,
      bg: 'bg-[var(--caution-soft-bg)]',
      fg: 'text-[var(--caution-soft-fg)]',
    },
    {
      label: 'Paid this year',
      value: `${totalPaid.toLocaleString()} LBP`,
      icon: <CheckCircle size={20} />,
      bg: 'bg-[var(--positive-soft-bg)]',
      fg: 'text-[var(--positive-soft-fg)]',
    },
    {
      label: 'Active insurance',
      value: 'CNSS / 50%',
      icon: <ShieldCheck size={20} />,
      bg: 'bg-[var(--brand-soft-bg)]',
      fg: 'text-[var(--brand-soft-fg)]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(({ label, value, icon, bg, fg }) => (
        <div key={label} className="card p-5 flex flex-col gap-3">
          <div className={`w-10 h-10 rounded-[10px] ${bg} ${fg} flex items-center justify-center`}>{icon}</div>
          <div>
            <p className="text-[12px] text-[var(--fg-3)]">{label}</p>
            <p className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-[2px]">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
