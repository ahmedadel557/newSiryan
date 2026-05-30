'use client';
import { useEffect, useState } from 'react';
import { useToast, type Toast } from '@/hooks/useToast';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const variantStyles: Record<Toast['variant'], string> = {
  success: 'bg-[var(--positive-soft-bg)] text-[var(--positive-soft-fg)] border-[var(--positive)]',
  error: 'bg-[var(--critical-soft-bg)] text-[var(--critical-soft-fg)] border-[var(--critical)]',
  info: 'bg-[var(--info-soft-bg)] text-[var(--info-soft-fg)] border-[var(--info)]',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const Icon = toast.variant === 'success' ? CheckCircle : toast.variant === 'error' ? XCircle : Info;

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)]
        border shadow-[var(--shadow-md)] text-sm font-medium
        transition-all duration-[220ms] ease-out
        ${variantStyles[toast.variant]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <Icon size={16} strokeWidth={1.75} className="shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="btn shrink-0 opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

function ToastContainer() {
  const { toasts, showToast } = useToast();
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    setItems(toasts);
  }, [toasts]);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed z-[100] flex flex-col gap-2 bottom-4 left-4 right-4 w-auto sm:bottom-6 sm:right-6 sm:left-auto sm:w-[360px] sm:max-w-[calc(100vw-48px)]"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {items.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          onDismiss={() => {
            // Remove immediately on dismiss; auto-dismiss handled by useToast
            setItems((prev) => prev.filter((x) => x.id !== t.id));
          }}
        />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
