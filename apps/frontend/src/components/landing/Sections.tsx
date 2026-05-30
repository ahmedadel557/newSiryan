import Link from 'next/link';
import { UserPlus, CalendarPlus, Stethoscope, Pill, ArrowRight } from 'lucide-react';

const howSteps = [
  {
    num: '01',
    icon: <UserPlus size={24} strokeWidth={1.75} />,
    title: 'Create your account',
    desc: 'Sign up in under a minute. No paperwork, no waiting.',
  },
  {
    num: '02',
    icon: <CalendarPlus size={24} strokeWidth={1.75} />,
    title: 'Book or chat',
    desc: 'Pick a doctor and time, or start with Siryan Assistant for a quick symptom check.',
  },
  {
    num: '03',
    icon: <Stethoscope size={24} strokeWidth={1.75} />,
    title: 'See your doctor',
    desc: 'Visit in person or by video. Prescriptions and lab orders happen right in the session.',
  },
  {
    num: '04',
    icon: <Pill size={24} strokeWidth={1.75} />,
    title: 'Get your medication',
    desc: 'Pick up at the hospital pharmacy or get it delivered. Insurance is applied automatically.',
  },
];

export function HowSection() {
  return (
    <section className="ln-how" id="how">
      <div className="ln-section-inner">
        <div className="ln-section-head">
          <span className="ln-eyebrow">How it works</span>
          <h2 className="ln-section-title">Four steps to better care</h2>
        </div>
        <div className="ln-how-steps">
          {howSteps.map((s) => (
            <div key={s.num} className="ln-how-step">
              <span className="ln-how-num">{s.num}</span>
              <span className="ln-how-icon">{s.icon}</span>
              <h3 className="ln-how-title">{s.title}</h3>
              <p className="ln-how-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="ln-cta">
      <div className="ln-cta-inner">
        <img src="/assets/siryan-logo.png" alt="" className="ln-cta-logo" />
        <h2 className="ln-cta-title">Ready to simplify your healthcare?</h2>
        <p className="ln-cta-sub">Create a free patient account today. No credit card needed.</p>
        <div className="ln-cta-actions">
          <Link href="/auth/register" className="btn btn-primary btn-lg" style={{ background: 'var(--bg-surface)', color: 'var(--forest-800)' }}>
            <ArrowRight size={16} strokeWidth={1.75} />
            Get started free
          </Link>
          <Link
            href="/auth/login"
            className="btn btn-secondary btn-lg"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff', background: 'rgba(255,255,255,0.08)' }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FooterSection() {
  return (
    <footer className="ln-footer">
      <div className="ln-footer-inner">
        <div className="ln-footer-brand">
          <img src="/assets/siryan-logo.png" alt="" className="ln-footer-logo" />
          <span className="ln-footer-name">Siryan</span>
          <p className="ln-footer-tagline">Healthcare, organised.</p>
        </div>
        <div className="ln-footer-cols">
          <div>
            <div className="ln-footer-head">Product</div>
            <a href="#features">Features</a>
            <a href="#roles">Pricing</a>
            <a href="#how">For hospitals</a>
            <a href="#features">Security</a>
          </div>
          <div>
            <div className="ln-footer-head">Support</div>
            <a href="#">Help center</a>
            <a href="#">Contact us</a>
            <a href="#">Status</a>
          </div>
          <div>
            <div className="ln-footer-head">Legal</div>
            <a href="#">Privacy policy</a>
            <a href="#">Terms of service</a>
            <a href="#">Data processing</a>
          </div>
        </div>
      </div>
      <div className="ln-footer-bottom">
        <span>© 2026 Siryan. All rights reserved.</span>
        <span>For emergencies, call 112 — do not use this platform.</span>
      </div>
    </footer>
  );
}
