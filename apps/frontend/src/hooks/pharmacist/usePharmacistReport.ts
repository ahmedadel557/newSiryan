'use client';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from '@/hooks/shared';
import type { PharmaDailyReport } from '@/types';

export function usePharmacistReport() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: report = null, isLoading: loading } = useQuery({
    queryKey: queryKeys.pharmacistDailyReport(date),
    queryFn: () => pharmacyService.getDailyReport(date),
  });

  const exportPdf = useCallback(() => {
    if (!report) return;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pharmacy Daily Report — ${report.report_date}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 32px; color: #111; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          p.sub { color: #555; font-size: 13px; margin-bottom: 24px; }
          .cards { display: flex; gap: 16px; margin-bottom: 24px; }
          .card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px 20px; flex: 1; }
          .card .label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.06em; }
          .card .value { font-size: 28px; font-weight: 600; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { text-align: left; padding: 8px 12px; background: #f5f5f5; font-weight: 600; border-bottom: 1px solid #e5e5e5; }
          td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
          .footer { margin-top: 32px; font-size: 11px; color: #999; }
        </style>
      </head>
      <body>
        <h1>Pharmacy Daily Report</h1>
        <p class="sub">Date: ${new Date(report.report_date).toLocaleDateString()}</p>
        <div class="cards">
          <div class="card"><div class="label">Total Dispensed</div><div class="value">${report.total_dispensed}</div></div>
          <div class="card"><div class="label">Total Revenue</div><div class="value">EGP ${report.total_revenue.toLocaleString()}</div></div>
          <div class="card"><div class="label">Prescription</div><div class="value">${report.prescription_count}</div></div>
          <div class="card"><div class="label">OTC</div><div class="value">${report.otc_count}</div></div>
        </div>
        <table>
          <thead><tr><th>Medication</th><th>Qty Dispensed</th><th>Revenue (EGP)</th></tr></thead>
          <tbody>
            ${report.breakdown.map((b) => `<tr><td>${b.medication_name}</td><td>${b.quantity}</td><td>${b.revenue.toLocaleString()}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">Generated at ${new Date().toLocaleString()}</div>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }, [report]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistDailyReport(date) });
  }, [queryClient, date]);

  return { report, loading, date, setDate, exportPdf, refresh };
}
