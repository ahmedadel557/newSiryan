'use client';

import { useAuth } from '@/hooks/shared';
import { StaffShell } from '@/components/layouts/StaffShell';
import { SettingsShell } from '@/components/shared/SettingsShell';
import { StaffProfileSection } from '@/components/shared/StaffProfileSection';
import { roleNavMap } from '@/config/navItems';

function StaffSettingsContent() {
  return <SettingsShell profileSection={<StaffProfileSection />} />;
}

export default function StaffSettingsPage() {
  const { user } = useAuth();
  const navItems = user ? (roleNavMap[user.role] ?? []) : [];

  return (
    <StaffShell navItems={navItems} pageTitle="Settings">
      <StaffSettingsContent />
    </StaffShell>
  );
}
