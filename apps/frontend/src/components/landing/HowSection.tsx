import { UserPlus, CalendarPlus, Stethoscope, Pill } from 'lucide-react';
import { Reveal } from './Reveal';

const steps = [
  { num: '01', icon: <UserPlus size={18} strokeWidth={1.75} />, title: 'Create your account', desc: 'Sign up in under a minute. No paperwork, no waiting.' },
  { num: '02', icon: <CalendarPlus size={18} strokeWidth={1.75} />, title: 'Book or chat', desc: 'Pick a doctor, or start with Siryan Assistant for a quick check.' },
  { num: '03', icon: <Stethoscope size={18} strokeWidth={1.75} />, title: 'See your doctor', desc: 'Visit in person or by video. Prescriptions happen in-session.' },
  { num: '04', icon: <Pill size={18} strokeWidth={1.75} />, title: 'Get medication', desc: 'Pickup or delivery. Insurance applied automatically.' },
];

export function HowSection() {
  return (
    <section className="how" id="how">
      <div className="section-inner">
        <Reveal className="section-head">
          <span className="section-eyebrow">How it works</span>
          <h2 className="section-title">
            Four steps to <span className="grad-text">better care</span>
          </h2>
        </Reveal>

        <div className="how-timeline">
          <div className="how-timeline-line" />
          {steps.map((s, i) => (
            <Reveal key={i} className={`how-step ${i % 2 === 0 ? 'left' : 'right'}`} delay={i * 120}>
              <div className="how-step-card">
                <div className="how-step-head">
                  <span className="how-step-num">{s.num}</span>
                  <span className="how-step-icn">{s.icon}</span>
                </div>
                <h3 className="how-step-title">{s.title}</h3>
                <p className="how-step-desc">{s.desc}</p>
              </div>
              <div className="how-step-dot" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
