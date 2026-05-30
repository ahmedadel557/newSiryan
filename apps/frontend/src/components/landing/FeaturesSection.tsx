import { Sparkles, CalendarCheck, Pill, Video, FileText, ShieldCheck, BedDouble, ArrowUpRight } from 'lucide-react';
import { Reveal } from './Reveal';

const small = [
  { icon: <CalendarCheck size={22} strokeWidth={1.75} />, title: 'Same-day booking', desc: 'Real-time doctor availability. Book in under a minute.' },
  { icon: <Pill size={22} strokeWidth={1.75} />, title: 'Pharmacy & delivery', desc: 'OTC ships now. Prescriptions verified in minutes.' },
  { icon: <Video size={22} strokeWidth={1.75} />, title: 'Video consultations', desc: 'Talk to your doctor face-to-face from home.' },
  { icon: <FileText size={22} strokeWidth={1.75} />, title: 'Complete records', desc: 'Vitals, labs, scans — one timeline.' },
  { icon: <ShieldCheck size={22} strokeWidth={1.75} />, title: 'Insurance built in', desc: 'Coverage visible at every step. No surprises.' },
  { icon: <BedDouble size={22} strokeWidth={1.75} />, title: 'Room booking', desc: 'Operation rooms, ICU, radiology — with assigned doctor.' },
];

export function FeaturesSection() {
  return (
    <section className="features" id="features">
      <div className="section-inner">
        <Reveal className="section-head">
          <span className="section-eyebrow">Features</span>
          <h2 className="section-title">
            Everything in <span className="grad-text">one place</span>
          </h2>
          <p className="section-sub">No more phone calls, paper forms, or separate pharmacy runs.</p>
        </Reveal>

        <div className="bento-grid">
          <Reveal className="bento-card bento-big" delay={0}>
            <div className="bento-big-bg" />
            <div className="bento-big-content">
              <span className="bento-tag">
                <Sparkles size={12} strokeWidth={1.75} /> AI-powered
              </span>
              <h3 className="bento-big-title">Siryan Assistant</h3>
              <p className="bento-big-desc">
                Talk to an AI medical assistant in Arabic or English. Upload prescriptions and scans for instant
                analysis. Every conversation is saved to your medical record so your doctor sees the full context.
              </p>
              <div className="bento-big-badge">
                <span className="bento-big-badge-pulse" />
                Powered by Claude
              </div>

              <div className="bento-chat-preview">
                <div className="bento-chat-bubble bot">
                  <Sparkles size={14} strokeWidth={1.75} />
                  <span>How can I help you today?</span>
                </div>
                <div className="bento-chat-bubble user">
                  <span>I&apos;ve had a headache for two days...</span>
                </div>
                <div className="bento-chat-bubble bot typing">
                  <Sparkles size={14} strokeWidth={1.75} />
                  <div className="bento-chat-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {small.map((f, i) => (
            <Reveal key={i} className="bento-card bento-small" delay={100 + i * 80}>
              <div className="bento-small-icn">{f.icon}</div>
              <h3 className="bento-small-title">{f.title}</h3>
              <p className="bento-small-desc">{f.desc}</p>
              <div className="bento-small-arrow">
                <ArrowUpRight size={18} strokeWidth={1.75} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
