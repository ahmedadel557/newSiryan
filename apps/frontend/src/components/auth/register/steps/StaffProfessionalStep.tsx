'use client';
import { Mail, Phone, ArrowRight, Building2 } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { StaffFields } from '@/components/auth/register/registerTypes';
import { STAFF_ROLES } from '@/components/auth/register/registerTypes';
import type { Department } from '@/types';

interface StaffProfessionalStepProps {
  register: UseFormRegister<StaffFields>;
  errors: FieldErrors<StaffFields>;
  role: string;
  departments: Department[];
  departmentsLoading?: boolean;
  selectedDepartment: string;
  availableSpecializations: string[];
  nationalId?: string;
  onNext: () => void;
}

export default function StaffProfessionalStep({
  register: sReg,
  errors,
  role,
  departments,
  departmentsLoading = false,
  selectedDepartment,
  availableSpecializations,
  nationalId = '',
  onNext,
}: StaffProfessionalStepProps) {
  return (
    <div className="reg-fields">
      <div className="reg-grid-2">
        <div className="field">
          <label className="field-label">First name</label>
          <input
            className="input"
            type="text"
            autoComplete="given-name"
            placeholder="Ahmed"
            {...sReg('first_name')}
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
            placeholder="Khalil"
            {...sReg('last_name')}
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
            {...sReg('email')}
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
            {...sReg('phone')}
          />
        </div>
        {errors.phone && (
          <p className="auth-field-error">{errors.phone.message}</p>
        )}
      </div>
      <div className="reg-grid-2">
        <div className="field">
          <label className="field-label">Role</label>
          <select className="input select" {...sReg('role')}>
            <option value="">Select role…</option>
            {STAFF_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {errors.role && (
            <p className="auth-field-error">{errors.role.message}</p>
          )}
        </div>
        <div className="field">
          <label className="field-label">Department</label>
          <div className="auth-input-wrap">
            <Building2 size={16} strokeWidth={1.75} />
            <select className="input" {...sReg('department')} disabled={!role || departmentsLoading}>
              <option value="">
                {!role
                  ? 'Select a role first'
                  : departmentsLoading
                    ? 'Loading departments…'
                    : departments.length === 0
                      ? 'No departments for this role'
                      : 'Select department…'}
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          {errors.department && (
            <p className="auth-field-error">{errors.department.message}</p>
          )}
        </div>
      </div>
      {role === 'doctor' && (
        <div className="field">
          <label className="field-label">Specialization</label>
          <select
            className="input select"
            {...sReg('specialization')}
            disabled={!selectedDepartment}
          >
            <option value="">
              {selectedDepartment ? 'Select specialization…' : 'Select department first'}
            </option>
            {availableSpecializations.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
          {errors.specialization && (
            <p className="auth-field-error">{errors.specialization.message}</p>
          )}
        </div>
      )}
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
          placeholder="14-digit national ID"
          {...sReg('national_id')}
        />
        {errors.national_id && (
          <p className="auth-field-error">{errors.national_id.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="btn btn-primary btn-lg auth-submit auth-submit-dark"
      >
        Continue <ArrowRight className="rtl:rotate-180" size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
