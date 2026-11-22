import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  Lock,
  MapPin,
  Phone,
  RotateCcw,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ROSTER_STATUS_FILTERS,
  ROLE_DASHBOARD_CONFIG,
  computeAdminClientHealthRows,
  computeRoleChartSpec,
  computeRoleDashboardMetrics,
  computeRosterStatusCounts,
  computeSuperAdminTenantRows,
  filterFleetRosterByStatus,
  type DashboardMetricsInput,
  type RosterStatusFilter,
} from '../../utils/roleDashboardConfig';
import type {
  PlatformDevice,
  PlatformVehicle,
} from '../../utils/unifiedPlatformLogic';
import type { RtoVehicleMetadata } from '../../utils/rtoRegistryDatabase';
import { GlobalRtoSearchBar } from './GlobalRtoSearchBar';
import { PlatformLiveMap } from './PlatformLiveMap';
import { RoleNavIcon } from './RoleNavIcons';
import type { PlatformActions, PlatformBootstrapData } from './platformTypes';

interface RoleAdaptiveDashboardProps {
  data: PlatformBootstrapData;
  filteredVehicles: PlatformVehicle[];
  selectedVehicle: PlatformVehicle | null;
  onSelectVehicle: (vehicleId: string) => void;
  onNavigateScreen: (screenId: string) => void;
  onSelectRtoVehicle?: (record: RtoVehicleMetadata) => void;
  onExportCsv: (vehicles: PlatformVehicle[]) => void;
  actions: PlatformActions;
  platform: PlatformDevice;
  compact?: boolean;
  isFullscreenMap?: boolean;
  onToggleFullscreenMap?: () => void;
}

function statusTextColor(status: PlatformVehicle['status']) {
  if (status === 'Running') return 'text-emerald-700 dark:text-emerald-400';
  if (status === 'Idle') return 'text-amber-700 dark:text-amber-400';
  if (status === 'Stationary') return 'text-sky-700 dark:text-sky-400';
  return 'text-slate-500 dark:text-slate-400';
}

function metricToneText(tone: 'neutral' | 'positive' | 'warning' | 'critical') {
  if (tone === 'positive') return 'text-emerald-700 dark:text-emerald-400';
  if (tone === 'warning') return 'text-amber-700 dark:text-amber-400';
  if (tone === 'critical') return 'text-rose-700 dark:text-rose-400';
  return 'text-slate-600 dark:text-slate-300';
}

export function RoleAdaptiveDashboard({
  data,
  filteredVehicles,
  selectedVehicle,
  onSelectVehicle,
  onNavigateScreen,
  onSelectRtoVehicle,
  onExportCsv,
  actions,
  platform,
  compact = false,
  isFullscreenMap = false,
  onToggleFullscreenMap,
}: RoleAdaptiveDashboardProps) {
  const role = data.user.role;
  const roleConfig = ROLE_DASHBOARD_CONFIG[role];
  const [rosterStatusFilter, setRosterStatusFilter] = useState<RosterStatusFilter>('All');

  useEffect(() => {
    setRosterStatusFilter('All');
  }, [role]);

  const metricsInput: DashboardMetricsInput = useMemo(
    () => ({
      user: data.user,
      admins: data.admins,
      clients: data.clients,
      customers: data.customers,
      vehicles: data.vehicles,
      devices: data.devices,
      alerts: data.alerts,
      pods: data.pods,
      tickets: data.tickets,
      geofencesCount: data.geofences.length,
      deviceCatalogCount: data.deviceCatalogCount,
      apiIntegrationsCount: data.apiIntegrationsCount,
      uptimePercent: data.uptimeStats.uptimePercent,
    }),
    [data]
  );

  const kpis = useMemo(
    () => computeRoleDashboardMetrics(role, metricsInput),
    [role, metricsInput]
  );

  const superAdminRows = useMemo(
    () => (role === 'super_admin' ? computeSuperAdminTenantRows(metricsInput) : []),
    [role, metricsInput]
  );

  const adminClientRows = useMemo(
    () => (role === 'admin' ? computeAdminClientHealthRows(metricsInput) : []),
    [role, metricsInput]
  );

  const roleChartSpec = useMemo(
    () => computeRoleChartSpec(role, metricsInput, filteredVehicles),
    [role, metricsInput, filteredVehicles]
  );

  const rosterStatusCounts = useMemo(
    () => computeRosterStatusCounts(filteredVehicles),
    [filteredVehicles]
  );

  const visibleRosterVehicles = useMemo(
    () => filterFleetRosterByStatus(filteredVehicles, rosterStatusFilter),
    [filteredVehicles, rosterStatusFilter]
  );

  const surfaceCls =
    'rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1834]';

  return (
    <div
      data-testid="role-adaptive-dashboard"
      data-dashboard-role={role}
      className="space-y-4"
    >
      {/* 1. Role Context Header + Role-Exclusive Quick Actions */}
      <div
        className={`${surfaceCls} px-4 py-3.5 flex flex-col ${
          compact ? '' : 'xl:flex-row xl:items-center xl:justify-between'
        } gap-3`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className={`font-semibold ${roleConfig.accentTextClass}`}>
              {roleConfig.title} Workspace
            </span>
            <span aria-hidden="true">·</span>
            <span>{data.user.company}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {data.vehicles.length} scoped {data.vehicles.length === 1 ? 'vehicle' : 'vehicles'}
            </span>
          </div>
          <h2
            data-testid="role-dashboard-heading"
            className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight"
          >
            {roleConfig.dashboardHeading}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-2xl">
            {roleConfig.dashboardSubtitle}
          </p>
        </div>

        <div
          data-testid="role-quick-actions"
          className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'shrink-0'}`}
        >
          {roleConfig.quickActions.map((qa) => (
            <button
              key={qa.id}
              type="button"
              data-testid={`role-quick-action-${qa.targetScreenId}`}
              onClick={() => onNavigateScreen(qa.targetScreenId)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RoleNavIcon
                iconKey={qa.iconKey}
                className={`w-3.5 h-3.5 shrink-0 ${roleConfig.accentTextClass}`}
              />
              <span>{qa.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1B. Global RTO / Vehicle Number Search Bar */}
      {onSelectRtoVehicle && (
        <section
          aria-label="Global RTO and Vehicle Number Search"
          className={`${surfaceCls} px-4 py-3.5`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Global RTO / Vehicle Number Search
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Query the RTO vehicle registry by plate number, driver, or RTO office to load full registration metadata and launch Live Tracking.
              </p>
            </div>
          </div>
          <GlobalRtoSearchBar
            liveVehicles={data.vehicles}
            onSelectVehicleForTracking={onSelectRtoVehicle}
            variant="hero"
            testIdPrefix="dashboard-rto-search"
          />
        </section>
      )}

      {/* 2. Dynamic Role-Specific KPI Metrics Strip */}
      <div
        data-testid="role-dashboard-metrics"
        className={`grid gap-3 ${
          compact
            ? 'grid-cols-2'
            : role === 'super_admin'
            ? 'grid-cols-2 xl:grid-cols-3'
            : 'grid-cols-2 xl:grid-cols-4'
        }`}
      >
        {kpis.map((m) => (
          <button
            key={m.id}
            type="button"
            data-testid={`role-metric-${m.id}`}
            onClick={() => onNavigateScreen(m.targetScreenId)}
            className={`${surfaceCls} p-4 text-left hover:border-cyan-500/60 dark:hover:border-[#00D4FF]/50 transition-colors cursor-pointer group`}
          >
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium truncate">{m.label}</span>
              <RoleNavIcon
                iconKey={m.iconKey}
                className={`w-4 h-4 shrink-0 ${roleConfig.accentTextClass}`}
              />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
              {m.value}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
              <span className={`truncate ${metricToneText(m.tone)}`}>{m.detail}</span>
              <ArrowUpRight
                className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-[#00D4FF] shrink-0"
                aria-hidden="true"
              />
            </div>
          </button>
        ))}
      </div>

      {/* 3. Role-Differentiated Operational Workspace */}
      <div
        data-testid="role-dashboard-workspace"
        className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-12'}`}
      >
        {/* LEFT PRIMARY PANEL (8 cols on desktop) */}
        <div className={`${compact ? '' : 'xl:col-span-8'} space-y-4 min-w-0`}>
          {/* SUPER ADMIN EXCLUSIVE: Regional Admin Multi-Tenant Directory */}
          {role === 'super_admin' && (
            <section className={`${surfaceCls} p-4`}>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {roleConfig.workspaceTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Global multi-tenant breakdown across {data.admins.length} regional admins and {data.apiIntegrationsCount}+ connected APIs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateScreen('admins')}
                  className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline whitespace-nowrap cursor-pointer"
                >
                  Open Admin Console
                </button>
              </div>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3 font-medium">Regional Admin</th>
                      <th className="py-2 pr-3 font-medium">Region / Company</th>
                      <th className="py-2 pr-3 font-medium text-right">Clients</th>
                      <th className="py-2 pr-3 font-medium text-right">Fleet (Running)</th>
                      <th className="py-2 pr-3 font-medium text-right">Open Alerts</th>
                      <th className="py-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {superAdminRows.map((row) => (
                      <tr
                        key={row.adminId}
                        onClick={() => onNavigateScreen('admins')}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-white">
                          {row.adminName}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">
                          {row.company}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                          {row.clientCount}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                          {row.vehicleCount} ({row.runningCount})
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-amber-700 dark:text-amber-300">
                          {row.unreadAlertsCount}
                        </td>
                        <td
                          className={`py-2.5 text-right font-semibold ${
                            row.status === 'Active'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {row.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ADMIN EXCLUSIVE: Assigned Client Fleets Health Matrix */}
          {role === 'admin' && (
            <section className={`${surfaceCls} p-4`}>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {roleConfig.workspaceTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Client fleet health, fuel readiness, and violations under your regional jurisdiction
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateScreen('clients')}
                  className="text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline whitespace-nowrap cursor-pointer"
                >
                  Manage Clients
                </button>
              </div>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3 font-medium">Client Account</th>
                      <th className="py-2 pr-3 font-medium">Fleet Owner</th>
                      <th className="py-2 pr-3 font-medium text-right">Running / Total</th>
                      <th className="py-2 pr-3 font-medium text-right">Avg Fuel</th>
                      <th className="py-2 pr-3 font-medium text-right">Violations</th>
                      <th className="py-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {adminClientRows.map((row) => (
                      <tr
                        key={row.clientId}
                        onClick={() => onNavigateScreen('clients')}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-white">
                          {row.company}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">
                          {row.clientName}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                          {row.runningCount} / {row.vehicleCount}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                          {row.avgFuelPercent}%
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-amber-700 dark:text-amber-300">
                          {row.violationsCount}
                        </td>
                        <td
                          className={`py-2.5 text-right font-semibold ${
                            row.status === 'Active'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {row.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ROLE-ADAPTIVE ANALYTICS CHART (Super Admin / Admin / Client; hidden for read-only Customer) */}
          {roleChartSpec && roleChartSpec.points.length > 0 && (
            <section
              data-testid={`role-analytics-chart-${role}`}
              className={`${surfaceCls} p-4`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {roleChartSpec.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {roleChartSpec.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: roleChartSpec.primaryColor }}
                        aria-hidden="true"
                      />
                      <span>{roleChartSpec.primarySeriesLabel}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: roleChartSpec.secondaryColor }}
                        aria-hidden="true"
                      />
                      <span>{roleChartSpec.secondarySeriesLabel}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateScreen(roleChartSpec.ctaScreenId)}
                    className={`text-xs font-semibold hover:underline whitespace-nowrap cursor-pointer ${roleConfig.accentTextClass}`}
                  >
                    {roleChartSpec.ctaLabel}
                  </button>
                </div>
              </div>
              <div className="h-52 w-full mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={roleChartSpec.points}
                    margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#F8FAFC',
                      }}
                    />
                    <Bar
                      dataKey="primaryValue"
                      name={roleChartSpec.primarySeriesLabel}
                      fill={roleChartSpec.primaryColor}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="secondaryValue"
                      name={roleChartSpec.secondarySeriesLabel}
                      fill={roleChartSpec.secondaryColor}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* LIVE MAP MODULE (Scoped automatically to the logged-in role) */}
          <section className={`${surfaceCls} p-3.5`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {role === 'customer'
                    ? 'Shared Shipment Live Map'
                    : role === 'super_admin'
                    ? 'Global 24×7 Live Fleet Map'
                    : role === 'admin'
                    ? 'Regional Client Live Map'
                    : 'Live Fleet Tracking Map'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Real-time telemetry every {data.uptimeStats.telemetryIntervalSec}s · Click any pin for live status
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onNavigateScreen(role === 'customer' ? 'live-tracking' : 'live-map')
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 whitespace-nowrap cursor-pointer"
              >
                <span>Open Full Map</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <PlatformLiveMap
              vehicles={filteredVehicles}
              selectedVehicleId={selectedVehicle?.id || null}
              onSelectVehicle={onSelectVehicle}
              geofences={data.geofences}
              showGeofences={role !== 'customer'}
              showPlannedRoute={role === 'client' || role === 'customer'}
              platform={platform}
              heightClass={compact ? 'h-[240px]' : 'h-[340px]'}
              isFullscreen={isFullscreenMap}
              onToggleFullscreen={onToggleFullscreenMap}
            />
          </section>
        </div>

        {/* RIGHT SIDEBAR PANEL (4 cols on desktop) — Strictly Tailored Per Role */}
        <div className={`${compact ? '' : 'xl:col-span-4'} space-y-4 min-w-0`}>
          {role === 'customer' ? (
            /* CUSTOMER EXCLUSIVE: Driver Contact, Exact Address, Permitted Telemetry & Latest POD */
            <>
              {selectedVehicle && (
                <section className={`${surfaceCls} p-4 space-y-3`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Shared Vehicle
                      </div>
                      <h3 className="text-base font-bold font-mono text-slate-900 dark:text-white">
                        {selectedVehicle.vehicleNumber}
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-semibold ${statusTextColor(
                        selectedVehicle.status
                      )}`}
                    >
                      {selectedVehicle.status} · {selectedVehicle.speedKmh} km/h
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 dark:border-white/10 space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <MapPin
                        className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span className="text-slate-700 dark:text-slate-200 leading-snug">
                        {selectedVehicle.address}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 pl-6 tabular-nums">
                      {selectedVehicle.lat.toFixed(5)}, {selectedVehicle.lng.toFixed(5)}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Assigned Driver
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {selectedVehicle.driverName}
                      </div>
                      <div className="font-mono text-sky-700 dark:text-sky-300 tabular-nums">
                        {selectedVehicle.driverPhone}
                      </div>
                    </div>
                    <a
                      href={`tel:${selectedVehicle.driverPhone.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Call Driver</span>
                    </a>
                  </div>

                  {/* Client-Granted Telemetry Permission Transparency */}
                  <div className="pt-2.5 border-t border-slate-200 dark:border-white/10 space-y-2 text-xs">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      Permitted Sensor Access
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                      <div className="py-1.5 flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300">Odometer</span>
                        {selectedVehicle.odometerKm !== null ? (
                          <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                            {selectedVehicle.odometerKm.toLocaleString()} km
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Lock className="w-3 h-3" aria-hidden="true" />
                            <span>Restricted</span>
                          </span>
                        )}
                      </div>
                      <div className="py-1.5 flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300">Battery Voltage</span>
                        {selectedVehicle.batteryVoltage !== null ? (
                          <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                            {selectedVehicle.batteryVoltage} V
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Lock className="w-3 h-3" aria-hidden="true" />
                            <span>Restricted</span>
                          </span>
                        )}
                      </div>
                      <div className="py-1.5 flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300">A/C Status</span>
                        {selectedVehicle.acOn !== null ? (
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {selectedVehicle.acOn ? 'ON' : 'OFF'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Lock className="w-3 h-3" aria-hidden="true" />
                            <span>Restricted</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Latest Verified POD for Customer */}
              <section className={`${surfaceCls} p-4 space-y-2.5`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Latest Delivery Proof (POD)
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigateScreen('pods')}
                    className="text-xs font-semibold text-sky-700 dark:text-sky-300 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                {data.pods[0] ? (
                  <div className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {data.pods[0].consignmentNo}
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Signed</span>
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      Recipient: {data.pods[0].recipientName} · {data.pods[0].location}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {data.pods[0].timestamp} · {data.pods[0].signatureText}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Delivery proof photos and e-signatures will appear here once signed at destination.
                  </p>
                )}
              </section>
            </>
          ) : (
            /* SUPER ADMIN / ADMIN / CLIENT: Role-Scoped Priority Alerts + Role Highlight Panel */
            <>
              <section className={`${surfaceCls} p-4 flex flex-col`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {role === 'super_admin'
                      ? 'Global Alert Escalations'
                      : role === 'admin'
                      ? 'Regional Client Alerts'
                      : 'Active Fleet Alerts'}
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateScreen(
                        role === 'super_admin' ? 'alerts-settings' : 'alerts'
                      )
                    }
                    className={`text-xs font-semibold hover:underline cursor-pointer ${roleConfig.accentTextClass}`}
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[320px] overflow-y-auto">
                  {data.alerts.slice(0, 6).map((a) => (
                    <div key={a.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {a.vehicleNumber}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            a.severity === 'Critical'
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {a.type}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                        {a.message}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate">
                          {a.location} · {a.timestamp}
                        </span>
                        {!a.acknowledged ? (
                          <button
                            type="button"
                            onClick={() =>
                              actions.apiPatch(`/api/platform/alerts/${a.id}/ack`, {})
                            }
                            className={`font-semibold hover:underline shrink-0 ml-2 cursor-pointer ${roleConfig.accentTextClass}`}
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 shrink-0 ml-2">
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Secondary Role-Specific Digest Card */}
              {role === 'super_admin' && (
                <section className={`${surfaceCls} p-4 space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Infrastructure &amp; API Pulse
                    </h3>
                    <button
                      type="button"
                      onClick={() => onNavigateScreen('settings')}
                      className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
                    >
                      Settings
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">Platform Uptime SLA</span>
                      <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {data.uptimeStats.uptimePercent}%
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">Vehicle Categories</span>
                      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {data.vehicleTypesCount}+ types
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">Supported GPS Hardware</span>
                      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {data.deviceCatalogCount}+ models
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">Active API Connectors</span>
                      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {data.apiIntegrationsCount}+ live
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {role === 'admin' && (
                <section className={`${surfaceCls} p-4 space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Open Support Escalations
                    </h3>
                    <button
                      type="button"
                      onClick={() => onNavigateScreen('support')}
                      className="text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline cursor-pointer"
                    >
                      Support Desk
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                    {data.tickets.slice(0, 4).map((t) => (
                      <div key={t.id} className="py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {t.subject}
                          </span>
                          <span className="text-[11px] font-mono text-amber-700 dark:text-amber-300 shrink-0">
                            {t.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {t.createdByName} · {t.createdAt}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {role === 'client' && (
                <section className={`${surfaceCls} p-4 space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Recent Delivery PODs ({data.pods.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => onNavigateScreen('pods')}
                      className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                    >
                      Record POD
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                    {data.pods.slice(0, 4).map((pod) => (
                      <div key={pod.id} className="py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {pod.consignmentNo} · {pod.vehicleNumber}
                          </span>
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                            Verified
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {pod.recipientName} · {pod.location}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* 4. Scoped Live Fleet Telemetry Table (Super Admin / Admin / Client) */}
      {role !== 'customer' && (
        <section data-testid="live-telemetry-roster" className={`${surfaceCls} p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Live Telemetry Roster{' '}
                <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 font-medium">
                  ({visibleRosterVehicles.length}
                  {rosterStatusFilter !== 'All' ? ` of ${filteredVehicles.length}` : ''})
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Filter by live vehicle state, inspect telemetry, or call the assigned driver
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label="Filter telemetry roster by status"
                data-testid="roster-status-filter-group"
                className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-[#0A1128] overflow-x-auto max-w-full"
              >
                {ROSTER_STATUS_FILTERS.map((status) => {
                  const active = rosterStatusFilter === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      data-testid={`roster-filter-${status.toLowerCase()}`}
                      onClick={() => setRosterStatusFilter(status)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        active
                          ? roleConfig.accentBgActiveClass
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{status}</span>
                      <span className="font-mono tabular-nums opacity-80">
                        {rosterStatusCounts[status]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => onExportCsv(visibleRosterVehicles)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {visibleRosterVehicles.length === 0 ? (
            <div
              data-testid="roster-empty-state"
              className="py-10 px-4 text-center border-t border-slate-200 dark:border-white/10"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No {rosterStatusFilter.toLowerCase()} vehicles right now
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try switching back to all scoped vehicles to view active telemetry.
              </p>
              <button
                type="button"
                data-testid="roster-reset-filter-btn"
                onClick={() => setRosterStatusFilter('All')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset Filter</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Vehicle</th>
                    <th className="py-2 pr-3 font-medium">Driver</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium text-right">Speed</th>
                    <th className="py-2 pr-3 font-medium text-right">Odometer</th>
                    <th className="py-2 pr-3 font-medium text-right">Fuel</th>
                    <th className="py-2 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {visibleRosterVehicles.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => {
                        onSelectVehicle(v.id);
                        if (role === 'client') onNavigateScreen('vehicle-details');
                      }}
                      className="hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="py-2.5 pr-3">
                        <div className="font-mono font-semibold text-slate-900 dark:text-white">
                          {v.vehicleNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {v.vehicleType}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {v.driverName}
                        </div>
                        <a
                          href={`tel:${v.driverPhone.replace(/\s+/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[11px] text-cyan-700 dark:text-[#00D4FF] hover:underline tabular-nums"
                        >
                          {v.driverPhone}
                        </a>
                      </td>
                      <td className={`py-2.5 pr-3 font-semibold ${statusTextColor(v.status)}`}>
                        {v.status}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                        {v.speedKmh} km/h
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {v.odometerKm !== null ? `${v.odometerKm.toLocaleString()} km` : 'Restricted'}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                        {v.fuelPercent}% ({v.fuelLiters}L)
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300 max-w-[220px] truncate">
                        {v.address}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
