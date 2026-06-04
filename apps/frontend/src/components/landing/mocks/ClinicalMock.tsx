import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function ClinicalMock() {
  return (
    <div className="rmock-frame">
      <div className="rmock-head-row">
        <div>
          <div className="rmock-eyebrow">Today · 9 visits</div>
          <div className="rmock-page-title">My patients</div>
        </div>
        <Badge variant="critical">
          <AlertTriangle size={11} strokeWidth={1.75} />
          1 emergency
        </Badge>
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
