import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import {
  Fuel,
  Gauge,
  Globe2,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Search,
  WifiOff,
} from 'lucide-react';
import {
  INITIAL_WORLD_FLEET,
  filterWorldFleet,
  formatLatLng,
  summarizeWorldFleet,
  type FleetMapStatus,
  type FleetMapVehicle,
} from '../utils/fleetMapLogic';
import { useWorldFleetRealtime } from '../hooks/useFleetSocket';
import { VehicleStatus } from './VehicleStatus';

export interface FleetMapProps {
  initialVehicles?: FleetMapVehicle[];
  heightClass?: string;
}

const WORLD_CENTER: [number, number] = [18, 62];
const WORLD_ZOOM = 2;
const WORLD_BOUNDS: L.LatLngBoundsExpression = [
  [-36, -6],
  [55, 155],
];

function createVehicleIcon(
  vehicle: FleetMapVehicle,
  isSelected: boolean
): L.DivIcon {
  const palette =
    vehicle.status === 'Moving'
      ? {
          bg: '#16A34A',
          border: '#DCFCE7',
          text: '#FFFFFF',
          glyph: '&#9654;',
          label: `${vehicle.speedKmh} km/h`,
        }
      : vehicle.status === 'Idle'
      ? {
          bg: '#D97706',
          border: '#FEF3C7',
          text: '#FFFFFF',
          glyph: '&#9646;&#9646;',
          label: 'Idle',
        }
      : {
          bg: '#475569',
          border: '#E2E8F0',
          text: '#F8FAFC',
          glyph: '&#10005;',
          label: 'Offline',
        };

  const ringShadow = isSelected
    ? '0 0 0 3px #00D4FF, 0 8px 18px rgba(10, 17, 40, 0.45)'
    : '0 4px 12px rgba(10, 17, 40, 0.35)';

  return L.divIcon({
    className: 'fleet-custom-marker',
    html: `
      <div style="display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:9999px;background:${palette.bg};color:${palette.text};border:2px solid ${palette.border};box-shadow:${ringShadow};font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;font-weight:700;white-space:nowrap;transform:translate(-50%,-50%);line-height:1.1;">
        <span style="font-size:9px;letter-spacing:-1px;" aria-hidden="true">${palette.glyph}</span>
        <span>${palette.label}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18],
  });
}

function MapViewportController({
  focusRequest,
  onResetComplete,
}: {
  focusRequest:
    | { type: 'vehicle'; lat: number; lng: number; zoom: number; nonce: number }
    | { type: 'world'; nonce: number }
    | null;
  onResetComplete: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(WORLD_BOUNDS, { padding: [24, 24], maxZoom: 3 });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.type === 'world') {
      map.flyToBounds(WORLD_BOUNDS, {
        padding: [24, 24],
        maxZoom: 3,
        duration: 0.75,
      });
    } else {
      map.flyTo([focusRequest.lat, focusRequest.lng], focusRequest.zoom, {
        duration: 0.75,
      });
    }
    onResetComplete();
  }, [focusRequest, map, onResetComplete]);

  return null;
}

export function FleetMap({
  initialVehicles = INITIAL_WORLD_FLEET,
  heightClass = 'h-[360px] sm:h-[420px]',
}: FleetMapProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | FleetMapStatus>(
    'All'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(
    initialVehicles[0]?.id ?? ''
  );
  const [isPaused, setIsPaused] = useState(false);
  const [focusRequest, setFocusRequest] = useState<
    | { type: 'vehicle'; lat: number; lng: number; zoom: number; nonce: number }
    | { type: 'world'; nonce: number }
    | null
  >(null);

  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const { vehicles, resetWorldFleet } = useWorldFleetRealtime({
    initialVehicles,
    paused: isPaused,
  });

  const summary = useMemo(() => summarizeWorldFleet(vehicles), [vehicles]);

  const filteredVehicles = useMemo(
    () => filterWorldFleet(vehicles, statusFilter, searchQuery),
    [vehicles, statusFilter, searchQuery]
  );

  const selectedVehicle = useMemo(
    () =>
      vehicles.find((v) => v.id === selectedId) ??
      filteredVehicles[0] ??
      vehicles[0] ??
      null,
    [vehicles, selectedId, filteredVehicles]
  );

  const handleSelectVehicle = (vehicle: FleetMapVehicle, zoomLevel = 4) => {
    setSelectedId(vehicle.id);
    setFocusRequest({
      type: 'vehicle',
      lat: vehicle.lat,
      lng: vehicle.lng,
      zoom: zoomLevel,
      nonce: Date.now(),
    });
    window.setTimeout(() => {
      const marker = markerRefs.current[vehicle.id];
      if (marker) {
        marker.openPopup();
      }
    }, 820);
  };

  const handleWorldReset = () => {
    setFocusRequest({
      type: 'world',
      nonce: Date.now(),
    });
  };

  const handleResetSimulation = () => {
    resetWorldFleet();
    setStatusFilter('All');
    setSearchQuery('');
    setIsPaused(false);
    if (initialVehicles[0]) {
      setSelectedId(initialVehicles[0].id);
    }
    handleWorldReset();
  };

  const filterButtons: Array<{
    id: 'All' | FleetMapStatus;
    label: string;
    count: number;
  }> = [
    { id: 'All', label: 'All', count: summary.total },
    { id: 'Moving', label: 'Moving', count: summary.moving },
    { id: 'Idle', label: 'Idle', count: summary.idle },
    { id: 'Offline', label: 'Offline', count: summary.offline },
  ];

  return (
    <div
      data-testid="fleet-world-map"
      className="rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] p-4 sm:p-6 shadow-sm text-left"
    >
      {/* Top Bar: Title, Fleet Summary Metrics & Stream Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
            <Globe2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Global Fleet Map · Real-Time Socket.io Push</span>
          </div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
            Live Worldwide Vehicle &amp; Fuel Monitor
          </h3>
          <p className="text-xs text-slate-600 dark:text-[#A9B4D0] mt-0.5 tabular-nums">
            {summary.total} tracked corridors · Avg moving speed{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {summary.avgSpeedKmh} km/h
            </span>{' '}
            · Avg fleet fuel{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {summary.avgFuelPercent}%
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            aria-pressed={isPaused}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] text-slate-800 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
            onClick={handleWorldReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] text-slate-800 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
            <span>World View</span>
          </button>

          <button
            type="button"
            onClick={handleResetSimulation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] text-slate-700 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
        <div
          role="group"
          aria-label="Filter vehicles by status"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0A1128] border border-slate-200/80 dark:border-white/10"
        >
          {filterButtons.map((btn) => {
            const active = statusFilter === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  active
                    ? 'bg-[#00D4FF] text-[#0A1128]'
                    : 'text-slate-600 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {btn.label} ({btn.count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search fleet vehicles"
            placeholder="Search plate, driver, or country..."
            className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-[#00D4FF]"
          />
        </div>
      </div>

      {/* Map + Roster Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Leaflet World Map */}
        <div className="lg:col-span-8 flex flex-col">
          <div
            className={`fleet-leaflet-map relative w-full ${heightClass} rounded-xl overflow-hidden border border-slate-200 dark:border-white/15 bg-slate-200 dark:bg-[#081229] z-0`}
          >
            <MapContainer
              center={WORLD_CENTER}
              zoom={WORLD_ZOOM}
              minZoom={2}
              maxZoom={16}
              worldCopyJump
              scrollWheelZoom={false}
              className="w-full h-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapViewportController
                focusRequest={focusRequest}
                onResetComplete={() => setFocusRequest(null)}
              />

              {filteredVehicles.map((vehicle) => {
                const isSelected = vehicle.id === selectedId;

                return (
                  <Marker
                    key={vehicle.id}
                    position={[vehicle.lat, vehicle.lng]}
                    icon={createVehicleIcon(vehicle, isSelected)}
                    title={`${vehicle.plate} · ${vehicle.status} · ${vehicle.speedKmh} km/h · ${vehicle.fuelPercent}% fuel`}
                    zIndexOffset={isSelected ? 500 : 0}
                    ref={(instance) => {
                      markerRefs.current[vehicle.id] = instance;
                    }}
                    eventHandlers={{
                      click: () => setSelectedId(vehicle.id),
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
                        label={vehicle.plate}
                        subtitle={`${vehicle.hub} · ${vehicle.country}`}
                        status={vehicle.status}
                        speedKmh={vehicle.speedKmh}
                        headingDeg={vehicle.headingDeg}
                        latitude={vehicle.lat}
                        longitude={vehicle.lng}
                        fuelPercent={vehicle.fuelPercent}
                        fuelLiters={vehicle.fuelLiters}
                        tankCapacityLiters={vehicle.tankCapacityLiters}
                        vehicleType="Commercial Truck / Fleet"
                        driver={vehicle.driver}
                        lastUpdated={vehicle.lastPing}
                      />
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Map Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-slate-600 dark:text-[#A9B4D0]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
                <span>Moving (Active GPS &amp; Speed)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" aria-hidden="true" />
                <span>Idle (0 km/h · Ignition On)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#475569]" aria-hidden="true" />
                <span>Offline (Last Known Telemetry)</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-[#A9B4D0]">
              Click any marker or unit to inspect speed, engine &amp; fuel popup
            </span>
          </div>

          {selectedVehicle && (
            <VehicleStatus
              variant="dashboard"
              className="mt-4"
              label={selectedVehicle.plate}
              subtitle={`${selectedVehicle.hub} · ${selectedVehicle.country}`}
              status={selectedVehicle.status}
              speedKmh={selectedVehicle.speedKmh}
              headingDeg={selectedVehicle.headingDeg}
              latitude={selectedVehicle.lat}
              longitude={selectedVehicle.lng}
              fuelPercent={selectedVehicle.fuelPercent}
              fuelLiters={selectedVehicle.fuelLiters}
              tankCapacityLiters={selectedVehicle.tankCapacityLiters}
              vehicleType="Commercial Truck / Fleet"
              driver={selectedVehicle.driver}
              lastUpdated={selectedVehicle.lastPing}
              telemetrySourceLabel={isPaused ? 'Stream Paused' : 'Live Socket.io Feed'}
            />
          )}
        </div>

        {/* Right Column: Live Vehicle Telemetry Roster */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-[#A9B4D0] pb-2">
            <span>Fleet Units ({filteredVehicles.length})</span>
            <span>Speed / Fuel</span>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="flex-1 rounded-xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128]/50 p-6 flex flex-col items-center justify-center text-center gap-3">
              <p className="text-sm font-medium text-slate-700 dark:text-white">
                No vehicles match &ldquo;{searchQuery || statusFilter}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('All');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
              >
                Show All Vehicles
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[590px] overflow-y-auto pr-1">
              {filteredVehicles.map((vehicle) => {
                const isSelected = vehicle.id === selectedId;
                const statusColor =
                  vehicle.status === 'Moving'
                    ? 'text-emerald-700 dark:text-[#7CFF6B]'
                    : vehicle.status === 'Idle'
                    ? 'text-amber-700 dark:text-[#FFB020]'
                    : 'text-slate-600 dark:text-slate-400';

                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => handleSelectVehicle(vehicle)}
                    className={`w-full rounded-xl p-3 text-left border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-[#00D4FF]/10 border-cyan-400 dark:border-[#00D4FF]'
                        : 'bg-slate-50 dark:bg-[#0A1128]/70 border-slate-200/80 dark:border-white/10 hover:border-cyan-500/60 dark:hover:border-[#00D4FF]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {vehicle.status === 'Offline' ? (
                          <WifiOff
                            className={`w-3.5 h-3.5 shrink-0 ${statusColor}`}
                            aria-hidden="true"
                          />
                        ) : (
                          <MapPin
                            className={`w-3.5 h-3.5 shrink-0 ${statusColor}`}
                            aria-hidden="true"
                          />
                        )}
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                          {vehicle.plate}
                        </span>
                      </div>
                      <span className={`text-[11px] font-semibold shrink-0 ${statusColor}`}>
                        {vehicle.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-[#A9B4D0] mt-1 truncate">
                      {vehicle.hub} · {vehicle.country}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-800 dark:text-white">
                        <Gauge className="w-3 h-3 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
                        <span>{vehicle.speedKmh} km/h</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-800 dark:text-white">
                        <Fuel className="w-3 h-3 text-emerald-600 dark:text-[#7CFF6B]" aria-hidden="true" />
                        <span>
                          {vehicle.fuelPercent}% ({vehicle.fuelLiters} L)
                        </span>
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-[#A9B4D0]">
                      <span className="font-mono tabular-nums">
                        {formatLatLng(vehicle.lat, vehicle.lng)}
                      </span>
                      <span>{vehicle.lastPing}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
