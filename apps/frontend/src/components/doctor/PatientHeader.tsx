import { Video, FilePlus, Droplets, Phone, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { Appointment, Profile } from "@/types";

interface PatientHeaderProps {
  patient: Profile;
  appointment?: Appointment;
  onAddDiagnosis: () => void;
  onStartVideo?: () => void;
}

function calcAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function PatientHeader({
  patient,
  appointment,
  onAddDiagnosis,
  onStartVideo,
}: PatientHeaderProps) {
  const fullName =
    `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim();
  const age = patient.date_of_birth ? calcAge(patient.date_of_birth) : null;

  return (
    <div className="card flex items-start gap-[18px] p-[20px_22px]">
      <Avatar name={fullName} size="lg" className="h-12 w-12 shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] m-0">
            {fullName}
          </h1>
          <span className="inline-flex items-center px-[10px] py-[3px] bg-[var(--sand-100)] text-[var(--fg-2)] rounded-full text-[12px] font-mono">
            {patient.national_id}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 mt-2 text-[13px] text-[var(--fg-2)]">
          <span>
            {age != null ? `${age} y/o · ` : ""}
            {patient.gender}
          </span>
          <span className="inline-flex items-center gap-[6px]">
            <Droplets size={14} className="text-[var(--fg-3)]" />
            Blood {patient.blood_type}
          </span>
          <span className="inline-flex items-center gap-[6px]">
            <Phone size={14} className="text-[var(--fg-3)]" />
            {patient.phone}
          </span>
        </div>

        {(patient.allergies?.length ?? 0) > 0 && (
          <div className="flex items-center gap-2 mt-[10px] flex-wrap">
            <span className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">
              Allergies
            </span>
            {patient.allergies!.map((allergy) => (
              <Badge key={allergy} variant="critical">
                <TriangleAlert size={11} />
                {allergy}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={onStartVideo}
          disabled={!onStartVideo}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Video size={15} />
          Start video visit
        </button>
        <button
          onClick={onAddDiagnosis}
          className="btn btn-primary flex items-center gap-2"
        >
          <FilePlus size={15} />
          Add diagnosis
        </button>
      </div>
    </div>
  );
}
