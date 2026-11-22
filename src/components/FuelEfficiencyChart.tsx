import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, FileText, Fuel, TrendingUp } from 'lucide-react';
import type { TrackedDevice } from '../types';
import {
  buildFuelEfficiencySeries,
  generateFuelEfficiencyCsv,
  summarizeFuelEfficiency,
  type FuelChartMetric,
  type FuelTimeRange,
  type FuelTrendPoint,
} from '../utils/fuelEfficiencyLogic';
import {
  downloadAdministrativePdf,
  downloadCsvFile,
} from '../utils/pdfReportGenerator';
import {
  buildAdministrativeReportBundle,
  buildReportFilename,
} from '../utils/reportExportLogic';
import type { MaintenanceMap } from '../utils/serviceMilestoneLogic';
import { formatINR } from '../utils/storeLogic';

interface FuelEfficiencyChartProps {
  devices: TrackedDevice[];
  maintenanceByImei?: MaintenanceMap;
  accountName?: string;
  companyName?: string;
  theme: 'dark' | 'light';
  onExportToast?: (message: string) => void;
}

const TIME_RANGES: Array<{ id: FuelTimeRange; label: string }> = [
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '6m', label: '6M' },
  { id: '12m', label: '12M' },
];

interface TooltipPayloadEntry {
  dataKey?: string;
  name?: string;
  value?: number;
  color?: string;
  payload?: FuelTrendPoint;
}

function CustomFuelTooltip({
  active,
  payload,
  label,
  metricMode,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  metricMode: FuelChartMetric;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0A1128] px-3.5 py-2.5 shadow-lg text-xs space-y-1.5 min-w-[190px]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-1.5">
        <span className="font-semibold text-slate-900 dark:text-white">{label}</span>
        <span className="font-mono tabular-nums text-slate-500 dark:text-[#A9B4D0]">
          {point.distanceKm.toLocaleString('en-IN')} km
        </span>
      </div>

      {metricMode === 'efficiency' ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-cyan-700 dark:text-[#00D4FF] font-medium">
              Fleet Actual
            </span>
            <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
              {point.actualKmPerL.toFixed(2)} km/L
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-[#A9B4D0]">Pre-Telematics</span>
            <span className="font-mono tabular-nums text-slate-600 dark:text-[#A9B4D0]">
              {point.baselineKmPerL.toFixed(2)} km/L
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-cyan-700 dark:text-[#00D4FF] font-medium">
              Fuel Consumed
            </span>
            <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
              {point.fuelUsedLiters.toLocaleString('en-IN')} L
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-emerald-700 dark:text-[#7CFF6B] font-medium">
              Fuel Saved
            </span>
            <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-[#7CFF6B]">
              {point.fuelSavedLiters.toLocaleString('en-IN')} L
            </span>
          </div>
        </div>
      )}

      <div className="pt-1 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
        <span className="text-slate-500 dark:text-[#A9B4D0]">Est. Savings</span>
        <span className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-[#7CFF6B]">
          {formatINR(point.savingsInr)}
        </span>
      </div>
    </div>
  );
}

export function FuelEfficiencyChart({
  devices,
  maintenanceByImei = {},
  accountName = 'VS Fleet Customer',
  companyName = 'Connected Fleet Account',
  theme,
  onExportToast,
}: FuelEfficiencyChartProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<FuelTimeRange>('6m');
  const [metricMode, setMetricMode] = useState<FuelChartMetric>('efficiency');

  const activeDeviceId =
    selectedDeviceId === 'all' || devices.some((d) => d.id === selectedDeviceId)
      ? selectedDeviceId
      : 'all';

  const vehicleScopeLabel = useMemo(() => {
    if (activeDeviceId === 'all') return `All Fleet Units (${devices.length})`;
    const match = devices.find((d) => d.id === activeDeviceId);
    return match ? match.vehicleLabel : `All Fleet Units (${devices.length})`;
  }, [activeDeviceId, devices]);

  const series = useMemo(
    () => buildFuelEfficiencySeries(devices, activeDeviceId, timeRange),
    [devices, activeDeviceId, timeRange]
  );

  const summary = useMemo(() => summarizeFuelEfficiency(series), [series]);

  const isDark = theme === 'dark';
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
  const axisTickColor = isDark ? '#A9B4D0' : '#475569';
  const primaryStroke = isDark ? '#00D4FF' : '#0891B2';
  const baselineStroke = isDark ? '#94A3B8' : '#64748B';
  const savingsStroke = isDark ? '#7CFF6B' : '#16A34A';

  const handleExportCsv = () => {
    if (series.length === 0) return;
    const csv = generateFuelEfficiencyCsv(series, vehicleScopeLabel, timeRange);
    const filename = buildReportFilename(
      'fuel',
      'csv',
      timeRange,
      activeDeviceId,
      devices
    );
    downloadCsvFile(csv, filename);
    onExportToast?.(`Exported ${timeRange.toUpperCase()} fuel trend CSV (${filename}).`);
  };

  const handleExportPdf = () => {
    if (series.length === 0) return;
    const bundle = buildAdministrativeReportBundle({
      devices,
      maintenanceByImei,
      selectedDeviceId: activeDeviceId,
      timeRange,
      scope: 'fuel',
      accountName,
      companyName,
    });
    const filename = buildReportFilename(
      'fuel',
      'pdf',
      timeRange,
      activeDeviceId,
      devices
    );
    downloadAdministrativePdf(bundle, filename);
    onExportToast?.(`Exported ${timeRange.toUpperCase()} fuel efficiency PDF (${filename}).`);
  };

  return (
    <section
      aria-labelledby="fuel-efficiency-heading"
      className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-6"
    >
      {/* Top Header + Filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
              <Fuel className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Fleet Fuel Analytics</span>
            </div>
            <h2
              id="fuel-efficiency-heading"
              className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
            >
              Fuel Efficiency &amp; Usage Trends
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A9B4D0]">
              Track km/L efficiency gains, diesel usage patterns, and estimated savings over time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label htmlFor="fuel-vehicle-filter" className="sr-only">
              Filter fuel chart by vehicle
            </label>
            <select
              id="fuel-vehicle-filter"
              aria-label="Filter fuel chart by vehicle"
              value={activeDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-xs font-medium text-slate-900 dark:text-white max-w-[220px] truncate cursor-pointer"
            >
              <option value="all">All Fleet Units ({devices.length})</option>
              {devices.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.vehicleLabel}
                </option>
              ))}
            </select>

            <button
              type="button"
              data-testid="fuel-export-csv-btn"
              onClick={handleExportCsv}
              disabled={series.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              data-testid="fuel-export-pdf-btn"
              onClick={handleExportPdf}
              disabled={series.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div
            role="group"
            aria-label="Chart metric view"
            className="inline-flex rounded-xl bg-slate-100 dark:bg-[#0A1128] p-1 gap-1"
          >
            <button
              type="button"
              onClick={() => setMetricMode('efficiency')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                metricMode === 'efficiency'
                  ? 'bg-white dark:bg-[#111B3A] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Efficiency (km/L)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('usage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                metricMode === 'usage'
                  ? 'bg-white dark:bg-[#111B3A] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Usage &amp; Savings (L)
            </button>
          </div>

          <div
            role="group"
            aria-label="Timeframe range"
            className="inline-flex rounded-xl bg-slate-100 dark:bg-[#0A1128] p-1 gap-1"
          >
            {TIME_RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTimeRange(item.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  timeRange === item.id
                    ? 'bg-[#00D4FF] text-[#0A1128]'
                    : 'text-slate-600 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State vs Populated KPI + Chart */}
      {series.length === 0 ? (
        <div className="py-12 border-t border-slate-200 dark:border-white/10 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            No tracked devices connected yet
          </p>
          <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
            Register a GPS tracker or fuel sensor IMEI to monitor efficiency and fuel savings.
          </p>
        </div>
      ) : (
        <>
          {/* 4-Metric Hairline Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-y border-slate-200 dark:border-white/10 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-white/10">
            <div className="py-3.5 sm:pr-4 lg:pr-5">
              <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                Avg Fuel Efficiency
              </div>
              <div
                data-testid="fuel-avg-kml"
                className="mt-1 font-mono text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap text-slate-900 dark:text-white"
              >
                {summary.avgKmPerL.toFixed(2)} km/L
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums text-emerald-700 dark:text-[#7CFF6B]">
                <TrendingUp className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>+{summary.improvementPct.toFixed(1)}% vs baseline</span>
              </div>
            </div>

            <div className="py-3.5 sm:pl-4 lg:px-5">
              <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                Diesel Saved ({timeRange.toUpperCase()})
              </div>
              <div
                data-testid="fuel-saved-liters"
                className="mt-1 font-mono text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap text-emerald-700 dark:text-[#7CFF6B]"
              >
                {summary.totalFuelSavedLiters.toLocaleString('en-IN')} L
              </div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-[#A9B4D0]">
                Saved vs pre-telematics
              </div>
            </div>

            <div className="py-3.5 sm:pr-4 lg:px-5 sm:border-t lg:border-t-0 border-slate-200 dark:border-white/10">
              <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                Estimated Cost Savings
              </div>
              <div
                data-testid="fuel-savings-inr"
                className="mt-1 font-mono text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap text-cyan-700 dark:text-[#00D4FF]"
              >
                {formatINR(summary.estimatedSavingsInr)}
              </div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-[#A9B4D0]">
                Calculated at ₹96/L diesel
              </div>
            </div>

            <div className="py-3.5 sm:pl-4 lg:pl-5 sm:border-t lg:border-t-0 border-slate-200 dark:border-white/10">
              <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                Total Fuel Consumed
              </div>
              <div
                data-testid="fuel-used-liters"
                className="mt-1 font-mono text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap text-slate-900 dark:text-white"
              >
                {summary.totalFuelUsedLiters.toLocaleString('en-IN')} L
              </div>
              <div className="mt-0.5 font-mono text-xs tabular-nums text-slate-500 dark:text-[#A9B4D0]">
                Across {summary.totalDistanceKm.toLocaleString('en-IN')} km
              </div>
            </div>
          </div>

          {/* Recharts Responsive Line Chart */}
          <div
            data-testid="fuel-efficiency-chart"
            className="w-full h-[290px]"
            role="img"
            aria-label={`Line chart showing ${
              metricMode === 'efficiency'
                ? 'fuel efficiency in km per liter versus baseline'
                : 'fuel consumed versus fuel saved in liters'
            } for ${vehicleScopeLabel} over ${timeRange.toUpperCase()}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  stroke={gridStroke}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  stroke={axisTickColor}
                  tick={{ fill: axisTickColor, fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                />
                <YAxis
                  stroke={axisTickColor}
                  tick={{ fill: axisTickColor, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  domain={metricMode === 'efficiency' ? ['auto', 'auto'] : [0, 'auto']}
                  tickFormatter={(val: number) =>
                    metricMode === 'efficiency'
                      ? `${val.toFixed(1)}`
                      : `${Math.round(val)}L`
                  }
                />
                <Tooltip
                  content={<CustomFuelTooltip metricMode={metricMode} />}
                  cursor={{
                    stroke: isDark ? 'rgba(0,212,255,0.28)' : 'rgba(8,145,178,0.28)',
                    strokeWidth: 1,
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '12px',
                    paddingTop: '10px',
                    color: axisTickColor,
                  }}
                />
                {metricMode === 'efficiency' ? (
                  <>
                    <Line
                      type="monotone"
                      dataKey="actualKmPerL"
                      name="Fleet Actual (km/L)"
                      stroke={primaryStroke}
                      strokeWidth={2.5}
                      isAnimationActive={false}
                      dot={{ r: 3.5, fill: primaryStroke, strokeWidth: 0 }}
                      activeDot={{ r: 5.5, fill: primaryStroke }}
                    />
                    <Line
                      type="monotone"
                      dataKey="baselineKmPerL"
                      name="Pre-Telematics Baseline (km/L)"
                      stroke={baselineStroke}
                      strokeWidth={1.75}
                      strokeDasharray="5 5"
                      isAnimationActive={false}
                      dot={false}
                      activeDot={{ r: 4, fill: baselineStroke }}
                    />
                  </>
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="fuelUsedLiters"
                      name="Fuel Consumed (L)"
                      stroke={primaryStroke}
                      strokeWidth={2.5}
                      isAnimationActive={false}
                      dot={{ r: 3.5, fill: primaryStroke, strokeWidth: 0 }}
                      activeDot={{ r: 5.5, fill: primaryStroke }}
                    />
                    <Line
                      type="monotone"
                      dataKey="fuelSavedLiters"
                      name="Fuel Saved (L)"
                      stroke={savingsStroke}
                      strokeWidth={2.25}
                      isAnimationActive={false}
                      dot={{ r: 3.5, fill: savingsStroke, strokeWidth: 0 }}
                      activeDot={{ r: 5.5, fill: savingsStroke }}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
