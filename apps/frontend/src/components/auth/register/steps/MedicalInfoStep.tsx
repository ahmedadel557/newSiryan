'use client';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { PatientFields } from '@/components/auth/register/registerTypes';

const today = new Date().toISOString().split('T')[0];

interface MedicalInfoStepProps {
  register: UseFormRegister<PatientFields>;
  errors: FieldErrors<PatientFields>;
  onNext: () => void;
  onBack: () => void;
  onNidBlur?: (value: string) => void;
  nationalId?: string;
  dobHint?: string;
  providers?: { id: string; name: string }[];
  providersLoading?: boolean;
  providersError?: boolean;
}

export default function MedicalInfoStep({
  register: pReg,
  errors,
  onNext,
  onBack,
  onNidBlur,
  nationalId = '',
  dobHint,
  providers = [],
  providersLoading = false,
  providersError = false,
}: MedicalInfoStepProps) {
  const { onBlur: rhfNidBlur, ...nidReg } = pReg('national_id');

  return (
    <div className="reg-fields">
      <div className="reg-grid-2">
        <div className="field">
          <label className="field-label">Date of birth</label>
          <input
            className="input"
            type="date"
            min="1900-01-01"
            max={today}
            {...pReg('date_of_birth')}
          />
          {dobHint && !errors.date_of_birth && (
            <p style={{ fontSize: 12, color: 'var(--positive)', marginTop: 4 }}>Date of birth extracted from national ID</p>
          )}
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
          <select
            className="input select"
            disabled={providersLoading}
            {...pReg('insurance_provider')}
          >
            {providersLoading && <option value="">Loading…</option>}
            {!providersLoading && providersError && (
              <option value="" disabled>Could not load insurance providers</option>
            )}
            {!providersLoading && !providersError && (
              <option value="">Select…</option>
            )}
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <label className="field-label" style={{ marginBottom: 0 }}>National ID</label>
          <span style={{ fontSize: 11, color: nationalId.length === 14 ? 'var(--positive)' : 'var(--fg-3)' }}>
            {nationalId.length}/14
          </span>
        </div>
        <input
          className="input"
          type="text"
          inputMode="numeric"
          maxLength={14}
          placeholder="Enter your 14-digit national ID"
          {...nidReg}
          onBlur={(e) => {
            rhfNidBlur(e);
            onNidBlur?.(e.target.value);
          }}
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
          <ArrowLeft className="rtl:rotate-180" size={14} strokeWidth={2} /> Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="btn btn-primary btn-lg auth-submit auth-submit-dark"
          style={{ flex: 1 }}
        >
          Continue <ArrowRight className="rtl:rotate-180" size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
