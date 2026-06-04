'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AvatarUpload } from '@/components/shared/AvatarUpload';
import { TagInput } from '@/components/ui/TagInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { usePatientProfile } from '@/hooks/patient';
import { useAuth } from '@/hooks/shared';
import { patientService } from '@/services/patient.service';
import type { InsuranceCompany } from '@/types';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function PatientProfileSection() {
  const { profile, isLoading: profileLoading, isSaving: profileSaving, update } = usePatientProfile();
  const { user, profile: authProfile } = useAuth();
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);

  useEffect(() => {
    patientService.getInsuranceCompanies().then(setInsuranceCompanies).catch(() => {});
  }, []);

  useEffect(() => {
    if (profile?.allergies) setAllergies(profile.allergies);
    if (profile?.chronic_conditions) setChronicConditions(profile.chronic_conditions);
  }, [profile?.allergies, profile?.chronic_conditions]);

  const { register, handleSubmit } = useForm({
    values: profile
      ? {
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? '',
          phone: profile.phone ?? '',
          date_of_birth: profile.date_of_birth?.slice(0, 10) ?? '',
          gender: profile.gender ?? '',
          blood_type: profile.blood_type ?? '',
          address: profile.address ?? '',
          insurance_provider: profile.insurance_provider ?? '',
          insurance_number: profile.insurance_number ?? '',
        }
      : undefined,
  });

  const onSaveProfile = handleSubmit(async (data) => {
    await update({ ...data, allergies, chronic_conditions: chronicConditions } as any);
  });

  return (
    <form onSubmit={onSaveProfile} className="space-y-6">
      <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Profile Information</h2>

      <div className="flex flex-col items-center gap-2">
        {profileLoading ? (
          <Skeleton className="w-24 h-24 rounded-full" />
        ) : (
          <AvatarUpload
            size="lg"
            currentUrl={authProfile?.avatar_url}
            name={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || user?.username || '?'}
            onUpload={() => {}}
            onDelete={() => {}}
          />
        )}
        <p className="text-[12px] text-[var(--fg-3)]">Click to change photo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(['first_name', 'last_name'] as const).map((key) => (
          <div key={key}>
            <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">
              {key === 'first_name' ? 'First name' : 'Last name'}
            </label>
            <input
              {...register(key)}
              className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Email</label>
        <input
          value={user?.email ?? ''}
          disabled
          className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-3)] border border-transparent outline-none cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Phone</label>
        <input
          {...register('phone')}
          placeholder="01XXXXXXXXX"
          className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Date of birth</label>
          <input
            type="date"
            {...register('date_of_birth')}
            className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Gender</label>
          <select
            {...register('gender')}
            className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Blood type</label>
        <select
          {...register('blood_type')}
          className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
        >
          <option value="">Select</option>
          {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Allergies</label>
        <TagInput value={allergies} onChange={setAllergies} />
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Chronic conditions</label>
        <TagInput value={chronicConditions} onChange={setChronicConditions} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Insurance provider</label>
          <select
            {...register('insurance_provider')}
            className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
          >
            <option value="">No insurance</option>
            {insuranceCompanies.map((c) => (
              <option key={c.id} value={c.name}>{c.name} ({c.discount_percentage}% discount)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Insurance number</label>
          <input
            {...register('insurance_number')}
            className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
          />
        </div>
      </div>

      <Button type="submit" disabled={profileSaving}>
        {profileSaving ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
