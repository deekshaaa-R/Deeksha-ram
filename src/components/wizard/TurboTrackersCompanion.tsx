import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BatteryCharging,
  Car,
  CheckCircle2,
  Compass,
  Download,
  Fuel,
  Gauge,
  LayoutDashboard,
  Lock,
  LogOut,
  Map as MapIcon,
  MapPin,
  Monitor,
  Navigation,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Snowflake,
  Trash2,
  User,
} from 'lucide-react';
import {
  canRoleAccessFeature,
  canRoleEditFeature,
  DEFAULT_PERMISSIONS_MATRIX,
  getRolePermission,
} from '../../utils/wizardSecurity';
import {
  CUSTOMER_STAGE_SPECS,
  type CustomerStage,
  type LiveTrackVehicleRecord,
} from '../../utils/rtoLookup';
import type { WizardAuthSession } from './WizardAuthGate';
import { LockedChip, type FormStyleMode } from './WizardSharedWidgets';
import { RtoLiveTrackerCard } from './RtoLiveTrackerCard';

export type TurboTrackVehicle = LiveTrackVehicleRecord;

export type CompanionTab = 'Dashboard' | 'Map' | 'Vehicles' | 'Account';

interface SessionItem {
  sessionId: string;
  deviceId: string;
  deviceLabel: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: string;
  actorUsername: string;
  actorRole: string;
  detail: string;
  deviceId: string;
  severity: 'info' | 'warning' | 'critical';
}

function stateBadgeStyle(state: TurboTrackVehicle['vehicleState']) {
  if (state === 'Move') {
    return 'bg-[#00A88F]/15 text-[#007B68] dark:bg-[#00A88F]/25 dark:text-teal-200 border-[#00A88F]/30';
  }
  if (state === 'Start') {
    return 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200 border-amber-300/60';
  }
  return 'bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-slate-300 border-slate-300/60';
}

function NineFieldTelemetryCard({
  vehicle,
  stage,
  onFocusOnMap,
  onTrackOnDashboard,
}: {
  vehicle: TurboTrackVehicle;
  stage: CustomerStage;
  onFocusOnMap?: () => void;
  onTrackOnDashboard?: () => void;
}) {
  const isIphone = stage === 'iphone';
  const accentBtn = isIphone
    ? 'bg-[#007AFF]/10 text-[#007AFF] dark:bg-sky-500/20 dark:text-sky-300'
    : 'bg-[#4B2166]/10 text-[#4B2166] dark:bg-purple-500/20 dark:text-purple-200';

  const driverName = vehicle.driverName;
  const driverPhone = vehicle.driverPhone;

  return (
    <div
      data-testid={`tracking-vehicle-card-${vehicle.vehicleNumber}`}
      className={`bg-white dark:bg-[#191524] border border-slate-200 dark:border-white/10 p-4 space-y-3 shadow-xs ${
        isIphone ? 'rounded-2xl' : 'rounded-2xl'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              {vehicle.vehicleNumber}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${stateBadgeStyle(
                vehicle.vehicleState
              )}`}
            >
              {vehicle.vehicleState}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {vehicle.currentStatus} · {vehicle.transporterName}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onTrackOnDashboard && (
            <button
              type="button"
              onClick={onTrackOnDashboard}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${accentBtn}`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Track</span>
            </button>
          )}
          {onFocusOnMap && (
            <button
              type="button"
              onClick={onFocusOnMap}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${accentBtn}`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Map pin</span>
            </button>
          )}
        </div>
      </div>

      {/* Exact Location & Driver Contact Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs">
        <div className="min-w-0 flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-[#00A88F] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
              {vehicle.exactLocation?.landmark || vehicle.exactLocation?.road || 'Live GPS Fix'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {vehicle.exactLocation?.address ||
                `${vehicle.lat.toFixed(5)}, ${vehicle.lng.toFixed(5)}`}
            </div>
          </div>
        </div>

        {driverPhone && (
          <a
            href={`tel:${driverPhone.replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00A88F]/12 text-[#007B68] dark:bg-[#00A88F]/20 dark:text-teal-200 text-xs font-semibold shrink-0 hover:bg-[#00A88F]/20"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{driverName ? `${driverName.split(' ')[0]} · ` : ''}{driverPhone}</span>
          </a>
        )}
      </div>

      {/* Core Live Telemetry Grid */}
      <div
        className={`grid ${
          stage === 'web' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'
        } gap-2 text-xs`}
      >
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
          <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Compass className="w-3 h-3 text-[#4B2166] dark:text-purple-300" />
            <span>Lat &amp; Lng</span>
          </div>
          <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 text-[11px] tabular-nums">
            {vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
          <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-[#00A88F]" />
            <span>Speed</span>
          </div>
          <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
            {vehicle.speedKmh} km/h
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
          <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Snowflake className="w-3 h-3 text-sky-500" />
            <span>A/C status</span>
          </div>
          <div className="font-bold text-slate-900 dark:text-white mt-0.5">
            {vehicle.acOn ? 'ON' : 'OFF'}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
          <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Fuel className="w-3 h-3 text-amber-500" />
            <span>Fuel monitoring</span>
          </div>
          <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
            {vehicle.fuelPercent}% ({vehicle.fuelLiters} L)
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
          <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
            Odometer reading
          </div>
          <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
            {vehicle.odometerKm.toLocaleString()} km
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
          <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <BatteryCharging className="w-3 h-3 text-emerald-500" />
            <span>Battery voltage</span>
          </div>
          <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
            {vehicle.batteryVoltage.toFixed(1)} V
          </div>
        </div>
      </div>
    </div>
  );
}

// Interactive Pin-Point Map View (Leaflet)
function LivePinPointMap({
  vehicles,
  selectedId,
  onSelectVehicle,
  tall,
}: {
  vehicles: TurboTrackVehicle[];
  selectedId: string | null;
  onSelectVehicle: (id: string) => void;
  tall?: boolean;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const trailRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const center: [number, number] =
      vehicles.length > 0 ? [vehicles[0].lat, vehicles[0].lng] : [13.3379, 77.1173];
    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 7,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      trailRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(vehicles.map((v) => v.id));
    for (const [id, marker] of markersRef.current.entries()) {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const v of vehicles) {
      const isSelected = v.id === selectedId;
      const color =
        v.vehicleState === 'Move'
          ? '#00A88F'
          : v.vehicleState === 'Start'
          ? '#D97706'
          : '#4B2166';

      const existing = markersRef.current.get(v.id);
      if (existing) {
        existing.setLatLng([v.lat, v.lng]);
        existing.setStyle({
          radius: isSelected ? 11 : 8,
          fillColor: color,
          color: isSelected ? '#FFFFFF' : '#1E1B2E',
          weight: isSelected ? 3 : 2,
        });
      } else {
        const marker = L.circleMarker([v.lat, v.lng], {
          radius: isSelected ? 11 : 8,
          fillColor: color,
          color: isSelected ? '#FFFFFF' : '#1E1B2E',
          weight: isSelected ? 3 : 2,
          fillOpacity: 0.95,
        })
          .addTo(map)
          .on('click', () => onSelectVehicle(v.id));
        marker.bindTooltip(`${v.vehicleNumber} · ${v.speedKmh} km/h (${v.vehicleState})`, {
          direction: 'top',
        });
        markersRef.current.set(v.id, marker);
      }
    }

    const focus = vehicles.find((v) => v.id === selectedId);
    if (focus) {
      map.panTo([focus.lat, focus.lng], { animate: true });
      if (trailRef.current) {
        trailRef.current.remove();
        trailRef.current = null;
      }
      if (focus.routeTrail && focus.routeTrail.length > 1) {
        trailRef.current = L.polyline(focus.routeTrail, {
          color: '#00A88F',
          weight: 3,
          opacity: 0.85,
          dashArray: '6 6',
        }).addTo(map);
      }
    }
    map.invalidateSize();
  }, [vehicles, selectedId, onSelectVehicle]);

  return (
    <div
      ref={mapContainerRef}
      data-testid="turbotrack-live-map"
      className={`relative isolate w-full ${
        tall ? 'h-80 sm:h-[420px]' : 'h-72 sm:h-80'
      } rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 z-0`}
    />
  );
}

export function TurboTrackersCompanion({
  session,
  vehicles,
  dataScope,
  activeTab,
  focusedVehicleNumber,
  formStyle,
  stage,
  onChangeTab,
  onChangeFormStyle,
  onChangeStage,
  onOpenInstallModal,
  onLaunchWizard,
  onLockApp,
  onRotateRefreshToken,
  onSimulateTokenReuse,
  onSignOut,
}: {
  session: WizardAuthSession;
  vehicles: TurboTrackVehicle[];
  dataScope: string;
  activeTab: CompanionTab;
  focusedVehicleNumber?: string;
  formStyle: FormStyleMode;
  stage: CustomerStage;
  onChangeTab: (tab: CompanionTab) => void;
  onChangeFormStyle: (mode: FormStyleMode) => void;
  onChangeStage: (stage: CustomerStage) => void;
  onOpenInstallModal: () => void;
  onLaunchWizard: () => void;
  onLockApp: () => void;
  onRotateRefreshToken: () => Promise<string>;
  onSimulateTokenReuse: () => Promise<void>;
  onSignOut: () => void;
}) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    vehicles[0]?.id ?? null
  );
  const [dashboardFocusRto, setDashboardFocusRto] = useState<string | undefined>(
    focusedVehicleNumber
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Account tab state (Active Sessions, Security Log, Privacy Delete)
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [locationConsent, setLocationConsent] = useState(true);
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const role = session.user.role;
  const canLaunchAnyWizardStep = [
    'step_1',
    'step_2',
    'step_3',
    'step_4',
    'step_5',
    'step_6',
  ].some((k) => canRoleEditFeature(role, k));
  const canViewSecurityLog = canRoleAccessFeature(role, 'security_log');

  const isWeb = stage === 'web';
  const isIphone = stage === 'iphone';
  const isAndroid = stage === 'android';

  useEffect(() => {
    if (focusedVehicleNumber) {
      setDashboardFocusRto(focusedVehicleNumber);
      const found = vehicles.find((v) => v.vehicleNumber === focusedVehicleNumber);
      if (found) setSelectedVehicleId(found.id);
    } else if (!selectedVehicleId && vehicles.length > 0) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [focusedVehicleNumber, vehicles, selectedVehicleId]);

  useEffect(() => {
    if (activeTab !== 'Account') return;
    fetch('/api/wizard-auth/sessions', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {});

    if (canViewSecurityLog) {
      fetch('/api/wizard-auth/security-log', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
        .then((r) => (r.ok ? r.json() : { entries: [] }))
        .then((d) => setAuditEntries(d.entries || []))
        .catch(() => {});
    }
  }, [activeTab, session.accessToken, canViewSecurityLog]);

  const counts = useMemo(() => {
    return {
      move: vehicles.filter((v) => v.vehicleState === 'Move').length,
      start: vehicles.filter((v) => v.vehicleState === 'Start').length,
      stop: vehicles.filter((v) => v.vehicleState === 'Stop').length,
    };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.vehicleNumber.toLowerCase().includes(q) ||
        v.transporterName.toLowerCase().includes(q) ||
        v.vehicleState.toLowerCase().includes(q) ||
        (v.driverName || '').toLowerCase().includes(q) ||
        (v.driverPhone || '').toLowerCase().includes(q)
    );
  }, [vehicles, searchQuery]);

  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null;

  const handleLogoutOtherDevices = async () => {
    const res = await fetch('/api/wizard-auth/logout-other-devices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const data = await res.json();
    setAccountNotice(`Logged out ${data.revokedCount ?? 0} other device session(s).`);
  };

  const handlePrivacyDeleteRequest = async () => {
    const res = await fetch('/api/wizard-auth/privacy-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ reason: 'User initiated via Account Privacy screen' }),
    });
    const data = await res.json();
    setDeleteConfirmOpen(false);
    setAccountNotice(
      data.message
        ? `${data.message} (Ref: ${data.ticketId})`
        : 'Account deletion request submitted.'
    );
  };

  const tabs: Array<{ id: CompanionTab; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'Dashboard', icon: LayoutDashboard },
    { id: 'Map', icon: MapIcon },
    { id: 'Vehicles', icon: Car },
    { id: 'Account', icon: User },
  ];

  // Shared inner tab content rendered across Laptop/PC, Android, and iPhone shells
  const renderTabBody = () => (
    <div className={`${isWeb ? 'max-w-6xl' : 'max-w-3xl'} mx-auto space-y-5`}>
      {activeTab === 'Dashboard' && (
        <>
          {/* Instant RTO Search Bar + Live Tracking Map + Driver Phone + Full New Vehicle Details */}
          <RtoLiveTrackerCard
            vehicles={vehicles}
            accessToken={session.accessToken}
            stage={stage}
            focusedVehicleNumber={dashboardFocusRto}
            onSelectVehicleOnMap={(vehicleId) => {
              setSelectedVehicleId(vehicleId);
              onChangeTab('Map');
            }}
          />

          {/* Start / Stop / Move Summary Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-[#191524] rounded-2xl p-4 border border-slate-200 dark:border-white/10">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Move
              </div>
              <div className="text-2xl font-extrabold text-[#00A88F] mt-1 font-mono tabular-nums">
                {counts.move}
              </div>
            </div>
            <div className="bg-white dark:bg-[#191524] rounded-2xl p-4 border border-slate-200 dark:border-white/10">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Start
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono tabular-nums">
                {counts.start}
              </div>
            </div>
            <div className="bg-white dark:bg-[#191524] rounded-2xl p-4 border border-slate-200 dark:border-white/10">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Stop
              </div>
              <div className="text-2xl font-extrabold text-[#4B2166] dark:text-purple-300 mt-1 font-mono tabular-nums">
                {counts.stop}
              </div>
            </div>
          </div>

          {/* Quick Admin Wizard Launch Card */}
          <div className="bg-white dark:bg-[#191524] rounded-2xl p-4 border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                6-Step New Vehicle Onboarding Wizard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Register Transporter, GPS Device, Vehicle &amp; Driver Phone, Payment, and Owner details — immediately searchable by RTO number.
              </p>
            </div>
            {canLaunchAnyWizardStep ? (
              <button
                type="button"
                onClick={onLaunchWizard}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer ${
                  isIphone
                    ? 'bg-[#007AFF] hover:bg-[#0066D6]'
                    : 'bg-[#4B2166] hover:bg-[#5E2A7F]'
                }`}
              >
                Open Wizard (Step 1/6)
              </button>
            ) : (
              <LockedChip reason={`Locked for ${role}`} />
            )}
          </div>

          {/* Scoped Vehicles Preview */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Fleet ({vehicles.length})
            </h2>
            <div className={isWeb ? 'grid grid-cols-1 lg:grid-cols-2 gap-3.5' : 'space-y-3'}>
              {vehicles.map((v) => (
                <NineFieldTelemetryCard
                  key={v.id}
                  vehicle={v}
                  stage={stage}
                  onTrackOnDashboard={() => {
                    setDashboardFocusRto(v.vehicleNumber);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onFocusOnMap={() => {
                    setSelectedVehicleId(v.id);
                    onChangeTab('Map');
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'Map' && (
        <div className="space-y-4">
          <LivePinPointMap
            vehicles={vehicles}
            selectedId={selectedVehicle?.id ?? null}
            onSelectVehicle={setSelectedVehicleId}
            tall={isWeb}
          />

          {/* Vehicle switcher chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {vehicles.map((v) => {
              const active = v.id === selectedVehicle?.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap border cursor-pointer ${
                    active
                      ? isIphone
                        ? 'bg-[#007AFF] text-white border-[#007AFF]'
                        : 'bg-[#4B2166] text-white border-[#4B2166]'
                      : 'bg-white dark:bg-[#191524] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10'
                  }`}
                >
                  {v.vehicleNumber} ({v.vehicleState})
                </button>
              );
            })}
          </div>

          {selectedVehicle && (
            <NineFieldTelemetryCard
              vehicle={selectedVehicle}
              stage={stage}
              onTrackOnDashboard={() => {
                setDashboardFocusRto(selectedVehicle.vehicleNumber);
                onChangeTab('Dashboard');
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'Vehicles' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search RTO number, driver name/phone, transporter, or state..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-[#191524] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#4B2166]"
            />
          </div>

          <div className={isWeb ? 'grid grid-cols-1 lg:grid-cols-2 gap-3.5' : 'space-y-3'}>
            {filteredVehicles.map((v) => (
              <NineFieldTelemetryCard
                key={v.id}
                vehicle={v}
                stage={stage}
                onTrackOnDashboard={() => {
                  setDashboardFocusRto(v.vehicleNumber);
                  onChangeTab('Dashboard');
                }}
                onFocusOnMap={() => {
                  setSelectedVehicleId(v.id);
                  onChangeTab('Map');
                }}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Account' && (
        <div className="space-y-4">
          {accountNotice && (
            <div
              role="status"
              data-testid="account-notice-banner"
              className="p-3 rounded-xl bg-[#00A88F]/12 border border-[#00A88F]/30 text-xs font-medium text-[#007764] dark:text-teal-200 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{accountNotice}</span>
            </div>
          )}

          {/* Download & Install on Android, iPhone, Laptop / PC */}
          <div className="bg-white dark:bg-[#191524] rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Download &amp; Install App (3 Customer Stages)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Install natively on Android, iPhone (iOS), and Laptop / PC or copy direct customer links.
                </p>
              </div>
              <button
                type="button"
                data-testid="account-download-app-btn"
                onClick={onOpenInstallModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00A88F] hover:bg-[#00947D] text-white text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download App</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['android', 'iphone', 'web'] as CustomerStage[]).map((s) => {
                const active = stage === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onChangeStage(s)}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[#4B2166] bg-[#4B2166]/8 dark:bg-purple-500/20 text-[#4B2166] dark:text-purple-200'
                        : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="text-xs font-bold">{CUSTOMER_STAGE_SPECS[s].shortLabel}</div>
                    <div className="text-[10px] opacity-75 truncate">
                      {CUSTOMER_STAGE_SPECS[s].tagline}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile & Preferences */}
          <div className="bg-white dark:bg-[#191524] rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {session.user.displayName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  @{session.user.username} · {session.user.role} · Auto-logout: {session.user.inactiveTimeMinutes} min
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onLockApp}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock</span>
                </button>
                <button
                  type="button"
                  data-testid="account-sign-out-btn"
                  onClick={onSignOut}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Form Style Preference */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Form style
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Classic matches Part A screenshots; Smart adds Material 3 cards &amp; pinned Save bar.
                </div>
              </div>
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-white/10 p-0.5 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => onChangeFormStyle('classic')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    formStyle === 'classic'
                      ? 'bg-[#4B2166] text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Classic
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFormStyle('smart')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    formStyle === 'smart'
                      ? 'bg-[#4B2166] text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Smart
                </button>
              </div>
            </div>
          </div>

          {/* Token Rotation & Active Sessions (C2) */}
          <div className="bg-white dark:bg-[#191524] rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#4B2166] dark:text-purple-300" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Active Sessions &amp; Token Security
                </h3>
              </div>
              <button
                type="button"
                onClick={handleLogoutOtherDevices}
                className="text-xs font-semibold text-[#4B2166] dark:text-purple-300 underline cursor-pointer"
              >
                Log out other devices
              </button>
            </div>

            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.sessionId}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {s.deviceLabel}{' '}
                      {s.isCurrent && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-[#00A88F]/15 text-[#007B68] dark:text-teal-200 text-[10px]">
                          This device
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      ID: {s.deviceId}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Active now
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  const msg = await onRotateRefreshToken();
                  setAccountNotice(msg);
                }}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rotate Refresh Token</span>
              </button>
              <button
                type="button"
                onClick={onSimulateTokenReuse}
                className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 text-xs font-semibold text-rose-700 dark:text-rose-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Simulate Stolen Token Reuse</span>
              </button>
            </div>
          </div>

          {/* RBAC Permission Matrix Snapshot */}
          <div className="bg-white dark:bg-[#191524] rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4B2166] dark:text-purple-300" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Your Role Permissions ({role})
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(DEFAULT_PERMISSIONS_MATRIX.matrix).map(([k, cfg]) => {
                const right = getRolePermission(role, k);
                return (
                  <div
                    key={k}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between gap-1"
                  >
                    <span className="truncate text-slate-700 dark:text-slate-200">
                      {cfg.label}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-[10px] shrink-0 ${
                        right === 'Y'
                          ? 'bg-[#00A88F]/15 text-[#007B68] dark:text-teal-200'
                          : right === 'View-only'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                      }`}
                    >
                      {right}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security Log */}
          <div className="bg-white dark:bg-[#191524] rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#4B2166] dark:text-purple-300" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Security Log
                </h3>
              </div>
              {!canViewSecurityLog && <LockedChip reason={`Hidden for ${role}`} />}
            </div>
            {canViewSecurityLog ? (
              <div
                data-testid="security-log-list"
                className="space-y-2 max-h-56 overflow-y-auto"
              >
                {auditEntries.slice(0, 12).map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[11px] text-[#4B2166] dark:text-purple-300">
                        {entry.eventType}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      {entry.detail}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Security audit logs are restricted to Super Admin, Admin, and Transporter Admin roles.
              </p>
            )}
          </div>

          {/* Privacy & Data Deletion */}
          <div className="bg-white dark:bg-[#191524] rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Privacy &amp; Consent
            </h3>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-700 dark:text-slate-300">
                Vehicle location-sharing consent
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={locationConsent}
                onClick={() => setLocationConsent((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  locationConsent ? 'bg-[#00A88F]' : 'bg-slate-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    locationConsent ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPrivacyPolicyOpen(true)}
                className="text-xs font-semibold text-[#4B2166] dark:text-purple-300 underline cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                data-testid="privacy-delete-account-btn"
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete my data / account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      data-testid="turbotrack-companion"
      data-stage={stage}
      className={`min-h-[680px] flex flex-1 ${
        isWeb ? 'flex-col md:flex-row' : 'flex-col'
      } ${
        isIphone
          ? 'bg-[#F2F2F7] dark:bg-[#0D0D12]'
          : 'bg-[#F6F5FA] dark:bg-[#120F1B]'
      }`}
    >
      {/* STAGE 1: LAPTOP / PC DESKTOP SIDEBAR */}
      {isWeb && (
        <aside
          data-testid="laptop-web-sidebar"
          className="hidden md:flex md:w-64 shrink-0 flex-col bg-[#1B1028] text-white border-r border-white/10"
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00A88F] flex items-center justify-center shrink-0">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight truncate">
                  TurboTrackers Web
                </div>
                <div className="text-[11px] text-purple-200 truncate">
                  Laptop &amp; PC Portal
                </div>
              </div>
            </div>
          </div>

          <nav aria-label="Desktop navigation" className="flex-1 p-3 space-y-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`companion-tab-${t.id.toLowerCase()}`}
                  onClick={() => onChangeTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#4B2166] text-white shadow-xs'
                      : 'text-purple-100/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{t.id}</span>
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-white/10 space-y-2">
              {canLaunchAnyWizardStep ? (
                <button
                  type="button"
                  data-testid="companion-launch-wizard-btn"
                  onClick={onLaunchWizard}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#00A88F] hover:bg-[#00947D] text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Vehicle</span>
                </button>
              ) : (
                <div className="px-2">
                  <LockedChip reason="View-only" />
                </div>
              )}

              <button
                type="button"
                data-testid="sidebar-download-app-btn"
                onClick={onOpenInstallModal}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#00A88F]" />
                <span>Install on PC / Mobile</span>
              </button>
            </div>
          </nav>

          <div className="p-4 border-t border-white/10 text-xs">
            <div className="font-bold text-white truncate">
              {session.user.displayName}
            </div>
            <div className="text-[11px] text-purple-200 truncate">
              {role} · {dataScope}
            </div>
          </div>
        </aside>
      )}

      {/* MAIN SHELL COLUMN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR — Distinct per Stage */}
        {isWeb ? (
          <header className="h-14 px-5 bg-white dark:bg-[#191524] border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {activeTab === 'Dashboard'
                  ? 'Fleet Live Tracking Dashboard'
                  : `TurboTrackers · ${activeTab}`}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {session.user.displayName} ({role}) · {vehicles.length} vehicles active
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenInstallModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#00A88F]" />
                <span className="hidden sm:inline">Download App</span>
              </button>
              {canLaunchAnyWizardStep && (
                <button
                  type="button"
                  onClick={onLaunchWizard}
                  className="md:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#00A88F] text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Vehicle</span>
                </button>
              )}
            </div>
          </header>
        ) : isIphone ? (
          /* STAGE 2: iPHONE (iOS CUPERTINO) FROSTED HEADER */
          <header
            data-testid="iphone-cupertino-header"
            className="px-4 py-3 bg-white/90 dark:bg-[#191524]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 shrink-0 sticky top-0 z-20"
          >
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#007AFF]">
                iOS App · {role}
              </div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                {activeTab === 'Dashboard' ? 'Live Tracking' : activeTab}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenInstallModal}
                aria-label="Install iPhone App"
                className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-[#007AFF] cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              {canLaunchAnyWizardStep ? (
                <button
                  type="button"
                  data-testid="companion-launch-wizard-btn"
                  onClick={onLaunchWizard}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Vehicle</span>
                </button>
              ) : (
                <LockedChip reason="View-only" />
              )}
            </div>
          </header>
        ) : (
          /* STAGE 3: ANDROID MATERIAL 3 DEEP-PURPLE APP BAR */
          <header
            data-testid="android-m3-header"
            className="px-4 h-14 flex items-center justify-between gap-2 text-white shadow-sm shrink-0"
            style={{
              background: 'linear-gradient(90deg, #4B2166 0%, #240D36 65%, #12071C 100%)',
            }}
          >
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight truncate">
                TurboTrackers · {activeTab}
              </h1>
              <p className="text-[11px] text-purple-200 truncate">
                Android App · {session.user.displayName} ({role})
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenInstallModal}
                aria-label="Download Android App"
                className="p-2 rounded-xl bg-white/12 hover:bg-white/20 text-white cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              {canLaunchAnyWizardStep ? (
                <button
                  type="button"
                  data-testid="companion-launch-wizard-btn"
                  onClick={onLaunchWizard}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#00A88F] hover:bg-[#00947D] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Vehicle</span>
                </button>
              ) : (
                <LockedChip reason="View-only" />
              )}
            </div>
          </header>
        )}

        {/* SCROLLABLE BODY */}
        <div className={`flex-1 overflow-y-auto p-4 ${isWeb ? 'md:p-6 pb-20 md:pb-8' : 'pb-24'}`}>
          {renderTabBody()}
        </div>

        {/* BOTTOM NAVIGATION: Android Material 3 / iPhone Cupertino / Web narrow fallback */}
        {isIphone ? (
          <nav
            aria-label="iPhone tab bar"
            data-testid="turbotrack-bottom-nav"
            className="sticky bottom-0 z-20 bg-white/95 dark:bg-[#191524]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 pt-1.5 pb-2 px-2 shrink-0"
          >
            <div className="grid grid-cols-4">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`companion-tab-${t.id.toLowerCase()}`}
                    onClick={() => onChangeTab(t.id)}
                    className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? 'text-[#007AFF]'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{t.id}</span>
                  </button>
                );
              })}
            </div>
            {/* Authentic iOS Home Indicator */}
            <div className="mt-1.5 flex justify-center">
              <div className="w-28 h-1 rounded-full bg-slate-900/20 dark:bg-white/25" />
            </div>
          </nav>
        ) : (
          <nav
            aria-label="TurboTrackers navigation"
            data-testid="turbotrack-bottom-nav"
            className={`${
              isWeb ? 'md:hidden' : ''
            } sticky bottom-0 z-20 bg-white dark:bg-[#191524] border-t border-slate-200 dark:border-white/10 grid grid-cols-4 h-16 shrink-0`}
          >
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`companion-tab-${t.id.toLowerCase()}`}
                  onClick={() => onChangeTab(t.id)}
                  className={`flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'text-[#4B2166] dark:text-purple-300'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <span
                    className={`px-3 py-1 rounded-full ${
                      active
                        ? isAndroid
                          ? 'bg-[#4B2166]/15 dark:bg-purple-500/25'
                          : 'bg-[#4B2166]/12 dark:bg-purple-500/20'
                        : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span>{t.id}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Delete Account Confirmation */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm bg-white dark:bg-[#191524] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Delete my data / account
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              This submits a verified privacy deletion request, clears encrypted local drafts, and logs an audit entry for compliance review.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-privacy-delete-btn"
                onClick={handlePrivacyDeleteRequest}
                className="py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Sheet */}
      {privacyPolicyOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-white dark:bg-[#191524] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-white/10 space-y-3"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Privacy &amp; Telemetry Data Policy
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              We collect only the vehicle telemetry required for live tracking (GPS coordinates, exact address, speed, vehicle state, A/C status, fuel, odometer, battery voltage, and assigned driver contact). Sensitive identifiers (SIM, IMEI) are masked in summaries, passwords are never persisted in local drafts, and all authenticated saves are HMAC-signed over TLS.
            </p>
            <button
              type="button"
              onClick={() => setPrivacyPolicyOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#4B2166] text-white text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
