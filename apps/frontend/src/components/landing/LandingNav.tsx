'use client';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import Image from 'next/image';
import * as Sentry from '@sentry/nextjs';

<button
  onClick={() => {
    Sentry.captureException(
      new Error('Production Frontend Test')
    );
  }}
>
  Test Sentry
</button>
export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`ln-nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="ln-nav-inner">
        <div className="ln-nav-left">
          <Image src="/assets/siryan-logo.png" alt="" className="ln-nav-logo" width={100} height={40} />
          <span className="ln-nav-brand">Siryan</span>
        </div>
        <div className="ln-nav-links">
          <a href="#features">Features</a>
          <a href="#roles">Who it&apos;s for</a>
          <a href="#how">How it works</a>
          <a href="#stats">Impact</a>
        </div>
        <div className="ln-nav-right">
          <ThemeToggle />
          <Link href="/auth/login" className="btn btn-ghost">
            Sign in
          </Link>
          <Link href="/auth/register" className="btn btn-primary ln-nav-cta">
            Get started
          </Link>
          <button
            className="ln-nav-burger"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="ln-mobile-menu" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-1)', padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <a href="#features" style={{ fontSize: 15, color: 'var(--fg-1)', padding: '10px 8px', borderRadius: 8, display: 'block' }} onClick={() => setOpen(false)}>Features</a>
          <a href="#roles" style={{ fontSize: 15, color: 'var(--fg-1)', padding: '10px 8px', borderRadius: 8, display: 'block' }} onClick={() => setOpen(false)}>Who it&apos;s for</a>
          <a href="#how" style={{ fontSize: 15, color: 'var(--fg-1)', padding: '10px 8px', borderRadius: 8, display: 'block' }} onClick={() => setOpen(false)}>How it works</a>
          <a href="#stats" style={{ fontSize: 15, color: 'var(--fg-1)', padding: '10px 8px', borderRadius: 8, display: 'block' }} onClick={() => setOpen(false)}>Impact</a>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-1)', margin: '8px 0' }} />
          <Link href="/auth/login" className="btn btn-ghost" style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }} onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link href="/auth/register" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }} onClick={() => setOpen(false)}>
            Get started
          </Link>
        </div>
      )}
    </nav>
  );
}
