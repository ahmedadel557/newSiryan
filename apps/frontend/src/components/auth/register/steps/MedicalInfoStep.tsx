'use client';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { PatientFields } from '@/components/auth/register/registerTypes';

interface MedicalInfoStepProps {
  register: UseFormRegister<PatientFields>;
  errors: FieldErrors<PatientFields>;
  onNext: () => void;
  onBack: () => void;
}

export default function MedicalInfoStep({
  register: pReg,
  errors,
  onNext,
  onBack,
}: MedicalInfoStepProps) {
  return (
    <div className="reg-fields">
      <div className="reg-grid-2">
        <div className="field">
          <label className="field-label">Date of birth</label>
          <input className="input" type="date" {...pReg('date_of_birth')} />
          {errors.date_of_birth && (
            <p className="auth-field-error">{errors.date_of_birth.message}</p>
          )}
        </div>
        <div className="field">
          <label className="field-label">Gender</label>
          <select className="input select" {...pReg('gender')}>
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {errors.gender && (
            <p className="auth-field-error">{errors.gender.message}</p>
          )}
        </div>
      </div>
      <div className="reg-grid-2">
        <div className="field">
          <label className="field-label">Blood type</label>
          <select className="input select" {...pReg('blood_type')}>
            <option value="">Select…</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors.blood_type && (
            <p className="auth-field-error">{errors.blood_type.message}</p>
          )}
        </div>
        <div className="field">
          <label className="field-label">Insurance provider</label>
          <select className="input select" {...pReg('insurance_provider')}>
            <option value="">Select…</option>
            <option value="NSSF">NSSF</option>
            <option value="Private">Private</option>
            <option value="None">None</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label className="field-label">
          Insurance number{' '}
          <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          className="input"
          type="text"
          placeholder="e.g. NSSF-2024-12345"
          {...pReg('insurance_number')}
        />
      </div>
      <div className="field">
        <label className="field-label">
          Known allergies{' '}
          <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          className="input"
          type="text"
          placeholder="e.g. Penicillin, peanuts"
          {...pReg('allergies')}
        />
      </div>
      <div className="field">
        <label className="field-label">National ID</label>
        <input
          className="input"
          type="text"
          inputMode="numeric"
          maxLength={14}
          placeholder="Enter your 14-digit national ID"
          {...pReg('national_id')}
        />
        {errors.national_id ? (
          <p className="auth-field-error">{errors.national_id.message}</p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
            Kept secure and never shared
          </p>
        )}
      </div>
      <div className="reg-btn-row">
        <button type="button" className="btn btn-ghost-back" onClick={onBack}>
          <ArrowLeft size={14} strokeWidth={2} /> Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="btn btn-primary btn-lg auth-submit auth-submit-dark"
          style={{ flex: 1 }}
        >
          Continue <ArrowRight size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
