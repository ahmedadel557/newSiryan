'use client';
import { useCallback, useEffect, useState } from 'react';
import { settingsService } from '@/services/settings.service';
import { useToast } from './useToast';
import type { UserSettings } from '@/types';

export function useSettings() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    settingsService
      .getSettings()
      .then(setSettings)
      .catch(() => {
        /* silent */
      })
      .finally(() => setIsLoading(false));
  }, []);

  const changePassword = useCallback(
    async (data: { current_password: string; new_password: string; confirm_password: string }) => {
      setIsSaving(true);
      try {
        await settingsService.changePassword(data);
        showToast('Password updated successfully', 'success');
        return true;
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? 'Failed to update password';
        showToast(msg, 'error');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [showToast]
  );

  const updateNotifications = useCallback(
    async (data: Partial<UserSettings['notifications']>) => {
      setIsSaving(true);
      try {
        const updated = await settingsService.updateNotifications(data);
        setSettings(updated);
        showToast('Preferences saved', 'success');
      } catch {
        showToast('Failed to save preferences', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [showToast]
  );

  const updateAppearance = useCallback(
    async (data: Partial<UserSettings['appearance']>) => {
      setIsSaving(true);
      try {
        const updated = await settingsService.updateAppearance(data);
        setSettings(updated);
      } catch {
        showToast('Failed to save appearance', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [showToast]
  );

  const deleteAccount = useCallback(
    async (data: { password: string }) => {
      setIsSaving(true);
      try {
        await settingsService.deleteAccount(data);
        return true;
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? 'Failed to delete account';
        showToast(msg, 'error');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [showToast]
  );

  return { settings, isLoading, isSaving, changePassword, updateNotifications, updateAppearance, deleteAccount };
}
