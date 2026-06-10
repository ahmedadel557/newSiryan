'use client';
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Badge } from '@/components/ui/Badge';
import type { PharmaMedicationBatch } from '@/types';

const schema = yup.object({
  batch_number: yup.string().min(1).required('Batch number is required'),
  quantity: yup.number().integer().min(1).required('Quantity is required'),
  expiry_date: yup.string().required('Expiry date is required'),
});
type BatchForm = yup.InferType<typeof schema>;

interface Props {
  data: { medicationId: string; medicationName: string; batches: PharmaMedicationBatch[] } | null;
  loading: boolean;
  onClose: () => void;
  onAddBatch: (medicationId: string, data: { batch_number: string; quantity: number; expiry_date: string }) => Promise<void>;
}

export function BatchesModal({ data, loading, onClose, onAddBatch }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BatchForm>({
    resolver: yupResolver(schema),
  });

  if (!data) return null;

  async function onSubmit(values: BatchForm) {
    setSaving(true);
    try {
      await onAddBatch(data!.medicationId, {
        batch_number: values.batch_number,
        quantity: values.quantity,
        expiry_date: new Date(values.expiry_date).toISOString(),
      });
      reset();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    reset();
    setShowForm(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[540px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)] shrink-0">
          <div>
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">{data.medicationName}</p>
            <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">Batch inventory</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm flex items-center gap-1"
              onClick={() => setShowForm((v) => !v)}
            >
              <Plus size={13} />
              Add batch
            </button>
            <button onClick={handleClose} className="btn btn-ghost p-[6px]">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Add batch form */}
        {showForm && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="px-6 py-4 border-b border-[var(--border-1)] flex flex-col gap-3 shrink-0 bg-[var(--bg-page)]"
          >
            <p className="text-[13px] font-medium text-[var(--fg-1)]">New batch</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="field">
                <label className="field-label">Batch number</label>
                <input className="input" placeholder="e.g. BN-2024-001" {...register('batch_number')} />
                {errors.batch_number && <p className="field-help text-[var(--critical)]">{errors.batch_number.message}</p>}
              </div>
              <div className="field">
                <label className="field-label">Quantity</label>
                <input className="input" type="number" min={1} placeholder="e.g. 200" {...register('quantity', { valueAsNumber: true })} />
                {errors.quantity && <p className="field-help text-[var(--critical)]">{errors.quantity.message}</p>}
              </div>
            </div>
            <div className="field">
              <label className="field-label">Expiry date</label>
              <input className="input" type="date" {...register('expiry_date')} />
              {errors.expiry_date && <p className="field-help text-[var(--critical)]">{errors.expiry_date.message}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { reset(); setShowForm(false); }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Saving…' : 'Add batch'}
              </button>
            </div>
          </form>
        )}

        {/* Batches list */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-5 h-5 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
            </div>
          ) : data.batches.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-3)] text-center py-12">No batches found</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="tbl w-full">
              <thead>
                <tr>
                  <th>Batch #</th>
                  <th>Remaining / Total</th>
                  <th>Expiry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="font-mono text-[12px]">{batch.batch_number}</td>
                    <td className="tabular-nums text-[13px]">
                      {batch.quantity_remaining} / {batch.quantity_total}
                    </td>
                    <td className="text-[13px]">{new Date(batch.expiry_date).toLocaleDateString()}</td>
                    <td>
                      <Badge variant={batch.is_active ? 'positive' : 'neutral'}>
                        {batch.is_active ? 'Active' : 'Depleted'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-1)] shrink-0 flex justify-end">
          <button className="btn btn-secondary" onClick={handleClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
