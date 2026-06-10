"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCompleteVisit } from "@/hooks/doctor";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { usePatientRecord } from "@/hooks/patient";
import { PatientHeader } from "@/components/doctor/PatientHeader";
import { PatientSummaryCard } from "@/components/doctor/PatientSummaryCard";
import { OverviewTab } from "@/components/doctor/OverviewTab";
import { VitalsTab } from "@/components/doctor/VitalsTab";
import { PrescriptionsTab } from "@/components/doctor/PrescriptionsTab";
import { LabResultsTab } from "@/components/doctor/LabResultsTab";
import { RadiologyTab } from "@/components/doctor/RadiologyTab";
import { NotesTab } from "@/components/doctor/NotesTab";
import { DiagnosisModal } from "@/components/doctor/DiagnosisModal";
import { PrescriptionModal } from "@/components/doctor/PrescriptionModal";
import { LabOrderModal } from "@/components/doctor/LabOrderModal";
import { RadiologyOrderModal } from "@/components/doctor/RadiologyOrderModal";
import { RoomRequestModal } from "@/components/doctor/RoomRequestModal";
import { FollowUpModal } from "@/components/doctor/FollowUpModal";
import { VisitSidebarCard } from "@/components/doctor/VisitSidebarCard";
import type { RecordTab } from "@/hooks/patient";

const TABS: { id: RecordTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "vitals", label: "Vitals" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "labs", label: "Labs" },
  { id: "imaging", label: "Imaging" },
  { id: "notes", label: "Notes" },
];

export default function PatientRecordPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();
  const [quickNote, setQuickNote] = useState<string>("");
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const completeVisitMutation = useCompleteVisit();

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
    <div className="flex flex-col gap-5">
      <button
        onClick={() => router.push("/dashboard/doctor")}
        className="btn btn-ghost text-[13px] flex items-center gap-1 self-start"
      >
        <ArrowLeft className="rtl:rotate-180" size={14} /> Patients
      </button>

      <PatientHeader
        patient={patient}
        appointment={latestAppointment}
        appointmentStatus={latestAppointment?.status}
        onAddDiagnosis={() => setOpenModal("diagnosis")}
        onStartVideo={
          latestAppointment?.visit_type === "online" &&
          !["cancelled", "completed"].includes(latestAppointment.status) &&
          Date.now() >=
            new Date(latestAppointment.scheduled_at).getTime() - 5 * 60 * 1000
            ? () =>
                router.push(
                  `/dashboard/doctor/video/${latestAppointment!.id}`
                )
            : undefined
        }
        onCompleteVisit={
          latestAppointment &&
          ["in_progress", "confirmed"].includes(latestAppointment.status)
            ? () => setShowCompleteConfirm(true)
            : undefined
        }
      />

      {vitalsAlert && (
        <div
          className="card flex items-start gap-3 p-4 border-s-4"
          style={{
            borderInlineStartColor:
              vitalsAlert.severity === "critical"
                ? "var(--critical)"
                : "var(--caution-soft-fg)",
            background:
              vitalsAlert.severity === "critical"
                ? "var(--critical-soft-bg)"
                : "var(--caution-soft-bg)",
          }}
        >
          <TriangleAlert
            size={18}
            className="shrink-0 mt-[2px]"
            style={{
              color:
                vitalsAlert.severity === "critical"
                  ? "var(--critical)"
                  : "var(--caution-soft-fg)",
            }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-semibold"
              style={{
                color:
                  vitalsAlert.severity === "critical"
                    ? "var(--critical)"
                    : "var(--caution-soft-fg)",
              }}
            >
              {vitalsAlert.severity === "critical"
                ? "Critical vitals detected"
                : "Abnormal vitals detected"}
            </p>
            <p className="text-[12px] text-[var(--fg-2)] mt-1">
              {vitalsAlert.abnormalities
                .map((a) => `${a.label} ${a.value}${a.unit} — ${a.message}`)
                .join(" · ")}
            </p>
            <p className="text-[11px] text-[var(--fg-4)] mt-1">
              Received {new Date(vitalsAlert.received_at).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={dismissVitalsAlert}
            className="btn btn-ghost p-1 shrink-0"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <PatientSummaryCard
        patient={patient}
        record={record}
        prescriptions={prescriptions}
      />

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-[var(--border-1)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "btn px-4 py-[10px] text-[13px] font-medium -mb-px transition-colors",
              activeTab === tab.id
                ? "text-[var(--brand)] border-b-2 border-[var(--brand)]"
                : "text-[var(--fg-3)] hover:text-[var(--fg-1)]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 70/30 content grid */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="min-w-0">
          {activeTab === "overview" && (
            <OverviewTab
              record={record}
              prescriptions={prescriptions}
              labs={labs}
              imaging={imaging}
              onNewPrescription={() => setOpenModal("prescription")}
              onNewLab={() => setOpenModal("lab")}
              onNewRadiology={() => setOpenModal("radiology")}
              onRequestRoom={() => setOpenModal("room")}
              onScheduleFollowUp={() => setOpenModal("follow_up")}
            />
          )}
          {activeTab === "vitals" && <VitalsTab vitals={record?.vitals} />}
          {activeTab === "prescriptions" && (
            <PrescriptionsTab
              prescriptions={prescriptions}
              onNew={() => setOpenModal("prescription")}
            />
          )}
          {activeTab === "labs" && (
            <LabResultsTab labs={labs} onNew={() => setOpenModal("lab")} />
          )}
          {activeTab === "imaging" && (
            <RadiologyTab
              imaging={imaging}
              onNew={() => setOpenModal("radiology")}
            />
          )}
          {activeTab === "notes" && (
            <NotesTab
              record={record}
              records={records}
              onSaveNote={saveNote}
              patientId={patientId}
              appointmentId={latestAppointment?.id}
            />
          )}
        </div>

        {/* Sidebar (30%) */}
        <div className="flex flex-col gap-4">
          <VisitSidebarCard
            appointment={latestAppointment}
            records={records}
            quickNote={quickNote}
            onQuickNoteChange={setQuickNote}
            onSaveNote={saveNote}
            onGoToNotes={() => setActiveTab("notes")}
          />
        </div>
      </div>

      {/* Modals */}
      {latestAppointment && (
        <DiagnosisModal
          open={openModal === "diagnosis"}
          onClose={() => setOpenModal(null)}
          appointmentId={latestAppointment.id}
          onSubmit={submitDiagnosis}
        />
      )}
      <PrescriptionModal
        open={openModal === "prescription"}
        onClose={() => setOpenModal(null)}
        medicalRecordId={record?.id ?? ""}
        medications={medications}
        onSubmit={submitPrescription}
      />
      <LabOrderModal
        open={openModal === "lab"}
        onClose={() => setOpenModal(null)}
        medicalRecordId={record?.id ?? ""}
        onSubmit={submitLabOrder}
      />
      <RadiologyOrderModal
        open={openModal === "radiology"}
        onClose={() => setOpenModal(null)}
        medicalRecordId={record?.id ?? ""}
        onSubmit={submitRadiologyOrder}
      />
      <RoomRequestModal
        open={openModal === "room"}
        onClose={() => setOpenModal(null)}
        onSubmit={submitRoomRequest}
      />
      <FollowUpModal
        open={openModal === "follow_up"}
        parentAppointmentId={latestAppointment?.id}
        onClose={() => setOpenModal(null)}
        onSubmit={submitFollowUp}
      />

      {/* Complete Visit Confirmation */}
      <ModalSheet
        open={showCompleteConfirm}
        onOpenChange={setShowCompleteConfirm}
        maxWidth="md:w-[420px]"
      >
        <div className="p-6 flex flex-col gap-4">
          <div>
            <p className="text-[15px] font-semibold text-[var(--fg-1)]">
              Complete this visit?
            </p>
            <p className="text-[13px] text-[var(--fg-3)] mt-1">
              Mark this visit as complete? This will notify the patient.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              className="btn btn-secondary"
              onClick={() => setShowCompleteConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={completeVisitMutation.isPending}
              onClick={() => {
                if (!latestAppointment?.id) return;
                completeVisitMutation.mutate(latestAppointment.id, {
                  onSuccess: () => setShowCompleteConfirm(false),
                });
              }}
            >
              {completeVisitMutation.isPending ? "Completing…" : "Complete Visit"}
            </button>
          </div>
        </div>
      </ModalSheet>
    </div>
  );
}
