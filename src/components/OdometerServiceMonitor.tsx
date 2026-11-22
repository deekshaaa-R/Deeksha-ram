import { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Gauge,
  Wrench,
} from 'lucide-react';
import type { ServiceMilestoneId, TrackedDevice } from '../types';
import {
  evaluateVehicleMilestones,
  getFleetServiceAlerts,
  resolveMaintenanceRecord,
  summarizeServiceHealth,
  validateOdometerInput,
  type MaintenanceMap,
  type ServiceAlertFilter,
} from '../utils/serviceMilestoneLogic';

interface OdometerServiceMonitorProps {
  devices: TrackedDevice[];
  maintenanceByImei: MaintenanceMap;
  onUpdateOdometer: (
    deviceId: string,
    rawOdometer: string | number
  ) => Promise<{
    ok: boolean;
    odometerKm?: number;
    syncedToFirestore: boolean;
    error?: string;
  }>;
  onCompleteMilestone: (
    deviceId: string,
    milestoneId: ServiceMilestoneId
  ) => Promise<{
    ok: boolean;
    syncedToFirestore: boolean;
    error?: string;
  }>;
  onBookServiceSlot: () => void;
  compactMode?: boolean;
  onViewAllTab?: () => void;
}

function VehicleOdometerRow({
  device,
  maintenanceByImei,
  onUpdateOdometer,
}: {
  device: TrackedDevice;
  maintenanceByImei: MaintenanceMap;
  onUpdateOdometer: OdometerServiceMonitorProps['onUpdateOdometer'];
}) {
  const record = useMemo(
    () => resolveMaintenanceRecord(device, maintenanceByImei),
    [device, maintenanceByImei]
  );
  const milestones = useMemo(() => evaluateVehicleMilestones(record), [record]);

  const [draftOdo, setDraftOdo] = useState(String(record.odometerKm));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftOdo(String(record.odometerKm));
  }, [record.odometerKm]);

  const handleSave = async (nextVal: string | number) => {
    setError(null);
    const validation = validateOdometerInput(nextVal);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    setSaving(true);
    try {
      const res = await onUpdateOdometer(device.id, validation.odometerKm);
      if (!res.ok && res.error) {
        setError(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const overdueForVehicle = milestones.filter((m) => m.severity === 'Overdue').length;
  const approachingForVehicle = milestones.filter(
    (m) => m.severity === 'Approaching'
  ).length;

  return (
    <div
      data-testid={`vehicle-odometer-card-${device.id}`}
      className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-5 flex flex-col justify-between gap-4"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white truncate">
              {device.vehicleLabel}
            </h3>
            <p className="text-[11px] font-mono text-slate-500 dark:text-[#A9B4D0] mt-0.5 truncate">
              IMEI {device.imei}
              {device.vehicleType ? ` · ${device.vehicleType}` : ''}
            </p>
          </div>
          {overdueForVehicle > 0 ? (
            <span className="inline-flex items-center gap-1 shrink-0 text-xs font-semibold text-rose-700 dark:text-[#FF4D4F]">
              <AlertOctagon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{overdueForVehicle} overdue</span>
            </span>
          ) : approachingForVehicle > 0 ? (
            <span className="inline-flex items-center gap-1 shrink-0 text-xs font-semibold text-amber-700 dark:text-[#FFB020]">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{approachingForVehicle} approaching</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 shrink-0 text-xs font-semibold text-emerald-700 dark:text-[#7CFF6B]">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Healthy</span>
            </span>
          )}
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-baseline justify-between gap-2">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0] block">
              Current Odometer
            </span>
            <span
              data-testid={`vehicle-odometer-value-${device.id}`}
              className="font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white"
            >
              {record.odometerKm.toLocaleString('en-IN')} km
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-[#A9B4D0]">
            {record.updatedAt}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              aria-label={`Odometer reading in km for ${device.vehicleLabel}`}
              data-testid={`odometer-input-${device.id}`}
              value={draftOdo}
              onChange={(e) => {
                setDraftOdo(e.target.value);
                if (error) setError(null);
              }}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-1.5 text-xs font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-[#00D4FF]"
            />
            <button
              type="button"
              disabled={saving}
              data-testid={`odometer-save-${device.id}`}
              onClick={() => void handleSave(draftOdo)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer disabled:opacity-60"
            >
              Update
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave(record.odometerKm + 500)}
                className="px-2 py-0.5 rounded border border-slate-200 dark:border-white/15 text-slate-600 dark:text-[#A9B4D0] hover:border-[#00D4FF] hover:text-slate-900 dark:hover:text-white font-mono cursor-pointer"
              >
                +500 km
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave(record.odometerKm + 1500)}
                className="px-2 py-0.5 rounded border border-slate-200 dark:border-white/15 text-slate-600 dark:text-[#A9B4D0] hover:border-[#00D4FF] hover:text-slate-900 dark:hover:text-white font-mono cursor-pointer"
              >
                +1,500 km
              </button>
            </div>
            <span className="text-slate-400 dark:text-slate-500">Live CAN / GPS Odo</span>
          </div>
          {error && (
            <p
              role="alert"
              data-testid={`odometer-error-${device.id}`}
              className="text-xs text-rose-600 dark:text-[#FF4D4F]"
            >
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Top 3 Upcoming Service Milestones */}
      <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0]">
          Closest Service Intervals
        </div>
        {milestones.slice(0, 3).map((ms) => {
          const barClass =
            ms.severity === 'Overdue'
              ? 'bg-rose-600 dark:bg-[#FF4D4F]'
              : ms.severity === 'Approaching'
              ? 'bg-amber-500 dark:bg-[#FFB020]'
              : 'bg-emerald-500 dark:bg-[#7CFF6B]';
          const textClass =
            ms.severity === 'Overdue'
              ? 'text-rose-700 dark:text-[#FF4D4F]'
              : ms.severity === 'Approaching'
              ? 'text-amber-700 dark:text-[#FFB020]'
              : 'text-slate-600 dark:text-[#A9B4D0]';
          return (
            <div key={ms.milestoneId} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-800 dark:text-white font-medium truncate">
                  {ms.shortLabel}
                </span>
                <span className={`font-mono tabular-nums font-semibold shrink-0 ${textClass}`}>
                  {ms.remainingKm <= 0
                    ? `${Math.abs(ms.remainingKm).toLocaleString('en-IN')} km overdue`
                    : `${ms.remainingKm.toLocaleString('en-IN')} km left`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-[#0A1128] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barClass}`}
                  style={{ width: `${ms.progressPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OdometerServiceMonitor({
  devices,
  maintenanceByImei,
  onUpdateOdometer,
  onCompleteMilestone,
  onBookServiceSlot,
  compactMode = false,
  onViewAllTab,
}: OdometerServiceMonitorProps) {
  const [severityFilter, setSeverityFilter] =
    useState<ServiceAlertFilter>('action-needed');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const summary = useMemo(
    () => summarizeServiceHealth(devices, maintenanceByImei),
    [devices, maintenanceByImei]
  );

  const visibleAlerts = useMemo(
    () =>
      getFleetServiceAlerts(
        devices,
        maintenanceByImei,
        severityFilter,
        deviceFilter
      ),
    [devices, maintenanceByImei, severityFilter, deviceFilter]
  );

  const displayedAlerts = compactMode ? visibleAlerts.slice(0, 4) : visibleAlerts;

  const handleMarkServiced = async (
    deviceId: string,
    milestoneId: ServiceMilestoneId
  ) => {
    const key = `${deviceId}:${milestoneId}`;
    setBusyKey(key);
    try {
      await onCompleteMilestone(deviceId, milestoneId);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section
      aria-labelledby="odometer-service-heading"
      data-testid="odometer-service-monitor"
      className="space-y-6 scroll-mt-24"
    >
      {/* Header + KPI Summary */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
              <Gauge className="w-4 h-4" aria-hidden="true" />
              <span>Preventive Maintenance & Odometer Telemetry</span>
            </div>
            <h2
              id="odometer-service-heading"
              className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
            >
              Odometer & Service Milestone Monitor
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
              Tracks cumulative vehicle mileage against oil, filter, brake, and transmission service intervals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {compactMode && onViewAllTab && (
              <button
                type="button"
                onClick={onViewAllTab}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-white hover:border-[#00D4FF] transition-colors cursor-pointer"
              >
                Open Full Service Log ({summary.actionNeededCount})
              </button>
            )}
            <button
              type="button"
              onClick={onBookServiceSlot}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Book Workshop Slot</span>
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-200 dark:border-white/10">
          <div className="pt-2 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0]">
              Monitored Vehicles
            </span>
            <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
              {summary.totalVehicles}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#A9B4D0]">
              {summary.vehiclesWithAlerts} with active reminders
            </p>
          </div>

          <div className="pt-2 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0]">
              Overdue Services
            </span>
            <div
              data-testid="kpi-overdue-count"
              className={`font-mono tabular-nums text-2xl font-bold ${
                summary.overdueCount > 0
                  ? 'text-rose-700 dark:text-[#FF4D4F]'
                  : 'text-emerald-700 dark:text-[#7CFF6B]'
              }`}
            >
              {summary.overdueCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#A9B4D0]">
              Past scheduled km limit
            </p>
          </div>

          <div className="pt-2 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0]">
              Approaching Due
            </span>
            <div
              data-testid="kpi-approaching-count"
              className={`font-mono tabular-nums text-2xl font-bold ${
                summary.approachingCount > 0
                  ? 'text-amber-700 dark:text-[#FFB020]'
                  : 'text-emerald-700 dark:text-[#7CFF6B]'
              }`}
            >
              {summary.approachingCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#A9B4D0]">
              Within 1,000–2,000 km window
            </p>
          </div>

          <div className="pt-2 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0]">
              Most Urgent Milestone
            </span>
            {summary.mostUrgentAlert ? (
              <>
                <div className="font-display text-sm font-bold text-slate-900 dark:text-white pt-0.5">
                  {summary.mostUrgentAlert.shortLabel}
                </div>
                <p
                  className={`text-[11px] font-mono tabular-nums font-semibold leading-snug ${
                    summary.mostUrgentAlert.severity === 'Overdue'
                      ? 'text-rose-700 dark:text-[#FF4D4F]'
                      : 'text-amber-700 dark:text-[#FFB020]'
                  }`}
                >
                  {summary.mostUrgentAlert.vehicleLabel.split(' ')[0]} ·{' '}
                  {summary.mostUrgentAlert.remainingKm <= 0
                    ? `${Math.abs(summary.mostUrgentAlert.remainingKm).toLocaleString('en-IN')} km overdue`
                    : `due in ${summary.mostUrgentAlert.remainingKm.toLocaleString('en-IN')} km`}
                </p>
              </>
            ) : (
              <>
                <div className="font-display text-sm font-bold text-emerald-700 dark:text-[#7CFF6B] pt-0.5">
                  All Fleet Compliant
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#A9B4D0]">
                  No overdue or approaching tasks
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Service Milestone Alerts Queue */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['action-needed', `Action Needed (${summary.actionNeededCount})`],
                ['overdue', `Overdue (${summary.overdueCount})`],
                ['approaching', `Approaching (${summary.approachingCount})`],
                ['all', 'All Intervals'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                data-testid={`alert-filter-${key}`}
                onClick={() => setSeverityFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  severityFilter === key
                    ? 'bg-[#00D4FF] text-[#0A1128]'
                    : 'bg-slate-100 dark:bg-[#0A1128] text-slate-600 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="service-vehicle-filter"
              className="text-xs text-slate-500 dark:text-[#A9B4D0] shrink-0"
            >
              Vehicle:
            </label>
            <select
              id="service-vehicle-filter"
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] pl-2.5 pr-7 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#00D4FF]"
            >
              <option value="all">All Vehicles ({devices.length})</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.vehicleLabel}
                </option>
              ))}
            </select>
          </div>
        </div>

        {displayedAlerts.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2
              className="w-8 h-8 text-emerald-600 dark:text-[#7CFF6B] mx-auto"
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              No service milestones match this filter
            </p>
            <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
              All inspected vehicle components are within healthy operating intervals.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {displayedAlerts.map((alert) => {
              const rowKey = `${alert.deviceId}:${alert.milestoneId}`;
              const isBusy = busyKey === rowKey;
              return (
                <div
                  key={rowKey}
                  data-testid={`service-alert-row-${alert.deviceId}-${alert.milestoneId}`}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {alert.severity === 'Overdue' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-[#FF4D4F]">
                          <AlertOctagon className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Overdue</span>
                        </span>
                      ) : alert.severity === 'Approaching' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-[#FFB020]">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Approaching</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-[#7CFF6B]">
                          <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Scheduled</span>
                        </span>
                      )}
                      <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        {alert.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                        · {alert.vehicleLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                      {alert.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0">
                    <div className="text-left lg:text-right">
                      <div
                        className={`font-mono tabular-nums text-xs font-bold ${
                          alert.severity === 'Overdue'
                            ? 'text-rose-700 dark:text-[#FF4D4F]'
                            : alert.severity === 'Approaching'
                            ? 'text-amber-700 dark:text-[#FFB020]'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {alert.remainingKm <= 0
                          ? `Overdue by ${Math.abs(alert.remainingKm).toLocaleString('en-IN')} km`
                          : `Due in ${alert.remainingKm.toLocaleString('en-IN')} km`}
                      </div>
                      <div className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-[#A9B4D0]">
                        Odo {alert.currentOdometerKm.toLocaleString('en-IN')} / Due{' '}
                        {alert.nextDueKm.toLocaleString('en-IN')} km
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      data-testid={`mark-serviced-${alert.deviceId}-${alert.milestoneId}`}
                      onClick={() =>
                        void handleMarkServiced(alert.deviceId, alert.milestoneId)
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isBusy ? 'Saving...' : 'Mark Serviced'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {compactMode && visibleAlerts.length > displayedAlerts.length && onViewAllTab && (
          <div className="pt-2 border-t border-slate-200 dark:border-white/10 text-right">
            <button
              type="button"
              onClick={onViewAllTab}
              className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
            >
              View all {visibleAlerts.length} service items →
            </button>
          </div>
        )}
      </div>

      {/* Vehicle Odometer Cards (Shown when not compact, or always show all monitored vehicles!) */}
      {!compactMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {devices.map((device) => (
            <VehicleOdometerRow
              key={device.id}
              device={device}
              maintenanceByImei={maintenanceByImei}
              onUpdateOdometer={onUpdateOdometer}
            />
          ))}
        </div>
      )}
    </section>
  );
}
