'use client';
import { useEffect, useState, useCallback } from 'react';
import { notificationService } from '@/services/notification.service';
import { useSocketEvent } from './useSocketEvent';
import type { Notification } from '@/types';

const POLL_INTERVAL_MS = 30_000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await notificationService.getAll();
      setNotifications(data);
    } catch {
      // silent — polling failures shouldn't surface to UI
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetch]);

  useSocketEvent<Notification>(
    'notification:new',
    useCallback((incoming) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });
    }, [])
  );

  const markRead = useCallback(async (id: string) => {
    await notificationService.markRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    await fetch();
  }, [fetch]);

  const deleteOne = useCallback(async (id: string) => {
    await notificationService.deleteOne(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await notificationService.clearAll();
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, markRead, markAllRead, deleteOne, clearAll, isLoading };
}
