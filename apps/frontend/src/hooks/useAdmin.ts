'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminService } from '@/services/admin.service';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
import type { User, DashboardStats, SystemLog, CreateUserDto, Role, DoctorReportItem, InventoryItem } from '@/types';

type RevenueByDay = { _id: { year: number; month: number; day: number }; total: number; count: number };

type StaffRequestPayload = {
  user_id: string;
  name: string;
  role: string;
};

export type UserRoleFilter = 'all' | 'doctor' | 'nurse' | 'support' | 'patient';

type PaymentReceived = {
  invoice_id: string;
  amount: number;
  patient_name: string;
  payment_method: string;
  status: string;
  total_due: number;
  is_partial: boolean;
};

export function useAdmin() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [doctorReport, setDoctorReport] = useState<DoctorReportItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<RevenueByDay[]>([]);
  const [pendingStaffCount, setPendingStaffCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editRoleUser, setEditRoleUser] = useState<User | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<UserRoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([
      adminService.getUsers(),
      adminService.getDashboardStats(),
      adminService.getAuditLog(),
      adminService.getDoctorReport().catch(() => []),
      inventoryService.getLowStock().catch(() => ({ inventory: [], medications: [] })),
      adminService.getRevenueReport().catch(() => ({ by_day: [], by_month: [], by_category: [] })),
      adminService.getStaffRequests('pending').catch(() => ({ requests: [], total: 0 })),
    ])
      .then(([fetchedUsers, fetchedStats, fetchedLogs, fetchedDoctorReport, fetchedLowStock, fetchedRevenue, fetchedPending]) => {
        setUsers(fetchedUsers);
        setStats(fetchedStats);
        setLogs(fetchedLogs);
        setDoctorReport(fetchedDoctorReport);
        setLowStockItems(fetchedLowStock.inventory);
        setRevenueByDay(fetchedRevenue.by_day);
        setPendingStaffCount(fetchedPending.total);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Real-time payment alerts from the cashier: toast + authoritative revenue refresh.
  useSocketEvent<PaymentReceived>(
    'payment:received',
    useCallback(
      (p) => {
        const label = p.is_partial ? 'Partial payment' : 'Payment';
        showToast(
          `${label} received: ${p.amount.toLocaleString('en-US')} EGP from ${p.patient_name} (${p.payment_method})`,
          p.is_partial ? 'info' : 'success'
        );
        adminService.getDashboardStats().then(setStats).catch(() => {});
        adminService.getRevenueReport().then((r) => setRevenueByDay(r.by_day)).catch(() => {});
      },
      [showToast]
    )
  );

  // Real-time staff request alerts.
  useSocketEvent<StaffRequestPayload>(
    'staff_request:new',
    useCallback(
      (p) => {
        showToast(`New staff request: ${p.name} (${p.role.replace(/_/g, ' ')})`, 'info');
        adminService.getStaffRequests('pending').then((r) => setPendingStaffCount(r.total)).catch(() => {});
      },
      [showToast]
    )
  );

  const createUser = useCallback(
    async (data: CreateUserDto) => {
      try {
        const created = await adminService.createUser(data);
        setUsers((prev) => [created, ...prev]);
        showToast('User created', 'success');
        setCreateModalOpen(false);
      } catch {
        showToast('Failed to create user', 'error');
      }
    },
    [showToast]
  );

  const toggleUserActive = useCallback(
    async (id: string, isActive: boolean) => {
      try {
        const updated = await adminService.updateUserActive(id, isActive);
        setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
        showToast(isActive ? 'User activated' : 'User deactivated', 'success');
      } catch {
        showToast('Failed to update user', 'error');
      }
    },
    [showToast]
  );

  const updateUserRole = useCallback(
    async (id: string, role: Role) => {
      try {
        const updated = await adminService.updateUserRole(id, role);
        setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
        showToast('Role updated', 'success');
        setEditRoleUser(null);
      } catch {
        showToast('Failed to update role', 'error');
      }
    },
    [showToast]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      try {
        await adminService.deleteUser(id);
        setUsers((prev) => prev.filter((u) => u.id !== id));
        showToast('User deleted', 'success');
        setDeleteConfirmId(null);
      } catch {
        showToast('Failed to delete user', 'error');
      }
    },
    [showToast]
  );

  const filteredUsers = useMemo(() => {
    let result = users;
    if (userFilter === 'doctor') result = result.filter((u) => u.role === 'doctor');
    else if (userFilter === 'nurse') result = result.filter((u) => u.role === 'nurse');
    else if (userFilter === 'support') result = result.filter((u) => !['doctor', 'nurse', 'patient'].includes(u.role));
    else if (userFilter === 'patient') result = result.filter((u) => u.role === 'patient');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return result;
  }, [users, userFilter, searchQuery]);

  return {
    users: filteredUsers,
    allUsers: users,
    stats,
    logs,
    doctorReport,
    lowStockItems,
    revenueByDay,
    pendingStaffCount,
    isLoading,
    createModalOpen,
    setCreateModalOpen,
    editRoleUser,
    setEditRoleUser,
    deleteConfirmId,
    setDeleteConfirmId,
    userFilter,
    setUserFilter,
    searchQuery,
    setSearchQuery,
    createUser,
    toggleUserActive,
    updateUserRole,
    deleteUser,
  };
}
