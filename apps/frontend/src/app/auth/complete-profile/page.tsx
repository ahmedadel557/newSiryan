'use client';
import { useEffect, useState } from 'react';
import AuthShell from '@/components/shared/AuthShell';
import ProfileHeader from '@/components/auth/complete-profile/ProfileHeader';
import CompleteProfileForm from '@/components/auth/complete-profile/CompleteProfileForm';

export default function CompleteProfilePage() {
  const [googleAvatar, setGoogleAvatar] = useState('');

  useEffect(() => {
    setGoogleAvatar(sessionStorage.getItem('google_avatar') || ''); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  return (
    <AuthShell maxWidth={500}>
      <div className="auth-form-content">
        <ProfileHeader googleAvatar={googleAvatar} />
        <CompleteProfileForm googleAvatar={googleAvatar} />
      </div>
    </AuthShell>
  );
}
