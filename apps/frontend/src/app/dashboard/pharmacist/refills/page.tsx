'use client';

import { usePharmacistRefills } from '@/hooks/pharmacist';
import { RefillRequestCard } from '@/components/staff/pharmacist/RefillRequestCard';
import { RejectModal } from '@/components/staff/pharmacist/RejectModal';

export default function PharmacistRefillsPage() {
  const {
    refills,
    loading,
    actionLoading,
    rejectModalId,
    setRejectModalId,
    approve,
    reject,
  } = usePharmacistRefills();

  const pending = refills.filter((r) => r.status === 'pending').length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Refill Requests</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
          {pending} pending · {refills.length} total
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-[120px]" />
          ))}
        </div>
      ) : refills.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-[15px] font-medium text-[var(--fg-2)]">No refill requests</p>
          <p className="text-[13px] text-[var(--fg-3)]">Patient refill requests will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {refills.map((refill) => (
            <RefillRequestCard
              key={refill.id}
              refill={refill}
              actionLoading={actionLoading}
              onApprove={approve}
              onReject={setRejectModalId}
            />
          ))}
        </div>
      )}

      <RejectModal
        id={rejectModalId}
        title="Reject refill request"
        onClose={() => setRejectModalId(null)}
        onConfirm={reject}
      />
    </div>
  );
}
