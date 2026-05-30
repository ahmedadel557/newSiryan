import { StaffShell } from '@/components/layouts/StaffShell';
import { inventoryNav } from '@/config/navItems';

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell navItems={inventoryNav}>{children}</StaffShell>;
}
