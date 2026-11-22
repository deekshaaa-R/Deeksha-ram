import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Cloud,
  Compass,
  Fuel,
  MapPin,
  PauseCircle,
  PowerOff,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import {
  resolveVehicleStatus,
  type EngineState,
  type FuelBand,
  type SpeedBand,
  type VehicleStatusInput,
} from '../utils/vehicleStatusLogic';

export interface VehicleStatusProps extends VehicleStatusInput {
  variant?: 'dashboard' | 'popup';
  compact?: boolean;
  actionSlot?: ReactNode;
  className?: string;
}

function getSpeedStrokeColor(band: SpeedBand): string {
  switch (band) {
    case 'Overspeed':
      return '#DC2626';
    case 'Highway':
      return '#0284C7';
    case 'City':
      return '#16A34A';
    case 'Stopped':
    default:
      return '#64748B';
  }
}

function getSpeedTextClass(band: SpeedBand, isPopup: boolean): string {
  if (isPopup) {
    switch (band) {
      case 'Overspeed':
        return 'text-rose-700';
      case 'Highway':
        return 'text-sky-700';
      case 'City':
        return 'text-emerald-700';
      default:
        return 'text-slate-600';
    }
  }
  switch (band) {
    case 'Overspeed':
      return 'text-rose-700 dark:text-[#FF4D4F]';
    case 'Highway':
      return 'text-cyan-700 dark:text-[#00D4FF]';
    case 'City':
      return 'text-emerald-700 dark:text-[#7CFF6B]';
    default:
      return 'text-slate-600 dark:text-[#A9B4D0]';
  }
}

function getEngineTone(state: EngineState, isPopup: boolean): {
  textClass: string;
  barClass: string;
} {
  if (isPopup) {
    switch (state) {
      case 'Running':
        return { textClass: 'text-emerald-700', barClass: 'bg-emerald-600' };
      case 'Idling':
        return { textClass: 'text-amber-700', barClass: 'bg-amber-500' };
      case 'Immobilized':
        return { textClass: 'text-rose-700', barClass: 'bg-rose-600' };
      case 'Off':
      default:
        return { textClass: 'text-slate-600', barClass: 'bg-slate-400' };
    }
  }
  switch (state) {
    case 'Running':
      return {
        textClass: 'text-emerald-700 dark:text-[#7CFF6B]',
        barClass: 'bg-emerald-600 dark:bg-[#7CFF6B]',
      };
    case 'Idling':
      return {
        textClass: 'text-amber-700 dark:text-[#FFB020]',
        barClass: 'bg-amber-500 dark:bg-[#FFB020]',
      };
    case 'Immobilized':
      return {
        textClass: 'text-rose-700 dark:text-[#FF4D4F]',
        barClass: 'bg-rose-600 dark:bg-[#FF4D4F]',
      };
    case 'Off':
    default:
      return {
        textClass: 'text-slate-600 dark:text-slate-400',
        barClass: 'bg-slate-400 dark:bg-slate-500',
      };
  }
}

function getFuelTone(band: FuelBand, isPopup: boolean): {
  barClass: string;
  textClass: string;
} {
  if (isPopup) {
    switch (band) {
      case 'Critical':
        return { barClass: 'bg-rose-600', textClass: 'text-rose-700' };
      case 'Low':
        return { barClass: 'bg-amber-500', textClass: 'text-amber-700' };
      case 'Healthy':
      default:
        return { barClass: 'bg-emerald-600', textClass: 'text-emerald-700' };
    }
  }
  switch (band) {
    case 'Critical':
      return {
        barClass: 'bg-rose-600 dark:bg-[#FF4D4F]',
        textClass: 'text-rose-700 dark:text-[#FF4D4F]',
      };
    case 'Low':
      return {
        barClass: 'bg-amber-500 dark:bg-[#FFB020]',
        textClass: 'text-amber-700 dark:text-[#FFB020]',
      };
    case 'Healthy':
    default:
      return {
        barClass: 'bg-emerald-600 dark:bg-[#7CFF6B]',
        textClass: 'text-emerald-700 dark:text-[#7CFF6B]',
      };
  }
}

function EngineIcon({
  state,
  className,
}: {
  state: EngineState;
  className?: string;
}) {
  switch (state) {
    case 'Running':
      return <Zap className={className} aria-hidden="true" />;
    case 'Idling':
      return <PauseCircle className={className} aria-hidden="true" />;
    case 'Immobilized':
      return <ShieldAlert className={className} aria-hidden="true" />;
    case 'Off':
    default:
      return <PowerOff className={className} aria-hidden="true" />;
  }
}

function SpeedGaugeSvg({
  speedKmh,
  speedBand,
  dashArray,
  dashOffset,
  size,
  isPopup,
}: {
  speedKmh: number;
  speedBand: SpeedBand;
  dashArray: number;
  dashOffset: number;
  size: 'sm' | 'md';
  isPopup: boolean;
}) {
  const strokeColor = getSpeedStrokeColor(speedBand);
  const trackColor = isPopup ? '#E2E8F0' : 'currentColor';
  const widthClass =
    size === 'sm' ? 'w-[106px] h-[68px]' : 'w-[120px] h-[76px]';

  return (
    <div className="relative inline-flex flex-col items-center justify-center shrink-0">
      <svg
        viewBox="0 0 116 74"
        className={`${widthClass} ${
          isPopup ? 'text-slate-200' : 'text-slate-200 dark:text-white/10'
        }`}
        role="img"
        aria-label={`Live speed gauge: ${speedKmh} kilometers per hour`}
      >
        {/* Scale ticks cleanly outside the arc stroke */}
        <text
          x="10"
          y="71"
          textAnchor="middle"
          fontSize="7"
          fill={isPopup ? '#64748B' : '#94A3B8'}
          fontFamily="ui-monospace, monospace"
        >
          0
        </text>
        <text
          x="58"
          y="9"
          textAnchor="middle"
          fontSize="7"
          fill={isPopup ? '#64748B' : '#94A3B8'}
          fontFamily="ui-monospace, monospace"
        >
          60
        </text>
        <text
          x="104"
          y="71"
          textAnchor="middle"
          fontSize="7"
          fill={isPopup ? '#64748B' : '#94A3B8'}
          fontFamily="ui-monospace, monospace"
        >
          120
        </text>

        {/* Background semi-circle track (radius 42 centered at 58, 60) */}
        <path
          d="M 16 60 A 42 42 0 0 1 100 60"
          fill="none"
          stroke={trackColor}
          strokeWidth="7.5"
          strokeLinecap="round"
        />
        {/* Active speed sweep */}
        <path
          d="M 16 60 A 42 42 0 0 1 100 60"
          fill="none"
          stroke={strokeColor}
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 400ms ease, stroke 300ms ease' }}
        />
      </svg>

      <div className="absolute bottom-2 flex flex-col items-center leading-none pointer-events-none">
        <span
          data-testid={size === 'md' ? 'selected-vehicle-speed' : undefined}
          className={`font-mono font-bold tabular-nums ${
            size === 'sm' ? 'text-base' : 'text-xl'
          } ${isPopup ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}
        >
          {speedKmh}
          <span className="sr-only"> km/h</span>
        </span>
        <span
          aria-hidden="true"
          className={`font-mono uppercase tracking-wider mt-0.5 ${
            size === 'sm' ? 'text-[8.5px]' : 'text-[9.5px]'
          } ${isPopup ? 'text-slate-500' : 'text-slate-500 dark:text-[#A9B4D0]'}`}
        >
          km/h
        </span>
      </div>
    </div>
  );
}

export function VehicleStatus(props: VehicleStatusProps) {
  const {
    variant = 'dashboard',
    compact = false,
    actionSlot,
    className = '',
    telemetrySourceLabel,
    driver,
    lastUpdated,
    cloudSynced,
    trailPointsCount,
  } = props;

  const metrics = resolveVehicleStatus(props);
  const isPopup = variant === 'popup';
  const engineTone = getEngineTone(metrics.engineState, isPopup);
  const fuelTone = getFuelTone(metrics.fuelBand, isPopup);
  const speedTextClass = getSpeedTextClass(metrics.speedBand, isPopup);

  if (isPopup) {
    return (
      <div
        data-testid="vehicle-status-popup"
        className={`font-sans text-slate-900 space-y-3 min-w-[258px] ${className}`}
      >
        {/* Popup Header (extra right padding clears Leaflet's built-in close button) */}
        <div className="pb-2 pr-5 border-b border-slate-200 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-sm font-bold text-slate-900 truncate">
              {metrics.label}
            </div>
            {metrics.subtitle && (
              <div className="text-[11px] text-slate-600 truncate mt-0.5">
                {metrics.subtitle}
              </div>
            )}
          </div>
          <span
            className={`text-[11px] font-semibold shrink-0 whitespace-nowrap ${engineTone.textClass}`}
          >
            {metrics.status}
          </span>
        </div>

        {/* Speed Arc + Engine State */}
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-5 flex flex-col items-center">
            <SpeedGaugeSvg
              speedKmh={metrics.speedKmh}
              speedBand={metrics.speedBand}
              dashArray={metrics.gaugeArc.dashArray}
              dashOffset={metrics.gaugeArc.dashOffset}
              size="sm"
              isPopup
            />
            <span className={`text-[10px] font-semibold mt-0.5 ${speedTextClass}`}>
              {metrics.speedBandLabel}
            </span>
          </div>

          <div className="col-span-7 border-l border-slate-200 pl-3 space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Engine State
            </div>
            <div
              className={`flex items-center gap-1.5 text-xs font-bold ${engineTone.textClass}`}
            >
              <EngineIcon state={metrics.engineState} className="w-3.5 h-3.5 shrink-0" />
              <span>{metrics.engineLabel}</span>
            </div>
            <div className="text-[11px] text-slate-600 leading-snug">
              {metrics.engineDetail}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-600 pt-0.5">
              <Compass className="w-3 h-3 text-sky-600 shrink-0" aria-hidden="true" />
              <span>
                {metrics.headingDeg}° {metrics.headingCardinal}
              </span>
            </div>
          </div>
        </div>

        {/* Fuel Level Bar */}
        <div className="pt-2 border-t border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              <Fuel className={`w-3.5 h-3.5 ${fuelTone.textClass}`} aria-hidden="true" />
              <span>Fuel Level</span>
            </span>
            <span className="font-mono font-bold tabular-nums text-slate-900">
              {metrics.fuelPercent}% · {metrics.fuelLiters}/{metrics.tankCapacityLiters} L
            </span>
          </div>

          <div
            className="relative w-full h-2 rounded-full bg-slate-200 overflow-hidden"
            role="progressbar"
            aria-label="Fuel level"
            aria-valuenow={metrics.fuelPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${fuelTone.barClass}`}
              style={{ width: `${metrics.fuelPercent}%` }}
            />
            {/* 25% Reserve Marker */}
            <span
              aria-hidden="true"
              className="absolute top-0 bottom-0 left-1/4 w-px bg-white/80"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-600">
            <span className="font-mono tabular-nums">
              Est. range ~{metrics.estimatedRangeKm} km
            </span>
            {metrics.fuelAlertLabel ? (
              <span className={`inline-flex items-center gap-1 font-semibold ${fuelTone.textClass}`}>
                <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{metrics.fuelBand} Fuel</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">Nominal Reserve</span>
            )}
          </div>
        </div>

        {/* Popup Footer Metadata */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 text-[10px] text-slate-600">
          <span className="truncate">
            {driver
              ? `Driver: ${driver}`
              : telemetrySourceLabel ?? metrics.formattedCoords ?? 'Live Telemetry'}
          </span>
          <span className="font-mono tabular-nums shrink-0">
            {lastUpdated ?? metrics.formattedCoords ?? ''}
          </span>
        </div>
      </div>
    );
  }

  // Dashboard Variant (Single-elevation flat surface with hairline dividers)
  return (
    <section
      data-testid="vehicle-status-dashboard"
      aria-label={`Live vehicle telemetry for ${metrics.label}`}
      className={`rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0A1128] overflow-hidden ${className}`}
    >
      {/* Header Strip */}
      <div
        data-testid="selected-vehicle-telemetry"
        className="px-4 py-3.5 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-start justify-between gap-3"
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h3
              data-testid="selected-vehicle-label"
              className="font-display text-base font-bold text-slate-900 dark:text-white truncate"
            >
              {metrics.label}
            </h3>
            {telemetrySourceLabel && (
              <span
                data-testid="selected-vehicle-source"
                className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]"
              >
                {telemetrySourceLabel}
              </span>
            )}
            {cloudSynced && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-[#7CFF6B]">
                <Cloud className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Firestore Synced</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 dark:text-[#A9B4D0] font-mono truncate">
            {[
              metrics.subtitle,
              driver ? `Driver ${driver}` : null,
              lastUpdated,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        {actionSlot && <div className="shrink-0">{actionSlot}</div>}
      </div>

      {/* 3-Instrument Telemetry Strip */}
      <div
        className={
          compact
            ? 'grid grid-cols-1 divide-y divide-slate-200 dark:divide-white/10'
            : 'grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-white/10'
        }
      >
        {/* Instrument 1: Live Speedometer Gauge */}
        <div
          className={`${
            compact ? '' : 'md:col-span-4'
          } p-4 flex items-center gap-3`}
        >
          <SpeedGaugeSvg
            speedKmh={metrics.speedKmh}
            speedBand={metrics.speedBand}
            dashArray={metrics.gaugeArc.dashArray}
            dashOffset={metrics.gaugeArc.dashOffset}
            size={compact ? 'sm' : 'md'}
            isPopup={false}
          />
          <div className="min-w-0 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0]">
              Live Speed
            </div>
            <div className={`text-[13px] font-bold whitespace-nowrap ${speedTextClass}`}>
              {metrics.speedBandLabel}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-600 dark:text-[#A9B4D0] whitespace-nowrap">
              <Compass
                className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF] shrink-0"
                aria-hidden="true"
              />
              <span>
                {metrics.headingDeg}° {metrics.headingCardinal}
              </span>
            </div>
          </div>
        </div>

        {/* Instrument 2: Engine State & Live Fix */}
        <div
          data-testid="vehicle-status-engine"
          className={`${
            compact ? '' : 'md:col-span-4'
          } p-4 flex flex-col justify-between gap-2.5`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0]">
                Engine State
              </span>
              <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-[#A9B4D0]">
                {metrics.ignitionOn ? 'IGN ON' : 'IGN OFF'}
              </span>
            </div>

            <div className={`flex items-center gap-2 text-sm font-bold ${engineTone.textClass}`}>
              <EngineIcon state={metrics.engineState} className="w-4 h-4 shrink-0" />
              <span>{metrics.engineLabel}</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#A9B4D0]">
              {metrics.engineDetail}
            </p>
          </div>

          {metrics.formattedCoords && (
            <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
              <span
                data-testid="selected-vehicle-coords"
                className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700 dark:text-slate-200 truncate"
              >
                <MapPin
                  className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF] shrink-0"
                  aria-hidden="true"
                />
                <span>{metrics.formattedCoords}</span>
              </span>
              {typeof trailPointsCount === 'number' && trailPointsCount > 0 && (
                <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-[#A9B4D0] shrink-0">
                  {trailPointsCount} pts
                </span>
              )}
            </div>
          )}
        </div>

        {/* Instrument 3: Fuel Level Telemetry */}
        <div
          data-testid="vehicle-status-fuel"
          className={`${
            compact ? '' : 'md:col-span-4'
          } p-4 flex flex-col justify-between gap-2.5`}
        >
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0]">
                <Fuel className={`w-3.5 h-3.5 ${fuelTone.textClass}`} aria-hidden="true" />
                <span>Fuel Level</span>
              </span>
              <span className="font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white leading-none">
                {metrics.fuelPercent}%
              </span>
            </div>

            <div
              className="relative w-full h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden"
              role="progressbar"
              aria-label="Vehicle fuel level"
              aria-valuenow={metrics.fuelPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${fuelTone.barClass}`}
                style={{ width: `${metrics.fuelPercent}%` }}
              />
              {/* 25% reserve marker */}
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-1/4 w-px bg-white/80 dark:bg-[#0A1128]"
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums text-slate-600 dark:text-[#A9B4D0]">
              <span>
                {metrics.fuelLiters} / {metrics.tankCapacityLiters} L
              </span>
              <span>~{metrics.estimatedRangeKm} km range</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
            {metrics.fuelAlertLabel ? (
              <span className={`inline-flex items-center gap-1.5 font-semibold ${fuelTone.textClass}`}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{metrics.fuelAlertLabel}</span>
              </span>
            ) : (
              <span className="font-medium text-emerald-700 dark:text-[#7CFF6B]">
                Fuel Reserve Healthy
              </span>
            )}
            <span className="font-mono text-[11px] text-slate-500 dark:text-[#A9B4D0]">
              25% res.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
