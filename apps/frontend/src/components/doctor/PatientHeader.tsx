import { Video, FilePlus, Droplets, Phone, TriangleAlert, CheckCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { Appointment, AppointmentStatus, Profile } from "@/types";

interface PatientHeaderProps {
  patient: Profile;
  appointment?: Appointment;
  onAddDiagnosis: () => void;
  onStartVideo?: () => void;
  onCompleteVisit?: () => void;
  appointmentStatus?: AppointmentStatus;
}

function calcAge(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export function PatientHeader({
  patient,
  appointment: _appointment,
  onAddDiagnosis,
  onStartVideo,
  onCompleteVisit,
  appointmentStatus,
}: PatientHeaderProps) {
  const fullName = `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim();
  const age = patient.date_of_birth ? calcAge(patient.date_of_birth) : null;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={fullName} size="lg" className="shrink-0" />

        <div className="flex-1 min-w-0">
          {/* Name + MR badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] leading-tight m-0">
              {fullName}
            </h1>
            {patient.national_id && (
              <span className="inline-flex items-center px-[10px] py-[3px] bg-[var(--sand-100)] text-[var(--fg-3)] rounded-[var(--radius-pill)] text-[11px] font-mono tracking-[0.02em]">
                MR · {patient.national_id}
              </span>
            )}
          </div>

          {/* Demographics row */}
          <div className="flex flex-wrap items-center gap-2 mt-[6px] text-[13px] text-[var(--fg-2)]">
            {age != null && <span>{age} y/o</span>}
            {patient.gender && <span className="capitalize">{patient.gender}</span>}
            {patient.blood_type && (
              <span className="inline-flex items-center gap-[5px]">
                <Droplets size={13} className="text-[var(--fg-3)]" />
                {patient.blood_type}
              </span>
            )}
            {patient.phone && (
              <span className="inline-flex items-center gap-[5px]">
                <Phone size={13} className="text-[var(--fg-3)]" />
                {patient.phone}
              </span>
            )}
          </div>

          {/* Allergies */}
          {(patient.allergies?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">
                Allergies
              </span>
              {patient.allergies!.map((a) => (
                <Badge key={a} variant="critical">
                  <TriangleAlert size={10} />
                  {a}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto md:shrink-0 md:justify-end md:items-start">
          <button
            onClick={onStartVideo}
            disabled={!onStartVideo}
            className="btn btn-secondary flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Video size={15} />
            Start video visit
          </button>

          {appointmentStatus === "completed" ? (
            <span
              className="btn btn-secondary flex items-center justify-center gap-2 cursor-default select-none w-full md:w-auto"
              style={{
                color: "var(--positive-soft-fg)",
                borderColor: "var(--positive-soft-fg)",
              }}
            >
              <CheckCircle size={15} />
              Visit completed
            </span>
          ) : appointmentStatus === "in_progress" ||
            appointmentStatus === "confirmed" ? (
            <button
              onClick={onCompleteVisit}
              disabled={appointmentStatus !== "in_progress"}
              title={
                appointmentStatus === "confirmed"
                  ? "Waiting for patient check-in"
                  : undefined
              }
              className="btn btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
            >
              <CheckCircle size={15} />
              Complete visit
            </button>
          ) : null}

          <button
            onClick={onAddDiagnosis}
            className="btn btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <FilePlus size={15} />
            Add diagnosis
          </button>
        </div>
      </div>
    </div>
  );
}
