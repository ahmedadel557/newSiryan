import apiClient from './api.client';
import type { ApiResponse, LoginDto, RegisterDto, User, Profile } from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });

type AuthPayload = {
  user: User;
  profile: Profile | null;
  requires_profile_completion?: boolean;
};

export const authService = {
  async login(data: LoginDto): Promise<AuthPayload> {
    const res = await apiClient.post<ApiResponse<any>>('/auth/login', data);
    const d = res.data.data;
    if (d.requires_profile_completion) {
      return { requires_profile_completion: true, user: null as any, profile: null };
    }
    return {
      user: normalize<User>(d.user),
      profile: d.profile ? normalize<Profile>(d.profile) : null,
    };
  },

  async register(data: RegisterDto): Promise<AuthPayload> {
    const res = await apiClient.post<ApiResponse<any>>('/auth/register', data);
    const d = res.data.data;
    return {
      user: normalize<User>(d.user),
      profile: d.profile ? normalize<Profile>(d.profile) : null,
    };
  },

  async getMe(): Promise<{ user: User; profile: Profile | null }> {
    const res = await apiClient.get<ApiResponse<{ user: User; profile: Profile | null }>>('/auth/me');
    const d = res.data.data;
    return {
      user: normalize<User>(d.user),
      profile: d.profile ? normalize<Profile>(d.profile) : null,
    };
  },

  async checkUsername(username: string): Promise<{ available: boolean }> {
    const res = await apiClient.get<ApiResponse<{ available: boolean }>>(`/auth/check-username?username=${encodeURIComponent(username)}`);
    return res.data.data;
  },

  async completeProfile(data: {
    username: string;
    password: string;
    confirm_password: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    blood_type?: string;
    phone?: string;
    national_id: string;
    avatar_url?: string;
  }): Promise<void> {
    await apiClient.post('/auth/complete-profile', data);
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  async changePassword(newPassword: string): Promise<void> {
    await apiClient.patch('/auth/change-password', { newPassword });
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
