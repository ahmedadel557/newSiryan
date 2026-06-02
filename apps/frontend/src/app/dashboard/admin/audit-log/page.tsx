'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck, Search, X } from 'lucide-react';
import { useAdminAuditLog, useAdminUsers } from '@/hooks/admin';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

type ActionCategory = 'all' | 'login' | 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'pay' | 'other';

const ACTION_CATEGORIES: { id: ActionCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'login', label: 'Login / Logout' },
  { id: 'create', label: 'Create' },
  { id: 'update', label: 'Update' },
  { id: 'delete', label: 'Delete' },
  { id: 'approve', label: 'Approve' },
  { id: 'reject', label: 'Reject' },
  { id: 'pay', label: 'Payment' },
  { id: 'other', label: 'Other' },
];

function matchCategory(action: string, cat: ActionCategory): boolean {
  if (cat === 'all') return true;
  if (cat === 'login') return action.startsWith('login') || action.startsWith('logout');
  if (cat === 'create') return action.startsWith('create');
  if (cat === 'update') return action.startsWith('update') || action.startsWith('edit') || action.startsWith('change') || action.startsWith('activate') || action.startsWith('deactivate');
  if (cat === 'delete') return action.startsWith('delete') || action.startsWith('cancel') || action.startsWith('remove');
  if (cat === 'approve') return action.startsWith('approve');
  if (cat === 'reject') return action.startsWith('reject');
  if (cat === 'pay') return action.startsWith('pay') || action.startsWith('partial') || action.startsWith('invoice');
  // 'other': anything that doesn't match above
  return !['login', 'logout', 'create', 'update', 'edit', 'change', 'activate', 'deactivate', 'delete', 'cancel', 'remove', 'approve', 'reject', 'pay', 'partial', 'invoice'].some((prefix) => action.startsWith(prefix));
}

function actionColor(action: string): string {
  if (action.startsWith('login') || action.startsWith('logout')) return 'var(--brand)';
  if (action.startsWith('delete') || action.startsWith('reject') || action.startsWith('cancel') || action.startsWith('deactivate'))
    return 'var(--critical)';
  if (action.startsWith('create') || action.startsWith('approve') || action.startsWith('pay') || action.startsWith('activate') || action.startsWith('confirm'))
    return 'var(--positive)';
  return 'var(--fg-2)';
}

export default function AdminAuditLogPage() {
  const { logs, loading: isLoading } = useAdminAuditLog();
  const { allUsers } = useAdminUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionCat, setActionCat] = useState<ActionCategory>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const usernames = useMemo(
    () => Array.from(new Set(allUsers.map((u) => u.username))).sort(),
    [allUsers]
  );

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = l.action.toLowerCase().includes(q) || l.resource.toLowerCase().includes(q) || l.performed_by?.username?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (userFilter && l.performed_by?.username !== userFilter) return false;
      if (!matchCategory(l.action, actionCat)) return false;
      if (dateFrom && l.created_at < dateFrom) return false;
      if (dateTo && l.created_at > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [logs, searchQuery, userFilter, actionCat, dateFrom, dateTo]);

  const hasFilters = searchQuery || userFilter || actionCat !== 'all' || dateFrom || dateTo;

  function clearAll() {
    setSearchQuery('');
    setUserFilter('');
    setActionCat('all');
    setDateFrom('');
    setDateTo('');
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Audit log</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">All system actions performed by staff and administrators</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--fg-3)] uppercase tracking-[0.06em]">Search</label>
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-3 text-[var(--fg-3)]" />
            <input
              className="input pl-8 h-9 text-[13px] w-[200px]"
              type="text"
              placeholder="Action, resource, user…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* User filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--fg-3)] uppercase tracking-[0.06em]">User</label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="input h-9 text-[13px] pr-8"
            style={{ minWidth: 160 }}
          >
            <option value="">All users</option>
            {usernames.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* Action category */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--fg-3)] uppercase tracking-[0.06em]">Action type</label>
          <select
            value={actionCat}
            onChange={(e) => setActionCat(e.target.value as ActionCategory)}
            className="input h-9 text-[13px] pr-8"
            style={{ minWidth: 140 }}
          >
            {ACTION_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--fg-3)] uppercase tracking-[0.06em]">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input h-9 text-[13px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--fg-3)] uppercase tracking-[0.06em]">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input h-9 text-[13px]"
          />
        </div>

        {hasFilters && (
          <button onClick={clearAll} className="btn btn-ghost text-[12px] h-9 flex items-center gap-1 self-end">
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && <Badge variant="neutral">Search: "{searchQuery}"</Badge>}
          {userFilter && <Badge variant="neutral">User: {userFilter}</Badge>}
          {actionCat !== 'all' && <Badge variant="neutral">Type: {ACTION_CATEGORIES.find((c) => c.id === actionCat)?.label}</Badge>}
          {dateFrom && <Badge variant="neutral">From: {dateFrom}</Badge>}
          {dateTo && <Badge variant="neutral">To: {dateTo}</Badge>}
          <span className="text-[12px] text-[var(--fg-3)] self-center">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-1)]">
          <ShieldCheck size={16} strokeWidth={1.75} className="text-[var(--brand)] shrink-0" />
          <span className="text-[15px] font-semibold text-[var(--fg-1)] flex-1">System events</span>
          <span className="text-[12px] text-[var(--fg-3)] tabular-nums">{filtered.length} / {logs.length}</span>
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
            title={hasFilters ? 'No matching events' : 'No audit events yet'}
            description={hasFilters ? 'Try adjusting your filters.' : 'System activity will appear here.'}
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
                    {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
