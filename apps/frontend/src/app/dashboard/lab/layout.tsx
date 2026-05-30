import { StaffShell } from '@/components/layouts/StaffShell';
import { labNav } from '@/config/navItems';

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell navItems={labNav}>{children}</StaffShell>;
}
