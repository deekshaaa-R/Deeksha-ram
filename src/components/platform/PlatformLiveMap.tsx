import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import { Maximize2, Minimize2 } from 'lucide-react';
import type {
  GeofenceRecord,
  NearbyAmenity,
  PlatformDevice,
  PlatformVehicle,
} from '../../utils/unifiedPlatformLogic';
import { VehicleStatus } from '../VehicleStatus';

interface PlatformLiveMapProps {
  vehicles: PlatformVehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  geofences?: GeofenceRecord[];
  amenities?: NearbyAmenity[];
  showGeofences?: boolean;
  showPlannedRoute?: boolean;
  showAmenities?: boolean;
  showViolations?: boolean;
  playbackPoints?: Array<[number, number]>;
  playbackIndex?: number;
  platform: PlatformDevice;
  heightClass?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function createPlatformVehicleMarker(
  vehicle: PlatformVehicle,
  isSelected: boolean
): L.DivIcon {
  const palette =
    vehicle.status === 'Running'
      ? { bg: '#16A34A', border: '#DCFCE7', glyph: '▶', text: `${vehicle.speedKmh} km/h` }
      : vehicle.status === 'Idle'
      ? { bg: '#D97706', border: '#FEF3C7', glyph: '⏸', text: 'Idle' }
      : vehicle.status === 'Stationary'
      ? { bg: '#0284C7', border: '#BAE6FD', glyph: '■', text: 'Stopped' }
      : { bg: '#475569', border: '#E2E8F0', glyph: '✕', text: 'Offline' };

  const ring = isSelected
    ? '0 0 0 3px #00D4FF, 0 8px 18px rgba(10, 17, 40, 0.5)'
    : '0 4px 12px rgba(10, 17, 40, 0.35)';

  return L.divIcon({
    className: 'platform-vehicle-marker',
    html: `
      <div style="display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:9999px;background:${palette.bg};color:#FFFFFF;border:2px solid ${palette.border};box-shadow:${ring};font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;white-space:nowrap;transform:translate(-50%,-50%);line-height:1.1;">
        <span style="font-size:8.5px;" aria-hidden="true">${palette.glyph}</span>
        <span>${vehicle.vehicleNumber}</span>
        <span style="opacity:0.9;">${palette.text}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18],
  });
}

function createPinMarker(label: string, bg: string): L.DivIcon {
  return L.divIcon({
    className: 'platform-aux-marker',
    html: `<div style="padding:3px 7px;border-radius:6px;background:${bg};color:#fff;font-family:ui-sans-serif,system-ui,sans-serif;font-size:10px;font-weight:700;white-space:nowrap;transform:translate(-50%,-50%);box-shadow:0 3px 10px rgba(0,0,0,0.3);border:1.5px solid #fff;">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -14],
  });
}

function MapAutoFocus({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(t);
  }, [map]);

  useEffect(() => {
    map.panTo(center, { animate: true, duration: 0.45 });
  }, [center[0], center[1], zoom, map]);

  return null;
}

export function PlatformLiveMap({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  geofences = [],
  amenities = [],
  showGeofences = false,
  showPlannedRoute = false,
  showAmenities = false,
  showViolations = false,
  playbackPoints,
  playbackIndex = 0,
  platform,
  heightClass = 'h-[360px]',
  isFullscreen = false,
  onToggleFullscreen,
}: PlatformLiveMapProps) {
  const selected =
    vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0] ?? null;

  const center: [number, number] = selected
    ? [selected.lat, selected.lng]
    : [13.3379, 77.1173];

  const mapEngineLabel =
    platform === 'android'
      ? 'Google Maps Telemetry Layer'
      : platform === 'iphone'
      ? 'Apple Maps Live Sheet Layer'
      : 'Web Control Room Map';

  const playbackCurrent =
    playbackPoints && playbackPoints.length > 0
      ? playbackPoints[Math.min(playbackIndex, playbackPoints.length - 1)]
      : null;

  return (
    <div
      data-testid="platform-live-map"
      className={`relative w-full ${
        isFullscreen
          ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)] shadow-2xl'
          : `${heightClass} isolate z-0`
      } rounded-2xl overflow-hidden border border-slate-200 dark:border-white/15 bg-slate-200 dark:bg-[#081229]`}
    >
      {/* Clean top-right overlay controls */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-lg bg-white/95 dark:bg-[#0A1128]/90 border border-slate-200 dark:border-white/15 text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
          {mapEngineLabel}
        </span>
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit full-screen live map' : 'Open full-screen live map'}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A1128] text-white text-[11px] font-semibold shadow-sm hover:bg-slate-800 cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Full Screen</span>
              </>
            )}
          </button>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={selected ? 11 : 5}
        minZoom={3}
        maxZoom={18}
        scrollWheelZoom
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapAutoFocus center={playbackCurrent ?? center} zoom={11} />

        {/* Live Vehicle Trail */}
        {selected && selected.trail.length > 1 && (
          <Polyline
            positions={selected.trail}
            pathOptions={{ color: '#0284C7', weight: 4, opacity: 0.85 }}
          />
        )}

        {/* Planned Route for Route Deviation Monitoring */}
        {showPlannedRoute && selected && selected.plannedRoute.length > 1 && (
          <Polyline
            positions={selected.plannedRoute}
            pathOptions={{
              color: selected.routeDeviated ? '#DC2626' : '#16A34A',
              weight: 3.5,
              dashArray: '8 6',
              opacity: 0.9,
            }}
          />
        )}

        {/* 6-Month Trip History Playback Route */}
        {playbackPoints && playbackPoints.length > 1 && (
          <>
            <Polyline
              positions={playbackPoints}
              pathOptions={{ color: '#7C3AED', weight: 4.5, opacity: 0.9 }}
            />
            {playbackCurrent && (
              <Marker
                position={playbackCurrent}
                icon={createPinMarker('Playback Pin', '#7C3AED')}
                zIndexOffset={900}
              />
            )}
          </>
        )}

        {/* Geofences & POIs */}
        {showGeofences &&
          geofences.map((gf) => (
            <Circle
              key={gf.id}
              center={[gf.lat, gf.lng]}
              radius={gf.radiusMeters}
              pathOptions={{
                color: gf.kind === 'POI' ? '#D97706' : '#0284C7',
                fillColor: gf.kind === 'POI' ? '#F59E0B' : '#0EA5E9',
                fillOpacity: 0.16,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs font-sans text-slate-900">
                  <div className="font-bold">{gf.name}</div>
                  <div className="text-slate-600">
                    {gf.kind} · Radius {gf.radiusMeters}m
                  </div>
                </div>
              </Popup>
            </Circle>
          ))}

        {/* Overspeed & Overstoppage Pins */}
        {showViolations &&
          selected?.overspeedEvents.map((ev) => (
            <Marker
              key={ev.id}
              position={[ev.lat, ev.lng]}
              icon={createPinMarker(`Overspeed ${ev.speedKmh} km/h`, '#DC2626')}
            >
              <Popup>
                <div className="text-xs font-sans text-slate-900">
                  <div className="font-bold text-rose-700">Overspeed ({ev.speedKmh} km/h)</div>
                  <div>{ev.location}</div>
                  <div className="text-slate-500">{ev.timestamp}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        {showViolations &&
          selected?.overstoppageEvents.map((ev) => (
            <Marker
              key={ev.id}
              position={[ev.lat, ev.lng]}
              icon={createPinMarker(`Stopped ${ev.durationMins}m`, '#D97706')}
            >
              <Popup>
                <div className="text-xs font-sans text-slate-900">
                  <div className="font-bold text-amber-700">Overstoppage ({ev.durationMins} mins)</div>
                  <div>{ev.location}</div>
                  <div className="text-slate-500">{ev.timestamp}</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Nearby Amenities Pins */}
        {showAmenities &&
          amenities.map((am) => (
            <Marker
              key={am.id}
              position={[am.lat, am.lng]}
              icon={createPinMarker(
                `${am.category}: ${am.distanceKm}km`,
                am.category === 'Hospital'
                  ? '#DC2626'
                  : am.category === 'Fuel Pump'
                  ? '#059669'
                  : '#4F46E5'
              )}
            >
              <Popup>
                <div className="text-xs font-sans text-slate-900 space-y-1">
                  <div className="font-bold">{am.name}</div>
                  <div className="text-slate-600">
                    {am.category} · {am.distanceKm} km away · {am.open24x7 ? 'Open 24x7' : 'Day Hours'}
                  </div>
                  <div className="font-mono text-slate-700">{am.phone}</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Live Vehicle Markers */}
        {vehicles.map((v) => {
          const isSelected = v.id === selected?.id;
          const mappedStatus =
            v.status === 'Running'
              ? 'Moving'
              : v.status === 'Offline'
              ? 'Offline'
              : 'Idle';
          return (
            <Marker
              key={v.id}
              position={[v.lat, v.lng]}
              icon={createPlatformVehicleMarker(v, isSelected)}
              zIndexOffset={isSelected ? 700 : 150}
              eventHandlers={{
                click: () => onSelectVehicle(v.id),
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
                  label={v.vehicleNumber}
                  subtitle={`${v.vehicleType} · ${v.address}`}
                  status={mappedStatus}
                  speedKmh={v.speedKmh}
                  headingDeg={v.headingDeg}
                  latitude={v.lat}
                  longitude={v.lng}
                  fuelPercent={v.fuelPercent}
                  fuelLiters={v.fuelLiters}
                  tankCapacityLiters={v.tankCapacityLiters}
                  ignitionOn={v.ignitionOn}
                  driver={v.driverName}
                  lastUpdated={v.lastUpdated}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
