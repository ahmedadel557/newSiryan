'use client';

import { Receipt } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DailyTransaction } from '@/types';

function fmtLBP(n: number) {
  return n.toLocaleString('en-US') + ' LBP';
}

function fmtTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const METHOD_CHIP: Record<string, string> = {
  cash: 'chip-pos',
  card: 'chip-brand',
  insurance: 'chip-caut',
  mixed: 'chip-neut',
};

interface TodaysTransactionsProps {
  transactions: DailyTransaction[];
  loading: boolean;
  title?: string;
}

export function TodaysTransactions({ transactions, loading, title = "Today's transactions" }: TodaysTransactionsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] font-semibold text-[var(--fg-1)]">{title}</p>
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title="No transactions today"
            description="Payments collected today will appear here."
          />
        ) : (
          <ul className="flex flex-col">
            {transactions.map((t, i) => (
              <li
                key={t._id}
                className="flex items-center gap-3 px-5 py-3"
                style={i > 0 ? { borderTop: '1px solid var(--border-1)' } : undefined}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[var(--fg-1)] truncate">
                    {t.patient_name || 'Unknown patient'}
                  </p>
                  <p className="text-[12px] text-[var(--fg-3)]">{fmtTime(t.paid_at)}</p>
                </div>
                {t.payment_method && (
                  <span className={`chip ${METHOD_CHIP[t.payment_method] ?? 'chip-neut'}`}>
                    {t.payment_method}
                  </span>
                )}
                <p className="text-[14px] font-semibold text-[var(--fg-1)] tabular-nums w-[120px] text-right">
                  {fmtLBP(t.amount_paid)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
