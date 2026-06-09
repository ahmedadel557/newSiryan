'use client';
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notification.service';
import { useSocketEvent } from './useSocketEvent';
import { queryKeys } from '@/lib/queryKeys';
import type { Notification } from '@/types';

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => notificationService.getAll(),
    refetchInterval: 30_000,
  });

  useSocketEvent<Notification>(
    'notification:new',
    useCallback(
      (incoming) => {
        const normalized: Notification = { ...incoming, id: (incoming as any)._id ?? incoming.id };
        queryClient.setQueryData<Notification[]>(queryKeys.notifications(), (prev = []) => {
          if (prev.some((n) => n.id === normalized.id)) return prev;
          return [normalized, ...prev];
        });
      },
      [queryClient]
    )
  );

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Notification[]>(queryKeys.notifications(), (prev = []) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  });

  const deleteOneMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteOne(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Notification[]>(queryKeys.notifications(), (prev = []) =>
        prev.filter((n) => n.id !== id)
      );
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => notificationService.clearAll(),
    onSuccess: () => queryClient.setQueryData(queryKeys.notifications(), []),
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
    deleteOne: (id: string) => deleteOneMutation.mutate(id),
    clearAll: () => clearAllMutation.mutate(),
    isLoading,
  };
}
