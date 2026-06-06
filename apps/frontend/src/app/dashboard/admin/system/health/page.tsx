'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { adminService } from '@/services/admin.service';
import type { SystemHealth, CronJobStatus, ErrorLog } from '@/types';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import { RefreshCw, Database, Layers, Wifi, Clock, Cpu, MemoryStick, Server, Activity, Zap, Radio } from 'lucide-react';

function StatusDot({ status }: { status: 'ok' | 'error' | 'degraded' | 'unavailable' }) {
  const colors: Record<string, string> = {
    ok: 'var(--positive)',
    error: 'var(--critical)',
    degraded: 'var(--caution)',
    unavailable: 'var(--critical)',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: colors[status] ?? 'var(--fg-3)',
        flexShrink: 0,
      }}
    />
  );
}

function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const color =
    percent >= 90 ? 'var(--critical)' : percent >= 70 ? 'var(--caution)' : 'var(--positive)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ height: 6, background: 'var(--bg-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(percent, 100)}%`,
            background: color,
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      {label && <p className="t-small" style={{ color: 'var(--fg-3)' }}>{label}</p>}
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

const CRON_LABELS: Record<string, string> = {
  inventory_alert: 'Inventory Alerts',
  inventory_expiry: 'Inventory Expiry',
  inventory_report: 'Inventory Report',
  appointment_reminder: 'Appt Reminders',
  profile_cleanup: 'Profile Cleanup',
  pharmacy_expiry: 'Pharmacy Expiry',
  pharmacy_report: 'Pharmacy Report',
};

function CronBadge({ status }: { status: CronJobStatus }) {
  return (
    <span
      className="badge"
      style={{
        background: status === 'running'
          ? 'color-mix(in srgb, var(--positive) 15%, transparent)'
          : 'color-mix(in srgb, var(--critical) 15%, transparent)',
        color: status === 'running' ? 'var(--positive)' : 'var(--critical)',
        fontSize: 11,
      }}
    >
      {status}
    </span>
  );
}

const LOG_LEVEL_COLOR: Record<string, string> = {
  error: 'var(--critical)',
  warn: 'var(--caution)',
  info: 'var(--info)',
};

const SKELETON_CARD = (
  <div className="card p-4" style={{ height: 100, background: 'var(--bg-surface-2)' }} />
);

export default function SystemHealthPage() {
  const { showToast } = useToast();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [h, l] = await Promise.all([
        adminService.getSystemHealth(),
        adminService.getSystemLogs(),
      ]);
      setHealth(h);
      setLogs(l);
    } catch {
      showToast('Failed to load system health', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  useSocketEvent<SystemHealth>('health_update', (data) => {
    setHealth(data);
  });

  useSocketEvent<{ severity: string; service: string; message: string; timestamp: string }>(
    'health_alert',
    useCallback((data) => {
      showToast(`Critical: ${data.message}`, 'error');
      load();
    }, [showToast, load])
  );

  const handleRefresh = () => {
    setLoading(true);
    load();
  };

  // Derive values with fallbacks for legacy shape
  const uptimeSeconds = health?.uptime ?? health?.uptime_seconds ?? 0;
  const socketConns = health?.socket?.active_connections ?? health?.socket_connections ?? 0;
  const checkedAt = health?.checked_at;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-h2">System Health</h1>
          <p className="t-body" style={{ color: 'var(--fg-2)' }}>
            {checkedAt ? `Last checked: ${new Date(checkedAt).toLocaleString()}` : 'Real-time system status'}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !health ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i}>{SKELETON_CARD}</div>)}</div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i}>{SKELETON_CARD}</div>)}</div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i}>{SKELETON_CARD}</div>)}</div>
        </div>
      ) : health && (
        <div className="space-y-6">

          {/* ── Row 1: Core Services ── */}
          <section className="space-y-3">
            <h2 className="t-h3">Core Services</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

              {/* MongoDB */}
              <div className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Database size={15} style={{ color: 'var(--fg-2)' }} />
                  <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>MongoDB</span>
                  <StatusDot status={health.mongodb.status} />
                </div>
                <p className="t-body font-medium capitalize" style={{ color: health.mongodb.status === 'ok' ? 'var(--positive)' : 'var(--critical)' }}>
                  {health.mongodb.status}
                </p>
                {health.mongodb.latency_ms !== undefined && (
                  <p className="t-small" style={{ color: 'var(--fg-3)' }}>{health.mongodb.latency_ms}ms latency</p>
                )}
              </div>

              {/* Redis */}
              <div className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Layers size={15} style={{ color: 'var(--fg-2)' }} />
                  <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Redis</span>
                  <StatusDot status={health.redis.status} />
                </div>
                <p className="t-body font-medium capitalize" style={{ color: health.redis.status === 'ok' ? 'var(--positive)' : 'var(--critical)' }}>
                  {health.redis.status}
                </p>
                {health.redis.latency_ms !== undefined && (
                  <p className="t-small" style={{ color: 'var(--fg-3)' }}>{health.redis.latency_ms}ms latency</p>
                )}
              </div>

              {/* Socket.IO */}
              <div className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Wifi size={15} style={{ color: 'var(--fg-2)' }} />
                  <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Socket.IO</span>
                </div>
                <p className="t-body font-medium">{socketConns}</p>
                <p className="t-small" style={{ color: 'var(--fg-3)' }}>active connections</p>
              </div>

              {/* Stream API */}
              <div className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Radio size={15} style={{ color: 'var(--fg-2)' }} />
                  <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Stream API</span>
                  {health.stream_api && (
                    <StatusDot status={health.stream_api.status === 'ok' ? 'ok' : 'unavailable'} />
                  )}
                </div>
                <p className="t-body font-medium capitalize" style={{ color: health.stream_api?.status === 'ok' ? 'var(--positive)' : 'var(--fg-3)' }}>
                  {health.stream_api?.status ?? 'unknown'}
                </p>
                <p className="t-small" style={{ color: 'var(--fg-3)' }}>video &amp; chat</p>
              </div>
            </div>
          </section>

          {/* ── Row 2: System Resources ── */}
          <section className="space-y-3">
            <h2 className="t-h3">System Resources</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

              {/* CPU */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu size={15} style={{ color: 'var(--fg-2)' }} />
                  <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>CPU Usage</span>
                </div>
                <p className="t-h2">{health.cpu?.usage_percent ?? 0}%</p>
                <ProgressBar
                  percent={health.cpu?.usage_percent ?? 0}
                  label={`${health.cpu?.usage_percent ?? 0}% utilization`}
                />
              </div>

              {/* Memory */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MemoryStick size={15} style={{ color: 'var(--fg-2)' }} />
                  <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Memory</span>
                </div>
                <p className="t-body font-medium">
                  {health.memory?.used_mb ?? '—'} MB / {health.memory?.total_mb ?? '—'} MB
                </p>
                <ProgressBar
                  percent={health.memory?.percent ?? 0}
                  label={`${health.memory?.percent ?? 0}% used`}
                />
              </div>

              {/* Heap */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Activity size={15} style={{ color: 'var(--fg-2)' }} />
                  <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Node Heap</span>
                </div>
                <p className="t-body font-medium">
                  {health.memory?.heap_used_mb ?? '—'} MB / {health.memory?.heap_total_mb ?? '—'} MB
                </p>
                <ProgressBar
                  percent={health.memory?.heap_total_mb
                    ? Math.round(((health.memory.heap_used_mb ?? 0) / health.memory.heap_total_mb) * 100)
                    : 0}
                  label={`heap utilization`}
                />
              </div>
            </div>
          </section>

          {/* ── Row 3: Application ── */}
          <section className="space-y-3">
            <h2 className="t-h3">Application</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">

              {/* Uptime */}
              <div className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock size={15} style={{ color: 'var(--fg-2)' }} />
                  <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Uptime</span>
                </div>
                <p className="t-body font-medium">{formatUptime(uptimeSeconds)}</p>
                <p className="t-small" style={{ color: 'var(--fg-3)' }}>{uptimeSeconds}s total</p>
              </div>

              {/* DB Connections */}
              <div className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Server size={15} style={{ color: 'var(--fg-2)' }} />
                  <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>DB Connections</span>
                </div>
                <p className="t-body font-medium">
                  {health.db_connections?.active ?? 0} active
                </p>
                <p className="t-small" style={{ color: 'var(--fg-3)' }}>
                  {health.db_connections?.available ?? 0} available
                </p>
              </div>

              {/* Last Deploy */}
              <div className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap size={15} style={{ color: 'var(--fg-2)' }} />
                  <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Last Deploy</span>
                </div>
                <p className="t-body font-medium" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {health.last_deploy?.timestamp ?? '—'}
                </p>
                <p className="t-small" style={{ color: 'var(--fg-3)' }}>commit / version</p>
              </div>
            </div>
          </section>

          {/* ── Row 4: Cron Jobs ── */}
          {health.cron_jobs && (
            <section className="space-y-3">
              <h2 className="t-h3">Background Jobs</h2>
              <div className="card p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {(Object.entries(health.cron_jobs) as [string, CronJobStatus][]).map(([key, status]) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '8px 10px',
                        background: 'var(--bg-surface-2)',
                        borderRadius: 8,
                        border: '1px solid var(--border-1)',
                      }}
                    >
                      <span className="t-small" style={{ color: 'var(--fg-2)' }}>
                        {CRON_LABELS[key] ?? key}
                      </span>
                      <CronBadge status={status} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Error Logs */}
      <section className="space-y-3">
        <h2 className="t-h3">Recent Audit Logs</h2>
        {logs.length === 0 ? (
          <div className="card p-6 text-center" style={{ color: 'var(--fg-3)' }}>No logs available</div>
        ) : (
          <div className="card overflow-x-auto" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid var(--border-1)' }}>
                  {['Timestamp', 'Level', 'Message', 'Endpoint'].map((h) => (
                    <th key={h} className="t-small" style={{ padding: '10px 12px', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id ?? i} style={{ borderBottom: '1px solid var(--border-1)' }}>
                    <td className="t-small" style={{ padding: '8px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        className="badge capitalize"
                        style={{
                          background: `color-mix(in srgb, ${LOG_LEVEL_COLOR[log.level] ?? 'var(--fg-3)'} 15%, transparent)`,
                          color: LOG_LEVEL_COLOR[log.level] ?? 'var(--fg-3)',
                          fontSize: 11,
                        }}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="t-small" style={{ padding: '8px 12px', color: 'var(--fg-1)', maxWidth: 340 }}>
                      <span title={log.stack}>{log.message}</span>
                    </td>
                    <td className="t-small" style={{ padding: '8px 12px', color: 'var(--fg-3)', fontFamily: 'monospace', fontSize: 11 }}>
                      {log.endpoint ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
