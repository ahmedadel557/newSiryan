"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import type { DoctorAvailability } from "@/types";

interface DoctorStepProps {
  doctors: DoctorAvailability[];
  selectedDoctorId: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function DoctorStep({
  doctors,
  selectedDoctorId,
  onSelect,
  isLoading,
  onNext,
  onBack,
}: DoctorStepProps) {
  const [activeSpec, setActiveSpec] = useState<string>("All");

  const specializations = [
    "All",
    ...[
      ...new Set(
        doctors
          .map((d) => d.specialization ?? d.specialty)
          .filter(Boolean) as string[],
      ),
    ],
  ];

  const displayed =
    activeSpec === "All"
      ? doctors
      : doctors.filter((d) => (d.specialization ?? d.specialty) === activeSpec);

  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white font-mono text-[12px] font-semibold flex items-center justify-center">
          2
        </span>
        <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">
          Choose a doctor
        </h2>
      </div>

      {!isLoading && specializations.length > 1 && (
        <div
          className="
      flex
      gap-2
      overflow-x-auto
      pb-1
      -mx-1
      px-1
      whitespace-nowrap
      touch-pan-x
      scroll-smooth
      cursor-grab
      active:cursor-grabbing
    "
          onWheel={(e) => {
            e.currentTarget.scrollLeft += e.deltaY;
          }}
        >
          {!isLoading && specializations.length > 1 && (
            <div
              className="
      flex
      gap-2
      overflow-x-auto
      pb-1
      -mx-1
      px-1
      whitespace-nowrap
      touch-pan-x
      scroll-smooth
      cursor-grab
      active:cursor-grabbing
    "
              onWheel={(e) => {
                e.currentTarget.scrollLeft += e.deltaY;
              }}
            >
              {specializations.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setActiveSpec(spec)}
                  className={`btn shrink-0 px-3 py-[5px] rounded-full border text-[12px] font-medium transition-colors ${
                    activeSpec === spec
                      ? "bg-[var(--brand)] border-[var(--brand)] text-white"
                      : "border-[var(--border-1)] text-[var(--fg-2)] hover:border-[var(--brand)]"
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-[72px] rounded-[var(--radius-md)]"
              />
            ))
          : displayed.map((d) => {
              const isSelected = d.id === selectedDoctorId;
              const spec = d.specialization ?? d.specialty;
              return (
                <button
                  key={d.id}
                  onClick={() => onSelect(d.id)}
                  className={` flex items-center gap-[14px] px-[14px] py-3 border rounded-[var(--radius-md)] cursor-pointer transition-colors text-left w-full ${
                    isSelected
                      ? "border-[var(--brand)] bg-[var(--brand-soft-bg)]"
                      : "border-[var(--border-1)] hover:bg-[var(--sand-50)] dark:hover:bg-[var(--forest-900)]"
                  }`}
                >
                  <Avatar name={d.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--fg-1)]">
                      {d.name}
                    </p>
                    <p className="text-[12px] text-[var(--fg-3)]">{spec}</p>
                    {d.department && (
                      <p className="text-[11px] text-[var(--fg-4)] mt-[1px]">
                        {d.department}
                      </p>
                    )}
                  </div>
                  {d.next_available && (
                    <div className="hidden sm:block text-right shrink-0 mr-2">
                      <p className="text-[11px] text-[var(--fg-3)]">
                        Next available
                      </p>
                      <p className="text-[12px] font-medium text-[var(--fg-2)]">
                        {d.next_available}
                      </p>
                    </div>
                  )}
                  <div
                    className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-[var(--brand)] border-[var(--brand)] text-white"
                        : "border-[var(--border-2)]"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="btn btn-ghost">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedDoctorId}
          className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
