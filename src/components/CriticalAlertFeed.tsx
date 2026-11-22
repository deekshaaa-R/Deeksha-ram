import { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Power,
  ShieldAlert,
} from 'lucide-react';
import {
  filterAlertFeed,
  summarizeAlertFeed,
  type FleetAlertSeverity,
  type SimulatorAlert,
} from '../utils/simulatorLogic';

export interface CriticalAlertFeedProps {
  alerts: SimulatorAlert[];
  onAcknowledge?: (id: string) => void;
  onAcknowledgeAll?: () => void;
  onSelectVehicle?: (vehicleId: string) => void;
  compact?: boolean;
}

function getCategoryIcon(category: SimulatorAlert['category']) {
  switch (category) {
    case 'Engine Idle Too Long':
      return Clock;
    case 'Harsh Braking':
      return AlertOctagon;
    case 'Overspeed':
      return Gauge;
    case 'Engine Cut-Off':
      return Power;
    case 'Geofence Breach':
    default:
      return ShieldAlert;
  }
}

export function CriticalAlertFeed({
  alerts,
  onAcknowledge,
  onAcknowledgeAll,
  onSelectVehicle,
  compact = false,
}: CriticalAlertFeedProps) {
  const [severityFilter, setSeverityFilter] = useState<'all' | FleetAlertSeverity>(
    'all'
  );

  const summary = useMemo(() => summarizeAlertFeed(alerts), [alerts]);
  const visibleAlerts = useMemo(() => {
    const filtered = filterAlertFeed(alerts, severityFilter);
    return compact ? filtered.slice(0, 3) : filtered;
  }, [alerts, severityFilter, compact]);

  const filterTabs: Array<{
    id: 'all' | FleetAlertSeverity;
    label: string;
    count: number;
  }> = [
    { id: 'all', label: 'All', count: alerts.length },
    {
      id: 'critical',
      label: 'Red',
      count: alerts.filter((a) => a.severity === 'critical').length,
    },
    {
      id: 'warning',
      label: 'Amber',
      count: alerts.filter((a) => a.severity === 'warning').length,
    },
  ];

  return (
    <section
      data-testid={compact ? 'critical-alert-feed-compact' : 'critical-alert-feed'}
      aria-label="Critical Alert Feed"
      className={
        compact
          ? 'mt-3.5 pt-3.5 border-t border-slate-200 dark:border-white/10'
          : 'rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] p-4 sm:p-5 shadow-sm'
      }
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldAlert
              className="w-4 h-4 text-rose-600 dark:text-[#FF4D4F] shrink-0"
              aria-hidden="true"
            />
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Critical Alert Feed
            </h3>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#A9B4D0] mt-0.5 tabular-nums">
            <span className="font-semibold text-rose-700 dark:text-[#FF4D4F]">
              {summary.criticalCount} Red
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="font-semibold text-amber-700 dark:text-[#FFB020]">
              {summary.warningCount} Amber
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>{summary.unacknowledged} active</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Filter critical alert feed by severity"
            className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-[#0A1128] p-0.5 border border-slate-200/80 dark:border-white/10"
          >
            {filterTabs.map((tab) => {
              const active = severityFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSeverityFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    active
                      ? 'bg-[#00D4FF] text-[#0A1128]'
                      : 'text-slate-600 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>

          {!compact && summary.unacknowledged > 0 && onAcknowledgeAll && (
            <button
              type="button"
              onClick={onAcknowledgeAll}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Acknowledge All
            </button>
          )}
        </div>
      </div>

      {/* Event Stream */}
      {visibleAlerts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128]/50 p-4 text-center space-y-2">
          <p className="text-xs text-slate-600 dark:text-[#A9B4D0]">
            No {severityFilter === 'critical' ? 'Red (Critical)' : severityFilter === 'warning' ? 'Amber (Warning)' : ''} alerts recorded right now.
          </p>
          {severityFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSeverityFilter('all')}
              className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
            >
              Show All Alerts
            </button>
          )}
        </div>
      ) : (
        <ul
          aria-live="polite"
          className={`space-y-2 ${
            compact ? 'max-h-44 overflow-y-auto pr-0.5' : 'max-h-[296px] overflow-y-auto pr-1'
          }`}
        >
          {visibleAlerts.map((alert) => {
            const CategoryIcon = getCategoryIcon(alert.category);
            const isRed = alert.severity === 'critical';

            const cardClass = alert.acknowledged
              ? 'bg-slate-50 dark:bg-[#0A1128]/45 border-slate-200/80 dark:border-white/10 opacity-75'
              : isRed
              ? 'bg-rose-50/75 dark:bg-[#FF4D4F]/10 border-rose-200 dark:border-[#FF4D4F]/45'
              : 'bg-amber-50/75 dark:bg-[#FFB020]/10 border-amber-200 dark:border-[#FFB020]/45';

            const severityColor = isRed
              ? 'text-rose-700 dark:text-[#FF4D4F]'
              : 'text-amber-700 dark:text-[#FFB020]';

            return (
              <li
                key={alert.id}
                data-severity={alert.severity}
                className={`rounded-xl border px-3 py-2.5 transition-colors ${cardClass}`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`mt-0.5 shrink-0 ${severityColor}`}>
                      {alert.acknowledged ? (
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-600 dark:text-[#7CFF6B]"
                          aria-hidden="true"
                        />
                      ) : isRed ? (
                        <CategoryIcon className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {alert.title}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            alert.acknowledged
                              ? 'text-emerald-700 dark:text-[#7CFF6B]'
                              : severityColor
                          }`}
                        >
                          {alert.acknowledged
                            ? 'Acknowledged'
                            : isRed
                            ? 'Red · Critical'
                            : 'Amber · Warning'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-[#A9B4D0] mt-0.5 leading-snug">
                        {alert.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-500 dark:text-[#A9B4D0]">
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          {onSelectVehicle ? (
                            <button
                              type="button"
                              onClick={() => onSelectVehicle(alert.vehicleId)}
                              className="font-mono font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer shrink-0"
                            >
                              {alert.plate}
                            </button>
                          ) : (
                            <span className="font-mono font-semibold text-slate-800 dark:text-white shrink-0">
                              {alert.plate}
                            </span>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{alert.location}</span>
                        </span>
                        <span className="font-mono tabular-nums shrink-0">
                          {alert.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!alert.acknowledged && onAcknowledge && (
                    <button
                      type="button"
                      onClick={() => onAcknowledge(alert.id)}
                      aria-label={`Acknowledge ${alert.title} for ${alert.plate}`}
                      className="shrink-0 rounded-lg border border-slate-300 dark:border-white/15 bg-white/80 dark:bg-[#0A1128]/70 hover:border-cyan-500 dark:hover:border-[#00D4FF] px-2 py-1 text-[11px] font-semibold text-slate-800 dark:text-white transition-colors cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
