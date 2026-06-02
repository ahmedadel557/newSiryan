'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { adminService } from '@/services/admin.service';
import { useToast } from '@/hooks/useToast';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import type { StaffRequest } from '@/types';

type StaffRequestPayload = { user_id: string; name: string; role: string };
type StaffRequestPage = { requests: StaffRequest[]; total: number };

// Optimistically drop a pending request from every cached staff-requests page so the
// list row and the sidebar badge both update instantly. Returns the snapshot so
// onError can restore it if the API call fails.
function removePendingFromCache(id: string): Array<[readonly unknown[], StaffRequestPage | undefined]> {
  const snapshots = queryClient.getQueriesData<StaffRequestPage>({ queryKey: ['admin', 'staff-requests'] });
  for (const [key, data] of snapshots) {
    if (!data) continue;
    const next: StaffRequestPage = {
      requests: data.requests.filter((r) => r.id !== id),
      total: Math.max(0, data.total - (data.requests.some((r) => r.id === id) ? 1 : 0)),
    };
    queryClient.setQueryData(key, next);
  }
  return snapshots;
}

function restoreSnapshots(snapshots: Array<[readonly unknown[], StaffRequestPage | undefined]>) {
  for (const [key, data] of snapshots) queryClient.setQueryData(key, data);
}

export function useAdminStaffRequests(status: string = 'pending', options: { enabled?: boolean } = {}) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const enabled = options.enabled ?? true;

  const query = useQuery({
    queryKey: queryKeys.adminStaffRequests(status),
    queryFn: () => adminService.getStaffRequests(status),
    enabled,
  });

  useSocketEvent<StaffRequestPayload>(
    'staff_request:new',
    useCallback(
      (p) => {
        showToast(`New staff request: ${p.name} (${p.role.replace(/_/g, ' ')})`, 'info');
        queryClient.invalidateQueries({ queryKey: ['admin', 'staff-requests'] });
      },
      [showToast],
    ),
  );

  const approve = useMutation({
    mutationFn: (id: string) => adminService.approveStaff(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['admin', 'staff-requests'] });
      return { snapshots: removePendingFromCache(id) };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshots) restoreSnapshots(ctx.snapshots);
      showToast('Failed to approve request', 'error');
    },
    onSuccess: () => {
      showToast('Request approved', 'success');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'staff-requests'] });
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers() });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminService.rejectStaff(id, reason),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'staff-requests'] });
      return { snapshots: removePendingFromCache(id) };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshots) restoreSnapshots(ctx.snapshots);
      showToast('Failed to reject request', 'error');
    },
    onSuccess: () => {
      showToast('Request rejected', 'success');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'staff-requests'] });
    },
  });

  return {
    requests: query.data?.requests ?? [],
    total: query.data?.total ?? 0,
    loading: query.isLoading,
    error: query.error,
    approve,
    reject,
  };
}
