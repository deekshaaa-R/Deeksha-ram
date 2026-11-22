import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import {
  Crosshair,
  Info,
  LocateFixed,
  Maximize2,
  Navigation,
  Pause,
  Play,
  Plus,
  Radio,
  Send,
  Smartphone,
} from 'lucide-react';
import type { TrackedDevice } from '../types';
import {
  appendRoutePoint,
  buildGeolocationTelemetry,
  computeHeadingDeg,
  formatTelemetrySourceLabel,
  haversineMeters,
  resolveVehiclePosition,
  validateManualPing,
  type RouteTrailMap,
  type TelemetryUpdatePayload,
} from '../utils/registeredVehicleTracking';
import {
  mergeRegisteredFleetUpdates,
  syncTrailsFromDevices,
  type VehicleLocationPushEvent,
} from '../utils/realtimeFleetLogic';
import { useRegisteredFleetRealtime } from '../hooks/useFleetSocket';
import { VehicleStatus } from './VehicleStatus';

interface RegisteredFleetLiveTrackerProps {
  devices: TrackedDevice[];
  filteredDevices: TrackedDevice[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  onUpdateTelemetry: (
    deviceId: string,
    update: TelemetryUpdatePayload,
    options?: { syncFirestore?: boolean }
  ) => Promise<{ ok: boolean; syncedToFirestore: boolean }>;
  onBulkUpdateTelemetry: (
    updater: (prev: TrackedDevice[]) => TrackedDevice[]
  ) => void;
  onOpenRegisterModal: () => void;
  isCloudAuthenticated: boolean;
  isFirestoreLive?: boolean;
  roomId?: string;
  onShowToast: (text: string, tone?: 'success' | 'info' | 'error') => void;
}

function createRegisteredMarkerIcon(
  device: TrackedDevice,
  isSelected: boolean,
  isLiveGps: boolean
): L.DivIcon {
  const palette = isLiveGps
    ? { bg: '#059669', border: '#A7F3D0', text: '#FFFFFF', dot: '●' }
    : device.status === 'Moving'
    ? { bg: '#0284C7', border: '#BAE6FD', text: '#FFFFFF', dot: '▶' }
    : device.status === 'Alert'
    ? { bg: '#DC2626', border: '#FECACA', text: '#FFFFFF', dot: '!' }
    : { bg: '#D97706', border: '#FEF3C7', text: '#FFFFFF', dot: '⏸' };

  const shortPlate = device.vehicleLabel.split(' ')[0].slice(0, 14);
  const ringShadow = isSelected
    ? '0 0 0 3px #00D4FF, 0 8px 20px rgba(10, 17, 40, 0.55)'
    : '0 4px 12px rgba(10, 17, 40, 0.35)';

  return L.divIcon({
    className: 'registered-fleet-marker',
    html: `
      <div style="display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:9999px;background:${palette.bg};color:${palette.text};border:2px solid ${palette.border};box-shadow:${ringShadow};font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;font-weight:700;white-space:nowrap;transform:translate(-50%,-50%);line-height:1.15;">
        <span style="font-size:9px;" aria-hidden="true">${palette.dot}</span>
        <span>${shortPlate}</span>
        <span style="opacity:0.9;font-weight:600;">${device.speedKmh} km/h</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18],
  });
}

function LiveMapViewportController({
  selectedCoords,
  followSelected,
  fitAllRequest,
  allCoords,
  focusNonce,
}: {
  selectedCoords: [number, number] | null;
  followSelected: boolean;
  fitAllRequest: number;
  allCoords: Array<[number, number]>;
  focusNonce: number;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [map]);

  // Fly to vehicle when user explicitly selects one
  useEffect(() => {
    if (!selectedCoords) return;
    map.flyTo(selectedCoords, Math.max(map.getZoom(), 13), { duration: 0.65 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  // Smooth pan when Follow Selected is enabled and coordinates update
  useEffect(() => {
    if (!followSelected || !selectedCoords) return;
    map.panTo(selectedCoords, { animate: true, duration: 0.5 });
  }, [followSelected, selectedCoords, map]);

  // Fit all registered vehicles on map
  useEffect(() => {
    if (fitAllRequest === 0 || allCoords.length === 0) return;
    if (allCoords.length === 1) {
      map.flyTo(allCoords[0], 13, { duration: 0.65 });
      return;
    }
    const bounds = L.latLngBounds(allCoords);
    map.flyToBounds(bounds, { padding: [44, 44], maxZoom: 13, duration: 0.7 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitAllRequest]);

  return null;
}

export function RegisteredFleetLiveTracker({
  devices,
  filteredDevices,
  selectedDeviceId,
  onSelectDevice,
  onUpdateTelemetry,
  onBulkUpdateTelemetry,
  onOpenRegisterModal,
  isCloudAuthenticated,
  isFirestoreLive = false,
  roomId = 'demo',
  onShowToast,
}: RegisteredFleetLiveTrackerProps) {
  const visibleDevices = filteredDevices.length > 0 ? filteredDevices : devices;
  const effectiveSelectedId = useMemo(() => {
    if (selectedDeviceId && devices.some((d) => d.id === selectedDeviceId)) {
      return selectedDeviceId;
    }
    return visibleDevices[0]?.id ?? devices[0]?.id ?? null;
  }, [selectedDeviceId, devices, visibleDevices]);

  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === effectiveSelectedId) ?? null,
    [devices, effectiveSelectedId]
  );

  const selectedPos = useMemo(
    () => (selectedDevice ? resolveVehiclePosition(selectedDevice) : null),
    [selectedDevice]
  );

  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [followSelected, setFollowSelected] = useState(true);
  const [fitAllNonce, setFitAllNonce] = useState(0);
  const [focusNonce, setFocusNonce] = useState(0);
  const [trails, setTrails] = useState<RouteTrailMap>(() => {
    const init: RouteTrailMap = {};
    for (const d of devices) {
      const pos = resolveVehiclePosition(d);
      init[d.id] = [[pos.latitude, pos.longitude]];
    }
    return init;
  });

  // Real Browser / Phone GPS streaming state
  const [liveGpsDeviceId, setLiveGpsDeviceId] = useState<string | null>(null);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastCloudSyncRef = useRef<{ ts: number; lat: number; lng: number } | null>(null);
  const lastGpsPointRef = useRef<{ lat: number; lng: number } | null>(null);

  // Manual GPS Ping inputs
  const [pingLat, setPingLat] = useState(
    selectedPos ? String(selectedPos.latitude) : '13.3379'
  );
  const [pingLng, setPingLng] = useState(
    selectedPos ? String(selectedPos.longitude) : '77.1173'
  );
  const [pingSpeed, setPingSpeed] = useState(
    selectedPos ? String(selectedPos.speedKmh) : '52'
  );
  const [pingError, setPingError] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // Reactively append coordinate updates from Firestore onSnapshot OR Socket.io push to polyline trails
  useEffect(() => {
    setTrails((prev) => syncTrailsFromDevices(prev, devices));
  }, [devices]);

  // Keep manual ping inputs prefilled when switching selected vehicle
  useEffect(() => {
    if (!selectedDevice) return;
    const pos = resolveVehiclePosition(selectedDevice);
    setPingLat(pos.latitude.toFixed(4));
    setPingLng(pos.longitude.toFixed(4));
    setPingSpeed(String(pos.speedKmh || 48));
    setPingError(null);
    setFocusNonce((n) => n + 1);
    // Only re-seed form when the selected vehicle ID changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSelectedId]);

  const handleSocketUpdates = useCallback(
    (updates: VehicleLocationPushEvent[]) => {
      onBulkUpdateTelemetry((prev) =>
        mergeRegisteredFleetUpdates(prev, updates, {
          skipDeviceId: liveGpsDeviceId,
        })
      );
    },
    [liveGpsDeviceId, onBulkUpdateTelemetry]
  );

  // Authoritative Socket.io real-time push listener (works alongside Firestore onSnapshot)
  const { emitDevicePing } = useRegisteredFleetRealtime({
    roomId,
    devices,
    paused: isStreamPaused,
    onReceiveUpdates: handleSocketUpdates,
  });

  // Clean up geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const stopDeviceGpsStream = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLiveGpsDeviceId(null);
    setGpsStatusMessage(null);
    lastCloudSyncRef.current = null;
    lastGpsPointRef.current = null;
  };

  const handleToggleDeviceGps = () => {
    if (!selectedDevice) return;
    setGpsError(null);

    if (liveGpsDeviceId === selectedDevice.id) {
      stopDeviceGpsStream();
      onShowToast(`Stopped live phone/browser GPS stream for ${selectedDevice.vehicleLabel}.`, 'info');
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsError(
        'Geolocation is not supported in this browser. Use Manual GPS Ping below or open the app on a GPS-enabled phone.'
      );
      return;
    }

    // Stop any previous watch before starting for newly selected vehicle
    stopDeviceGpsStream();
    const targetId = selectedDevice.id;
    const targetImei = selectedDevice.imei;
    const targetLabel = selectedDevice.vehicleLabel;

    setLiveGpsDeviceId(targetId);
    setGpsStatusMessage('Requesting device GPS lock...');
    setFollowSelected(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const prevPt = lastGpsPointRef.current;
        const computedHeading = prevPt
          ? computeHeadingDeg(
              prevPt.lat,
              prevPt.lng,
              position.coords.latitude,
              position.coords.longitude
            )
          : 0;
        const telemetry = buildGeolocationTelemetry(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed,
            heading: position.coords.heading,
            accuracy: position.coords.accuracy,
          },
          computedHeading
        );

        lastGpsPointRef.current = {
          lat: telemetry.latitude,
          lng: telemetry.longitude,
        };

        setTrails((prev) => ({
          ...prev,
          [targetId]: appendRoutePoint(prev[targetId], [
            telemetry.latitude,
            telemetry.longitude,
          ]),
        }));

        // Throttle Cloud Firestore writes (every >= 4 seconds OR >= 15m moved)
        const now = Date.now();
        const lastSync = lastCloudSyncRef.current;
        const movedMeters = lastSync
          ? haversineMeters(
              lastSync.lat,
              lastSync.lng,
              telemetry.latitude,
              telemetry.longitude
            )
          : Infinity;
        const shouldSyncCloud =
          isCloudAuthenticated &&
          (!lastSync || now - lastSync.ts >= 4000 || movedMeters >= 15);

        if (shouldSyncCloud) {
          lastCloudSyncRef.current = {
            ts: now,
            lat: telemetry.latitude,
            lng: telemetry.longitude,
          };
        }

        void onUpdateTelemetry(targetId, telemetry, {
          syncFirestore: shouldSyncCloud,
        });
        emitDevicePing(targetId, targetImei, telemetry);

        setGpsError(null);
        setGpsStatusMessage(
          `GPS Lock Active${
            telemetry.accuracyMeters ? ` · ±${telemetry.accuracyMeters}m` : ''
          }${isCloudAuthenticated ? ' · Syncing to Firestore' : ''}`
        );
      },
      (err) => {
        stopDeviceGpsStream();
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError(
            'Location permission denied. Enable Location Access in your browser/phone settings to stream real GPS, or use Manual GPS Ping below.'
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError(
            'Device GPS signal unavailable right now. Move outdoors or test coordinates using Manual GPS Ping.'
          );
        } else {
          setGpsError(
            'Timed out waiting for device GPS fix. Retry or push a Manual GPS Ping.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );

    onShowToast(`Started live device GPS tracking for ${targetLabel}.`);
  };

  const handleManualPingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    setPingError(null);

    const validated = validateManualPing(pingLat, pingLng, pingSpeed);
    if (!validated.ok) {
      setPingError(validated.error);
      return;
    }

    if (liveGpsDeviceId === selectedDevice.id) {
      stopDeviceGpsStream();
    }

    const prevPos = resolveVehiclePosition(selectedDevice);
    const nextHeading = computeHeadingDeg(
      prevPos.latitude,
      prevPos.longitude,
      validated.latitude,
      validated.longitude
    );

    const payload: TelemetryUpdatePayload = {
      latitude: validated.latitude,
      longitude: validated.longitude,
      speedKmh: validated.speedKmh,
      headingDeg: nextHeading || prevPos.headingDeg,
      status: validated.status,
      telemetrySource: 'manual',
      lastUpdated: 'Manual GPS Ping · just now',
      lastPingAt: new Date().toISOString(),
    };

    setIsPinging(true);
    try {
      setTrails((prev) => ({
        ...prev,
        [selectedDevice.id]: appendRoutePoint(prev[selectedDevice.id], [
          validated.latitude,
          validated.longitude,
        ]),
      }));

      const res = await onUpdateTelemetry(selectedDevice.id, payload, {
        syncFirestore: isCloudAuthenticated,
      });
      emitDevicePing(selectedDevice.id, selectedDevice.imei, payload);

      setFocusNonce((n) => n + 1);
      onShowToast(
        res.syncedToFirestore
          ? `GPS ping pushed for ${selectedDevice.vehicleLabel} via Socket.io & Firestore.`
          : `GPS ping pushed live for ${selectedDevice.vehicleLabel} across connected maps.`
      );
    } finally {
      setIsPinging(false);
    }
  };

  const handleResumeSimulatedRoute = async () => {
    if (!selectedDevice) return;
    if (liveGpsDeviceId === selectedDevice.id) {
      stopDeviceGpsStream();
    }
    const pos = resolveVehiclePosition(selectedDevice);
    const resumePayload: TelemetryUpdatePayload = {
      latitude: pos.latitude,
      longitude: pos.longitude,
      speedKmh: Math.max(42, pos.speedKmh || 48),
      headingDeg: pos.headingDeg,
      status: 'Moving',
      telemetrySource: 'simulated',
      lastUpdated: 'Live Socket Push · just now',
      lastPingAt: new Date().toISOString(),
    };
    await onUpdateTelemetry(selectedDevice.id, resumePayload, {
      syncFirestore: false,
    });
    emitDevicePing(selectedDevice.id, selectedDevice.imei, resumePayload);
    setIsStreamPaused(false);
    onShowToast(`Resumed live corridor push for ${selectedDevice.vehicleLabel}.`, 'info');
  };

  const fleetCounts = useMemo(() => {
    let moving = 0;
    let idle = 0;
    let alert = 0;
    for (const d of devices) {
      if (d.status === 'Moving') moving += 1;
      else if (d.status === 'Alert') alert += 1;
      else idle += 1;
    }
    return { moving, idle, alert };
  }, [devices]);

  const allCoords = useMemo<Array<[number, number]>>(
    () =>
      visibleDevices.map((d) => {
        const pos = resolveVehiclePosition(d);
        return [pos.latitude, pos.longitude];
      }),
    [visibleDevices]
  );

  const selectedTrail = effectiveSelectedId ? trails[effectiveSelectedId] ?? [] : [];
  const isSelectedStreamingGps = Boolean(
    selectedDevice && liveGpsDeviceId === selectedDevice.id
  );

  if (devices.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-10 text-center space-y-4">
        <p className="text-base font-semibold text-slate-900 dark:text-white">
          No vehicles registered yet
        </p>
        <p className="text-xs text-slate-500 dark:text-[#A9B4D0] max-w-md mx-auto">
          Register your first 15-digit IMEI GPS tracker to start watching live coordinates, speed, and route history on the map.
        </p>
        <button
          type="button"
          onClick={onOpenRegisterModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Register First Vehicle</span>
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="registered-live-tracker"
      className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-4 sm:p-6 space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
            <Radio className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              Registered Fleet Live GPS Map ·{' '}
              {isFirestoreLive ? 'Firestore + Socket.io Push' : 'Socket.io Real-Time Push'}
            </span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
            Track Your Registered Vehicles in Real Time
          </h2>
          <p className="text-xs text-slate-600 dark:text-[#A9B4D0] mt-0.5 tabular-nums">
            {devices.length} registered unit{devices.length === 1 ? '' : 's'} ·{' '}
            <span className="font-semibold text-emerald-700 dark:text-[#7CFF6B]">
              {fleetCounts.moving} Moving
            </span>{' '}
            ·{' '}
            <span className="font-semibold text-amber-700 dark:text-[#FFB020]">
              {fleetCounts.idle} Idle
            </span>
            {fleetCounts.alert > 0 && (
              <>
                {' '}
                ·{' '}
                <span className="font-semibold text-rose-700 dark:text-[#FF4D4F]">
                  {fleetCounts.alert} Alert
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="toggle-live-stream-btn"
            aria-pressed={isStreamPaused}
            onClick={() => setIsStreamPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] text-slate-800 dark:text-white hover:border-[#00D4FF] transition-colors cursor-pointer"
          >
            {isStreamPaused ? (
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
            data-testid="toggle-follow-btn"
            aria-pressed={followSelected}
            onClick={() => setFollowSelected((f) => !f)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              followSelected
                ? 'bg-[#00D4FF]/15 border-[#00D4FF] text-cyan-800 dark:text-[#00D4FF]'
                : 'border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] text-slate-700 dark:text-[#A9B4D0]'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{followSelected ? 'Following Vehicle' : 'Follow Vehicle'}</span>
          </button>

          <button
            type="button"
            data-testid="fit-all-vehicles-btn"
            onClick={() => {
              setFollowSelected(false);
              setFitAllNonce((n) => n + 1);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] text-slate-800 dark:text-white hover:border-[#00D4FF] transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
            <span>Fit All</span>
          </button>

          <button
            type="button"
            onClick={onOpenRegisterModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Main Split: Map + Telemetry Card (Left) & Vehicle Selector + GPS Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Cols: Interactive Leaflet Map + Selected Vehicle Live Telemetry */}
        <div className="lg:col-span-8 space-y-4">
          <div
            data-testid="live-tracking-map-container"
            className="relative w-full h-[380px] sm:h-[440px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/15 bg-slate-200 dark:bg-[#081229] z-0"
          >
            <MapContainer
              center={
                selectedPos
                  ? [selectedPos.latitude, selectedPos.longitude]
                  : [13.3379, 77.1173]
              }
              zoom={13}
              minZoom={3}
              maxZoom={18}
              scrollWheelZoom
              className="w-full h-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <LiveMapViewportController
                selectedCoords={
                  selectedPos
                    ? [selectedPos.latitude, selectedPos.longitude]
                    : null
                }
                followSelected={followSelected}
                fitAllRequest={fitAllNonce}
                allCoords={allCoords}
                focusNonce={focusNonce}
              />

              {selectedTrail.length > 1 && (
                <Polyline
                  positions={selectedTrail}
                  pathOptions={{
                    color: isSelectedStreamingGps ? '#10B981' : '#00D4FF',
                    weight: 4,
                    opacity: 0.85,
                    dashArray: isSelectedStreamingGps ? undefined : '6 6',
                  }}
                />
              )}

              {visibleDevices.map((dev) => {
                const pos = resolveVehiclePosition(dev);
                const isSelected = dev.id === effectiveSelectedId;
                const isLiveGps = dev.id === liveGpsDeviceId;

                return (
                  <Marker
                    key={dev.id}
                    position={[pos.latitude, pos.longitude]}
                    icon={createRegisteredMarkerIcon(dev, isSelected, isLiveGps)}
                    zIndexOffset={isSelected ? 600 : 100}
                    eventHandlers={{
                      click: () => {
                        onSelectDevice(dev.id);
                        setFocusNonce((n) => n + 1);
                      },
                    }}
                  >
                    <Popup
                      minWidth={276}
                      maxWidth={310}
                      autoPanPaddingTopLeft={[16, 20]}
                      autoPanPaddingBottomRight={[16, 16]}
                    >
                      <VehicleStatus
                        variant="popup"
                        label={dev.vehicleLabel}
                        subtitle={`IMEI ${dev.imei} · ${dev.model}`}
                        status={dev.status}
                        speedKmh={pos.speedKmh}
                        headingDeg={pos.headingDeg}
                        latitude={pos.latitude}
                        longitude={pos.longitude}
                        imei={dev.imei}
                        vehicleType={dev.vehicleType}
                        trailPointsCount={(trails[dev.id] ?? []).length}
                        telemetrySourceLabel={formatTelemetrySourceLabel(
                          pos.telemetrySource
                        )}
                        lastUpdated={dev.lastUpdated}
                      />
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Selected Vehicle Live Telemetry Readout */}
          {selectedDevice && selectedPos && (
            <VehicleStatus
              variant="dashboard"
              label={selectedDevice.vehicleLabel}
              subtitle={`IMEI ${selectedDevice.imei} · ${selectedDevice.model}${
                selectedDevice.vehicleType ? ` · ${selectedDevice.vehicleType}` : ''
              }`}
              status={selectedDevice.status}
              speedKmh={selectedPos.speedKmh}
              headingDeg={selectedPos.headingDeg}
              latitude={selectedPos.latitude}
              longitude={selectedPos.longitude}
              imei={selectedDevice.imei}
              vehicleType={selectedDevice.vehicleType}
              trailPointsCount={selectedTrail.length}
              telemetrySourceLabel={formatTelemetrySourceLabel(
                selectedPos.telemetrySource
              )}
              cloudSynced={selectedDevice.cloudSynced}
              lastUpdated={selectedDevice.lastUpdated}
              actionSlot={
                (selectedPos.telemetrySource === 'manual' ||
                  selectedDevice.status === 'Idle') &&
                !isSelectedStreamingGps ? (
                  <button
                    type="button"
                    onClick={handleResumeSimulatedRoute}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-500/40 bg-cyan-500/10 text-cyan-800 dark:text-[#00D4FF] hover:bg-cyan-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Resume Moving Route</span>
                  </button>
                ) : undefined
              }
            />
          )}
        </div>

        {/* Right 4 Cols: Vehicle List + Real Phone GPS + Manual GPS Ping */}
        <div className="lg:col-span-4 space-y-4">
          {/* Vehicle Selector Roster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-[#A9B4D0]">
              <span>Your Registered Fleet ({visibleDevices.length})</span>
              <span>Click to focus</span>
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {visibleDevices.map((dev) => {
                const pos = resolveVehiclePosition(dev);
                const isSelected = dev.id === effectiveSelectedId;
                const isGpsActive = dev.id === liveGpsDeviceId;

                return (
                  <button
                    key={dev.id}
                    type="button"
                    data-testid={`tracker-roster-item-${dev.id}`}
                    onClick={() => {
                      onSelectDevice(dev.id);
                      setFocusNonce((n) => n + 1);
                    }}
                    className={`w-full rounded-xl p-3 text-left border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-[#00D4FF]/10 border-cyan-500 dark:border-[#00D4FF]'
                        : 'bg-slate-50 dark:bg-[#0A1128]/70 border-slate-200 dark:border-white/10 hover:border-cyan-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs font-bold text-slate-900 dark:text-white truncate">
                        {dev.vehicleLabel}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-semibold shrink-0 ${
                          isGpsActive
                            ? 'text-emerald-700 dark:text-[#7CFF6B]'
                            : dev.status === 'Moving'
                            ? 'text-cyan-700 dark:text-[#00D4FF]'
                            : dev.status === 'Alert'
                            ? 'text-rose-700 dark:text-[#FF4D4F]'
                            : 'text-amber-700 dark:text-[#FFB020]'
                        }`}
                      >
                        {isGpsActive ? 'GPS LIVE' : `${pos.speedKmh} km/h`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1 text-[11px] font-mono text-slate-500 dark:text-[#A9B4D0]">
                      <span className="truncate">IMEI {dev.imei}</span>
                      <span className="shrink-0">
                        {pos.latitude.toFixed(2)}, {pos.longitude.toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stream Real Phone / Browser GPS */}
          {selectedDevice && (
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-[#7CFF6B] shrink-0">
                  <Smartphone className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Stream Real GPS from This Device
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-[#A9B4D0] mt-0.5 leading-relaxed">
                    Use your phone or browser GPS to broadcast real-time location for{' '}
                    <strong className="text-slate-900 dark:text-white">
                      {selectedDevice.vehicleLabel.split(' ')[0]}
                    </strong>
                    {isCloudAuthenticated ? ' and sync live via Cloud Firestore.' : '.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="toggle-device-gps-btn"
                onClick={handleToggleDeviceGps}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isSelectedStreamingGps
                    ? 'bg-rose-600 text-white hover:bg-rose-500'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                <LocateFixed className="w-4 h-4" aria-hidden="true" />
                <span>
                  {isSelectedStreamingGps
                    ? 'Stop Live Device GPS Stream'
                    : 'Start Live Device GPS'}
                </span>
              </button>

              {gpsStatusMessage && isSelectedStreamingGps && (
                <p
                  data-testid="device-gps-status"
                  className="text-[11px] font-mono text-emerald-700 dark:text-[#7CFF6B]"
                >
                  {gpsStatusMessage}
                </p>
              )}
              {gpsError && (
                <p
                  role="alert"
                  className="text-[11px] text-rose-600 dark:text-[#FF4D4F] leading-relaxed"
                >
                  {gpsError}
                </p>
              )}
            </div>
          )}

          {/* Send Live Manual GPS Ping */}
          {selectedDevice && (
            <form
              data-testid="manual-ping-form"
              onSubmit={handleManualPingSubmit}
              noValidate
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Send Live GPS Ping
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPingLat('13.3379');
                    setPingLng('77.1173');
                    setPingSpeed('56');
                    setPingError(null);
                  }}
                  className="text-[11px] font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
                >
                  Use Tumkuru HQ
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label
                    htmlFor="manual-ping-lat"
                    className="block text-[10px] font-semibold text-slate-600 dark:text-[#A9B4D0] mb-1"
                  >
                    Latitude
                  </label>
                  <input
                    id="manual-ping-lat"
                    data-testid="manual-ping-lat"
                    type="text"
                    inputMode="decimal"
                    value={pingLat}
                    onChange={(e) => setPingLat(e.target.value)}
                    placeholder="13.3379"
                    className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-ping-lng"
                    className="block text-[10px] font-semibold text-slate-600 dark:text-[#A9B4D0] mb-1"
                  >
                    Longitude
                  </label>
                  <input
                    id="manual-ping-lng"
                    data-testid="manual-ping-lng"
                    type="text"
                    inputMode="decimal"
                    value={pingLng}
                    onChange={(e) => setPingLng(e.target.value)}
                    placeholder="77.1173"
                    className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-ping-speed"
                    className="block text-[10px] font-semibold text-slate-600 dark:text-[#A9B4D0] mb-1"
                  >
                    Speed (km/h)
                  </label>
                  <input
                    id="manual-ping-speed"
                    data-testid="manual-ping-speed"
                    type="text"
                    inputMode="numeric"
                    value={pingSpeed}
                    onChange={(e) => setPingSpeed(e.target.value)}
                    placeholder="56"
                    className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
              </div>

              {pingError && (
                <p role="alert" className="text-[11px] text-rose-600 dark:text-[#FF4D4F]">
                  {pingError}
                </p>
              )}

              <button
                type="submit"
                data-testid="submit-manual-ping-btn"
                disabled={isPinging}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isPinging ? 'Updating Position...' : 'Push Live GPS Ping'}</span>
              </button>
            </form>
          )}

          {/* Hardware Gateway Transparency Note */}
          <details className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#0A1128]/70 px-3.5 py-2.5 text-[11px] text-slate-600 dark:text-[#A9B4D0]">
            <summary className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-white cursor-pointer select-none">
              <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF] shrink-0" aria-hidden="true" />
              <span>How physical 4G GPS boxes vs. phone GPS work</span>
            </summary>
            <p className="mt-2 leading-relaxed">
              Newly registered IMEI units immediately display live simulated corridor telemetry so you can test tracking right away. For real physical location inside a vehicle, tap{' '}
              <strong className="text-slate-900 dark:text-white">Start Live Device GPS</strong> on a phone/PWA inside the vehicle (syncs live via Cloud Firestore across devices). Standalone wired 4G tracker boxes require an active M2M SIM card configured to transmit TCP/IP packets to a VS Technology carrier ingestion server.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
