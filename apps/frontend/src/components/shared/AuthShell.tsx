'use client';
import { useState, useEffect } from 'react';
import { Sparkles, CalendarCheck, Pill, HeartPulse, Video, ShieldCheck, Lock } from 'lucide-react';

const scenes = [
  { gradient: 'linear-gradient(135deg, #051F20 0%, #235347 40%, #8EB69B 100%)' },
  { gradient: 'linear-gradient(135deg, #031412 0%, #163832 50%, #b4d4be 100%)' },
  { gradient: 'linear-gradient(135deg, #1a8fc4 0%, #235347 60%, #DAF1DE 100%)' },
];

const features = [
  { Icon: Sparkles, text: 'AI symptom check', x: '8%', y: '18%', delay: '0s' },
  { Icon: CalendarCheck, text: 'Same-day booking', x: '5%', y: '55%', delay: '0.6s' },
  { Icon: Pill, text: 'Pharmacy delivery', x: '12%', y: '82%', delay: '1.2s' },
  { Icon: HeartPulse, text: 'Complete records', x: '72%', y: '12%', delay: '0.3s' },
  { Icon: Video, text: 'Video consultations', x: '78%', y: '48%', delay: '0.9s' },
  { Icon: ShieldCheck, text: 'Insurance built in', x: '68%', y: '80%', delay: '1.5s' },
];

interface AuthShellProps {
  children: React.ReactNode;
  maxWidth?: number;
}

export default function AuthShell({ children, maxWidth = 460 }: AuthShellProps) {
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setBgIndex((i) => (i + 1) % scenes.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-bg">
        {scenes.map((s, i) => (
          <div key={i} className={`auth-bg-layer ${i === bgIndex ? 'is-active' : ''}`} style={{ background: s.gradient }} />
        ))}
        <div className="auth-floats">
          {features.map(({ Icon, text, x, y, delay }, i) => (
            <div key={i} className="auth-float" style={{ left: x, top: y, animationDelay: delay }}>
              <Icon size={14} strokeWidth={1.75} />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <svg className="auth-pulse" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path
            d="M0,100 L300,100 L350,30 L400,170 L450,60 L500,140 L550,100 L1200,100"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <div className="auth-watermark">
          <img src="/assets/siryan-logo.png" alt="" />
        </div>
      </div>

      <div className="auth-card-wrap" style={{ maxWidth }}>
        <div className="auth-card">{children}</div>
        <div className="auth-trust">
          <span>
            <Lock size={13} strokeWidth={1.75} /> 256-bit encryption
          </span>
          <span>
            <ShieldCheck size={13} strokeWidth={1.75} /> HIPAA compliant
          </span>
        </div>
      </div>
    </div>
  );
}
