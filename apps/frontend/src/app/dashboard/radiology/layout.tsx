import { StaffShell } from '@/components/layouts/StaffShell';
import { radiologyNav } from '@/config/navItems';

export default function RadiologyLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell navItems={radiologyNav}>{children}</StaffShell>;
}
