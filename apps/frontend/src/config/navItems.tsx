import {
  LayoutDashboard,
  Bot,
  CalendarPlus,
  Pill,
  FileText,
  Receipt,
  Users,
  CalendarDays,
  ClipboardList,
  AlertTriangle,
  Calendar,
  FlaskConical,
  Scan,
  UserCheck,
  CheckSquare,
  Package,
  Truck,
  Building2,
  Warehouse,
  CheckCircle,
  CreditCard,
  BarChart2,
  ShieldCheck,
  BedDouble,
  Inbox,
  UserRound,
  Settings,
  ShieldPlus,
  Clock,
  Megaphone,
  SlidersHorizontal,
  Shield,
  Activity,
  ShoppingBag,
  RefreshCcw,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const I = { size: 18, strokeWidth: 1.75 } as const;

export const patientNav: NavItem[] = [
  { label: 'Home', href: '/dashboard/patient', icon: <LayoutDashboard {...I} /> },
  { label: 'Siryan Assistant', href: '/dashboard/patient/assistant', icon: <Bot {...I} /> },
  { label: 'Book Appointment', href: '/dashboard/patient/appointments/new', icon: <CalendarPlus {...I} /> },
  { label: 'My Requests', href: '/dashboard/patient/requests', icon: <Inbox {...I} /> },
  { label: 'Pharmacy', href: '/dashboard/patient/pharmacy', icon: <Pill {...I} /> },
  { label: 'My Records', href: '/dashboard/patient/records', icon: <FileText {...I} /> },
  { label: 'Billing', href: '/dashboard/patient/billing', icon: <Receipt {...I} /> },
  { label: 'My Rooms', href: '/dashboard/patient/rooms', icon: <BedDouble {...I} /> },
  { label: 'Settings', href: '/dashboard/patient/settings', icon: <Settings {...I} /> },
];

export const doctorNav: NavItem[] = [
  { label: 'My Patients', href: '/dashboard/doctor', icon: <Users {...I} /> },
  { label: 'Schedule', href: '/dashboard/doctor/schedule', icon: <CalendarDays {...I} /> },
  { label: 'Shared Records', href: '/dashboard/doctor/shared-records', icon: <Inbox {...I} /> },
  { label: 'Patient Record', href: '/dashboard/doctor/record', icon: <FileText {...I} /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings {...I} /> },
];

export const nurseNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/nurse', icon: <LayoutDashboard {...I} /> },
  { label: 'Patients', href: '/dashboard/nurse/patients', icon: <Users {...I} /> },
  { label: 'Medication Schedule', href: '/dashboard/nurse/medications', icon: <ClipboardList {...I} /> },
  { label: 'Alerts', href: '/dashboard/nurse/alerts', icon: <AlertTriangle {...I} /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings {...I} /> },
];

export const receptionistNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/receptionist', icon: <LayoutDashboard {...I} /> },
  { label: 'Appointments', href: '/dashboard/receptionist/appointments', icon: <Calendar {...I} /> },
  { label: 'Patients', href: '/dashboard/receptionist/patients', icon: <Users {...I} /> },
  { label: 'Requests', href: '/dashboard/receptionist/requests', icon: <Inbox {...I} /> },
  { label: 'Orders', href: '/dashboard/receptionist/orders', icon: <FlaskConical {...I} /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings {...I} /> },
];

export const pharmacistNav: NavItem[] = [
  { label: 'Dashboard',     href: '/dashboard/pharmacist',              icon: <LayoutDashboard {...I} /> },
  { label: 'Orders',        href: '/dashboard/pharmacist/orders',        icon: <ShoppingBag {...I} /> },
  { label: 'Prescriptions', href: '/dashboard/pharmacist/prescriptions', icon: <FileText {...I} /> },
  { label: 'Medications',   href: '/dashboard/pharmacist/medications',   icon: <Pill {...I} /> },
  { label: 'History',       href: '/dashboard/pharmacist/history',       icon: <ClipboardList {...I} /> },
  { label: 'Refills',       href: '/dashboard/pharmacist/refills',       icon: <RefreshCcw {...I} /> },
  { label: 'Reports',       href: '/dashboard/pharmacist/reports',       icon: <BarChart2 {...I} /> },
  { label: 'Settings',      href: '/dashboard/settings',                 icon: <Settings {...I} /> },
];

export const inventoryNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard/inventory', icon: <Package {...I} /> },
  { label: 'Items', href: '/dashboard/inventory/items', icon: <AlertTriangle {...I} /> },
  { label: 'Supply Requests', href: '/dashboard/inventory/requests', icon: <Truck {...I} /> },
  { label: 'Warehouse', href: '/dashboard/inventory/warehouse', icon: <Warehouse {...I} /> },
  { label: 'Rooms', href: '/dashboard/inventory/rooms', icon: <Building2 {...I} /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings {...I} /> },
];

export const labNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/lab',           icon: <FlaskConical {...I} /> },
  { label: 'Orders',    href: '/dashboard/lab/orders',    icon: <ClipboardList {...I} /> },
  { label: 'Schedule',  href: '/dashboard/lab/schedule',  icon: <CalendarDays {...I} /> },
  { label: 'Completed', href: '/dashboard/lab/completed', icon: <CheckCircle {...I} /> },
  { label: 'Settings',  href: '/dashboard/settings',      icon: <Settings {...I} /> },
];

export const radiologyNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/radiology',           icon: <Scan {...I} /> },
  { label: 'Orders',    href: '/dashboard/radiology/orders',    icon: <ClipboardList {...I} /> },
  { label: 'Schedule',  href: '/dashboard/radiology/schedule',  icon: <CalendarDays {...I} /> },
  { label: 'Completed', href: '/dashboard/radiology/completed', icon: <CheckCircle {...I} /> },
  { label: 'Settings',  href: '/dashboard/settings',            icon: <Settings {...I} /> },
];

export const cashierNav: NavItem[] = [
  { label: 'Payments', href: '/dashboard/cashier', icon: <Receipt {...I} /> },
  { label: 'Pending', href: '/dashboard/cashier/pending', icon: <Inbox {...I} /> },
  { label: 'All Invoices', href: '/dashboard/cashier/invoices', icon: <CreditCard {...I} /> },
  { label: 'Daily Report', href: '/dashboard/cashier/reports', icon: <BarChart2 {...I} /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings {...I} /> },
];

export const adminNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard/admin', icon: <LayoutDashboard {...I} /> },
  { label: 'Users', href: '/dashboard/admin/users', icon: <Users {...I} /> },
  { label: 'Staff Requests', href: '/dashboard/admin/staff-requests', icon: <UserCheck {...I} /> },
  { label: 'Appointments', href: '/dashboard/admin/appointments', icon: <Calendar {...I} /> },
  { label: 'Insurance', href: '/dashboard/admin/insurance', icon: <ShieldPlus {...I} /> },
  { label: 'Departments', href: '/dashboard/admin/departments', icon: <Building2 {...I} /> },
  { label: 'Reports', href: '/dashboard/admin/reports', icon: <BarChart2 {...I} /> },
  { label: 'Invoices', href: '/dashboard/admin/invoices', icon: <Receipt {...I} /> },
  { label: 'Audit Log', href: '/dashboard/admin/audit-log', icon: <ShieldCheck {...I} /> },
  { label: 'Schedules', href: '/dashboard/admin/schedules', icon: <CalendarDays {...I} /> },
  { label: 'Shifts', href: '/dashboard/admin/shifts', icon: <Clock {...I} /> },
  { label: 'Announcements', href: '/dashboard/admin/announcements', icon: <Megaphone {...I} /> },
  { label: 'Sys Settings', href: '/dashboard/admin/settings', icon: <SlidersHorizontal {...I} /> },
  { label: 'Compliance', href: '/dashboard/admin/compliance', icon: <Shield {...I} /> },
  { label: 'Sys Health', href: '/dashboard/admin/system/health', icon: <Activity {...I} /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings {...I} /> },
];

export const roleNavMap: Record<Role, NavItem[]> = {
  patient: patientNav,
  doctor: doctorNav,
  nurse: nurseNav,
  receptionist: receptionistNav,
  pharmacist: pharmacistNav,
  inventory_manager: inventoryNav,
  lab_technician: labNav,
  radiology_technician: radiologyNav,
  cashier: cashierNav,
  admin: adminNav,
};
