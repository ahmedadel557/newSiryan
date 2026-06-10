'use client';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Check } from 'lucide-react';
import type { UseFormRegister, UseFormHandleSubmit, FieldErrors, SubmitHandler } from 'react-hook-form';
import type { StaffFields } from '@/components/auth/register/registerTypes';
import type { UsernameStatus } from '@/components/auth/shared/UsernameField';
import UsernameField from '@/components/auth/shared/UsernameField';
import PasswordInput from '@/components/shared/PasswordInput';
import PasswordStrength from '@/components/auth/shared/PasswordStrength';

interface StaffSecurityStepProps {
  register: UseFormRegister<StaffFields>;
  errors: FieldErrors<StaffFields>;
  handleSubmit: UseFormHandleSubmit<StaffFields>;
  onSubmit: SubmitHandler<StaffFields>;
  isSubmitting: boolean;
  apiError: string;
  password: string;
  usernameStatus: UsernameStatus;
  onBack: () => void;
}

export default function StaffSecurityStep({
  register: sReg,
  errors,
  handleSubmit,
  onSubmit,
  isSubmitting,
  apiError,
  password,
  usernameStatus,
  onBack,
}: StaffSecurityStepProps) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="reg-fields">
      <UsernameField
        registration={sReg('username')}
        status={usernameStatus}
        error={errors.username?.message}
      />
      <PasswordInput
        label="Create a password"
        placeholder="••••••••"
        registration={sReg('password')}
        error={errors.password?.message}
        autoComplete="new-password"
      >
        <PasswordStrength password={password} />
      </PasswordInput>
      <PasswordInput
        label="Confirm password"
        placeholder="Re-enter password"
        registration={sReg('confirm_password')}
        error={errors.confirm_password?.message}
        autoComplete="new-password"
      />
      <label className="reg-terms-row">
        <input type="checkbox" {...sReg('professional_confirm')} />
        <span>I confirm that my professional information is accurate and complete</span>
      </label>
      {errors.professional_confirm && (
        <p className="auth-field-error">{errors.professional_confirm.message}</p>
      )}
      <label className="reg-terms-row">
        <input type="checkbox" {...sReg('terms')} />
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
          disabled={isSubmitting || usernameStatus === 'taken'}
          className="btn btn-primary btn-lg auth-submit auth-submit-dark"
          style={{ flex: 1 }}
        >
          <Check size={15} strokeWidth={2.5} />
          {isSubmitting ? 'Submitting…' : 'Submit request'}
        </button>
      </div>
    </form>
  );
}
