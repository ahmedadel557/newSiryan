'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePatientRecord } from '@/hooks/patient';
import { PatientHeader } from '@/components/doctor/PatientHeader';
import { PatientSummaryCard } from '@/components/doctor/PatientSummaryCard';
import { OverviewTab } from '@/components/doctor/OverviewTab';
import { VitalsTab } from '@/components/doctor/VitalsTab';
import { PrescriptionsTab } from '@/components/doctor/PrescriptionsTab';
import { LabResultsTab } from '@/components/doctor/LabResultsTab';
import { RadiologyTab } from '@/components/doctor/RadiologyTab';
import { NotesTab } from '@/components/doctor/NotesTab';
import { DiagnosisModal } from '@/components/doctor/DiagnosisModal';
import { PrescriptionModal } from '@/components/doctor/PrescriptionModal';
import { LabOrderModal } from '@/components/doctor/LabOrderModal';
import { RadiologyOrderModal } from '@/components/doctor/RadiologyOrderModal';
import { RoomRequestModal } from '@/components/doctor/RoomRequestModal';
import { FollowUpModal } from '@/components/doctor/FollowUpModal';
import type { RecordTab } from '@/hooks/patient';

const TABS: { id: RecordTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'vitals', label: 'Vitals' },
  { id: 'prescriptions', label: 'Prescriptions' },
  { id: 'labs', label: 'Labs' },
  { id: 'imaging', label: 'Imaging' },
  { id: 'notes', label: 'Notes' },
];

export default function PatientRecordPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();
  const [quickNote, setQuickNote] = useState<string>('');

  const {
    patient,
    record,
    records,
    prescriptions,
    labs,
    imaging,
    medications,
    latestAppointment,
    activeTab,
    setActiveTab,
    openModal,
    setOpenModal,
    isLoading,
    submitDiagnosis,
    submitPrescription,
    submitLabOrder,
    submitRadiologyOrder,
    submitRoomRequest,
    submitFollowUp,
    saveNote,
    vitalsAlert,
    dismissVitalsAlert,
  } = usePatientRecord(patientId);

  useEffect(() => {
    if (record?.notes != null) setQuickNote(record.notes);
  }, [record?.notes]);

  if (isLoading || !patient) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-8 w-40 rounded-[var(--radius-md)] bg-[var(--sand-100)] animate-pulse" />
        <div className="card h-32 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => router.push('/dashboard/doctor')} className="btn btn-ghost text-[13px] flex items-center gap-1 self-start">
        <ArrowLeft size={14} /> Patients
      </button>

      <PatientHeader patient={patient} appointment={latestAppointment} onAddDiagnosis={() => setOpenModal('diagnosis')} />

      {vitalsAlert && (
        <div
          className="card flex items-start gap-3 p-4 border-l-4"
          style={{
            borderLeftColor: vitalsAlert.severity === 'critical' ? 'var(--critical)' : 'var(--caution-soft-fg)',
            background: vitalsAlert.severity === 'critical' ? 'var(--critical-soft-bg)' : 'var(--caution-soft-bg)',
          }}
        >
          <TriangleAlert
            size={18}
            className="shrink-0 mt-[2px]"
            style={{ color: vitalsAlert.severity === 'critical' ? 'var(--critical)' : 'var(--caution-soft-fg)' }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-semibold"
              style={{ color: vitalsAlert.severity === 'critical' ? 'var(--critical)' : 'var(--caution-soft-fg)' }}
            >
              {vitalsAlert.severity === 'critical' ? 'Critical vitals detected' : 'Abnormal vitals detected'}
            </p>
            <p className="text-[12px] text-[var(--fg-2)] mt-1">
              {vitalsAlert.abnormalities
                .map((a) => `${a.label} ${a.value}${a.unit} — ${a.message}`)
                .join(' · ')}
            </p>
            <p className="text-[11px] text-[var(--fg-4)] mt-1">
              Received {new Date(vitalsAlert.received_at).toLocaleTimeString()}
            </p>
          </div>
          <button onClick={dismissVitalsAlert} className="btn btn-ghost p-1 shrink-0" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <PatientSummaryCard patient={patient} record={record} prescriptions={prescriptions} />

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-[var(--border-1)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'btn px-4 py-[10px] text-[13px] font-medium -mb-px transition-colors',
              activeTab === tab.id ? 'text-[var(--brand)] border-b-2 border-[var(--brand)]' : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 360px' }}>
        {/* Main content */}
        <div className="min-w-0">
          {activeTab === 'overview' && (
            <OverviewTab
              record={record}
              prescriptions={prescriptions}
              labs={labs}
              imaging={imaging}
              onNewPrescription={() => setOpenModal('prescription')}
              onNewLab={() => setOpenModal('lab')}
              onNewRadiology={() => setOpenModal('radiology')}
              onRequestRoom={() => setOpenModal('room')}
              onScheduleFollowUp={() => setOpenModal('follow_up')}
            />
          )}
          {activeTab === 'vitals' && <VitalsTab vitals={record?.vitals} />}
          {activeTab === 'prescriptions' && <PrescriptionsTab prescriptions={prescriptions} onNew={() => setOpenModal('prescription')} />}
          {activeTab === 'labs' && <LabResultsTab labs={labs} onNew={() => setOpenModal('lab')} />}
          {activeTab === 'imaging' && <RadiologyTab imaging={imaging} onNew={() => setOpenModal('radiology')} />}
          {activeTab === 'notes' && (
            <NotesTab
              record={record}
              records={records}
              onSaveNote={saveNote}
              patientId={patientId}
              appointmentId={latestAppointment?.id}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Visit summary */}
          <div className="card p-5">
            <p className="text-[13px] font-semibold text-[var(--fg-1)] mb-3">Visit summary</p>
            {latestAppointment ? (
              <div className="grid gap-[6px_12px] text-[13px]" style={{ gridTemplateColumns: '90px 1fr' }}>
                <span className="text-[var(--fg-3)]">Date</span>
                <span className="text-[var(--fg-1)]">
                  {new Date(latestAppointment.scheduled_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-[var(--fg-3)]">Reason</span>
                <span className="text-[var(--fg-1)]">{latestAppointment.reason}</span>
                <span className="text-[var(--fg-3)]">Status</span>
                <span className="text-[var(--fg-1)] capitalize">{latestAppointment.status.replace('_', ' ')}</span>
                {latestAppointment.visit_type && (
                  <>
                    <span className="text-[var(--fg-3)]">Type</span>
                    <span className="text-[var(--fg-1)] capitalize">{latestAppointment.visit_type}</span>
                  </>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--fg-3)]">No active appointment.</p>
            )}

            <div className="border-t border-[var(--border-1)] mt-4 pt-4 flex flex-col gap-2">
              <textarea
                placeholder="Quick note…"
                rows={3}
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-1)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { saveNote(quickNote); setActiveTab('notes'); }}
                  className="btn btn-secondary text-[12px] py-[4px] px-3 flex-1"
                >
                  Save draft
                </button>
                <button
                  onClick={() => { saveNote(quickNote); setActiveTab('notes'); }}
                  className="btn btn-primary text-[12px] py-[4px] px-3 flex-1"
                >
                  Sign & save
                </button>
              </div>
            </div>
          </div>

          {/* Past visits */}
          <div className="card p-5">
            <p className="text-[13px] font-semibold text-[var(--fg-1)] mb-3">Past visits</p>
            {records.length === 0 ? (
              <p className="text-[13px] text-[var(--fg-3)]">No past visits on record.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {records.slice(0, 5).map((rec) => (
                  <div key={rec.id} className="flex gap-3 py-2 border-b border-[var(--border-1)] last:border-0">
                    <p className="font-mono text-[11px] text-[var(--fg-3)] shrink-0 pt-[2px]">
                      {new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <div className="flex-1 min-w-0">
                      {rec.chief_complaint && <p className="text-[12px] font-medium text-[var(--fg-1)] truncate">{rec.chief_complaint}</p>}
                      {rec.diagnosis && <p className="text-[11px] text-[var(--fg-3)] truncate mt-[1px]">{rec.diagnosis}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {latestAppointment && (
        <DiagnosisModal
          open={openModal === 'diagnosis'}
          onClose={() => setOpenModal(null)}
          appointmentId={latestAppointment.id}
          onSubmit={submitDiagnosis}
        />
      )}
      <PrescriptionModal
        open={openModal === 'prescription'}
        onClose={() => setOpenModal(null)}
        medicalRecordId={record?.id ?? ''}
        medications={medications}
        onSubmit={submitPrescription}
      />
      <LabOrderModal open={openModal === 'lab'} onClose={() => setOpenModal(null)} medicalRecordId={record?.id ?? ''} onSubmit={submitLabOrder} />
      <RadiologyOrderModal
        open={openModal === 'radiology'}
        onClose={() => setOpenModal(null)}
        medicalRecordId={record?.id ?? ''}
        onSubmit={submitRadiologyOrder}
      />
      <RoomRequestModal
        open={openModal === 'room'}
        onClose={() => setOpenModal(null)}
        onSubmit={submitRoomRequest}
      />
      <FollowUpModal
        open={openModal === 'follow_up'}
        parentAppointmentId={latestAppointment?.id}
        onClose={() => setOpenModal(null)}
        onSubmit={submitFollowUp}
      />
    </div>
  );
}
