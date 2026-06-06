import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { DashboardSkeleton } from '@/components/shared/DashboardSkeleton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Suspense fallback={<DashboardSkeleton />}>
        {children}
      </Suspense>
    </AuthProvider>
  );
}
