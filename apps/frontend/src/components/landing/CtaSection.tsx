import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Lock, Zap } from 'lucide-react';
import { Reveal } from './Reveal';

export function CtaSection() {
  return (
    <section className="cta">
      <div className="cta-bg">
        <div className="cta-blob cta-blob-1" />
        <div className="cta-blob cta-blob-2" />
      </div>
      <Reveal className="cta-inner">
        <Image src="/assets/siryan-logo.png" alt="" className="cta-logo" width={64} height={64} />
        <h2 className="cta-title">
          Ready to simplify<br />
          <span className="grad-text-light">your healthcare?</span>
        </h2>
        <p className="cta-sub">Create a free patient account today. No credit card needed.</p>
        <div className="cta-actions">
          <Link href="/auth/register" className="btn btn-lg cta-primary">
            <ArrowRight size={16} strokeWidth={1.75} /> Get started free
          </Link>
          <Link href="/auth/login" className="btn btn-lg cta-secondary">
            Sign in
          </Link>
        </div>
        <div className="cta-trust">
          <span><ShieldCheck size={14} strokeWidth={1.75} /> HIPAA compliant</span>
          <span><Lock size={14} strokeWidth={1.75} /> End-to-end encrypted</span>
          <span><Zap size={14} strokeWidth={1.75} /> Setup in 1 minute</span>
        </div>
      </Reveal>
    </section>
  );
}
