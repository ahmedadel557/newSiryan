'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { adminService } from '@/services/admin.service';
import type { SystemHealth, ErrorLog } from '@/types';
import { useToast } from '@/hooks/useToast';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { RefreshCw, Database, Layers, Wifi, Clock, Cpu } from 'lucide-react';

function StatusDot({ status }: { status: 'ok' | 'error' | 'degraded' }) {
  const colors = { ok: 'var(--positive)', error: 'var(--critical)', degraded: 'var(--caution)' };
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: colors[status],
        flexShrink: 0,
      }}
    />
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

const LOG_LEVEL_COLOR: Record<string, string> = {
  error: 'var(--critical)',
  warn: 'var(--caution)',
  info: 'var(--info)',
};

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-h2">System Health</h1>
          <p className="t-body" style={{ color: 'var(--fg-2)' }}>
            {health?.checked_at ? `Last checked: ${new Date(health.checked_at).toLocaleString()}` : 'Real-time system status'}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Status cards */}
      {loading && !health ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4" style={{ height: 100, background: 'var(--bg-surface-2)' }} />
          ))}
        </div>
      ) : health && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {/* MongoDB */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Database size={16} style={{ color: 'var(--fg-2)' }} />
              <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>MongoDB</span>
              <StatusDot status={health.mongodb.status} />
            </div>
            <p className="t-body font-medium capitalize" style={{ color: health.mongodb.status === 'ok' ? 'var(--positive)' : 'var(--critical)' }}>
              {health.mongodb.status}
            </p>
            {health.mongodb.latency_ms !== undefined && (
              <p className="t-small" style={{ color: 'var(--fg-3)' }}>{health.mongodb.latency_ms}ms</p>
            )}
            {health.mongodb.message && <p className="t-small" style={{ color: 'var(--fg-3)' }}>{health.mongodb.message}</p>}
          </div>

          {/* Redis */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Layers size={16} style={{ color: 'var(--fg-2)' }} />
              <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Redis</span>
              <StatusDot status={health.redis.status} />
            </div>
            <p className="t-body font-medium capitalize" style={{ color: health.redis.status === 'ok' ? 'var(--positive)' : 'var(--critical)' }}>
              {health.redis.status}
            </p>
            {health.redis.latency_ms !== undefined && (
              <p className="t-small" style={{ color: 'var(--fg-3)' }}>{health.redis.latency_ms}ms</p>
            )}
            {health.redis.message && <p className="t-small" style={{ color: 'var(--fg-3)' }}>{health.redis.message}</p>}
          </div>

          {/* Socket.io */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Wifi size={16} style={{ color: 'var(--fg-2)' }} />
              <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Socket.io</span>
            </div>
            <p className="t-body font-medium">{health.socket_connections}</p>
            <p className="t-small" style={{ color: 'var(--fg-3)' }}>active connections</p>
          </div>

          {/* Uptime */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Clock size={16} style={{ color: 'var(--fg-2)' }} />
              <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Uptime</span>
            </div>
            <p className="t-body font-medium">{formatUptime(health.uptime_seconds)}</p>
            <p className="t-small" style={{ color: 'var(--fg-3)' }}>{health.uptime_seconds}s total</p>
          </div>

          {/* Memory */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Cpu size={16} style={{ color: 'var(--fg-2)' }} />
              <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Memory</span>
            </div>
            <p className="t-body font-medium">{health.memory?.used_mb ?? '—'}MB / {health.memory?.total_mb ?? '—'}MB</p>
            <div style={{ height: 6, background: 'var(--bg-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${health.memory?.percentage ?? 0}%`,
                  background: (health.memory?.percentage ?? 0) > 85 ? 'var(--critical)' : (health.memory?.percentage ?? 0) > 65 ? 'var(--caution)' : 'var(--positive)',
                  borderRadius: 4,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p className="t-small" style={{ color: 'var(--fg-3)' }}>{health.memory?.percentage ?? 0}% used</p>
          </div>
        </div>
      )}

      {/* Error Logs */}
      <section className="space-y-3">
        <h2 className="t-h3">Recent Error Logs</h2>
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
