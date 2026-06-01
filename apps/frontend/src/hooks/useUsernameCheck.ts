'use client';
import { useState, useEffect, useRef } from 'react';
import { authService } from '@/services/auth.service';
import type { UsernameStatus } from '@/components/auth/shared/UsernameField';

/**
 * Debounced username availability check.
 * Follows the same pattern as the original auth pages.
 */
export function useUsernameCheck(usernameValue: string): UsernameStatus {
  const [status, setStatus] = useState<UsernameStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!usernameValue || usernameValue.length < 3) {
      setStatus('idle'); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    setStatus('checking');
    timerRef.current = setTimeout(async () => {
      try {
        const { available } = await authService.checkUsername(usernameValue);
        setStatus(available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [usernameValue]);

  return status;
}
