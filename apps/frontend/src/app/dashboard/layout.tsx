import { Suspense } from 'react';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/context/AuthContext';
import { DashboardSkeleton } from '@/components/shared/DashboardSkeleton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <Suspense fallback={<DashboardSkeleton />}>
          {children}
        </Suspense>
      </AuthProvider>
    </QueryProvider>
  );
}
