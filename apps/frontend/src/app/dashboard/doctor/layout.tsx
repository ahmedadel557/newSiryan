import { StaffShell } from '@/components/layouts/StaffShell';
import { doctorNav } from '@/config/navItems';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell navItems={doctorNav}>{children}</StaffShell>;
}
