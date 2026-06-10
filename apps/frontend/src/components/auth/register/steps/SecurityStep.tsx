'use client';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Check } from 'lucide-react';
import type { UseFormRegister, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import type { PatientFields } from '@/components/auth/register/registerTypes';
import PasswordInput from '@/components/shared/PasswordInput';
import PasswordStrength from '@/components/auth/shared/PasswordStrength';

interface SecurityStepProps {
  register: UseFormRegister<PatientFields>;
  errors: FieldErrors<PatientFields>;
  handleSubmit: UseFormHandleSubmit<PatientFields>;
  onSubmit: (data: PatientFields) => Promise<void>;
  isSubmitting: boolean;
  apiError: string;
  password: string;
  onBack: () => void;
}

export default function SecurityStep({
  register: pReg,
  errors,
  handleSubmit,
  onSubmit,
  isSubmitting,
  apiError,
  password,
  onBack,
}: SecurityStepProps) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="reg-fields">
      <PasswordInput
        label="Create a password"
        placeholder="••••••••"
        registration={pReg('password')}
        error={errors.password?.message}
        autoComplete="new-password"
      >
        <PasswordStrength password={password} />
      </PasswordInput>
      <PasswordInput
        label="Confirm password"
        placeholder="Re-enter password"
        registration={pReg('confirm_password')}
        error={errors.confirm_password?.message}
        autoComplete="new-password"
      />
      <label className="reg-terms-row">
        <input type="checkbox" {...pReg('terms')} />
        <span>
          I agree to Siryan&apos;s{' '}
          <Link href="/terms">Terms of Service</Link> and{' '}
          <Link href="/privacy">Privacy Policy</Link>
        </span>
      </label>
      {errors.terms && (
        <p className="auth-field-error">{errors.terms.message}</p>
      )}
      {apiError && (
        <div className="reg-err">
          <AlertCircle size={16} strokeWidth={1.75} />
          <span>{apiError}</span>
        </div>
      )}
      <div className="reg-btn-row">
        <button type="button" className="btn btn-ghost-back" onClick={onBack}>
          <ArrowLeft className="rtl:rotate-180" size={14} strokeWidth={2} /> Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary btn-lg auth-submit auth-submit-dark"
          style={{ flex: 1 }}
        >
          <Check size={15} strokeWidth={2.5} />
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </div>
    </form>
  );
}
