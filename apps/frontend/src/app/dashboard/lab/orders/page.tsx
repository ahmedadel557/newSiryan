'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useLab } from '@/hooks/useLab';
import { LabOrdersTable } from '@/components/staff/lab/LabOrdersTable';
import { UploadResultsModal } from '@/components/staff/lab/UploadResultsModal';
import type { OrderStatus } from '@/types';

type FilterTab = 'all' | 'pending' | 'in_progress' | 'completed';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export default function LabOrdersPage() {
  const { allOrders, isLoading, uploadOrderId, setUploadOrderId, submitResults, updateStatus } = useLab();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const uploadOrder = allOrders.find((o) => o.id === uploadOrderId) ?? null;

  const filtered = allOrders
    .filter((o) => {
      if (activeTab !== 'all' && o.status !== (activeTab as OrderStatus)) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (o.patient_name ?? o.patient_id ?? '').toLowerCase();
        const test = (o.test_name ?? o.tests_requested?.join(' ') ?? '').toLowerCase();
        if (!name.includes(q) && !test.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const tabCls = (active: boolean) =>
    [
      'px-4 py-[6px] text-[13px] font-medium rounded-[var(--radius-md)] transition-colors',
      active
        ? 'bg-[var(--bg-surface)] text-[var(--fg-1)] shadow-[var(--shadow-sm)]'
        : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]',
    ].join(' ');

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Lab orders</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {isLoading ? 'Loading…' : `${allOrders.length} total orders`}
          </p>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-[var(--sand-100)] p-1 rounded-[var(--radius-md)]">
          {TABS.map(({ key, label }) => (
            <button key={key} className={tabCls(activeTab === key)} onClick={() => setActiveTab(key)}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
          <input
            type="text"
            className="input pl-9 text-[13px] w-full"
            placeholder="Search patient or test name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Orders table */}
      <LabOrdersTable
        orders={filtered}
        isLoading={isLoading}
        onUpload={setUploadOrderId}
        onUpdateStatus={updateStatus}
      />

      {/* Upload modal */}
      <UploadResultsModal
        order={uploadOrder}
        onClose={() => setUploadOrderId(null)}
        onSubmit={submitResults}
      />
    </div>
  );
}
