import { StaffShell } from '@/components/layouts/StaffShell';
import { receptionistNav } from '@/config/navItems';

export default function ReceptionistLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell navItems={receptionistNav}>{children}</StaffShell>;
}
