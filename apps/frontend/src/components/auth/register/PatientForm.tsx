'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useUsernameCheck } from '@/hooks/shared';
import { authService } from '@/services/auth.service';
import { patientService } from '@/services/patient.service';
import { extractDOBFromNationalId } from '@/lib/validateNationalId';
import StepIndicator from '@/components/auth/shared/StepIndicator';
import PersonalInfoStep from '@/components/auth/register/steps/PersonalInfoStep';
import MedicalInfoStep from '@/components/auth/register/steps/MedicalInfoStep';
import SecurityStep from '@/components/auth/register/steps/SecurityStep';
import {
  patientSchema,
  type PatientFields,
  PATIENT_STEPS,
  PATIENT_STEP_DESCRIPTIONS,
} from '@/components/auth/register/registerTypes';

export default function PatientForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [apiError, setApiError] = useState('');
  const [dobHint, setDobHint] = useState('');
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState(false);

  useEffect(() => {
    patientService.getPublicInsuranceProviders()
      .then(setProviders)
      .catch(() => setProvidersError(true))
      .finally(() => setProvidersLoading(false));
  }, []);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PatientFields>({
    resolver: yupResolver(patientSchema),
    mode: 'onTouched',
  });

  const pw = watch('password') ?? '';
  const usernameVal = watch('username') ?? '';
  const nationalIdVal = watch('national_id') ?? '';
  const usernameStatus = useUsernameCheck(usernameVal);

  const handleNationalIdBlur = (value: string) => {
    const dob = extractDOBFromNationalId(value);
    if (dob) {
      setValue('date_of_birth', dob.toISOString().split('T')[0]);
      setDobHint('auto-filled');
    }
  };

  async function goNext() {
    const fieldsByStep: Record<number, (keyof PatientFields)[]> = {
      1: ['first_name', 'last_name', 'email', 'phone', 'username'],
      2: ['date_of_birth', 'gender', 'blood_type', 'national_id'],
    };
    if (step === 1 && usernameStatus === 'taken') return;
    const valid = await trigger(fieldsByStep[step]);
    if (valid) {
      setDobHint('');
      setStep((s) => s + 1);
    }
  }

  async function onSubmit(data: PatientFields) {
    setApiError('');
    try {
      await authService.register({
        username: data.username,
        email: data.email,
        password: data.password,
        profile: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          date_of_birth: data.date_of_birth,
          gender: data.gender as 'male' | 'female',
          blood_type: data.blood_type,
          national_id: data.national_id,
          insurance_provider: data.insurance_provider,
          insurance_number: data.insurance_number,
          allergies: data.allergies,
        },
      });
      router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setApiError(msg || 'Registration failed. Please try again.');
    }
  }

  return (
    <>
      <p className="auth-lede">{PATIENT_STEP_DESCRIPTIONS[step - 1]}</p>

      <StepIndicator steps={PATIENT_STEPS} currentStep={step} />

      {step === 1 && (
        <PersonalInfoStep
          register={register}
          errors={errors}
          usernameStatus={usernameStatus}
          onNext={goNext}
        />
      )}

      {step === 2 && (
        <MedicalInfoStep
          register={register}
          errors={errors}
          onNext={goNext}
          onBack={() => setStep(1)}
          onNidBlur={handleNationalIdBlur}
          nationalId={nationalIdVal}
          dobHint={dobHint}
          providers={providers}
          providersLoading={providersLoading}
          providersError={providersError}
        />
      )}

      {step === 3 && (
        <SecurityStep
          register={register}
          errors={errors}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          apiError={apiError}
          password={pw}
          onBack={() => setStep(2)}
        />
      )}
    </>
  );
}
