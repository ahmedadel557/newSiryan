'use client';

import { Loader2 } from 'lucide-react';

interface CallStatusOverlayProps {
  title: string;
  subtitle?: string;
}

export function CallStatusOverlay({ title, subtitle }: CallStatusOverlayProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ background: 'var(--brand)' }} />
        <span
          className="relative inline-flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'var(--brand)', color: 'var(--fg-on-brand)' }}
        >
          <Loader2 size={26} className="animate-spin" />
        </span>
      </span>
      <div>
        <p className="text-[18px] font-semibold" style={{ color: 'var(--fg-on-brand)' }}>{title}</p>
        {subtitle && <p className="mt-1 text-[13px]" style={{ color: 'var(--fg-on-inverse)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}
