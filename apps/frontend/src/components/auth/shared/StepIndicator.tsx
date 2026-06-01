'use client';
import { Check } from 'lucide-react';

export interface StepDef {
  n: number;
  label: string;
}

interface StepIndicatorProps {
  steps: StepDef[];
  currentStep: number;
}

function circleClass(stepN: number, currentStep: number): string {
  if (stepN < currentStep) return 'done';
  if (stepN === currentStep) return 'current';
  return 'upcoming';
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="reg-steps">
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: 'contents' }}>
          <div className="reg-step-wrap">
            <div className={`reg-step-circle ${circleClass(s.n, currentStep)}`}>
              {s.n < currentStep ? <Check size={13} strokeWidth={2.5} /> : s.n}
            </div>
            <span className={`reg-step-label ${circleClass(s.n, currentStep)}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`reg-step-line ${s.n < currentStep ? 'done' : 'upcoming'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
