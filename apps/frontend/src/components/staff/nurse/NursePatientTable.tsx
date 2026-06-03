import { HeartPulse, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Profile } from '@/types';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

type VitalsStatus = 'Overdue' | 'Due now' | 'Done' | 'Due in 30m';

function deriveVitalsStatus(index: number): VitalsStatus {
  const statuses: VitalsStatus[] = ['Due now', 'Overdue', 'Done', 'Due now', 'Done', 'Due in 30m'];
  return statuses[index % statuses.length];
}

const statusVariant: Record<VitalsStatus, 'critical' | 'caution' | 'positive' | 'neutral'> = {
  Overdue: 'critical',
  'Due now': 'caution',
  Done: 'positive',
  'Due in 30m': 'neutral',
};

const hasFlag = (index: number) => index === 1;

interface NursePatientTableProps {
  patients: Profile[];
  isLoading: boolean;
  onRecordVitals: (patientId: string) => void;
  onEmergency: (patientId: string) => void;
}

export function NursePatientTable({ patients, isLoading, onRecordVitals, onEmergency }: NursePatientTableProps) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Patients in ward</p>
        <button className="btn btn-ghost text-[12px] py-[4px]">Refresh</button>
      </div>

      {isLoading ? (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Patient</th>
              <th className={thClass}>Vitals status</th>
              <th className={thClass}>Last recorded</th>
              <th className={thClass}>Flag</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className={tdClass}>
                  <div className="h-4 w-32 rounded bg-[var(--sand-100)] animate-pulse" />
                </td>
                <td className={tdClass}>
                  <div className="h-4 w-20 rounded bg-[var(--sand-100)] animate-pulse" />
                </td>
                <td className={tdClass}>
                  <div className="h-4 w-16 rounded bg-[var(--sand-100)] animate-pulse" />
                </td>
                <td className={tdClass}>
                  <div className="h-4 w-24 rounded bg-[var(--sand-100)] animate-pulse" />
                </td>
                <td className={tdClass}>
                  <div className="h-4 w-16 rounded bg-[var(--sand-100)] animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : patients.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<HeartPulse />} title="No patients assigned" description="No patients are currently assigned to you." />
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Patient</th>
              <th className={thClass}>Vitals status</th>
              <th className={thClass}>Last recorded</th>
              <th className={thClass}>Flag</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {patients.map((patient, i) => {
              const status = deriveVitalsStatus(i);
              const flagged = hasFlag(i);
              const fullName = `${patient.first_name} ${patient.last_name}`;
              return (
                <tr key={patient.id} className="hover:bg-[var(--sand-50)] transition-colors">
                  <td className={tdClass}>
                    <div className="flex items-center gap-[10px]">
                      <Avatar name={fullName} size="sm" />
                      <div>
                        <div className="font-semibold text-[var(--fg-1)]">{fullName}</div>
                        <div className="font-mono text-[11px] text-[var(--fg-3)]">{patient.national_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className={tdClass}>
                    <Badge variant={statusVariant[status]} dot>
                      {status}
                    </Badge>
                  </td>
                  <td className={`${tdClass} text-[var(--fg-3)] text-[12px]`}>
                    {i === 0 ? '2h ago' : i === 1 ? '4h ago' : i === 2 ? '30 min ago' : `${i}h ago`}
                  </td>
                  <td className={tdClass}>
                    {flagged ? (
                      <Badge variant="critical">
                        <AlertTriangle size={12} /> BP 180/110 — flagged
                      </Badge>
                    ) : (
                      <span className="text-[var(--fg-3)] text-[12px]">—</span>
                    )}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      {flagged && (
                        <button
                          onClick={() => onEmergency(patient.id)}
                          className="btn btn-ghost text-[12px] py-[4px]"
                          style={{ color: 'var(--critical-soft-fg)' }}
                        >
                          <AlertTriangle size={13} />
                        </button>
                      )}
                      <button onClick={() => onRecordVitals(patient.id)} className="btn btn-primary text-[12px] py-[4px] px-3 flex items-center gap-1">
                        <HeartPulse size={13} /> Record
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
