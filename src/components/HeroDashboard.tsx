import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Navigation,
  ShieldAlert,
} from 'lucide-react';
import {
  INITIAL_CRITICAL_ALERTS,
  INITIAL_LIVE_VEHICLES,
  generateDynamicSimulationAlert,
  stepSimulatedFleet,
  type LiveVehicle,
  type SimulatorAlert,
} from '../utils/simulatorLogic';
import { CriticalAlertFeed } from './CriticalAlertFeed';
import { GoogleFleetMap } from './GoogleFleetMap';

export interface HeroDashboardProps {
  vehicles?: LiveVehicle[];
  selectedId?: string;
  onSelectId?: (id: string) => void;
  activeAlert?: SimulatorAlert | null;
  onAcknowledgeAlert?: () => void;
  alerts?: SimulatorAlert[];
  onAcknowledgeAlertById?: (id: string) => void;
  onAcknowledgeAllAlerts?: () => void;
  showAlertFeed?: boolean;
  isPaused?: boolean;
  consoleSubtitle?: string;
}

export function HeroDashboard(props: HeroDashboardProps = {}) {
  const [internalVehicles, setInternalVehicles] =
    useState<LiveVehicle[]>(INITIAL_LIVE_VEHICLES);
  const [internalSelectedId, setInternalSelectedId] = useState<string>('v4');
  const [internalAlerts, setInternalAlerts] = useState<SimulatorAlert[]>(
    INITIAL_CRITICAL_ALERTS
  );
  const [internalActiveAlert, setInternalActiveAlert] =
    useState<SimulatorAlert | null>(INITIAL_CRITICAL_ALERTS[0]);
  const [mapViewMode, setMapViewMode] = useState<'simulated' | 'google'>(
    'simulated'
  );

  const isControlled = props.vehicles !== undefined;
  const vehicles = props.vehicles ?? internalVehicles;
  const vehiclesRef = useRef<LiveVehicle[]>(internalVehicles);
  vehiclesRef.current = internalVehicles;
  const selectedId = props.selectedId ?? internalSelectedId;
  const setSelectedId = props.onSelectId ?? setInternalSelectedId;
  const currentAlert =
    props.activeAlert !== undefined ? props.activeAlert : internalActiveAlert;
  const feedAlerts = props.alerts ?? internalAlerts;
  const showAlertFeed = props.showAlertFeed ?? true;

  const handleAcknowledgeActive = () => {
    if (props.onAcknowledgeAlert) {
      props.onAcknowledgeAlert();
      return;
    }
    if (!internalActiveAlert) return;
    const ackId = internalActiveAlert.id;
    setInternalActiveAlert(null);
    setInternalAlerts((prev) =>
      prev.map((a) => (a.id === ackId ? { ...a, acknowledged: true } : a))
    );
  };

  const handleAcknowledgeById = (id: string) => {
    if (props.onAcknowledgeAlertById) {
      props.onAcknowledgeAlertById(id);
      return;
    }
    setInternalAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
    if (internalActiveAlert?.id === id) {
      setInternalActiveAlert(null);
    }
  };

  const handleAcknowledgeAll = () => {
    if (props.onAcknowledgeAllAlerts) {
      props.onAcknowledgeAllAlerts();
      return;
    }
    setInternalAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
    setInternalActiveAlert(null);
  };

  const tickRef = useRef(0);

  useEffect(() => {
    if (isControlled || props.isPaused) return;
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;
      const next = stepSimulatedFleet(vehiclesRef.current, tick);
      vehiclesRef.current = next;
      setInternalVehicles(next);

      const dynamicAlert = generateDynamicSimulationAlert(next, tick);
      if (dynamicAlert) {
        setInternalActiveAlert(dynamicAlert);
        setInternalAlerts((existing) =>
          [dynamicAlert, ...existing.filter((a) => a.id !== dynamicAlert.id)].slice(0, 8)
        );
      }
    }, 2200);

    return () => window.clearInterval(timer);
  }, [isControlled, props.isPaused]);

  const selectedVehicle =
    vehicles.find((v) => v.id === selectedId) ?? vehicles[0];

  const liveMoving = vehicles.filter((v) => v.status === 'Moving').length;
  const liveIdle = vehicles.filter((v) => v.status === 'Idle').length;
  const liveAlert = vehicles.filter((v) => v.status === 'Alert').length;

  const movingTotal = 84 + liveMoving;
  const idleTotal = 23 + liveIdle;
  const alertTotal = Math.max(
    0,
    13 + liveAlert - (currentAlert === null ? 1 : 0)
  );

  return (
    <div
      className="relative rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white/95 dark:bg-[#111B3A]/90 backdrop-blur-md p-4 sm:p-5 shadow-xl shadow-slate-900/5 dark:shadow-[#00D4FF]/5"
      aria-label="Live fleet telemetry preview"
    >
      {/* Console Header */}
      <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-white/10">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-[#A9B4D0]">
            VS Fleet Pro Console
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {props.consoleSubtitle ?? 'National Logistics Corridor'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-[#0A1128] p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setMapViewMode('simulated')}
              className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                mapViewMode === 'simulated'
                  ? 'bg-[#00D4FF] text-[#0A1128] font-semibold'
                  : 'text-slate-600 dark:text-[#A9B4D0]'
              }`}
            >
              Simulated
            </button>
            <button
              type="button"
              onClick={() => setMapViewMode('google')}
              className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                mapViewMode === 'google'
                  ? 'bg-[#00D4FF] text-[#0A1128] font-semibold'
                  : 'text-slate-600 dark:text-[#A9B4D0]'
              }`}
            >
              Google Maps
            </button>
          </div>
          <div
            className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
              props.isPaused
                ? 'text-amber-700 dark:text-[#FFB020]'
                : 'text-emerald-700 dark:text-[#7CFF6B]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                props.isPaused
                  ? 'bg-amber-500 dark:bg-[#FFB020]'
                  : 'bg-emerald-500 dark:bg-[#7CFF6B]'
              }`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">
              {props.isPaused ? 'Paused' : 'Live Stream'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Telemetry Counters */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 my-3.5">
        <div className="rounded-xl bg-slate-100 dark:bg-[#0A1128]/80 p-2.5 border border-slate-200/80 dark:border-white/5">
          <div className="text-[11px] text-slate-500 dark:text-[#A9B4D0]">
            Total
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            124
          </div>
        </div>
        <div className="rounded-xl bg-slate-100 dark:bg-[#0A1128]/80 p-2.5 border border-slate-200/80 dark:border-white/5">
          <div className="text-[11px] text-emerald-700 dark:text-[#7CFF6B]">
            Moving
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-[#7CFF6B]">
            {movingTotal}
          </div>
        </div>
        <div className="rounded-xl bg-slate-100 dark:bg-[#0A1128]/80 p-2.5 border border-slate-200/80 dark:border-white/5">
          <div className="text-[11px] text-amber-700 dark:text-[#FFB020]">
            Idle
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-700 dark:text-[#FFB020]">
            {idleTotal}
          </div>
        </div>
        <div className="rounded-xl bg-slate-100 dark:bg-[#0A1128]/80 p-2.5 border border-slate-200/80 dark:border-white/5">
          <div className="text-[11px] text-rose-700 dark:text-[#FF4D4F]">
            Alerts
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-rose-700 dark:text-[#FF4D4F]">
            {alertTotal}
          </div>
        </div>
      </div>

      {/* Interactive SVG Map or Live Google Maps */}
      {mapViewMode === 'google' ? (
        <GoogleFleetMap
          mode="fleet"
          heightClass="h-48 sm:h-52"
          selectedFleetId={selectedId}
          liveVehicles={vehicles}
          onSelectFleetVehicle={(id) => setSelectedId(id)}
        />
      ) : (
        <div className="relative h-48 sm:h-52 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900 dark:bg-[#070D1F]">
          <svg
            viewBox="0 0 400 200"
            className="w-full h-full"
            role="img"
            aria-label="Live fleet GPS route map"
          >
            {/* Grid lines */}
            <defs>
              <pattern
                id="map-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="rgba(0, 212, 255, 0.08)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="400" height="200" fill="url(#map-grid)" />

            {/* Highway & Geofence paths */}
            <path
              d="M 20 155 Q 110 110 185 130 T 370 55"
              fill="none"
              stroke="rgba(0, 212, 255, 0.35)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
            <path
              d="M 45 40 Q 170 70 250 68 T 360 140"
              fill="none"
              stroke="rgba(124, 255, 107, 0.25)"
              strokeWidth="2"
            />
            {/* Geofence circle */}
            <circle
              cx="312"
              cy="124"
              r="34"
              fill="rgba(255, 77, 79, 0.1)"
              stroke="rgba(255, 77, 79, 0.65)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x="284"
              y="168"
              fill="#A9B4D0"
              fontSize="9"
              fontFamily="Inter, sans-serif"
            >
              Depot Geofence B
            </text>
          </svg>

          {/* Live Vehicle Markers */}
          {vehicles.map((v) => {
            const isSelected = v.id === selectedId;
            const colorClass =
              v.status === 'Moving'
                ? 'bg-[#7CFF6B] text-[#0A1128]'
                : v.status === 'Idle'
                ? 'bg-[#FFB020] text-[#0A1128]'
                : 'bg-[#FF4D4F] text-white';

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                aria-label={`Inspect vehicle ${v.plate}, ${v.status}, ${v.speed} km/h`}
                style={{ left: `${v.x}%`, top: `${v.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-mono font-semibold shadow-md transition-transform duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00D4FF] ${colorClass} ${
                  isSelected ? 'ring-2 ring-[#00D4FF] scale-110 z-10' : 'opacity-90 hover:opacity-100'
                }`}
              >
                <Navigation className="w-2.5 h-2.5" aria-hidden="true" />
                <span className="tabular-nums">{v.speed}</span>
              </button>
            );
          })}

          {/* Active Alert Popup */}
          {currentAlert ? (
            <div
              className={`absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto sm:w-80 rounded-xl bg-[#0A1128]/95 border px-3 py-2.5 text-white shadow-lg flex items-center justify-between gap-2.5 ${
                currentAlert.severity === 'warning'
                  ? 'border-[#FFB020]/70'
                  : 'border-[#FF4D4F]/60'
              }`}
            >
              <div className="flex items-start gap-2 min-w-0">
                <ShieldAlert
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    currentAlert.severity === 'warning'
                      ? 'text-[#FFB020]'
                      : 'text-[#FF4D4F]'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">
                    {currentAlert.title}
                  </div>
                  <p className="text-[11px] text-[#A9B4D0] truncate">
                    {currentAlert.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAcknowledgeActive}
                className="shrink-0 rounded-md bg-white/10 hover:bg-white/20 px-2 py-1 text-[11px] font-medium text-white transition-colors cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          ) : (
            <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-[#0A1128]/90 border border-[#7CFF6B]/40 px-2.5 py-1.5 text-[11px] text-[#7CFF6B] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>All alerts acknowledged</span>
            </div>
          )}
        </div>
      )}

      {/* Live Vehicle List */}
      <div className="mt-3.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-[#A9B4D0] px-1">
          <span>Active Unit · {selectedVehicle.routeZone}</span>
          <span>Speed</span>
        </div>
        {vehicles.map((v) => {
          const active = v.id === selectedId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedId(v.id)}
              className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                active
                  ? 'bg-cyan-50 dark:bg-[#00D4FF]/10 border border-cyan-300 dark:border-[#00D4FF]/40'
                  : 'bg-slate-50 dark:bg-[#0A1128]/60 border border-transparent hover:border-slate-200 dark:hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPin
                  className={`w-3.5 h-3.5 shrink-0 ${
                    v.status === 'Moving'
                      ? 'text-emerald-600 dark:text-[#7CFF6B]'
                      : v.status === 'Idle'
                      ? 'text-amber-600 dark:text-[#FFB020]'
                      : 'text-rose-600 dark:text-[#FF4D4F]'
                  }`}
                  aria-hidden="true"
                />
                <span className="font-mono font-semibold text-slate-900 dark:text-white truncate">
                  {v.plate}
                </span>
                <span className="hidden sm:inline text-slate-500 dark:text-[#A9B4D0] truncate">
                  · {v.driver}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-[11px] font-medium ${
                    v.status === 'Moving'
                      ? 'text-emerald-700 dark:text-[#7CFF6B]'
                      : v.status === 'Idle'
                      ? 'text-amber-700 dark:text-[#FFB020]'
                      : 'text-rose-700 dark:text-[#FF4D4F]'
                  }`}
                >
                  {v.status === 'Alert' && (
                    <AlertTriangle className="inline w-3 h-3 mr-1" aria-hidden="true" />
                  )}
                  {v.status}
                </span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white w-14 text-right">
                  {v.speed} km/h
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {showAlertFeed && (
        <CriticalAlertFeed
          compact
          alerts={feedAlerts}
          onAcknowledge={handleAcknowledgeById}
          onAcknowledgeAll={handleAcknowledgeAll}
          onSelectVehicle={(id) => setSelectedId(id)}
        />
      )}
    </div>
  );
}
