'use client';
import { Phone } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { FormValues } from './CompleteProfileForm';

interface ProfilePersonalFieldsProps {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
}

export default function ProfilePersonalFields({ register: reg, errors }: ProfilePersonalFieldsProps) {
  return (
    <>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--fg-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        Personal
      </p>

      <div className="reg-grid-2">
        <div className="field">
          <label className="field-label">First name</label>
          <input className="input" type="text" autoComplete="given-name" placeholder="Layla" {...reg('first_name')} />
          {errors.first_name && <p className="auth-field-error">{errors.first_name.message}</p>}
        </div>
        <div className="field">
          <label className="field-label">Last name</label>
          <input className="input" type="text" autoComplete="family-name" placeholder="Karam" {...reg('last_name')} />
          {errors.last_name && <p className="auth-field-error">{errors.last_name.message}</p>}
        </div>
      </div>

      <div className="reg-grid-2">
        <div className="field">
          <label className="field-label">Date of birth</label>
          <input className="input" type="date" {...reg('date_of_birth')} />
          {errors.date_of_birth && <p className="auth-field-error">{errors.date_of_birth.message}</p>}
        </div>
        <div className="field">
          <label className="field-label">Gender</label>
          <select className="input select" {...reg('gender')}>
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {errors.gender && <p className="auth-field-error">{errors.gender.message}</p>}
        </div>
      </div>

      <div className="field">
        <label className="field-label">Phone</label>
        <div className="auth-input-wrap">
          <Phone size={16} strokeWidth={1.75} />
          <input className="input" type="tel" autoComplete="tel" placeholder="01xxxxxxxxx" maxLength={11} {...reg('phone')} />
        </div>
        {errors.phone ? (
          <p className="auth-field-error">{errors.phone.message}</p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>Egyptian number starting with 010, 011, 012, or 015</p>
        )}
      </div>

      <div className="field">
        <label className="field-label">
          Blood type <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>(optional)</span>
        </label>
        <select className="input select" {...reg('blood_type')}>
          <option value="">Select…</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label">National ID</label>
        <input
          className="input"
          type="text"
          inputMode="numeric"
          maxLength={14}
          placeholder="Enter your 14-digit national ID"
          {...reg('national_id')}
        />
        {errors.national_id ? (
          <p className="auth-field-error">{errors.national_id.message}</p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>Kept secure and never shared</p>
        )}
      </div>
    </>
  );
}
