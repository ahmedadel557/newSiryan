'use client';

import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import { BudgetGauge } from '@/components/staff/inventory/BudgetGauge';
import { useToast } from '@/hooks/useToast';
import type { BudgetSummary, BudgetHistoryEntry } from '@/types';

const inputClass = 'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function SetBudgetModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (amount: number, month: number, year: number) => Promise<void> }) {
  const now = new Date();
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [year, setYear] = useState(now.getFullYear());
  const [submitting, setSubmitting] = useState(false);

  const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPastMonth) return;
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit(val, month + 1, year);
      onClose();
    } catch {
      /* handled by caller */
    } finally {
      setSubmitting(false);
    }
  }

  const years = [now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[400px] p-6 flex flex-col gap-4">
        <p className="text-[16px] font-semibold text-[var(--fg-1)]">Set Monthly Budget</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inputClass}>
                {MONTHS.map((m, i) => (
                  <option
                    key={i}
                    value={i}
                    disabled={year < now.getFullYear() || (year === now.getFullYear() && i < now.getMonth())}
                  >
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputClass}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          {isPastMonth && (
            <p className="text-[12px] text-[var(--critical-soft-fg)]">Cannot set budget for a past month.</p>
          )}
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Budget amount (EGP) *</label>
            <input type="number" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" required className={inputClass} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={submitting || isPastMonth} className="btn btn-primary flex-1">{submitting ? 'Saving…' : 'Set Budget'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const { showToast } = useToast();
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [history, setHistory] = useState<BudgetHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [setBudgetOpen, setSetBudgetOpen] = useState(false);

  useEffect(() => {
    Promise.all([inventoryService.getBudget(), inventoryService.getBudgetHistory()])
      .then(([b, h]) => { setBudget(b); setHistory(h); })
      .catch(() => showToast('Failed to load budget data', 'error'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSetBudget(amount: number, month: number, year: number) {
    try {
      await inventoryService.setBudget({ amount, month, year });
      const updated = await inventoryService.getBudget();
      setBudget(updated);
      const [updatedHistory] = await Promise.all([inventoryService.getBudgetHistory()]);
      setHistory(updatedHistory);
      showToast('Budget updated', 'success');
    } catch {
      showToast('Failed to set budget', 'error');
      throw new Error('failed');
    }
  }

  const historyReversed = [...history].reverse();
  const maxVal = Math.max(...history.map((h) => Math.max(h.budget, h.spent)), 1);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Budget</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Track monthly inventory spending against budget</p>
        </div>
        <button className="btn btn-primary text-[13px] flex items-center gap-1" onClick={() => setSetBudgetOpen(true)}>
          <DollarSign size={14} /> Set Budget
        </button>
      </div>

      {/* Current Month */}
      <div className="card flex flex-col gap-4 max-w-[520px]">
        <p className="text-[13px] font-semibold text-[var(--fg-1)]">
          {MONTHS[new Date().getMonth()]} {new Date().getFullYear()} Budget
        </p>
        {isLoading ? (
          <div className="h-24 rounded bg-[var(--sand-100)] animate-pulse" />
        ) : budget ? (
          <BudgetGauge budget={budget.budget} spent={budget.spent} percentage={budget.percentage} />
        ) : (
          <div className="flex flex-col gap-2 py-4 text-center">
            <p className="text-[14px] text-[var(--fg-3)]">No budget set for this month</p>
            <button className="btn btn-primary text-[13px] mx-auto" onClick={() => setSetBudgetOpen(true)}>Set budget now</button>
          </div>
        )}
      </div>

      {/* History Chart */}
      <div className="card flex flex-col gap-4">
        <p className="text-[13px] font-semibold text-[var(--fg-1)]">12-Month History</p>
        {history.length === 0 ? (
          <p className="text-[13px] text-[var(--fg-3)] py-8 text-center">No historical data yet</p>
        ) : (
          <>
            <div className="flex gap-4 text-[12px] text-[var(--fg-3)]">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-[2px]" style={{ background: 'var(--brand)' }} /> Budget</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-[2px]" style={{ background: 'var(--caution-soft-fg)' }} /> Actual</span>
            </div>
            <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
              {historyReversed.map((entry) => {
                const budgetH = entry.budget > 0 ? (entry.budget / maxVal) * 100 : 0;
                const spentH = entry.spent > 0 ? (entry.spent / maxVal) * 100 : 0;
                const overBudget = entry.spent > entry.budget && entry.budget > 0;
                return (
                  <div key={`${entry.year}-${entry.month}`} className="flex flex-col items-center gap-1 min-w-[40px]">
                    <div className="flex items-end gap-[3px] h-36">
                      <div
                        title={`Budget: EGP ${entry.budget.toFixed(0)}`}
                        className="w-[14px] rounded-t-[3px] transition-all"
                        style={{ height: `${budgetH}%`, background: 'var(--brand)', opacity: 0.6, minHeight: entry.budget > 0 ? '4px' : '0' }}
                      />
                      <div
                        title={`Spent: EGP ${entry.spent.toFixed(0)}`}
                        className="w-[14px] rounded-t-[3px] transition-all"
                        style={{ height: `${spentH}%`, background: overBudget ? 'var(--critical-soft-fg)' : 'var(--caution-soft-fg)', minHeight: entry.spent > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--fg-3)]">{MONTHS[entry.month - 1]}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[var(--border-1)] pt-3">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Month', 'Budget', 'Spent', 'Remaining'].map((h) => (
                      <th key={h} className="text-[11px] uppercase tracking-wider font-medium text-[var(--fg-3)] text-left py-2 px-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyReversed.map((entry) => (
                    <tr key={`${entry.year}-${entry.month}`} className="hover:bg-[var(--sand-50)]">
                      <td className="py-2 px-3 text-[13px] text-[var(--fg-2)]">{MONTHS[entry.month - 1]} {entry.year}</td>
                      <td className="py-2 px-3 text-[13px] text-[var(--fg-1)]">EGP {entry.budget.toFixed(0)}</td>
                      <td className="py-2 px-3 text-[13px] font-semibold" style={{ color: entry.spent > entry.budget && entry.budget > 0 ? 'var(--critical-soft-fg)' : 'var(--fg-1)' }}>
                        EGP {entry.spent.toFixed(0)}
                      </td>
                      <td className="py-2 px-3 text-[13px] text-[var(--fg-2)]">EGP {Math.max(0, entry.remaining).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {setBudgetOpen && <SetBudgetModal onClose={() => setSetBudgetOpen(false)} onSubmit={handleSetBudget} />}
    </div>
  );
}
