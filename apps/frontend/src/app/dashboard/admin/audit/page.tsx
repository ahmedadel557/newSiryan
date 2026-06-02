'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck, Search } from 'lucide-react';
import { useAdminAuditLog } from '@/hooks/admin';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

function actionColor(action: string): string {
  if (action.startsWith('login') || action.startsWith('logout')) return 'var(--brand)';
  if (action.startsWith('delete') || action.startsWith('reject') || action.startsWith('cancel') || action.startsWith('deactivate'))
    return 'var(--critical)';
  if (
    action.startsWith('create') ||
    action.startsWith('approve') ||
    action.startsWith('pay') ||
    action.startsWith('activate') ||
    action.startsWith('confirm')
  )
    return 'var(--positive)';
  return 'var(--fg-2)';
}

export default function AdminAuditPage() {
  const { logs, loading: isLoading } = useAdminAuditLog();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) => l.action.toLowerCase().includes(q) || l.resource.toLowerCase().includes(q) || l.performed_by?.username?.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Audit log</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">All system actions performed by staff and administrators</p>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-1)]">
          <ShieldCheck size={16} strokeWidth={1.75} className="text-[var(--brand)] shrink-0" />
          <span className="text-[15px] font-semibold text-[var(--fg-1)] flex-1">System events</span>
          <div className="flex items-center gap-2 relative">
            <Search size={14} strokeWidth={1.75} className=" text-[var(--fg-3)] " />
            <input
              className="input pl-[50px] text-[13px] py-[6px] "
              style={{ width: '220px' }}
              type="text"
              placeholder="Filter by action, resource…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0">
                <Skeleton height="13px" width="140px" />
                <Skeleton height="13px" width="80px" />
                <Skeleton height="13px" width="120px" />
                <Skeleton height="13px" width="90px" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={24} strokeWidth={1.5} />}
            title={searchQuery ? 'No matching events' : 'No audit events yet'}
            description={searchQuery ? 'Try a different search term.' : 'System activity will appear here.'}
          />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border-1)]">
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Timestamp</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">User</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Action</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Resource</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Resource ID</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Details</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-[var(--border-1)] last:border-0 hover:bg-[var(--bg-sunken)] transition-colors">
                  <td className="px-5 py-4 text-[var(--fg-3)] font-mono text-[12px] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-[var(--fg-1)]">{log.performed_by?.username ?? '—'}</p>
                    <p className="text-[10px] text-[var(--fg-3)] font-mono mt-0.5">{log.performed_by?.role ?? ''}</p>
                  </td>
                  <td className="px-5 py-4 font-medium" style={{ color: actionColor(log.action) }}>
                    {log.action.replace(/_/g, ' ')}
                  </td>
                  <td className="px-5 py-4 text-[var(--fg-2)]">{log.resource}</td>
                  <td className="px-5 py-4 text-[var(--fg-3)] font-mono text-[12px]">{log.resource_id ?? '—'}</td>
                  <td className="px-5 py-4 text-[var(--fg-3)] text-[12px] max-w-[200px] truncate">{log.details ?? '—'}</td>
                  <td className="px-5 py-4 text-[var(--fg-3)] font-mono text-[12px]">{log.ip_address ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
