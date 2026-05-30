'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminService } from '@/services/admin.service';
import type { PricingSettings, PricingTestItem, RadiologyScanItem, MaintenanceStatus, EmailTemplate } from '@/types';
import { useToast } from '@/hooks/useToast';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { Plus, Trash2, Save, Eye, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

type Tab = 'pricing' | 'maintenance' | 'email';

// ---------- Pricing Tab ----------
function PricingTab() {
  const { showToast } = useToast();
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingBanner, setPricingBanner] = useState(false);

  // Local editable states per section
  const [appt, setAppt] = useState({ physical_fee: 0, online_fee: 0 });
  const [rooms, setRooms] = useState({ general_per_day: 0, icu_per_day: 0, operation_per_day: 0, radiology_per_day: 0 });
  const [pharmacy, setPharmacy] = useState({ delivery_fee: 0 });
  const [labTests, setLabTests] = useState<PricingTestItem[]>([]);
  const [radioScans, setRadioScans] = useState<RadiologyScanItem[]>([]);
  const [newLab, setNewLab] = useState<PricingTestItem>({ test_name: '', price: 0 });
  const [newRadio, setNewRadio] = useState<RadiologyScanItem>({ scan_type: '', price: 0 });

  const [saving, setSaving] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await adminService.getPricing();
      setPricing(p);
      setAppt({ physical_fee: p.appointments.physical_fee, online_fee: p.appointments.online_fee });
      setRooms({ ...p.rooms });
      setPharmacy({ delivery_fee: p.pharmacy.delivery_fee });
      setLabTests(p.lab ?? []);
      setRadioScans(p.radiology ?? []);
    } catch {
      showToast('Failed to load pricing', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  useSocketEvent('pricing_updated', () => setPricingBanner(true));

  const save = async (section: string, data: Partial<PricingSettings>) => {
    setSaving(section);
    try {
      const updated = await adminService.updatePricing(data);
      setPricing(updated);
      showToast('Pricing updated');
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving('');
    }
  };

  const handleAddLab = async () => {
    if (!newLab.test_name || newLab.price <= 0) return;
    try {
      const updated = await adminService.addLabTest(newLab);
      setLabTests(updated.lab ?? []);
      setNewLab({ test_name: '', price: 0 });
      showToast('Lab test added');
    } catch {
      showToast('Failed to add lab test', 'error');
    }
  };

  const handleDeleteLab = async (test_name: string) => {
    try {
      const updated = await adminService.deleteLabTest(test_name);
      setLabTests(updated.lab ?? []);
      showToast('Lab test removed');
    } catch {
      showToast('Failed to remove', 'error');
    }
  };

  const handleAddRadio = async () => {
    if (!newRadio.scan_type || newRadio.price <= 0) return;
    try {
      const updated = await adminService.addRadiologyScan(newRadio);
      setRadioScans(updated.radiology ?? []);
      setNewRadio({ scan_type: '', price: 0 });
      showToast('Radiology scan added');
    } catch {
      showToast('Failed to add scan', 'error');
    }
  };

  const handleDeleteRadio = async (scan_type: string) => {
    try {
      const updated = await adminService.deleteRadiologyScan(scan_type);
      setRadioScans(updated.radiology ?? []);
      showToast('Scan removed');
    } catch {
      showToast('Failed to remove', 'error');
    }
  };

  if (loading) return <div className="p-6 text-center" style={{ color: 'var(--fg-3)' }}>Loading pricing...</div>;

  return (
    <div className="space-y-6">
      {pricingBanner && (
        <div className="card p-3 flex items-center gap-2" style={{ borderLeft: '4px solid var(--caution)', background: 'color-mix(in srgb, var(--caution) 8%, var(--bg-card))' }}>
          <AlertTriangle size={14} style={{ color: 'var(--caution)' }} />
          <p className="t-small" style={{ color: 'var(--caution)' }}>Pricing was updated by another admin. <button className="underline" onClick={() => { load(); setPricingBanner(false); }}>Refresh</button></p>
        </div>
      )}

      {pricing?.updatedAt && (
        <p className="t-small" style={{ color: 'var(--fg-3)' }}>Last updated: {new Date(pricing.updatedAt).toLocaleString()}</p>
      )}

      {/* Appointment Fees */}
      <div className="card p-4 space-y-3">
        <h3 className="t-h4">Appointment Fees (EGP)</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Physical</label>
            <input type="number" className="input w-full" value={appt.physical_fee} onChange={(e) => setAppt((a) => ({ ...a, physical_fee: +e.target.value }))} />
          </div>
          <div>
            <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Online</label>
            <input type="number" className="input w-full" value={appt.online_fee} onChange={(e) => setAppt((a) => ({ ...a, online_fee: +e.target.value }))} />
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => save('appointments', { appointments: appt })} disabled={saving === 'appointments'}>
          <Save size={14} /> {saving === 'appointments' ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Room Pricing */}
      <div className="card p-4 space-y-3">
        <h3 className="t-h4">Room Pricing (EGP / day)</h3>
        <div className="grid grid-cols-2 gap-3">
          {(['general_per_day', 'icu_per_day', 'operation_per_day', 'radiology_per_day'] as const).map((key) => (
            <div key={key}>
              <label className="t-small block mb-1 capitalize" style={{ color: 'var(--fg-2)' }}>{key.replace(/_/g, ' ')}</label>
              <input type="number" className="input w-full" value={rooms[key]} onChange={(e) => setRooms((r) => ({ ...r, [key]: +e.target.value }))} />
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => save('rooms', { rooms })} disabled={saving === 'rooms'}>
          <Save size={14} /> {saving === 'rooms' ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Pharmacy */}
      <div className="card p-4 space-y-3">
        <h3 className="t-h4">Pharmacy</h3>
        <div style={{ maxWidth: 200 }}>
          <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Delivery Fee (EGP)</label>
          <input type="number" className="input w-full" value={pharmacy.delivery_fee} onChange={(e) => setPharmacy({ delivery_fee: +e.target.value })} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => save('pharmacy', { pharmacy })} disabled={saving === 'pharmacy'}>
          <Save size={14} /> {saving === 'pharmacy' ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Lab Tests */}
      <div className="card p-4 space-y-3">
        <h3 className="t-h4">Lab Tests</h3>
        <div className="space-y-2">
          {labTests.map((t) => (
            <div key={t.test_name} className="flex items-center justify-between rounded px-3 py-2" style={{ background: 'var(--bg-surface-2)' }}>
              <span className="t-small">{t.test_name}</span>
              <div className="flex items-center gap-3">
                <span className="t-small" style={{ color: 'var(--fg-2)' }}>EGP {t.price}</span>
                <button onClick={() => handleDeleteLab(t.test_name)} style={{ color: 'var(--critical)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="Test name" value={newLab.test_name} onChange={(e) => setNewLab((n) => ({ ...n, test_name: e.target.value }))} style={{ flex: 1 }} />
          <input type="number" className="input" placeholder="Price" value={newLab.price || ''} onChange={(e) => setNewLab((n) => ({ ...n, price: +e.target.value }))} style={{ width: 100 }} />
          <button className="btn btn-primary btn-sm" onClick={handleAddLab}><Plus size={14} /></button>
        </div>
      </div>

      {/* Radiology Scans */}
      <div className="card p-4 space-y-3">
        <h3 className="t-h4">Radiology Scans</h3>
        <div className="space-y-2">
          {radioScans.map((s) => (
            <div key={s.scan_type} className="flex items-center justify-between rounded px-3 py-2" style={{ background: 'var(--bg-surface-2)' }}>
              <span className="t-small">{s.scan_type}</span>
              <div className="flex items-center gap-3">
                <span className="t-small" style={{ color: 'var(--fg-2)' }}>EGP {s.price}</span>
                <button onClick={() => handleDeleteRadio(s.scan_type)} style={{ color: 'var(--critical)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="Scan name" value={newRadio.scan_type} onChange={(e) => setNewRadio((n) => ({ ...n, scan_type: e.target.value }))} style={{ flex: 1 }} />
          <input type="number" className="input" placeholder="Price" value={newRadio.price || ''} onChange={(e) => setNewRadio((n) => ({ ...n, price: +e.target.value }))} style={{ width: 100 }} />
          <button className="btn btn-primary btn-sm" onClick={handleAddRadio}><Plus size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ---------- Maintenance Tab ----------
function MaintenanceTab() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await adminService.getMaintenanceStatus();
      setStatus(s);
    } catch {
      showToast('Failed to load maintenance status', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleEnable = async () => {
    setWorking(true);
    try {
      const mins = parseInt(duration, 10);
      const s = await adminService.enableMaintenance({
        message: message || undefined,
        estimated_duration: Number.isFinite(mins) && mins > 0 ? mins : undefined,
      });
      setStatus(s);
      showToast('Maintenance mode enabled');
    } catch {
      showToast('Failed to enable maintenance', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleDisable = async () => {
    setWorking(true);
    try {
      await adminService.disableMaintenance();
      setStatus({ is_active: false });
      showToast('Maintenance mode disabled');
    } catch {
      showToast('Failed to disable maintenance', 'error');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className="p-6 text-center" style={{ color: 'var(--fg-3)' }}>Loading...</div>;

  return (
    <div className="space-y-4" style={{ maxWidth: 520 }}>
      <div className="card p-4 flex items-center gap-3">
        <div
          className="rounded-full"
          style={{ width: 12, height: 12, background: status?.is_active ? 'var(--positive)' : 'var(--fg-3)', flexShrink: 0 }}
        />
        <div>
          <p className="t-body font-medium">Maintenance Mode: <strong style={{ color: status?.is_active ? 'var(--positive)' : 'var(--fg-2)' }}>{status?.is_active ? 'Active' : 'Inactive'}</strong></p>
          {status?.is_active && status.started_at && (
            <p className="t-small" style={{ color: 'var(--fg-3)' }}>Started {new Date(status.started_at).toLocaleString()}</p>
          )}
          {status?.is_active && status.message && (
            <p className="t-small" style={{ color: 'var(--fg-2)' }}>Message: {status.message}</p>
          )}
          {status?.is_active && status.estimated_duration != null && (
            <p className="t-small" style={{ color: 'var(--fg-2)' }}>Est. duration: {status.estimated_duration} min</p>
          )}
        </div>
      </div>

      {!status?.is_active && (
        <div className="card p-4 space-y-3">
          <h3 className="t-h4">Enable Maintenance</h3>
          <div>
            <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Message (shown to users)</label>
            <textarea className="input w-full" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="System is under maintenance..." style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Estimated Duration (minutes)</label>
            <input
              className="input w-full"
              type="number"
              min="1"
              step="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 30"
            />
          </div>
          <button className="btn btn-primary" onClick={handleEnable} disabled={working}>
            {working ? 'Enabling...' : 'Enable Maintenance Mode'}
          </button>
        </div>
      )}

      {status?.is_active && (
        <button className="btn" style={{ background: 'var(--critical)', color: '#fff' }} onClick={handleDisable} disabled={working}>
          {working ? 'Disabling...' : 'Disable Maintenance Mode'}
        </button>
      )}
    </div>
  );
}

// ---------- Email Templates Tab ----------
function EmailTemplatesTab() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<Record<string, { subject: string; body: string }>>({});
  const [saving, setSaving] = useState('');

  const TEMPLATE_HINTS: Record<string, string[]> = {
    default: ['{{patient_name}}', '{{otp_code}}', '{{hospital_name}}', '{{appointment_date}}', '{{doctor_name}}'],
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminService.getEmailTemplates();
      setTemplates(list);
      const forms: Record<string, { subject: string; body: string }> = {};
      list.forEach((t) => { forms[t.name] = { subject: t.subject, body: t.body }; });
      setEditForms(forms);
    } catch {
      showToast('Failed to load email templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (name: string) => {
    const form = editForms[name];
    if (!form) return;
    setSaving(name);
    try {
      await adminService.updateEmailTemplate(name, form);
      showToast('Template saved');
    } catch {
      showToast('Failed to save template', 'error');
    } finally {
      setSaving('');
    }
  };

  const handlePreview = (name: string) => {
    const form = editForms[name];
    if (!form) return;
    const rendered = form.body
      .replace(/\{\{patient_name\}\}/g, 'Ahmed Hassan')
      .replace(/\{\{otp_code\}\}/g, '123456')
      .replace(/\{\{hospital_name\}\}/g, 'Siryan Medical')
      .replace(/\{\{appointment_date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{doctor_name\}\}/g, 'Dr. Khalid');
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<html><head><title>${form.subject}</title></head><body>${rendered}</body></html>`);
      win.document.close();
    }
  };

  if (loading) return <div className="p-6 text-center" style={{ color: 'var(--fg-3)' }}>Loading...</div>;

  return (
    <div className="space-y-3" style={{ maxWidth: 680 }}>
      {templates.map((tmpl) => {
        const isOpen = expanded === tmpl.name;
        const form = editForms[tmpl.name] ?? { subject: tmpl.subject, body: tmpl.body };
        return (
          <div key={tmpl.name} className="card">
            <button
              className="w-full flex items-center justify-between p-4"
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => setExpanded(isOpen ? null : tmpl.name)}
            >
              <div>
                <p className="t-body font-medium capitalize">{tmpl.name.replace(/_/g, ' ')}</p>
                <p className="t-small" style={{ color: 'var(--fg-3)' }}>{form.subject}</p>
              </div>
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-1)', paddingTop: 16 }}>
                <div>
                  <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Subject</label>
                  <input
                    className="input w-full"
                    value={form.subject}
                    onChange={(e) => setEditForms((f) => ({ ...f, [tmpl.name]: { ...form, subject: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>HTML Body</label>
                  <textarea
                    className="input w-full"
                    rows={10}
                    value={form.body}
                    onChange={(e) => setEditForms((f) => ({ ...f, [tmpl.name]: { ...form, body: e.target.value } }))}
                    style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {(TEMPLATE_HINTS[tmpl.name] ?? TEMPLATE_HINTS.default).map((hint) => (
                    <span key={hint} className="t-small rounded px-2 py-0.5" style={{ background: 'var(--bg-surface-2)', color: 'var(--fg-2)', fontFamily: 'monospace', fontSize: 11 }}>{hint}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={() => handleSave(tmpl.name)} disabled={saving === tmpl.name}>
                    <Save size={13} /> {saving === tmpl.name ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handlePreview(tmpl.name)}>
                    <Eye size={13} /> Preview
                  </button>
                </div>
                {tmpl.updated_at && (
                  <p className="t-small" style={{ color: 'var(--fg-3)' }}>Last updated: {new Date(tmpl.updated_at).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Main Page ----------
export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('pricing');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pricing', label: 'Pricing' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'email', label: 'Email Templates' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="t-h2">System Settings</h1>
        <p className="t-body" style={{ color: 'var(--fg-2)' }}>Manage pricing, maintenance mode, and email templates</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-surface-2)', width: 'fit-content' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="btn btn-sm"
            style={{
              borderRadius: 6,
              background: tab === t.id ? 'var(--bg-card)' : 'transparent',
              color: tab === t.id ? 'var(--fg-1)' : 'var(--fg-3)',
              fontWeight: tab === t.id ? 600 : 400,
              boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pricing' && <PricingTab />}
      {tab === 'maintenance' && <MaintenanceTab />}
      {tab === 'email' && <EmailTemplatesTab />}
    </div>
  );
}
