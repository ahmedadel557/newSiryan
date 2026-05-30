'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles, ArrowRight, Play, Star, ShieldCheck, Zap, Globe,
  Lock, Users, Video, Pill, HeartPulse, Check,
} from 'lucide-react';
import { Reveal, Counter } from './Reveal';

const marqueeItems = [
  { icon: <ShieldCheck size={14} strokeWidth={1.75} />, text: 'HIPAA compliant' },
  { icon: <Zap size={14} strokeWidth={1.75} />, text: 'Real-time sync' },
  { icon: <Globe size={14} strokeWidth={1.75} />, text: 'Multi-language · Arabic supported' },
  { icon: <Lock size={14} strokeWidth={1.75} />, text: 'End-to-end encrypted' },
  { icon: <Users size={14} strokeWidth={1.75} />, text: '9 staff roles' },
  { icon: <Sparkles size={14} strokeWidth={1.75} />, text: 'Claude AI powered' },
  { icon: <Video size={14} strokeWidth={1.75} />, text: 'Video consultations' },
  { icon: <Pill size={14} strokeWidth={1.75} />, text: 'Pharmacy integrated' },
];

const avatarColors = ['#e8b9a5', '#c8ebd5', '#d6d8f5', '#f8e2b6', '#b4d4be'];

export function HeroSection() {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setMouseX(((e.clientX - rect.left) / rect.width - 0.5) * 2);
      setMouseY(((e.clientY - rect.top) / rect.height - 0.5) * 2);
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <section className="hero" ref={heroRef}>
      <div className="hero-mesh">
        <div className="hero-blob blob-1" style={{ transform: `translate(${mouseX * -20}px, ${mouseY * -20}px)` }} />
        <div className="hero-blob blob-2" style={{ transform: `translate(${mouseX * 30}px, ${mouseY * 20}px)` }} />
        <div className="hero-blob blob-3" style={{ transform: `translate(${mouseX * 15}px, ${mouseY * -25}px)` }} />
      </div>
      <div className="hero-grid-pattern" />

      <div className="hero-inner">
        <div className="hero-content">
          <Reveal className="hero-badge" delay={0}>
            <span className="hero-badge-pulse" />
            <span>New · AI-powered medical assistant</span>
            <ArrowRight size={13} strokeWidth={1.75} />
          </Reveal>

          <Reveal as="h1" className="hero-title" delay={100}>
            Healthcare,<br />
            <span className="hero-title-grad">reimagined.</span>
          </Reveal>

          <Reveal as="p" className="hero-sub" delay={200}>
            Siryan connects patients, doctors, pharmacists, and hospital staff on one modern platform.
            Book visits, talk to the AI assistant, order medication, and manage every record — all in one place.
          </Reveal>

          <Reveal className="hero-actions" delay={300}>
            <Link href="/auth/register" className="btn btn-primary btn-lg hero-cta-primary">
              Get started free <ArrowRight size={16} strokeWidth={1.75} />
            </Link>
            <a href="#how" className="btn-watch">
              <span className="btn-watch-icn"><Play size={14} strokeWidth={1.75} /></span>
              <span>See how it works</span>
            </a>
          </Reveal>

          <Reveal className="hero-trust" delay={400}>
            <div className="hero-avatars">
              {avatarColors.map((c, i) => (
                <span
                  key={i}
                  className="hero-avatar"
                  style={{ background: c, transitionDelay: `${600 + i * 80}ms` }}
                />
              ))}
            </div>
            <div>
              <div className="hero-trust-stars">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={13} strokeWidth={1.75} />
                ))}
                <strong>4.9</strong>
              </div>
              <div className="hero-trust-text">Trusted by 2,400+ patients &amp; 180 staff</div>
            </div>
          </Reveal>
        </div>

        <div className="hero-visual">
          <div
            className="hero-orbit"
            style={{
              transform: `perspective(1200px) rotateY(${mouseX * 4}deg) rotateX(${mouseY * -4}deg)`,
            }}
          >
            <div className="hero-mock">
              <div className="hero-mock-head">
                <Image src="/assets/siryan-logo.png" alt="" width={32} height={32} />
                <div>
                  <div className="hero-mock-title">Siryan · Dashboard</div>
                  <div className="hero-mock-sub">Live patient activity</div>
                </div>
                <span className="hero-mock-live">
                  <span className="hero-mock-live-dot" />
                  Live
                </span>
              </div>

              <div className="hero-mock-stats">
                <div className="hero-mock-stat">
                  <div className="hero-mock-stat-val">
                    <Counter to={128} />
                  </div>
                  <div className="hero-mock-stat-label">Visits today</div>
                </div>
                <div className="hero-mock-stat">
                  <div className="hero-mock-stat-val">
                    <Counter to={74} suffix="%" />
                  </div>
                  <div className="hero-mock-stat-label">Bed occupancy</div>
                </div>
                <div className="hero-mock-stat">
                  <div className="hero-mock-stat-val">
                    98<span style={{ fontSize: '0.6em', color: 'var(--fg-3)' }}>%</span>
                  </div>
                  <div className="hero-mock-stat-label">Satisfaction</div>
                </div>
              </div>

              <svg className="hero-mock-chart" viewBox="0 0 320 80">
                <defs>
                  <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#235347" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#235347" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 Q40,55 60,45 T120,30 T180,40 T240,20 T320,15 L320,80 L0,80 Z"
                  fill="url(#chartGrad)"
                />
                <path
                  d="M0,60 Q40,55 60,45 T120,30 T180,40 T240,20 T320,15"
                  fill="none"
                  stroke="#235347"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="hero-float hero-float-1">
              <div className="hero-float-icn" style={{ background: 'var(--info-soft-bg)', color: 'var(--info-soft-fg)' }}>
                <Sparkles size={16} strokeWidth={1.75} />
              </div>
              <div>
                <div className="hero-float-title">AI Assistant</div>
                <div className="hero-float-sub">Symptom check ready</div>
              </div>
            </div>

            <div className="hero-float hero-float-2">
              <div className="hero-float-icn" style={{ background: 'var(--positive-soft-bg)', color: 'var(--positive-soft-fg)' }}>
                <Check size={16} strokeWidth={1.75} />
              </div>
              <div>
                <div className="hero-float-title">Booking confirmed</div>
                <div className="hero-float-sub">Thu · 10:30 AM</div>
              </div>
            </div>

            <div className="hero-float hero-float-3">
              <div className="hero-float-icn" style={{ background: 'var(--caution-soft-bg)', color: 'var(--caution-soft-fg)' }}>
                <HeartPulse size={16} strokeWidth={1.75} />
              </div>
              <div>
                <div className="hero-float-title">BP 120/80</div>
                <div className="hero-float-sub">Normal range</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-marquee">
        <div className="hero-marquee-track">
          {[0, 1].map((k) => (
            <div key={k} className="hero-marquee-row">
              {marqueeItems.map((item, i) => (
                <span key={i}>
                  {item.icon} {item.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
