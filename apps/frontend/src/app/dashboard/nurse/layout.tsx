import { StaffShell } from '@/components/layouts/StaffShell';
import { nurseNav } from '@/config/navItems';

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell navItems={nurseNav}>{children}</StaffShell>;
}
