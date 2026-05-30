'use client';
import { useCallback, useEffect, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function notify() {
  const snapshot = [...toasts];
  listeners.forEach((l) => l(snapshot));
}

// ← مهم: showToast خارج الـ hook عشان reference ثابتة
function showToastGlobal(message: string, variant: ToastVariant = 'success') {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, message, variant }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 4000);
}

const DURATION_MS = 4000;

export function useToast() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const l: Listener = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  // ← useCallback مع dependency فاضية لأن showToastGlobal ثابتة
  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    showToastGlobal(message, variant);
  }, []); // ← [] لأن showToastGlobal مش بتتغير

  return { showToast, toasts };
}
