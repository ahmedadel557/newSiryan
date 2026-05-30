'use client';
import { useContext, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';
import type { LoginDto, RegisterDto, Role } from '@/types';

const roleRoutes: Record<Role, string> = {
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');

  const { user, setUser, profile, setProfile } = ctx;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  authService
    .getMe()
    .then(({ user: me, profile: prof }) => {
      setUser(me);
      setProfile(prof);
    })
    .catch(() => {
      setUser(null);
      setProfile(null);
    })
    .finally(() => setIsLoading(false));
}, []);

  async function login(data: LoginDto) {
    const res = await authService.login(data);

    if (res.requires_profile_completion) {
      router.push('/auth/complete-profile');
      return;
    }

    setUser(res.user);
    setProfile(res.profile);
    if (res.user.password_changed === false) {
      router.push('/auth/change-password');
    } else {
      router.push(roleRoutes[res.user.role]);
    }
  }

  async function register(data: RegisterDto) {
    await authService.register(data);
    router.push('/auth/login?message=Account+created!+Sign+in+to+get+started.');
  }

  async function logout() {
    await authService.logout();
    setUser(null);
    setProfile(null);
    router.push('/auth/login');
  }

  const setUserFromToken = useCallback(async () => {
    try {
      const { user: me, profile: prof } = await authService.getMe();
      setUser(me);
      setProfile(prof);
    } catch {
      setUser(null);
      setProfile(null);
    }
  }, [setUser, setProfile]);

  return { user, profile, setProfile, isLoading, isAuthenticated: !!user, login, register, logout, setUserFromToken };
}
