'use client';
import { useState } from 'react';
import Link from 'next/link';
import { UserRound, Stethoscope, Building2, Check, Sparkles, Pill, BedDouble, AlertTriangle, ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

type RoleKey = 'patient' | 'clinical' | 'admin';

interface RoleDef {
  label: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  points: string[];
  mock: RoleKey;
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
    mock: 'patient',
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
    mock: 'clinical',
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
    mock: 'admin',
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

        <div className="roles-panel" key={active}>
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
              <ArrowRight size={14} strokeWidth={1.75} />
            </Link>
          </div>

          <div className={`roles-mock roles-mock-${current.mock}`}>
            {current.mock === 'patient' && <PatientMock />}
            {current.mock === 'clinical' && <ClinicalMock />}
            {current.mock === 'admin' && <AdminMock />}
          </div>
        </div>
      </div>
    </section>
  );
}

function PatientMock() {
  return (
    <div className="rmock-frame">
      <div className="rmock-hero">
        <div className="rmock-hero-eyebrow">Good afternoon</div>
        <div className="rmock-hero-title">Hello, Layla.</div>
        <div className="rmock-hero-sub">One upcoming visit · 2 prescriptions ready</div>
      </div>
      <div className="rmock-shortcuts">
        <div className="rmock-short" style={{ background: 'rgba(94,96,196,0.15)', color: '#5a60c4' }}>
          <Sparkles size={22} strokeWidth={1.75} />
        </div>
        <div className="rmock-short" style={{ background: 'rgba(35,83,71,0.15)', color: '#235347' }}>
          <Stethoscope size={22} strokeWidth={1.75} />
        </div>
        <div className="rmock-short" style={{ background: 'rgba(22,134,74,0.15)', color: '#16864a' }}>
          <Pill size={22} strokeWidth={1.75} />
        </div>
        <div className="rmock-short" style={{ background: 'var(--bg-sunken)' }}>
          <BedDouble size={22} strokeWidth={1.75} />
        </div>
      </div>
      <div className="rmock-appt">
        <div className="rmock-appt-date">
          <div>Thu</div>
          <div className="rmock-appt-num">16</div>
        </div>
        <div className="rmock-appt-body">
          <div className="rmock-appt-title">Cardiology follow-up</div>
          <div className="rmock-appt-sub">Dr. Saleh · 10:30 AM</div>
        </div>
        <span className="chip chip-pos">
          <span className="chip-dot" />
          Confirmed
        </span>
      </div>
    </div>
  );
}

function ClinicalMock() {
  return (
    <div className="rmock-frame">
      <div className="rmock-head-row">
        <div>
          <div className="rmock-eyebrow">Today · 9 visits</div>
          <div className="rmock-page-title">My patients</div>
        </div>
        <span className="chip chip-crit" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={11} strokeWidth={1.75} />
          1 emergency
        </span>
      </div>
      <div className="rmock-stats">
        <div>
          <div className="rmock-stat-val">7</div>
          <div className="rmock-stat-label">Scheduled</div>
        </div>
        <div>
          <div className="rmock-stat-val">2</div>
          <div className="rmock-stat-label">Awaiting</div>
        </div>
        <div>
          <div className="rmock-stat-val">3</div>
          <div className="rmock-stat-label">Lab pending</div>
        </div>
      </div>
      <div className="rmock-table">
        {['Layla Karam · Cardiology', 'Hadi Mansour · BP flag', 'Maya Tarabay · Follow-up'].map((s, i) => (
          <div key={i} className="rmock-tr">
            <span className="rmock-tr-avatar">
              {s.split(' ').slice(0, 2).map((n) => n[0]).join('')}
            </span>
            <span className="rmock-tr-text">{s}</span>
            <span className={`rmock-tr-status ${i === 1 ? 'crit' : 'pos'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminMock() {
  return (
    <div className="rmock-frame">
      <div className="rmock-eyebrow">Hospital overview</div>
      <div className="rmock-kpis">
        <div className="rmock-kpi">
          <div className="rmock-kpi-val">84</div>
          <div className="rmock-kpi-label">Active staff</div>
          <div className="rmock-kpi-delta up">+4</div>
        </div>
        <div className="rmock-kpi">
          <div className="rmock-kpi-val">74%</div>
          <div className="rmock-kpi-label">Occupancy</div>
          <div className="rmock-kpi-delta up">+5%</div>
        </div>
        <div className="rmock-kpi">
          <div className="rmock-kpi-val">₺18M</div>
          <div className="rmock-kpi-label">Revenue</div>
          <div className="rmock-kpi-delta up">+12%</div>
        </div>
      </div>
      <svg className="rmock-chart" viewBox="0 0 300 80">
        <defs>
          <linearGradient id="adminChartGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#235347" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#235347" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,60 L40,50 L80,55 L120,40 L160,42 L200,28 L240,32 L300,18 L300,80 L0,80 Z"
          fill="url(#adminChartGrad)"
        />
        <path
          d="M0,60 L40,50 L80,55 L120,40 L160,42 L200,28 L240,32 L300,18"
          fill="none"
          stroke="#235347"
          strokeWidth="2"
        />
      </svg>
      <div className="rmock-alerts">
        <span className="chip chip-caut">
          <span className="chip-dot" />
          3 low-stock items
        </span>
        <span className="chip chip-pos">
          <span className="chip-dot" />
          All systems healthy
        </span>
      </div>
    </div>
  );
}
