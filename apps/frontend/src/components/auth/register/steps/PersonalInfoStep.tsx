'use client';
import { Mail, Phone, ArrowRight } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { PatientFields } from '@/components/auth/register/registerTypes';
import AuthDivider from '@/components/auth/shared/AuthDivider';
import GoogleIcon from '@/components/auth/shared/GoogleIcon';
import UsernameField from '@/components/auth/shared/UsernameField';
import type { UsernameStatus } from '@/components/auth/shared/UsernameField';

interface PersonalInfoStepProps {
  register: UseFormRegister<PatientFields>;
  errors: FieldErrors<PatientFields>;
  usernameStatus: UsernameStatus;
  onNext: () => void;
}

export default function PersonalInfoStep({
  register: pReg,
  errors,
  usernameStatus,
  onNext,
}: PersonalInfoStepProps) {
  return (
    <div className="reg-fields">
      <div className="reg-grid-2">
        <div className="field">
          <label className="field-label">First name</label>
          <input
            className="input"
            type="text"
            autoComplete="given-name"
            placeholder="Layla"
            {...pReg('first_name')}
          />
          {errors.first_name && (
            <p className="auth-field-error">{errors.first_name.message}</p>
          )}
        </div>
        <div className="field">
          <label className="field-label">Last name</label>
          <input
            className="input"
            type="text"
            autoComplete="family-name"
            placeholder="Karam"
            {...pReg('last_name')}
          />
          {errors.last_name && (
            <p className="auth-field-error">{errors.last_name.message}</p>
          )}
        </div>
      </div>
      <div className="field">
        <label className="field-label">Email</label>
        <div className="auth-input-wrap">
          <Mail size={16} strokeWidth={1.75} />
          <input
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...pReg('email')}
          />
        </div>
        {errors.email && (
          <p className="auth-field-error">{errors.email.message}</p>
        )}
      </div>
      <div className="field">
        <label className="field-label">Phone</label>
        <div className="auth-input-wrap">
          <Phone size={16} strokeWidth={1.75} />
          <input
            className="input"
            type="tel"
            autoComplete="tel"
            placeholder="01xxxxxxxxx"
            maxLength={11}
            {...pReg('phone')}
          />
        </div>
        {errors.phone ? (
          <p className="auth-field-error">{errors.phone.message}</p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
            Egyptian number starting with 010, 011, 012, or 015
          </p>
        )}
      </div>
      <UsernameField
        registration={pReg('username')}
        status={usernameStatus}
        error={errors.username?.message}
      />
      <button
        type="button"
        onClick={onNext}
        className="btn btn-primary btn-lg auth-submit auth-submit-dark"
      >
        Continue <ArrowRight className="rtl:rotate-180" size={15} strokeWidth={2} />
      </button>
      <AuthDivider />
      <button
        type="button"
        className="btn auth-social-btn"
        onClick={() => {
          window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
        }}
      >
        <GoogleIcon />
        Sign up with Google
      </button>
    </div>
  );
}
