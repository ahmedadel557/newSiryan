import { CheckCircle, XCircle, Truck, FileText, Clock } from 'lucide-react';
import type { PharmacyOrderFull } from '@/types';

const statusChip: Record<string, string> = {
  pending: 'chip chip-caut',
  approved: 'chip chip-pos',
  rejected: 'chip chip-crit',
  dispensed: 'chip chip-neut',
};

const DELIVERY_STAGES = ['preparing', 'dispatched', 'delivered'] as const;

interface Props {
  order: PharmacyOrderFull;
  actionLoading: string | null;
  onApproveOtc: (id: string) => void;
  onApprovePrescription: (order: PharmacyOrderFull) => void;
  onReject: (order: PharmacyOrderFull) => void;
  onUpdateDelivery?: (id: string, status: 'preparing' | 'dispatched' | 'delivered') => void;
}

export function OrderCard({ order, actionLoading, onApproveOtc, onApprovePrescription, onReject, onUpdateDelivery }: Props) {
  const isLoading = actionLoading === order.id;
  const isPrescription = order.order_type === 'prescription';
  const isDelivery = order.delivery_type === 'delivery';
  const canTrackDelivery = isDelivery && (order.status === 'approved' || order.status === 'dispensed');

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-semibold text-[var(--fg-1)]">
              {order.patient_name ?? 'Unknown patient'}
            </p>
            <span className={statusChip[order.status] ?? 'chip chip-neut'}>{order.status}</span>
            <span className={`chip ${isPrescription ? 'chip-info' : 'chip-neut'}`}>
              {isPrescription ? 'Prescription' : 'OTC'}
            </span>
            {order.delivery_type === 'delivery' && (
              <span className="chip chip-brand flex items-center gap-1">
                <Truck size={10} /> Delivery
              </span>
            )}
          </div>
          <p className="text-[12px] text-[var(--fg-3)] mt-1">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[15px] font-semibold text-[var(--fg-1)] tabular-nums">
            EGP {order.total_amount.toLocaleString()}
          </p>
          {(order.discount_applied ?? 0) > 0 && (
            <p className="text-[11px] text-[var(--positive-soft-fg)]">
              −EGP {order.discount_applied?.toLocaleString()} insurance
            </p>
          )}
        </div>
      </div>

      {/* Prescription badge */}
      {isPrescription && (
        <div className="flex items-center gap-2 text-[12px] text-[var(--positive-soft-fg)]">
          <CheckCircle size={13} />
          Prescription order
        </div>
      )}

      {/* Delivery status */}
      {order.delivery_type === 'delivery' && order.delivery_status && (
        <div className="flex items-center gap-2 text-[12px] text-[var(--fg-3)]">
          <Clock size={13} />
          Delivery: <span className="font-medium text-[var(--fg-2)]">{order.delivery_status}</span>
          {order.estimated_delivery_time && (
            <span>· ETA {new Date(order.estimated_delivery_time).toLocaleString()}</span>
          )}
        </div>
      )}

      {/* Medications */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] font-medium">Medications</p>
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-[var(--fg-2)]">
              {item.medication_name ?? 'Medication'}{' '}
              {item.requires_prescription && (
                <span className="text-[11px] text-[var(--caution)]">
                  <FileText size={10} className="inline" /> Rx required
                </span>
              )}
            </span>
            <span className="text-[var(--fg-3)] tabular-nums">
              ×{item.quantity} · EGP {item.price.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {order.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <button
            className="btn btn-primary btn-sm flex items-center gap-1"
            onClick={() => isPrescription ? onApprovePrescription(order) : onApproveOtc(order.id)}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <CheckCircle size={13} />
            )}
            Approve
          </button>
          <button
            className="btn btn-ghost btn-sm flex items-center gap-1"
            style={{ color: 'var(--critical)', fontSize: 13 }}
            onClick={() => onReject(order)}
            disabled={isLoading}
          >
            <XCircle size={13} />
            Reject
          </button>
        </div>
      )}

      {order.status === 'rejected' && order.rejection_reason && (
        <p className="text-[12px] text-[var(--critical-soft-fg)] bg-[var(--critical-soft-bg)] rounded-[var(--radius-sm)] px-3 py-2">
          Reason: {order.rejection_reason}
        </p>
      )}

      {/* Delivery tracking controls */}
      {canTrackDelivery && onUpdateDelivery && (
        <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border-1)]">
          <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] font-medium">Update delivery</p>
          <div className="flex gap-2">
            {DELIVERY_STAGES.map((stage) => (
              <button
                key={stage}
                className={`btn btn-sm flex items-center gap-1 ${order.delivery_status === stage ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 12, textTransform: 'capitalize' }}
                onClick={() => onUpdateDelivery(order.id, stage)}
                disabled={isLoading || order.delivery_status === stage}
              >
                <Truck size={11} />
                {stage}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
