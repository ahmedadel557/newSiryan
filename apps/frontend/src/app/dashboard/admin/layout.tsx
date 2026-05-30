import { StaffShell } from '@/components/layouts/StaffShell';
import { adminNav } from '@/config/navItems';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell navItems={adminNav}>{children}</StaffShell>;
}
