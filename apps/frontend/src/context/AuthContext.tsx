'use client';
import { createContext, useState, ReactNode } from 'react';
import { User, Profile } from '@/types';

export interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  return <AuthContext.Provider value={{ user, setUser, profile, setProfile }}>{children}</AuthContext.Provider>;
}
