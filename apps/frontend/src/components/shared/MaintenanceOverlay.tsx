'use client';
import { Wrench, X, Clock, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface MaintenanceOverlayProps {
  message: string;
  estimatedDuration?: number; // minutes
  startedAt?: string;         // ISO timestamp
  isAdmin: boolean;
  onAdminDismiss: () => void;
  onLogout?: () => void;
}

function useCountdown(minutes: number | undefined, startedAt: string | undefined): number {
  const getRemaining = () => {
    if (!minutes || minutes <= 0) return 0;
    const totalMs = minutes * 60 * 1000;
    if (!startedAt) return minutes * 60;
    const elapsed = Date.now() - new Date(startedAt).getTime();
    return Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
  };

  const [remaining, setRemaining] = useState(getRemaining);
  const ref = useRef(getRemaining);
  ref.current = getRemaining;

  useEffect(() => {
    if (!minutes) return;
    setRemaining(ref.current());
    const id = setInterval(() => setRemaining(ref.current()), 1000);
    return () => clearInterval(id);
  }, [minutes, startedAt]);

  return remaining;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/* Split the time string into individual digit/colon tiles */
function TimeTile({ char }: { char: string }) {
  const isColon = char === ':';
  return (
    <div
      className="flex items-center justify-center"
      style={
        isColon
          ? { width: 16, fontSize: 32, fontWeight: 700, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }
          : {
              width: 56,
              height: 68,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.10)',
              fontSize: 36,
              fontWeight: 700,
              color: '#ffffff',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }
      }
    >
      {char}
    </div>
  );
}

export function MaintenanceOverlay({
  message,
  estimatedDuration,
  startedAt,
  isAdmin,
  onAdminDismiss,
  onLogout,
}: MaintenanceOverlayProps) {
  const remaining = useCountdown(estimatedDuration, startedAt);
  const hasCountdown = estimatedDuration != null && estimatedDuration > 0;
  const expired = hasCountdown && remaining === 0;

  /* Lock body scroll while full-screen overlay is visible */
  useEffect(() => {
    if (isAdmin) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isAdmin]);

  /* ── Admin top banner ─────────────────────────────────────── */
  if (isAdmin) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-5 py-3 shrink-0"
        style={{
          background: 'linear-gradient(90deg, #b45309 0%, #d97706 100%)',
          borderBottom: '1px solid #92400e',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <Wrench size={14} color="#fff" strokeWidth={2} />
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-[13px] font-bold text-white">Maintenance mode is active</span>
            {message && (
              <span className="text-[13px] text-white/80 truncate">— {message}</span>
            )}
            {hasCountdown && (
              <span className="text-[12px] font-mono text-white/70">
                · {expired ? 'Overdue' : formatTime(remaining)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onAdminDismiss}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
          aria-label="Dismiss maintenance banner"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  /* ── Full-page lockout ────────────────────────────────────── */
  const timeStr = formatTime(remaining);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: 'var(--forest-900)', userSelect: 'none' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Top bar */}
      <div
        className="shrink-0 flex items-center gap-3 px-8 py-5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <Image src="/assets/siryan-logo.png" alt="Siryan" width={28} height={28} className="w-7 h-7 object-contain opacity-80" />
        <span className="text-[15px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Siryan</span>
        {onLogout && (
          <button
            onClick={onLogout}
            className="ml-auto flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px] font-medium transition-colors"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            <LogOut size={14} strokeWidth={1.75} />
            Sign out
          </button>
        )}
      </div>

      {/* Main content — vertically centred */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6 text-center">

        {/* Icon ring */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(217,119,6,0.15)',
            border: '1px solid rgba(217,119,6,0.30)',
            boxShadow: '0 0 40px rgba(217,119,6,0.12)',
          }}
        >
          <Wrench size={40} color="#d97706" strokeWidth={1.5} />
        </div>

        {/* Heading + message */}
        <div className="space-y-3 max-w-lg">
          <h1
            className="text-[32px] font-bold tracking-tight leading-tight"
            style={{ color: '#ffffff' }}
          >
            System Maintenance
          </h1>
          <p
            className="text-[16px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {message || 'The system is currently under maintenance.'}
          </p>
        </div>

        {/* Countdown block */}
        {hasCountdown && (
          <div className="flex flex-col items-center gap-4">
            {expired ? (
              <div
                className="px-8 py-4 rounded-[14px] text-[15px] font-medium"
                style={{
                  background: 'rgba(217,119,6,0.12)',
                  border: '1px solid rgba(217,119,6,0.25)',
                  color: '#fbbf24',
                }}
              >
                The system will be back at any moment
              </div>
            ) : (
              <>
                <div
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-semibold"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  <Clock size={11} strokeWidth={2} />
                  <span>Estimated time remaining</span>
                </div>

                {/* Digit tiles */}
                <div className="flex items-center gap-2">
                  {timeStr.split('').map((ch, i) => (
                    <TimeTile key={i} char={ch} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer note */}
        <p
          className="text-[13px] max-w-sm leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.28)' }}
        >
          Our team is working to restore the system as quickly as possible.
          Thank you for your patience.
        </p>
      </div>

      {/* Bottom strip */}
      <div
        className="shrink-0 flex items-center justify-center py-5 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.22)', fontSize: 12 }}
      >
        © {new Date().getFullYear()} Siryan Health System
      </div>
    </div>
  );
}
