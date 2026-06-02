'use client';

import { usePharmacistOrders } from '@/hooks/pharmacist';
import { OrderCard } from '@/components/staff/pharmacist/OrderCard';
import { DrugInteractionModal } from '@/components/staff/pharmacist/DrugInteractionModal';
import { SubstitutionModal } from '@/components/staff/pharmacist/SubstitutionModal';
import { RejectModal } from '@/components/staff/pharmacist/RejectModal';
import type { OrderStatusFilter, OrderTypeFilter } from '@/hooks/pharmacist';

const STATUS_TABS: { id: OrderStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const TYPE_TABS: { id: OrderTypeFilter; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'prescription', label: 'Prescription' },
  { id: 'otc', label: 'OTC' },
];

const tabBase = 'px-3 py-[6px] text-[13px] font-medium rounded-[var(--radius-sm)] transition-colors';
const tabActive = `${tabBase} bg-[var(--brand)] text-white`;
const tabInactive = `${tabBase} text-[var(--fg-2)] hover:bg-[var(--bg-page)]`;

export default function PharmacistOrdersPage() {
  const {
    orders,
    loading,
    actionLoading,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    interactionCheck,
    setInteractionCheck,
    rejectModalId,
    setRejectModalId,
    substitutes,
    setSubstitutes,
    handleApproveOtc,
    handleApprovePrescription,
    confirmApprovePrescription,
    handleRejectClick,
    proceedToRejectFromSubstitution,
    handleReject,
    handleUpdateDelivery,
  } = usePharmacistOrders();

  const pending = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Orders</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {pending} pending · {orders.length} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-page)] rounded-[var(--radius-md)]">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              className={statusFilter === tab.id ? tabActive : tabInactive}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type sub-filter */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-page)] rounded-[var(--radius-md)]">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              className={typeFilter === tab.id ? tabActive : tabInactive}
              onClick={() => setTypeFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-[160px]" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-[15px] font-medium text-[var(--fg-2)]">No orders found</p>
          <p className="text-[13px] text-[var(--fg-3)]">Try adjusting the filters above</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              actionLoading={actionLoading}
              onApproveOtc={handleApproveOtc}
              onApprovePrescription={handleApprovePrescription}
              onReject={handleRejectClick}
              onUpdateDelivery={handleUpdateDelivery}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <DrugInteractionModal
        check={interactionCheck}
        onClose={() => setInteractionCheck(null)}
        onApproveAnyway={confirmApprovePrescription}
      />

      <SubstitutionModal
        data={substitutes}
        onClose={() => setSubstitutes(null)}
        onProceedToReject={proceedToRejectFromSubstitution}
      />

      <RejectModal
        id={rejectModalId}
        title="Reject order"
        onClose={() => setRejectModalId(null)}
        onConfirm={handleReject}
      />
    </div>
  );
}
