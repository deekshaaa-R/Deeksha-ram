import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Gauge,
  MapPin,
  Navigation,
  Pause,
  Play,
  Power,
  Radio,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  INITIAL_CRITICAL_ALERTS,
  INITIAL_LIVE_VEHICLES,
  OVERSPEED_THRESHOLD_KMH,
  applyScenarioToVehicle,
  applySpeedOverride,
  formatCoordinates,
  generateDynamicSimulationAlert,
  stepSimulatedFleet,
  type LiveVehicle,
  type SimulatorAlert,
  type SimulatorScenario,
} from '../utils/simulatorLogic';
import { CriticalAlertFeed } from './CriticalAlertFeed';
import { HeroDashboard } from './HeroDashboard';

const SCENARIO_ACTIONS: Array<{
  id: SimulatorScenario;
  label: string;
  sublabel: string;
  tone: 'emerald' | 'amber' | 'rose' | 'cyan';
}> = [
  {
    id: 'cruise',
    label: 'Highway Cruise',
    sublabel: 'Moving · 62 km/h',
    tone: 'emerald',
  },
  {
    id: 'idle',
    label: 'Engine Idle Too Long',
    sublabel: 'Amber · >10m Idle',
    tone: 'amber',
  },
  {
    id: 'geofence',
    label: 'Geofence Breach',
    sublabel: 'Red · Zone B Exit',
    tone: 'rose',
  },
  {
    id: 'harsh-braking',
    label: 'Harsh Braking',
    sublabel: 'Red · -0.72g Decel',
    tone: 'rose',
  },
  {
    id: 'overspeed',
    label: 'Overspeed Alert',
    sublabel: 'Red · 96 km/h',
    tone: 'rose',
  },
  {
    id: 'immobilize',
    label: 'Immobilize Engine',
    sublabel: 'Amber · Relay Cut-Off',
    tone: 'cyan',
  },
];

export function LiveTrackingSimulatorSection() {
  const [vehicles, setVehicles] = useState<LiveVehicle[]>(
    INITIAL_LIVE_VEHICLES
  );
  const [selectedId, setSelectedId] = useState<string>('v4');
  const [activeAlert, setActiveAlert] = useState<SimulatorAlert | null>(
    INITIAL_CRITICAL_ALERTS[0]
  );
  const [alertLog, setAlertLog] = useState<SimulatorAlert[]>(
    INITIAL_CRITICAL_ALERTS
  );
  const [isPaused, setIsPaused] = useState(false);
  const [fastStream, setFastStream] = useState(false);

  const selectedVehicle =
    vehicles.find((v) => v.id === selectedId) ?? vehicles[0];

  const vehiclesRef = useRef<LiveVehicle[]>(vehicles);
  vehiclesRef.current = vehicles;
  const tickRef = useRef(0);

  useEffect(() => {
    if (isPaused) return;
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReduced) return;

    const intervalMs = fastStream ? 1100 : 2200;
    const timer = window.setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;
      const next = stepSimulatedFleet(vehiclesRef.current, tick);
      vehiclesRef.current = next;
      setVehicles(next);

      const dynamicAlert = generateDynamicSimulationAlert(next, tick);
      if (dynamicAlert) {
        setActiveAlert(dynamicAlert);
        setAlertLog((existing) =>
          [dynamicAlert, ...existing.filter((a) => a.id !== dynamicAlert.id)].slice(0, 12)
        );
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isPaused, fastStream]);

  const recordAlert = (nextAlert: SimulatorAlert, collapseSameOverspeed = false) => {
    setActiveAlert(nextAlert);
    setAlertLog((prev) => {
      if (
        collapseSameOverspeed &&
        prev.length > 0 &&
        !prev[0].acknowledged &&
        prev[0].title === nextAlert.title
      ) {
        return [nextAlert, ...prev.slice(1)];
      }
      return [nextAlert, ...prev].slice(0, 12);
    });
  };

  const handleSpeedChange = (rawSpeed: number) => {
    const result = applySpeedOverride(selectedVehicle, rawSpeed);
    setVehicles((prev) =>
      prev.map((v) => (v.id === selectedVehicle.id ? result.vehicle : v))
    );
    if (result.alert) {
      recordAlert(result.alert, true);
    } else if (
      activeAlert &&
      activeAlert.message.includes(selectedVehicle.plate) &&
      activeAlert.title === 'Overspeed Limit Breach'
    ) {
      setActiveAlert(null);
    }
  };

  const handleScenario = (scenario: SimulatorScenario) => {
    const result = applyScenarioToVehicle(selectedVehicle, scenario);
    setVehicles((prev) =>
      prev.map((v) => (v.id === selectedVehicle.id ? result.vehicle : v))
    );
    if (result.alert) {
      recordAlert(result.alert, false);
    } else {
      setActiveAlert(null);
    }
  };

  const handleAcknowledge = () => {
    if (!activeAlert) return;
    const ackId = activeAlert.id;
    setActiveAlert(null);
    setAlertLog((prev) =>
      prev.map((entry) =>
        entry.id === ackId ? { ...entry, acknowledged: true } : entry
      )
    );
  };

  const handleAcknowledgeById = (ackId: string) => {
    if (activeAlert?.id === ackId) {
      setActiveAlert(null);
    }
    setAlertLog((prev) =>
      prev.map((entry) =>
        entry.id === ackId ? { ...entry, acknowledged: true } : entry
      )
    );
  };

  const handleAcknowledgeAll = () => {
    setActiveAlert(null);
    setAlertLog((prev) => prev.map((entry) => ({ ...entry, acknowledged: true })));
  };

  const handleReset = () => {
    tickRef.current = 0;
    vehiclesRef.current = INITIAL_LIVE_VEHICLES;
    setVehicles(INITIAL_LIVE_VEHICLES);
    setSelectedId('v4');
    setActiveAlert(INITIAL_CRITICAL_ALERTS[0]);
    setAlertLog(INITIAL_CRITICAL_ALERTS);
    setIsPaused(false);
    setFastStream(false);
  };

  const statusBadgeClasses =
    selectedVehicle.status === 'Moving'
      ? 'bg-emerald-50 dark:bg-[#7CFF6B]/15 text-emerald-700 dark:text-[#7CFF6B] border-emerald-200 dark:border-[#7CFF6B]/40'
      : selectedVehicle.status === 'Idle'
      ? 'bg-amber-50 dark:bg-[#FFB020]/15 text-amber-700 dark:text-[#FFB020] border-amber-200 dark:border-[#FFB020]/40'
      : 'bg-rose-50 dark:bg-[#FF4D4F]/15 text-rose-700 dark:text-[#FF4D4F] border-rose-200 dark:border-[#FF4D4F]/40';

  const statusDotClasses =
    selectedVehicle.status === 'Moving'
      ? 'bg-emerald-500 dark:bg-[#7CFF6B]'
      : selectedVehicle.status === 'Idle'
      ? 'bg-amber-500 dark:bg-[#FFB020]'
      : 'bg-rose-500 dark:bg-[#FF4D4F]';

  return (
    <section
      id="live-simulator"
      aria-labelledby="live-simulator-heading"
      className="scroll-mt-24 py-16 sm:py-20 bg-slate-100/70 dark:bg-[#070D1F] border-y border-slate-200/80 dark:border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-10">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-[#00D4FF] mb-2">
              <Radio className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Interactive Telemetry Sandbox</span>
            </p>
            <h2
              id="live-simulator-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white"
            >
              Live GPS Tracking Simulator
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-[#A9B4D0] mt-2 leading-relaxed">
              Test how the VS Fleet Pro Console responds in real time. Select any
              vehicle, adjust live speed, or simulate geofence breaches and
              remote immobilizer commands directly on the dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] text-slate-800 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors cursor-pointer"
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-[#7CFF6B]" aria-hidden="true" />
                  <span>Resume Stream</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-[#FFB020]" aria-hidden="true" />
                  <span>Pause Stream</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFastStream((f) => !f)}
              aria-pressed={fastStream}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                fastStream
                  ? 'bg-cyan-50 dark:bg-[#00D4FF]/15 border-cyan-400 dark:border-[#00D4FF]/60 text-cyan-800 dark:text-[#00D4FF]'
                  : 'bg-white dark:bg-[#111B3A] border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{fastStream ? '2× Ping Rate' : '1× Ping Rate'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] text-slate-700 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Fleet</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Control & Telemetry Workbench */}
          <div className="lg:col-span-5 space-y-5">
            {/* Active Vehicle Telemetry Summary */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0]">
                  1. Select Vehicle Unit
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${statusBadgeClasses}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${statusDotClasses}`}
                    aria-hidden="true"
                  />
                  <span>Status: {selectedVehicle.status}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {vehicles.map((v) => {
                  const isSelected = v.id === selectedVehicle.id;
                  const dotClass =
                    v.status === 'Moving'
                      ? 'bg-emerald-500 dark:bg-[#7CFF6B]'
                      : v.status === 'Idle'
                      ? 'bg-amber-500 dark:bg-[#FFB020]'
                      : 'bg-rose-500 dark:bg-[#FF4D4F]';
                  const statusTextClass =
                    v.status === 'Moving'
                      ? 'text-emerald-700 dark:text-[#7CFF6B]'
                      : v.status === 'Idle'
                      ? 'text-amber-700 dark:text-[#FFB020]'
                      : 'text-rose-700 dark:text-[#FF4D4F]';
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedId(v.id)}
                      className={`flex flex-col gap-1.5 rounded-xl px-3 py-2.5 text-left text-xs transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-cyan-50 dark:bg-[#00D4FF]/10 border-cyan-400 dark:border-[#00D4FF] text-slate-900 dark:text-white'
                          : 'bg-slate-50 dark:bg-[#0A1128]/70 border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-[#A9B4D0] hover:border-slate-300 dark:hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white truncate">
                          {v.plate}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 ${statusTextClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${dotClass}`}
                            aria-hidden="true"
                          />
                          <span>{v.status}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 w-full text-[11px] text-slate-500 dark:text-[#A9B4D0]">
                        <span className="truncate flex items-center gap-1 min-w-0">
                          <MapPin className="w-3 h-3 shrink-0 text-cyan-600 dark:text-[#00D4FF]" aria-hidden="true" />
                          <span className="truncate">{v.routeZone}</span>
                        </span>
                        <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white shrink-0">
                          {v.speed} km/h
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <div className="text-slate-500 dark:text-[#A9B4D0] text-[11px]">
                    Driver
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
                    {selectedVehicle.driver}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-[#A9B4D0] text-[11px]">
                    GPS Coordinates
                  </div>
                  <div className="font-mono font-semibold text-[11px] text-slate-900 dark:text-white mt-0.5 whitespace-nowrap">
                    {formatCoordinates(selectedVehicle.lat, selectedVehicle.lng)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-[#A9B4D0] text-[11px]">
                    Ignition / Relay
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1">
                    <Power
                      className={`w-3 h-3 shrink-0 ${
                        selectedVehicle.ignitionOn === false
                          ? 'text-rose-500 dark:text-[#FF4D4F]'
                          : 'text-emerald-600 dark:text-[#7CFF6B]'
                      }`}
                      aria-hidden="true"
                    />
                    <span>
                      {selectedVehicle.immobilized
                        ? 'Cut-Off'
                        : selectedVehicle.ignitionOn === false
                        ? 'OFF'
                        : 'ON'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-[#A9B4D0] text-[11px]">
                    Live Speed
                  </div>
                  <div
                    className="font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-0.5"
                    data-testid="sim-selected-speed"
                  >
                    {selectedVehicle.speed} km/h
                  </div>
                </div>
              </div>
            </div>

            {/* Speed Control & Scenario Triggers */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] p-5 shadow-sm space-y-5">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="sim-speed-slider"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0]"
                  >
                    <Gauge className="w-3.5 h-3.5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
                    <span>2. Adjust Vehicle Speed</span>
                  </label>
                  <span className="text-xs font-mono font-bold tabular-nums text-cyan-700 dark:text-[#00D4FF]">
                    {selectedVehicle.speed} km/h
                  </span>
                </div>
                <input
                  id="sim-speed-slider"
                  type="range"
                  min={0}
                  max={110}
                  step={1}
                  value={selectedVehicle.speed}
                  onChange={(e) => handleSpeedChange(Number(e.target.value))}
                  className="w-full accent-[#00D4FF] cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#A9B4D0] mt-1">
                  <span>0 km/h (Idle)</span>
                  <span>{OVERSPEED_THRESHOLD_KMH}+ km/h (Overspeed Alert)</span>
                  <span>110 km/h</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0]">
                    <Activity className="w-3.5 h-3.5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
                    <span>3. Trigger Telemetry Scenario</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SCENARIO_ACTIONS.map((action) => {
                    const accentClass =
                      action.tone === 'emerald'
                        ? 'hover:border-emerald-500 dark:hover:border-[#7CFF6B]/60'
                        : action.tone === 'amber'
                        ? 'hover:border-amber-500 dark:hover:border-[#FFB020]/60'
                        : action.tone === 'rose'
                        ? 'hover:border-rose-500 dark:hover:border-[#FF4D4F]/60'
                        : 'hover:border-cyan-500 dark:hover:border-[#00D4FF]/60';

                    const badgeColor =
                      action.tone === 'emerald'
                        ? 'text-emerald-700 dark:text-[#7CFF6B]'
                        : action.tone === 'amber'
                        ? 'text-amber-700 dark:text-[#FFB020]'
                        : action.tone === 'rose'
                        ? 'text-rose-700 dark:text-[#FF4D4F]'
                        : 'text-cyan-700 dark:text-[#00D4FF]';

                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => handleScenario(action.id)}
                        className={`flex flex-col items-start rounded-xl px-3.5 py-2.5 text-left border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128]/70 transition-colors cursor-pointer ${accentClass}`}
                      >
                        <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {action.tone === 'rose' ? (
                            <AlertTriangle
                              className={`w-3.5 h-3.5 shrink-0 ${badgeColor}`}
                              aria-hidden="true"
                            />
                          ) : (
                            <Navigation
                              className={`w-3.5 h-3.5 shrink-0 ${badgeColor}`}
                              aria-hidden="true"
                            />
                          )}
                          <span>{action.label}</span>
                        </span>
                        <span className={`text-[11px] mt-0.5 ${badgeColor}`}>
                          {action.sublabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Reused Live Dashboard Console + Critical Alert Feed Widget */}
          <div className="lg:col-span-7 space-y-4">
            <HeroDashboard
              vehicles={vehicles}
              selectedId={selectedVehicle.id}
              onSelectId={setSelectedId}
              activeAlert={activeAlert}
              onAcknowledgeAlert={handleAcknowledge}
              showAlertFeed={false}
              isPaused={isPaused}
              consoleSubtitle="Interactive Simulator · Live Telemetry"
            />

            <CriticalAlertFeed
              alerts={alertLog}
              onAcknowledge={handleAcknowledgeById}
              onAcknowledgeAll={handleAcknowledgeAll}
              onSelectVehicle={(id) => setSelectedId(id)}
            />

            {/* Status Legend & Telemetry Metadata */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-[#A9B4D0]">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-[#7CFF6B]"
                    aria-hidden="true"
                  />
                  <span>Moving (&gt;0 km/h)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-[#A9B4D0]">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-[#FFB020]"
                    aria-hidden="true"
                  />
                  <span>Idle (0 km/h)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-[#A9B4D0]">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-rose-500 dark:bg-[#FF4D4F]"
                    aria-hidden="true"
                  />
                  <span>Alert (Breach / Overspeed)</span>
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-600 dark:text-[#00D4FF]">
                Zone: {selectedVehicle.routeZone}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
