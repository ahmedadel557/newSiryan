import { StaffShell } from '@/components/layouts/StaffShell';
import { pharmacistNav } from '@/config/navItems';

export default function PharmacistLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell navItems={pharmacistNav}>{children}</StaffShell>;
}
