import { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
} from '@vis.gl/react-google-maps';
import { Navigation, ExternalLink, MapPin } from 'lucide-react';
import {
  EXPERIENCE_CENTERS,
  FLEET_MAP_TELEMETRY,
  HEAD_OFFICE_COORDS,
  type FleetMapMarkerData,
} from '../data/catalog';
import type { ExperienceCenter } from '../types';
import type { LiveVehicle } from '../utils/simulatorLogic';

const MAPS_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];

interface GoogleFleetMapProps {
  mode: 'fleet' | 'stores';
  heightClass?: string;
  selectedCenterId?: string | null;
  selectedFleetId?: string | null;
  liveVehicles?: LiveVehicle[];
  onSelectCenter?: (center: ExperienceCenter) => void;
  onSelectFleetVehicle?: (id: string) => void;
}

function toFleetMarkers(liveVehicles?: LiveVehicle[]): FleetMapMarkerData[] {
  if (!liveVehicles || liveVehicles.length === 0) {
    return FLEET_MAP_TELEMETRY;
  }
  return liveVehicles.map((v) => ({
    id: v.id,
    plate: v.plate,
    driver: v.driver,
    status: v.status,
    speedKmh: v.speed,
    routeZone: v.routeZone,
    lat: v.lat,
    lng: v.lng,
  }));
}

function FleetMapInner({
  selectedFleetId,
  liveVehicles,
  onSelectFleetVehicle,
}: {
  selectedFleetId?: string | null;
  liveVehicles?: LiveVehicle[];
  onSelectFleetVehicle?: (id: string) => void;
}) {
  const markers = toFleetMarkers(liveVehicles);
  const [activeId, setActiveId] = useState<string | null>(
    () => selectedFleetId ?? markers[3]?.id ?? markers[0]?.id ?? null
  );

  useEffect(() => {
    if (selectedFleetId) {
      setActiveId(selectedFleetId);
    }
  }, [selectedFleetId]);

  const activeVehicle = markers.find((v) => v.id === activeId) ?? null;

  const pinColors = (status: FleetMapMarkerData['status']) => {
    if (status === 'Moving') {
      return { background: '#7CFF6B', borderColor: '#0A1128', glyphColor: '#0A1128' };
    }
    if (status === 'Idle') {
      return { background: '#FFB020', borderColor: '#0A1128', glyphColor: '#0A1128' };
    }
    return { background: '#FF4D4F', borderColor: '#FFFFFF', glyphColor: '#FFFFFF' };
  };

  return (
    <GoogleMap
      defaultCenter={{ lat: 12.875, lng: 77.69 }}
      defaultZoom={11}
      mapId="DEMO_MAP_ID"
      internalUsageAttributionIds={MAPS_ATTRIBUTION_IDS}
      gestureHandling="cooperative"
      disableDefaultUI={false}
      style={{ width: '100%', height: '100%' }}
    >
      {markers.map((v) => {
        const colors = pinColors(v.status);
        return (
          <AdvancedMarker
            key={v.id}
            position={{ lat: v.lat, lng: v.lng }}
            title={`${v.plate} (${v.status})`}
            onClick={() => {
              setActiveId(v.id);
              onSelectFleetVehicle?.(v.id);
            }}
          >
            <Pin
              background={colors.background}
              borderColor={colors.borderColor}
              glyphColor={colors.glyphColor}
            />
          </AdvancedMarker>
        );
      })}

      {activeVehicle && (
        <InfoWindow
          position={{ lat: activeVehicle.lat, lng: activeVehicle.lng }}
          onCloseClick={() => setActiveId(null)}
        >
          <div className="p-1 text-slate-900 min-w-[175px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold">{activeVehicle.plate}</span>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100">
                {activeVehicle.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">{activeVehicle.driver}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{activeVehicle.routeZone}</p>
            <p className="font-mono text-xs font-semibold text-cyan-700 mt-1 flex items-center gap-1">
              <Navigation className="w-3 h-3" aria-hidden="true" />
              <span>{activeVehicle.speedKmh} km/h live</span>
            </p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

function StoresMapInner({
  selectedCenterId,
  onSelectCenter,
}: {
  selectedCenterId?: string | null;
  onSelectCenter?: (center: ExperienceCenter) => void;
}) {
  const [activeStore, setActiveStore] = useState<ExperienceCenter | null>(() => {
    if (selectedCenterId) {
      return EXPERIENCE_CENTERS.find((c) => c.id === selectedCenterId) ?? null;
    }
    return EXPERIENCE_CENTERS[0];
  });

  useEffect(() => {
    if (selectedCenterId) {
      const match = EXPERIENCE_CENTERS.find((c) => c.id === selectedCenterId);
      if (match) setActiveStore(match);
    }
  }, [selectedCenterId]);

  const mapCenter = activeStore
    ? { lat: activeStore.lat, lng: activeStore.lng }
    : { lat: 20.5937, lng: 78.9629 };

  return (
    <GoogleMap
      defaultCenter={mapCenter}
      center={selectedCenterId && activeStore ? { lat: activeStore.lat, lng: activeStore.lng } : undefined}
      defaultZoom={selectedCenterId ? 13 : 5}
      zoom={selectedCenterId ? 13 : undefined}
      mapId="DEMO_MAP_ID"
      internalUsageAttributionIds={MAPS_ATTRIBUTION_IDS}
      gestureHandling="cooperative"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Corporate HQ Pin */}
      <AdvancedMarker
        position={HEAD_OFFICE_COORDS}
        title="VS Technology Corporate HQ — Tumkuru"
      >
        <Pin background="#0A1128" borderColor="#00D4FF" glyphColor="#00D4FF" />
      </AdvancedMarker>

      {/* Experience Centers */}
      {EXPERIENCE_CENTERS.map((center) => {
        const isSelected = activeStore?.id === center.id;
        return (
          <AdvancedMarker
            key={center.id}
            position={{ lat: center.lat, lng: center.lng }}
            title={center.name}
            onClick={() => {
              setActiveStore(center);
              onSelectCenter?.(center);
            }}
          >
            <Pin
              background={center.launchingSoon ? '#FFB020' : isSelected ? '#00D4FF' : '#7CFF6B'}
              borderColor="#0A1128"
              glyphColor="#0A1128"
            />
          </AdvancedMarker>
        );
      })}

      {activeStore && (
        <InfoWindow
          position={{ lat: activeStore.lat, lng: activeStore.lng }}
          onCloseClick={() => setActiveStore(null)}
        >
          <div className="p-1 text-slate-900 max-w-[220px]">
            <div className="text-[11px] font-semibold text-cyan-700">{activeStore.city}</div>
            <div className="text-xs font-bold mt-0.5">{activeStore.name}</div>
            <p className="text-[11px] text-slate-600 mt-1 leading-snug">{activeStore.address}</p>
            <p className="text-[11px] font-mono text-slate-700 mt-1">{activeStore.phone}</p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeStore.lat},${activeStore.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 hover:underline"
            >
              <span>Directions in Google Maps</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

export function GoogleFleetMap({
  mode,
  heightClass = 'h-56 sm:h-72',
  selectedCenterId,
  selectedFleetId,
  liveVehicles,
  onSelectCenter,
  onSelectFleetVehicle,
}: GoogleFleetMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  if (!apiKey) {
    return (
      <div
        className={`${heightClass} w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#070D1F] flex flex-col items-center justify-center p-4 text-center`}
      >
        <MapPin className="w-6 h-6 text-cyan-600 dark:text-[#00D4FF] mb-2" aria-hidden="true" />
        <p className="text-xs font-semibold text-slate-800 dark:text-white">
          Google Maps API Key Required
        </p>
        <p className="text-[11px] text-slate-500 dark:text-[#A9B4D0] mt-1 max-w-xs">
          Set <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> to render live interactive Google Maps pins.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid={`google-map-${mode}`}
      className={`${heightClass} w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900`}
    >
      <APIProvider apiKey={apiKey}>
        {mode === 'fleet' ? (
          <FleetMapInner
            selectedFleetId={selectedFleetId}
            liveVehicles={liveVehicles}
            onSelectFleetVehicle={onSelectFleetVehicle}
          />
        ) : (
          <StoresMapInner
            selectedCenterId={selectedCenterId}
            onSelectCenter={onSelectCenter}
          />
        )}
      </APIProvider>
    </div>
  );
}
