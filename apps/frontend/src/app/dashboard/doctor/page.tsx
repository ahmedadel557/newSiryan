'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctor } from '@/hooks/doctor';
import { useSocketEvent } from '@/hooks/shared';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { DoctorRatingsCard } from '@/components/doctor/DoctorRatingsCard';
import { MyScheduleWidget } from '@/components/shared/MyScheduleWidget';
import { PatientQueueTable } from '@/components/doctor/PatientQueueTable';
import { ActiveAlertsCard } from '@/components/doctor/ActiveAlertsCard';
import { EmergencyAlertBanner } from '@/components/doctor/EmergencyAlertBanner';
import { LabResultBanner } from '@/components/doctor/LabResultBanner';
import { CheckedInBanner } from '@/components/doctor/CheckedInBanner';
import type { EmergencyFlagPayload, LabOrderCompletedPayload, RadiologyOrderCompletedPayload, PatientCheckedInPayload } from '@/types';

type ResultAlert =
  | (LabOrderCompletedPayload & { id: string; kind: 'lab' })
  | (RadiologyOrderCompletedPayload & { id: string; kind: 'radiology' });

export default function DoctorQueuePage() {
  const router = useRouter();
  const { rows, filter, setFilter, searchQuery, setSearchQuery, isLoading, totalToday } = useDoctor();

  const [emergencyAlerts, setEmergencyAlerts] = useState<(EmergencyFlagPayload & { id: string })[]>([]);
  const [resultAlerts, setResultAlerts] = useState<ResultAlert[]>([]);
  const [checkedInAlerts, setCheckedInAlerts] = useState<(PatientCheckedInPayload & { id: string })[]>([]);

  const handleEmergency = useCallback((payload: EmergencyFlagPayload) => {
    setEmergencyAlerts((prev) => [{ ...payload, id: `${Date.now()}-${payload.patientId}` }, ...prev]);
  }, []);

  const handleLabResult = useCallback((payload: LabOrderCompletedPayload) => {
    setResultAlerts((prev) => [{ ...payload, id: `${Date.now()}-${payload.id}`, kind: 'lab' }, ...prev]);
  }, []);

  const handleRadiologyResult = useCallback((payload: RadiologyOrderCompletedPayload) => {
    setResultAlerts((prev) => [{ ...payload, id: `${Date.now()}-${payload.id}`, kind: 'radiology' }, ...prev]);
  }, []);

  const handleCheckedIn = useCallback((payload: PatientCheckedInPayload) => {
    setCheckedInAlerts((prev) => [{ ...payload, id: `${Date.now()}-${payload.patientId}` }, ...prev]);
  }, []);

  useSocketEvent<EmergencyFlagPayload>('emergency:flag', handleEmergency);
  useSocketEvent<LabOrderCompletedPayload>('lab:order:completed', handleLabResult);
  useSocketEvent<RadiologyOrderCompletedPayload>('radiology:order:completed', handleRadiologyResult);
  useSocketEvent<PatientCheckedInPayload>('patient:checked_in', handleCheckedIn);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const todayRows = rows.filter((r) => {
    const d = new Date(r.appointment.scheduled_at).toISOString().slice(0, 10);
    return d === new Date().toISOString().slice(0, 10);
  });
  const awaitingRows = todayRows.filter((r) => r.appointment.status === 'scheduled');
  const pendingLabs = rows.filter((r) => r.appointment.status === 'in_progress');
  const emergencyRows = rows.filter((r) => r.appointment.visit_type === 'online' && r.appointment.status === 'scheduled');

  const kpiCards = [
    { label: 'Scheduled today', value: totalToday },
    { label: 'Awaiting check-in', value: awaitingRows.length },
    { label: 'In progress', value: pendingLabs.length },
    { label: 'Online visits', value: emergencyRows.length, tone: emergencyRows.length > 0 ? ('critical' as const) : undefined },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Real-time emergency banners */}
      {emergencyAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {emergencyAlerts.map((alert) => (
            <EmergencyAlertBanner
              key={alert.id}
              alert={alert}
              onDismiss={() => setEmergencyAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
            />
          ))}
        </div>
      )}

      {/* Real-time lab/radiology result banners */}
      {resultAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {resultAlerts.map((alert) => (
            <LabResultBanner
              key={alert.id}
              alert={alert}
              onDismiss={() => setResultAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
              onView={() => router.push(`/dashboard/doctor/patients/${alert.patient_id}`)}
            />
          ))}
        </div>
      )}

      {/* Real-time patient check-in banners */}
      {checkedInAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {checkedInAlerts.map((alert) => (
            <CheckedInBanner
              key={alert.id}
              alert={alert}
              onDismiss={() => setCheckedInAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
              onView={() => router.push(`/dashboard/doctor/patients/${alert.patientId}`)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">My patients</h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">
            {today} · {totalToday} visits scheduled
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn btn-ghost text-[13px] hidden sm:inline-flex">Filters</button>
          <button className="btn btn-ghost text-[13px] hidden sm:inline-flex">Export</button>
          <button className="btn btn-primary text-[13px]">+ Add visit note</button>
        </div>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <MyScheduleWidget />

      <ActiveAlertsCard />

      <DoctorRatingsCard />

      <PatientQueueTable
        rows={rows}
        filter={filter}
        onFilterChange={setFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenPatient={(patientId) => router.push(`/dashboard/doctor/patients/${patientId}`)}
        isLoading={isLoading}
      />
    </div>
  );
}
