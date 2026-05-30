'use client';

import { Check, X, Package, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatEGP } from '@/lib/pricing';
import type { PharmacistPatientOrder } from '@/types';

type BadgeVariant = 'positive' | 'caution' | 'critical' | 'info' | 'neutral' | 'brand';

const STATUS_VARIANT: Record<PharmacistPatientOrder['status'], BadgeVariant> = {
  pending: 'caution',
  approved: 'positive',
  rejected: 'critical',
  dispensed: 'info',
};

interface Props {
  orders: PharmacistPatientOrder[];
  isLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function PatientOrdersTable({ orders, isLoading, onApprove, onReject }: Props) {
  if (isLoading) {
    return (
      <div className="card p-4 flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Package size={20} className="mx-auto text-[var(--fg-4)] mb-2" />
        <p className="text-[13px] text-[var(--fg-3)]">No patient medication orders yet.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] text-left">
            <th className="py-2 px-4 border-b border-[var(--border-1)]">Patient</th>
            <th className="py-2 px-4 border-b border-[var(--border-1)]">Items</th>
            <th className="py-2 px-4 border-b border-[var(--border-1)]">Total</th>
            <th className="py-2 px-4 border-b border-[var(--border-1)]">Status</th>
            <th className="py-2 px-4 border-b border-[var(--border-1)] text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const isPending = o.status === 'pending';
            const needsRx = o.requires_prescription;
            const placedAt = o.created_at ? new Date(o.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
            return (
              <tr key={o.id} className="hover:bg-[var(--bg-sunken)]">
                <td className="py-3 px-4 border-b border-[var(--border-1)] align-top">
                  <div className="text-[14px] font-medium text-[var(--fg-1)]">{o.patient_name ?? 'Patient'}</div>
                  <div className="text-[11px] text-[var(--fg-3)] mt-0.5">{placedAt}</div>
                </td>
                <td className="py-3 px-4 border-b border-[var(--border-1)] align-top">
                  <ul className="flex flex-col gap-0.5 text-[12px] text-[var(--fg-2)]">
                    {o.items.map((it, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span>
                          {it.name} <span className="text-[var(--fg-4)]">× {it.quantity}</span>
                        </span>
                        {it.requires_prescription && (
                          <Badge variant="caution" className="text-[10px] py-0">Rx</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                  {needsRx && !o.has_prescription && (
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[var(--critical-soft-fg)]">
                      <AlertTriangle size={11} /> Missing prescription
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 border-b border-[var(--border-1)] align-top tabular-nums text-[14px] font-medium text-[var(--fg-1)]">
                  {formatEGP(o.total_amount)}
                </td>
                <td className="py-3 px-4 border-b border-[var(--border-1)] align-top">
                  <Badge variant={STATUS_VARIANT[o.status]} dot>
                    {o.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 border-b border-[var(--border-1)] align-top text-right">
                  {isPending ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onApprove(o.id)}
                        className="btn btn-primary text-[12px] py-[5px] px-3 flex items-center gap-1"
                      >
                        <Check size={12} /> Approve
                      </button>
                      <button
                        onClick={() => onReject(o.id)}
                        className="btn btn-secondary text-[12px] py-[5px] px-3 flex items-center gap-1"
                      >
                        <X size={12} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-[12px] text-[var(--fg-4)]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
