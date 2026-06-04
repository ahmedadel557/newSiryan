import { Badge } from '@/components/ui/Badge';

export default function AdminMock() {
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
        <Badge variant="caution" dot>
          3 low-stock items
        </Badge>
        <Badge variant="positive" dot>
          All systems healthy
        </Badge>
      </div>
    </div>
  );
}
