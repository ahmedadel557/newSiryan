'use client';

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { adminService } from '@/services/admin.service';
import { useSocketEvent } from '@/hooks/useSocketEvent';

interface RevenueParams {
  from?: string;
  to?: string;
}

export function useAdminRevenueReport(params: RevenueParams = {}) {
  useSocketEvent(
    'payment:received',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports', 'revenue'] });
    }, []),
  );

  return useQuery({
    queryKey: queryKeys.adminRevenueReport({ ...params }),
    queryFn: () => adminService.getRevenueReport(params.from || params.to ? params : undefined),
    staleTime: 1000 * 60,
  });
}

export function useAdminRatingsReport() {
  return useQuery({
    queryKey: queryKeys.adminRatingsReport(),
    queryFn: () => adminService.getRatingsReport(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAdminOccupancyReport(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.adminOccupancyReport(),
    queryFn: () => adminService.getOccupancyReport(),
    staleTime: 1000 * 60 * 2,
    enabled: options.enabled ?? true,
  });
}

export function useAdminPharmacyReport(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.adminPharmacyReport(),
    queryFn: () => adminService.getPharmacyReport(),
    staleTime: 1000 * 60 * 5,
    enabled: options.enabled ?? true,
  });
}

export function useAdminDoctorReport() {
  return useQuery({
    queryKey: queryKeys.adminDoctorReport(),
    queryFn: () => adminService.getDoctorReport(),
    staleTime: 1000 * 60 * 5,
  });
}
