'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import type { SubmitHandler } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api.client';
import { departmentService } from '@/services/department.service';
import { queryKeys } from '@/lib/queryKeys';
import { useUsernameCheck } from '@/hooks/shared';
import StepIndicator from '@/components/auth/shared/StepIndicator';
import StaffProfessionalStep from '@/components/auth/register/steps/StaffProfessionalStep';
import StaffSecurityStep from '@/components/auth/register/steps/StaffSecurityStep';
import {
  staffSchema,
  type StaffFields,
  STAFF_STEPS,
  DEPARTMENT_SPECIALIZATIONS,
} from '@/components/auth/register/registerTypes';

interface StaffFormProps {
  onSuccess: (email: string) => void;
}

export default function StaffForm({ onSuccess }: StaffFormProps) {
  const [step, setStep] = useState(1);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StaffFields>({
    resolver: yupResolver(staffSchema),
    mode: 'onTouched',
  });

  const pw = watch('password') ?? '';
  const usernameVal = watch('username') ?? '';
  const role = watch('role') ?? '';
  const selectedDepartment = watch('department') ?? '';
  const nationalIdVal = watch('national_id') ?? '';
  const availableSpecializations = DEPARTMENT_SPECIALIZATIONS[selectedDepartment] || [];
  const usernameStatus = useUsernameCheck(usernameVal);

  // Departments are role-aware: only those that accept the selected role are shown.
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: queryKeys.departmentsByRole(role),
    queryFn: () => departmentService.getByRole(role),
    enabled: !!role,
    staleTime: 5 * 60 * 1000,
  });

  // Reset department (and the dependent specialization) whenever the role changes,
  // since the available department set changes with the role.
  useEffect(() => {
    setValue('department', '');
    setValue('specialization', '');
  }, [role, setValue]);

  useEffect(() => {
    setValue('specialization', '');
  }, [selectedDepartment, setValue]);

  async function goNext() {
    const baseFields: (keyof StaffFields)[] = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'role',
      'department',
      'national_id',
    ];
    const valid = await trigger(baseFields);
    if (valid) {
      if (role === 'doctor' && !watch('specialization')) {
        return;
      }
      setStep(2);
    }
  }

  const onSubmit: SubmitHandler<StaffFields> = async (data) => {
    setApiError('');
    if (usernameStatus === 'taken') return;
    try {
      await apiClient.post('/auth/register/staff', {
        username: data.username,
        email: data.email,
        password: data.password,
        confirm_password: data.confirm_password,
        role: data.role,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        department: data.department,
        specialization: data.specialization || undefined,
        national_id: data.national_id,
      });
      onSuccess(data.email);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setApiError(msg || 'Registration failed. Please try again.');
    }
  };

  return (
    <>
      <p className="auth-lede">
        {step === 1
          ? 'Tell us about your professional background.'
          : 'Set up your login credentials.'}
      </p>

      <StepIndicator steps={STAFF_STEPS} currentStep={step} />

      {step === 1 && (
        <StaffProfessionalStep
          register={register}
          errors={errors}
          role={role}
          departments={departments}
          departmentsLoading={departmentsLoading}
          selectedDepartment={selectedDepartment}
          availableSpecializations={availableSpecializations}
          nationalId={nationalIdVal}
          onNext={goNext}
        />
      )}

      {step === 2 && (
        <StaffSecurityStep
          register={register}
          errors={errors}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          apiError={apiError}
          password={pw}
          usernameStatus={usernameStatus}
          onBack={() => setStep(1)}
        />
      )}
    </>
  );
}
