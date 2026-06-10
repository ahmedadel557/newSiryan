'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { UserRound, Stethoscope, Building2, Check, ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';


const MockPlaceholder = () => (
  <div className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--bg-sunken)' }} />
);

const PatientMock = dynamic(() => import('./mocks/PatientMock'), {
  ssr: false,
  loading: MockPlaceholder,
});

const ClinicalMock = dynamic(() => import('./mocks/ClinicalMock'), {
  ssr: false,
  loading: MockPlaceholder,
});

const AdminMock = dynamic(() => import('./mocks/AdminMock'), {
  ssr: false,
  loading: MockPlaceholder,
});

type RoleKey = 'patient' | 'clinical' | 'admin';

interface RoleDef {
  label: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  points: string[];
}

const roles: Record<RoleKey, RoleDef> = {
  patient: {
    label: 'For patients',
    icon: <UserRound size={16} strokeWidth={1.75} />,
    title: 'Your health, on your schedule',
    desc: 'Book appointments, talk to Siryan Assistant, get prescriptions, and access your complete history — anytime, anywhere.',
    points: [
      'Book appointments and see real-time availability',
      'Talk to Siryan Assistant about symptoms or scans',
      'Order medication with insurance coverage shown upfront',
      'Access your complete medical history anytime',
    ],
  },
  clinical: {
    label: 'For clinical staff',
    icon: <Stethoscope size={16} strokeWidth={1.75} />,
    title: 'Less admin, more care',
    desc: 'Doctors, nurses, pharmacists, lab and radiology techs each get a tailored dashboard. Write diagnoses, prescribe, dispense, flag emergencies — all in one flow.',
    points: [
      'See only your assigned patients and department',
      'Write diagnoses, prescriptions, and lab orders in one flow',
      'Nurses record vitals and flag emergencies instantly',
      'Pharmacists verify prescriptions with one-click approve',
    ],
  },
  admin: {
    label: 'For hospital admin',
    icon: <Building2 size={16} strokeWidth={1.75} />,
    title: 'Full visibility, zero guesswork',
    desc: 'Real-time operational insight: bed occupancy, revenue, doctor performance, inventory alerts, and a full audit log of every action.',
    points: [
      'Real-time bed occupancy, revenue, and doctor performance',
      'Manage all user accounts, roles, and departments',
      'Automatic low-stock alerts for inventory and pharmacy',
      'Audit logs for every action in the system',
    ],
  },
};

export function RolesSection() {
  const [active, setActive] = useState<RoleKey>('patient');
  const current = roles[active];

  return (
    <section className="roles" id="roles">
      <div className="section-inner">
        <Reveal className="section-head">
          <span className="section-eyebrow">Who it&apos;s for</span>
          <h2 className="section-title">
            One platform, <span className="grad-text">every role</span>
          </h2>
          <p className="section-sub">
            Patients, doctors, nurses, pharmacists, lab and radiology techs, cashiers, and administrators. Each gets their own view.
          </p>
        </Reveal>

        <Reveal className="roles-tabs">
          {(Object.entries(roles) as [RoleKey, RoleDef][]).map(([key, r]) => (
            <button
              key={key}
              className={`roles-tab${active === key ? ' is-active' : ''}`}
              onClick={() => setActive(key)}
            >
              {r.icon}
              <span>{r.label}</span>
            </button>
          ))}
        </Reveal>

        <div className="roles-panel">
          <div className="roles-panel-text">
            <h3 className="roles-panel-title">{current.title}</h3>
            <p className="roles-panel-desc">{current.desc}</p>
            <ul className="roles-panel-list">
              {current.points.map((p, i) => (
                <li key={i} style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="roles-check">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Link
              href={active === 'patient' ? '/auth/register' : '/auth/login'}
              className="btn btn-primary roles-cta"
            >
              {active === 'patient' ? 'Try the patient app' : 'Explore the staff portal'}
              <ArrowRight className="rtl:rotate-180" size={14} strokeWidth={1.75} />
            </Link>
          </div>

          {(['patient', 'clinical', 'admin'] as const).map((tab) => (
            <div
              key={tab}
              className={`roles-mock roles-mock-${tab}${active === tab ? '' : ' hidden'}`}
              aria-hidden={active !== tab}
            >
              {tab === 'patient' && <PatientMock />}
              {tab === 'clinical' && <ClinicalMock />}
              {tab === 'admin' && <AdminMock />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
