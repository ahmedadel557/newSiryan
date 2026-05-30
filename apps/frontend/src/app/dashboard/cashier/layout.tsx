import { StaffShell } from '@/components/layouts/StaffShell';
import { cashierNav } from '@/config/navItems';

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell navItems={cashierNav}>{children}</StaffShell>;
}
