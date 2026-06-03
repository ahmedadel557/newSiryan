import type { BadgeVariant } from '@/components/ui/Badge';

// Maps any status string to a Badge variant.
// Add new statuses here — never inline in components.

export const statusVariant: Record<string, BadgeVariant> = {
  // Appointment / booking statuses
  pending: 'caution',
  scheduled: 'caution',
  confirmed: 'positive',
  checked_in: 'info',
  completed: 'positive',
  cancelled: 'neutral',
  cancellation_requested: 'caution',
  reschedule_requested: 'caution',
  rescheduled: 'info',
  no_show: 'critical',

  // Order statuses (lab, radiology, pharmacy, purchase orders)
  ordered: 'caution',
  in_progress: 'info',
  ready: 'positive',
  shipped: 'info',
  received: 'positive',
  delivered: 'positive',
  draft: 'neutral',
  rejected: 'critical',
  approved: 'positive',
  awaiting_verification: 'caution',
  dispensed: 'positive',
  partially_paid: 'caution',
  partial: 'caution',
  paid: 'positive',
  unpaid: 'caution',
  overdue: 'critical',
  refunded: 'neutral',

  // Warehouse stock-assignment statuses
  unassigned: 'caution',
  assigned: 'positive',

  // Room / inventory statuses
  available: 'positive',
  occupied: 'critical',
  maintenance: 'caution',
  reserved: 'info',
  active: 'positive',
  inactive: 'neutral',
  expired: 'critical',
  low_stock: 'caution',
  fulfilled: 'positive',

  // Emergency flag statuses
  notified: 'caution',
  acknowledged: 'info',
  resolved: 'positive',

  // User / staff statuses
  verified: 'positive',
  unverified: 'caution',
  suspended: 'critical',
  password_change_required: 'caution',
};

export function getStatusVariant(status: string): BadgeVariant {
  return statusVariant[status?.toLowerCase()] ?? 'neutral';
}
