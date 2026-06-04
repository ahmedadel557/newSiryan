import { Sparkles, Stethoscope, Pill, BedDouble } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function PatientMock() {
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
        <Badge variant="positive" dot>
          Confirmed
        </Badge>
      </div>
    </div>
  );
}
