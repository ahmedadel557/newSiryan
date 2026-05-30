'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const roleMap: Record<string, string> = {
  patient: '/dashboard/patient',
  doctor: '/dashboard/doctor',
  nurse: '/dashboard/nurse',
  receptionist: '/dashboard/receptionist',
  pharmacist: '/dashboard/pharmacist',
  inventory_manager: '/dashboard/inventory',
  lab_technician: '/dashboard/lab',
  radiology_technician: '/dashboard/radiology',
  cashier: '/dashboard/cashier',
  admin: '/dashboard/admin',
};

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const role = searchParams.get('role');
    const error = searchParams.get('error');

    if (error) {
      router.push('/auth/login?error=google_failed');
      return;
    }

    if (!role) {
      router.push('/auth/login');
      return;
    }

    const isNew = searchParams.get('isNew') === 'true';
    const isProfileComplete = searchParams.get('is_profile_complete') !== 'false';

    if (isNew || !isProfileComplete) {
      sessionStorage.setItem('google_first_name', searchParams.get('first_name') || '');
      sessionStorage.setItem('google_last_name', searchParams.get('last_name') || '');
      sessionStorage.setItem('google_avatar', searchParams.get('avatar') || '');
      setTimeout(() => router.replace('/auth/complete-profile'), 100);
    } else {
      setTimeout(() => router.replace(roleMap[role] ?? '/dashboard/patient'), 100);
    }
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-page)' }}>
      <p style={{ color: 'var(--fg-2)', fontSize: '14px' }}>Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
