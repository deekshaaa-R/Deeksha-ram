import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BatteryCharging,
  Clock,
  Compass,
  Gauge,
  MapPin,
  Navigation,
  Pause,
  Play,
  ShieldCheck,
  Snowflake,
  Truck,
} from 'lucide-react';
import { VehicleSearch } from '../components/VehicleSearch';
import { VehicleStatus } from '../components/VehicleStatus';
import { PlatformLiveMap } from '../components/platform/PlatformLiveMap';
import { RtoMetadataBanner } from '../components/platform/RtoMetadataBanner';
import { useStore } from '../context/StoreContext';
import { stepLiveTrackedVehicle } from '../utils/liveTrackingState';
import {
  MOCK_RTO_REGISTRY,
  toPlatformVehicleFromRtoRecord,
  type RtoVehicleMetadata,
} from '../utils/rtoRegistryDatabase';
import type { PlatformVehicle } from '../utils/unifiedPlatformLogic';
import { lookupVehicleRecordByRto } from '../utils/vehicleSearchLogic';

interface LiveTrackingPageProps {
  initialRtoNumber?: string;
}

export function LiveTrackingPage({ initialRtoNumber }: LiveTrackingPageProps) {
  const {
    liveTracking,
    triggerLiveTracking,
    clearLiveTracking,
    navigate,
    showToast,
  } = useStore();

  const [streamPaused, setStreamPaused] = useState(false);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [trackedVehicle, setTrackedVehicle] = useState<PlatformVehicle | null>(null);
  const lastSyncedInitialRtoRef = useRef<string | null>(null);

  // Sync URL initialRtoNumber into global liveTracking state once per new route param
  useEffect(() => {
    if (!initialRtoNumber) return;
    const normalized = initialRtoNumber.trim().toUpperCase();
    if (lastSyncedInitialRtoRef.current === normalized) return;
    lastSyncedInitialRtoRef.current = normalized;

    if (
      liveTracking.selectedVehicle?.vehicleNumber.toUpperCase() === normalized
    ) {
      return;
    }
    const found = lookupVehicleRecordByRto(normalized, []);
    if (found) {
      triggerLiveTracking(found, { openView: false });
    }
  }, [initialRtoNumber, liveTracking.selectedVehicle?.vehicleNumber, triggerLiveTracking]);

  // Materialize live-trackable PlatformVehicle whenever global liveTracking.selectedVehicle changes
  useEffect(() => {
    if (!liveTracking.selectedVehicle) {
      setTrackedVehicle(null);
      return;
    }
    setTrackedVehicle(toPlatformVehicleFromRtoRecord(liveTracking.selectedVehicle));
    setStreamPaused(false);
  }, [liveTracking.selectedVehicle, liveTracking.lastTriggeredAt]);

  // Real-time simulated GPS movement loop for running vehicles
  useEffect(() => {
    if (!trackedVehicle || streamPaused || trackedVehicle.status !== 'Running') {
      return;
    }
    const timer = window.setInterval(() => {
      setTrackedVehicle((prev) => {
        if (!prev || prev.status !== 'Running') return prev;
        const delta = Math.random() > 0.5 ? 1 : -1;
        return stepLiveTrackedVehicle(prev, delta);
      });
    }, 3200);
    return () => window.clearInterval(timer);
  }, [trackedVehicle?.id, trackedVehicle?.status, streamPaused]);

  const recentRecords = useMemo(() => {
    const records: RtoVehicleMetadata[] = [];
    for (const plate of liveTracking.recentRtoNumbers) {
      const rec = MOCK_RTO_REGISTRY.find(
        (item) => item.vehicleNumber.toUpperCase() === plate.toUpperCase()
      );
      if (rec) records.push(rec);
    }
    return records;
  }, [liveTracking.recentRtoNumbers]);

  const selectedMeta = liveTracking.selectedVehicle;

  const handleSelectRecord = (record: RtoVehicleMetadata) => {
    lastSyncedInitialRtoRef.current = record.vehicleNumber.trim().toUpperCase();
    triggerLiveTracking(record, { openView: true });
    showToast(
      `Live Tracking switched to ${record.vehicleNumber} (${record.rtoOffice}).`,
      'success'
    );
  };

  return (
    <div
      data-testid="global-live-tracking-view"
      data-active-rto={selectedMeta?.vehicleNumber ?? ''}
      className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0A1128]"
    >
      {/* Top Control Strip */}
      <div className="border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0E1734]/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 text-xs font-medium text-slate-700 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Home</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <h1 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Live Vehicle Tracking Console
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {selectedMeta
                  ? `${selectedMeta.vehicleNumber} · ${selectedMeta.makeModel} · ${selectedMeta.rtoOffice}`
                  : 'Search any RTO registration number to start real-time GPS tracking'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-1 sm:flex-initial justify-end">
            <div className="w-full sm:w-[300px] lg:w-[340px]">
              <VehicleSearch
                variant="topbar"
                liveVehicles={trackedVehicle ? [trackedVehicle] : []}
                onTrackVehicle={handleSelectRecord}
                isAuthenticatedOverride
                testIdPrefix="live-tracking-vehicle-search"
                placeholder="Switch RTO plate (e.g. MH-12, TN-01)..."
              />
            </div>

            {trackedVehicle && (
              <button
                type="button"
                data-testid="live-tracking-stream-toggle"
                onClick={() => setStreamPaused((p) => !p)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer shrink-0"
              >
                {streamPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                    <span>Resume GPS</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-cyan-500" aria-hidden="true" />
                    <span>Pause GPS</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              data-testid="open-in-platform-portal-btn"
              onClick={() =>
                navigate({
                  page: 'platform',
                  ...(selectedMeta ? { trackRto: selectedMeta.vehicleNumber } : {}),
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>4-Role Fleet Portal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {!selectedMeta || !trackedVehicle ? (
          <div className="max-w-2xl mx-auto py-12 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
                <Navigation className="w-4 h-4" aria-hidden="true" />
                <span>PAN-India RTO Vehicle Lookup</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Locate Any Registered Vehicle Live
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
                Enter an RTO registration number to inspect vehicle metadata, driver contact,
                compliance validity, and real-time GPS map telemetry.
              </p>
            </div>

            <VehicleSearch
              variant="hero"
              onTrackVehicle={handleSelectRecord}
              isAuthenticatedOverride
              testIdPrefix="live-tracking-empty-search"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {MOCK_RTO_REGISTRY.slice(0, 4).map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => handleSelectRecord(rec)}
                  className="text-left rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-3.5 hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {rec.vehicleNumber}
                    </span>
                    <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {rec.status} · {rec.speedKmh} km/h
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                    {rec.makeModel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {rec.rtoOffice} · Driver: {rec.driverName}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Full RTO Registry Metadata Banner */}
            <RtoMetadataBanner
              record={selectedMeta}
              onDismiss={() => {
                clearLiveTracking();
              }}
            />

            {/* Map + Live Telemetry Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left 8 Columns: Interactive Leaflet Live Map */}
              <div className="lg:col-span-8 space-y-3">
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] overflow-hidden shadow-sm">
                  <PlatformLiveMap
                    vehicles={[trackedVehicle]}
                    selectedVehicleId={trackedVehicle.id}
                    onSelectVehicle={() => undefined}
                    showPlannedRoute
                    platform="laptop"
                    heightClass="h-[460px] sm:h-[520px]"
                    isFullscreen={isFullscreenMap}
                    onToggleFullscreen={() => setIsFullscreenMap((f) => !f)}
                  />

                  {/* Live Address & Coordinate Strip */}
                  <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0D1633] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin
                        className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF] shrink-0"
                        aria-hidden="true"
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                        {trackedVehicle.address}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                      <span>
                        {trackedVehicle.lat.toFixed(4)}° N, {trackedVehicle.lng.toFixed(4)}° E
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        <span>{streamPaused ? 'Paused' : trackedVehicle.lastUpdated}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 4 Columns: VehicleStatus Telemetry & Diagnostics */}
              <div className="lg:col-span-4 space-y-4">
                <VehicleStatus
                  label={trackedVehicle.vehicleNumber}
                  subtitle={`${selectedMeta.makeModel} · ${selectedMeta.rtoCode}`}
                  status={
                    trackedVehicle.status === 'Running'
                      ? 'Moving'
                      : trackedVehicle.status === 'Idle'
                      ? 'Idle'
                      : 'Offline'
                  }
                  speedKmh={trackedVehicle.speedKmh}
                  ignitionOn={trackedVehicle.ignitionOn}
                  fuelPercent={trackedVehicle.fuelPercent ?? selectedMeta.fuelPercent}
                  fuelLiters={trackedVehicle.fuelLiters ?? selectedMeta.fuelLiters}
                  tankCapacityLiters={selectedMeta.tankCapacityLiters}
                  headingDeg={trackedVehicle.headingDeg}
                  latitude={trackedVehicle.lat}
                  longitude={trackedVehicle.lng}
                  trailPointsCount={trackedVehicle.trail.length}
                  driver={selectedMeta.driverName}
                  lastUpdated={streamPaused ? 'Paused' : trackedVehicle.lastUpdated}
                  variant="dashboard"
                  compact
                />

                {/* Pin-Point Diagnostics */}
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF]" aria-hidden="true" />
                      <span>Live Telemetry Diagnostics</span>
                    </h2>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {selectedMeta.rtoCode}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] px-3 py-2">
                      <dt className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Gauge className="w-3 h-3" aria-hidden="true" />
                        <span>Odometer</span>
                      </dt>
                      <dd className="mt-0.5 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {trackedVehicle.odometerKm !== null
                          ? `${trackedVehicle.odometerKm.toLocaleString('en-IN')} km`
                          : 'N/A'}
                      </dd>
                    </div>

                    <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] px-3 py-2">
                      <dt className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <BatteryCharging className="w-3 h-3" aria-hidden="true" />
                        <span>Battery Voltage</span>
                      </dt>
                      <dd className="mt-0.5 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {trackedVehicle.batteryVoltage !== null
                          ? `${trackedVehicle.batteryVoltage.toFixed(1)} V`
                          : 'N/A'}
                      </dd>
                    </div>

                    <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] px-3 py-2">
                      <dt className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Snowflake className="w-3 h-3" aria-hidden="true" />
                        <span>Cabin A/C</span>
                      </dt>
                      <dd className="mt-0.5 font-mono font-bold text-slate-900 dark:text-white">
                        {trackedVehicle.acOn === null
                          ? 'N/A'
                          : trackedVehicle.acOn
                          ? 'ON'
                          : 'OFF'}
                      </dd>
                    </div>

                    <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] px-3 py-2">
                      <dt className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Compass className="w-3 h-3" aria-hidden="true" />
                        <span>Today&apos;s Distance</span>
                      </dt>
                      <dd className="mt-0.5 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {trackedVehicle.distanceTodayKm.toFixed(1)} km
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Recent RTO Searches */}
                {recentRecords.length > 0 && (
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-4 space-y-2.5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF]" aria-hidden="true" />
                      <span>Recent RTO Lookups</span>
                    </h2>
                    <div className="space-y-1.5">
                      {recentRecords.map((rec) => {
                        const isCurrent =
                          rec.vehicleNumber.toUpperCase() ===
                          selectedMeta.vehicleNumber.toUpperCase();
                        return (
                          <button
                            key={rec.id}
                            type="button"
                            data-testid={`recent-rto-${rec.vehicleNumber}`}
                            onClick={() => handleSelectRecord(rec)}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                              isCurrent
                                ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-500/15 text-slate-900 dark:text-white'
                                : 'border-slate-200 dark:border-white/10 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-mono font-bold truncate">
                                {rec.vehicleNumber}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {rec.makeModel} · {rec.driverName}
                              </div>
                            </div>
                            <span className="font-mono text-[11px] shrink-0 text-cyan-700 dark:text-[#00D4FF]">
                              {isCurrent ? 'Tracking' : 'Track →'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
