import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  X,
} from 'lucide-react';
import type { TrackedDevice, UserProfile } from '../types';
import type { FuelTimeRange } from '../utils/fuelEfficiencyLogic';
import {
  downloadAdministrativePdf,
  downloadCsvFile,
} from '../utils/pdfReportGenerator';
import {
  buildAdministrativeReportBundle,
  buildReportFilename,
  generateAdministrativeCsv,
  type ExportReportScope,
} from '../utils/reportExportLogic';
import type { MaintenanceMap } from '../utils/serviceMilestoneLogic';
import { formatINR } from '../utils/storeLogic';

interface AdministrativeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: TrackedDevice[];
  maintenanceByImei: MaintenanceMap;
  user: UserProfile;
  onExportSuccess?: (message: string) => void;
}

const SCOPE_OPTIONS: Array<{
  id: ExportReportScope;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'combined',
    label: 'Complete Fleet Audit',
    subtitle: 'Tracking logs + Fuel efficiency & savings',
  },
  {
    id: 'tracking',
    label: 'Tracking Logs Only',
    subtitle: 'GPS pings, speeds, odometer & coordinates',
  },
  {
    id: 'fuel',
    label: 'Fuel Efficiency Only',
    subtitle: 'km/L trends, diesel saved & cost reduction',
  },
];

const RANGE_OPTIONS: Array<{ id: FuelTimeRange; label: string }> = [
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '6m', label: '6M' },
  { id: '12m', label: '12M' },
];

export function AdministrativeExportModal({
  isOpen,
  onClose,
  devices,
  maintenanceByImei,
  user,
  onExportSuccess,
}: AdministrativeExportModalProps) {
  const [scope, setScope] = useState<ExportReportScope>('combined');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<FuelTimeRange>('6m');
  const [lastExportLabel, setLastExportLabel] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const activeDeviceId =
    selectedDeviceId === 'all' || devices.some((d) => d.id === selectedDeviceId)
      ? selectedDeviceId
      : 'all';

  const bundle = useMemo(
    () =>
      buildAdministrativeReportBundle({
        devices,
        maintenanceByImei,
        selectedDeviceId: activeDeviceId,
        timeRange,
        scope,
        accountName: user.name,
        companyName: user.company,
      }),
    [devices, maintenanceByImei, activeDeviceId, timeRange, scope, user.name, user.company]
  );

  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    if (devices.length === 0) return;
    setExportingFormat('csv');
    try {
      const csv = generateAdministrativeCsv(bundle);
      const filename = buildReportFilename(
        scope,
        'csv',
        timeRange,
        activeDeviceId,
        devices
      );
      downloadCsvFile(csv, filename);
      setLastExportLabel(`CSV saved: ${filename}`);
      onExportSuccess?.(`Exported ${filename} for administrative records.`);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleDownloadPdf = () => {
    if (devices.length === 0) return;
    setExportingFormat('pdf');
    try {
      const filename = buildReportFilename(
        scope,
        'pdf',
        timeRange,
        activeDeviceId,
        devices
      );
      downloadAdministrativePdf(bundle, filename);
      setLastExportLabel(`PDF saved: ${filename}`);
      onExportSuccess?.(`Exported ${filename} for administrative records.`);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-report-modal-title"
        data-testid="administrative-export-modal"
        className="w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111B3A] p-6 sm:p-7 shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
              <span>Administrative Record-Keeping</span>
            </div>
            <h2
              id="export-report-modal-title"
              className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
            >
              Export Fleet Tracking &amp; Fuel Efficiency Reports
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
              Download formatted PDF audit documents or RFC-4180 CSV spreadsheets for compliance, reimbursement, and management reviews.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export report modal"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Report Dataset Selection */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0]">
            1. Select Report Contents
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SCOPE_OPTIONS.map((opt) => {
              const selected = scope === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`export-scope-${opt.id}`}
                  onClick={() => setScope(opt.id)}
                  className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
                    selected
                      ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] hover:border-slate-300 dark:hover:border-white/25'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-[#A9B4D0] mt-0.5 leading-snug">
                    {opt.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vehicle Scope & Timeframe */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="export-vehicle-select"
              className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0]"
            >
              2. Vehicle Scope
            </label>
            <select
              id="export-vehicle-select"
              data-testid="export-vehicle-select"
              value={activeDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] pl-3 pr-7 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#00D4FF]"
            >
              <option value="all">All Fleet Units ({devices.length})</option>
              {devices.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.vehicleLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0]">
              3. Reporting Period
            </span>
            <div
              role="group"
              aria-label="Report period"
              className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0A1128]"
            >
              {RANGE_OPTIONS.map((rng) => (
                <button
                  key={rng.id}
                  type="button"
                  data-testid={`export-range-${rng.id}`}
                  onClick={() => setTimeRange(rng.id)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    timeRange === rng.id
                      ? 'bg-[#00D4FF] text-[#0A1128]'
                      : 'text-slate-600 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {rng.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] p-3.5 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-[#A9B4D0] block">
              Log Rows
            </span>
            <strong className="font-mono tabular-nums text-sm text-slate-900 dark:text-white">
              {bundle.trackingLogs.length} entries
            </strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-[#A9B4D0] block">
              Avg Fuel Economy
            </span>
            <strong className="font-mono tabular-nums text-sm text-slate-900 dark:text-white">
              {bundle.fuelSummary.avgKmPerL.toFixed(2)} km/L
            </strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-[#A9B4D0] block">
              Diesel Saved
            </span>
            <strong className="font-mono tabular-nums text-sm text-emerald-700 dark:text-[#7CFF6B]">
              {bundle.fuelSummary.totalFuelSavedLiters.toLocaleString('en-IN')} L
            </strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-[#A9B4D0] block">
              Est. Cost Savings
            </span>
            <strong className="font-mono tabular-nums text-sm text-cyan-700 dark:text-[#00D4FF]">
              {formatINR(bundle.fuelSummary.estimatedSavingsInr)}
            </strong>
          </div>
        </div>

        {/* Live Data Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-[#A9B4D0]">
              Preview ({scope === 'fuel' ? 'Fuel Efficiency Periods' : 'Latest Tracking Log Entries'})
            </span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-[#A9B4D0]">
              {bundle.vehicleScopeLabel}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            {scope === 'fuel' ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#0A1128] text-slate-600 dark:text-[#A9B4D0]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Period</th>
                    <th className="px-3 py-2 font-semibold">Actual</th>
                    <th className="px-3 py-2 font-semibold">Baseline</th>
                    <th className="px-3 py-2 font-semibold">Saved (L)</th>
                    <th className="px-3 py-2 font-semibold text-right">Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {bundle.fuelSeries.slice(0, 4).map((pt) => (
                    <tr key={pt.period}>
                      <td className="px-3 py-2 font-sans font-medium">{pt.period}</td>
                      <td className="px-3 py-2">{pt.actualKmPerL.toFixed(2)} km/L</td>
                      <td className="px-3 py-2">{pt.baselineKmPerL.toFixed(2)} km/L</td>
                      <td className="px-3 py-2 text-emerald-700 dark:text-[#7CFF6B]">
                        {pt.fuelSavedLiters.toFixed(1)} L
                      </td>
                      <td className="px-3 py-2 text-right">{formatINR(pt.savingsInr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#0A1128] text-slate-600 dark:text-[#A9B4D0]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Timestamp</th>
                    <th className="px-3 py-2 font-semibold">Vehicle</th>
                    <th className="px-3 py-2 font-semibold">Event</th>
                    <th className="px-3 py-2 font-semibold">Speed</th>
                    <th className="px-3 py-2 font-semibold text-right">Odometer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {bundle.trackingLogs.slice(0, 4).map((row) => (
                    <tr key={row.logId}>
                      <td className="px-3 py-2 whitespace-nowrap">{row.timestamp}</td>
                      <td className="px-3 py-2 font-sans font-medium">
                        {row.vehicleLabel.split(' ')[0]}
                      </td>
                      <td className="px-3 py-2 font-sans">{row.eventType}</td>
                      <td className="px-3 py-2">{row.speedKmh} km/h</td>
                      <td className="px-3 py-2 text-right">
                        {row.odometerKm.toLocaleString('en-IN')} km
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Export Feedback & Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-h-[20px] text-xs">
            {lastExportLabel ? (
              <span
                data-testid="last-export-status"
                className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-[#7CFF6B]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{lastExportLabel}</span>
              </span>
            ) : (
              <span className="text-slate-500 dark:text-[#A9B4D0]">
                Ready for immediate administrative download.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={devices.length === 0 || exportingFormat !== null}
              data-testid="modal-download-csv-btn"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-[#00D4FF] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download CSV</span>
            </button>

            <button
              type="button"
              disabled={devices.length === 0 || exportingFormat !== null}
              data-testid="modal-download-pdf-btn"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download PDF Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
