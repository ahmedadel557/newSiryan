"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Appointment, AppointmentStatus, MedicalRecord } from "@/types";
import type { BadgeVariant } from "@/components/ui/Badge";

interface VisitSidebarCardProps {
  appointment?: Appointment;
  records: MedicalRecord[];
  quickNote: string;
  onQuickNoteChange: (val: string) => void;
  onSaveNote: (note: string) => void;
  onGoToNotes: () => void;
}

const STATUS_BADGE: Record<AppointmentStatus, { label: string; variant: BadgeVariant }> = {
  confirmed: { label: "Confirmed", variant: "info" },
  in_progress: { label: "In progress", variant: "caution" },
  completed: { label: "Completed", variant: "positive" },
  checked_in: { label: "Checked in", variant: "brand" },
  pending: { label: "Pending", variant: "neutral" },
  scheduled: { label: "Scheduled", variant: "neutral" },
  rescheduled: { label: "Rescheduled", variant: "neutral" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  no_show: { label: "No show", variant: "critical" },
};

export function VisitSidebarCard({
  appointment,
  records,
  quickNote,
  onQuickNoteChange,
  onSaveNote,
  onGoToNotes,
}: VisitSidebarCardProps) {
  const [pastExpanded, setPastExpanded] = useState(false);

  const pastRecords = records.slice(0, pastExpanded ? undefined : 3);
  const hasMore = records.length > 3;

  const statusMeta = appointment?.status
    ? STATUS_BADGE[appointment.status] ?? { label: appointment.status, variant: "neutral" as BadgeVariant }
    : null;

  return (
    <>
      {/* Visit summary */}
      <div className="card p-5">
        <p className="text-[13px] font-semibold text-[var(--fg-1)] mb-3">Visit summary</p>

        {appointment ? (
          <div
            className="grid gap-[6px_12px] text-[13px]"
            style={{ gridTemplateColumns: "90px 1fr" }}
          >
            <span className="text-[var(--fg-3)]">Date</span>
            <span className="text-[var(--fg-1)]">
              {new Date(appointment.scheduled_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>

            <span className="text-[var(--fg-3)]">Reason</span>
            <span className="text-[var(--fg-1)]">{appointment.reason}</span>

            <span className="text-[var(--fg-3)]">Status</span>
            <span>
              {statusMeta && (
                <Badge variant={statusMeta.variant} dot>
                  {statusMeta.label}
                </Badge>
              )}
            </span>

            {appointment.visit_type && (
              <>
                <span className="text-[var(--fg-3)]">Type</span>
                <span className="text-[var(--fg-1)] capitalize">{appointment.visit_type}</span>
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
            onChange={(e) => onQuickNoteChange(e.target.value)}
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-1)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onSaveNote(quickNote); onGoToNotes(); }}
              className="btn btn-secondary text-[12px] py-[4px] px-3 flex-1"
            >
              Save draft
            </button>
            <button
              onClick={() => { onSaveNote(quickNote); onGoToNotes(); }}
              className="btn btn-primary text-[12px] py-[4px] px-3 flex-1"
            >
              Sign &amp; save
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
          <>
            <div className="flex flex-col gap-0">
              {pastRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="flex gap-3 py-2 border-b border-[var(--border-1)] last:border-0"
                >
                  <p className="font-mono text-[11px] text-[var(--fg-3)] shrink-0 pt-[2px]">
                    {new Date(rec.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <div className="flex-1 min-w-0">
                    {rec.chief_complaint && (
                      <p className="text-[12px] font-medium text-[var(--fg-1)] truncate">
                        {rec.chief_complaint}
                      </p>
                    )}
                    {rec.diagnosis && (
                      <p className="text-[11px] text-[var(--fg-3)] truncate mt-[1px]">
                        {rec.diagnosis}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => setPastExpanded((v) => !v)}
                className="btn btn-ghost text-[12px] flex items-center gap-1 mt-2 w-full justify-center"
              >
                {pastExpanded ? (
                  <>
                    <ChevronUp size={13} /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={13} /> Show {records.length - 3} more
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
