import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { jsPDF } from 'jspdf';
import {
  BatteryCharging,
  Bell,
  Compass,
  FileSpreadsheet,
  FileText,
  Flame,
  Fuel,
  Gauge,
  Globe,
  Headphones,
  History,
  KeyRound,
  Lock,
  MapPin,
  Megaphone,
  Navigation,
  Pause,
  Play,
  Plus,
  Route,
  Share2,
  ShieldAlert,
  Snowflake,
  Trash2,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import {
  buildNearbyAmenities,
  filterVehiclesBySearch,
  generateVehiclesCsvReport,
  summarizeFleetMetrics,
  type PlatformDevice,
  type PlatformVehicle,
} from '../../utils/unifiedPlatformLogic';
import { VehicleStatus } from '../VehicleStatus';
import type { RtoVehicleMetadata } from '../../utils/rtoRegistryDatabase';
import { PlatformLiveMap } from './PlatformLiveMap';
import { RoleAdaptiveDashboard } from './RoleAdaptiveDashboard';
import { RtoMetadataBanner } from './RtoMetadataBanner';
import type { PlatformActions, PlatformBootstrapData } from './platformTypes';

export interface PlatformRoleViewsProps {
  screenId: string;
  platform: PlatformDevice;
  data: PlatformBootstrapData;
  actions: PlatformActions;
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  searchQuery: string;
  onNavigateScreen: (screenId: string) => void;
  onSelectRtoVehicle?: (record: RtoVehicleMetadata) => void;
  activeRtoLookup?: RtoVehicleMetadata | null;
  onDismissRtoLookup?: () => void;
  compact?: boolean;
  isFullscreenMap?: boolean;
  onToggleFullscreenMap?: () => void;
}

function statusTextColor(status: PlatformVehicle['status']) {
  if (status === 'Running') return 'text-emerald-600 dark:text-emerald-400';
  if (status === 'Idle') return 'text-amber-600 dark:text-amber-400';
  if (status === 'Stationary') return 'text-sky-600 dark:text-sky-400';
  return 'text-slate-500 dark:text-slate-400';
}

function toVehicleStatusProp(v: PlatformVehicle) {
  return {
    label: v.vehicleNumber,
    subtitle: `${v.vehicleType} · ${v.deviceModel}`,
    status: (v.status === 'Running'
      ? 'Moving'
      : v.status === 'Offline'
      ? 'Offline'
      : 'Idle') as 'Moving' | 'Idle' | 'Alert' | 'Offline',
    speedKmh: v.speedKmh,
    headingDeg: v.headingDeg,
    latitude: v.lat,
    longitude: v.lng,
    ignitionOn: v.ignitionOn,
    fuelPercent: v.fuelPercent,
    fuelLiters: v.fuelLiters,
    tankCapacityLiters: v.tankCapacityLiters,
    driver: v.driverName,
    lastUpdated: v.lastUpdated,
    imei: v.imei,
    trailPointsCount: v.trail.length,
  };
}

export function PlatformRoleViews({
  screenId,
  platform,
  data,
  actions,
  selectedVehicleId,
  onSelectVehicle,
  searchQuery,
  onNavigateScreen,
  onSelectRtoVehicle,
  activeRtoLookup = null,
  onDismissRtoLookup,
  compact = false,
  isFullscreenMap = false,
  onToggleFullscreenMap,
}: PlatformRoleViewsProps) {
  const role = data.user.role;
  const filteredVehicles = useMemo(
    () => filterVehiclesBySearch(data.vehicles, searchQuery),
    [data.vehicles, searchQuery]
  );
  const selectedVehicle = useMemo(
    () =>
      filteredVehicles.find((v) => v.id === selectedVehicleId) ||
      data.vehicles.find((v) => v.id === selectedVehicleId) ||
      filteredVehicles[0] ||
      data.vehicles[0] ||
      null,
    [filteredVehicles, data.vehicles, selectedVehicleId]
  );

  const metrics = useMemo(() => summarizeFleetMetrics(data.vehicles), [data.vehicles]);
  const liveAmenities = useMemo(
    () =>
      selectedVehicle
        ? buildNearbyAmenities(selectedVehicle.lat, selectedVehicle.lng)
        : data.nearbyAmenities,
    [selectedVehicle, data.nearbyAmenities]
  );

  // Local form / filter states
  const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', company: '', adminId: 'admin-1' });
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    vehicleId: data.vehicles[0]?.id || '',
    canViewOdometer: true,
    canViewBattery: true,
    canViewAc: false,
    historyDaysLimit: 14,
  });
  const [deviceForm, setDeviceForm] = useState({
    imei: '',
    model: 'VS VST-PRO-4G-Pro',
    category: 'Wired',
    simNumber: '',
  });
  const [assignForm, setAssignForm] = useState({
    deviceId: data.devices[0]?.id || '',
    clientId: data.clients[0]?.id || '',
    vehicleNumber: '',
    vehicleType: '12-Wheeler Truck',
  });
  const [vtForm, setVtForm] = useState({
    name: '',
    category: 'Heavy Commercial',
    defaultSpeedLimitKmh: 75,
    defaultTankLiters: 250,
  });
  const [geofenceForm, setGeofenceForm] = useState({
    name: '',
    kind: 'Geofence',
    lat: selectedVehicle ? String(selectedVehicle.lat) : '13.3379',
    lng: selectedVehicle ? String(selectedVehicle.lng) : '77.1173',
    radiusMeters: 1200,
  });
  const [podForm, setPodForm] = useState({
    vehicleId: data.vehicles[0]?.id || '',
    consignmentNo: '',
    recipientName: '',
    location: '',
    signatureText: '',
    photoLabel: 'Signed LR & Unloading Photo',
    photoDataUrl: '',
    notes: '',
  });
  const [rulesForm, setRulesForm] = useState(data.alertRules);
  const [annForm, setAnnForm] = useState({ title: '', body: '' });
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '', priority: 'Normal' });

  // Catalog & table filters
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('All');
  const [amenityFilter, setAmenityFilter] = useState<'All' | 'Fuel Pump' | 'Hospital' | 'Garage'>('All');
  const [reportFilterClient, setReportFilterClient] = useState('All');
  const [reportRange, setReportRange] = useState<'daily' | '30d' | '180d'>('daily');
  const [reportSortBy, setReportSortBy] = useState<'vehicleNumber' | 'distanceTodayKm' | 'overspeedCount' | 'fuelPercent'>('distanceTodayKm');

  // Playback state
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [playbackIdx, setPlaybackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeTrips = selectedVehicle?.trips || [];
  const activeTrip = activeTrips.find((t) => t.id === selectedTripId) || activeTrips[0] || null;
  const maxPlaybackIdx = Math.max(0, (activeTrip?.points.length || 1) - 1);

  const handleTogglePlayback = () => {
    if (!activeTrip || activeTrip.points.length < 2) return;
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    let step = playbackIdx >= maxPlaybackIdx ? 0 : playbackIdx;
    const timer = window.setInterval(() => {
      step += 1;
      if (step > maxPlaybackIdx) {
        window.clearInterval(timer);
        setIsPlaying(false);
      } else {
        setPlaybackIdx(step);
      }
    }, 900);
  };

  const handlePodPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPodForm((p) => ({ ...p, photoDataUrl: reader.result as string, photoLabel: file.name }));
      }
    };
    reader.readAsDataURL(file);
  };

  const exportCsv = (vehiclesToExport: PlatformVehicle[]) => {
    const csv = generateVehiclesCsvReport(vehiclesToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vstrackpro-${role}-${reportRange}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    actions.notify(`Exported ${vehiclesToExport.length} vehicle rows to CSV (Excel).`, 'success');
  };

  const exportPdf = (vehiclesToExport: PlatformVehicle[]) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(15);
    doc.text(`VS TrackPro Fleet Report (${reportRange.toUpperCase()})`, 36, 42);
    doc.setFontSize(9);
    doc.text(
      `Generated for: ${data.user.name} (${role.replace('_', ' ').toUpperCase()}) · ${new Date().toLocaleString('en-IN')}`,
      36,
      58
    );
    let y = 84;
    doc.setFontSize(8.5);
    doc.text('Vehicle', 36, y);
    doc.text('Type', 120, y);
    doc.text('Status', 245, y);
    doc.text('Speed', 305, y);
    doc.text('Today km', 355, y);
    doc.text('Odometer', 415, y);
    doc.text('Batt / AC', 485, y);
    doc.text('Fuel', 555, y);
    doc.text('Overspeed / Stop', 600, y);
    doc.text('Location', 690, y);
    y += 14;
    for (const v of vehiclesToExport.slice(0, 28)) {
      doc.text(v.vehicleNumber, 36, y);
      doc.text(v.vehicleType.slice(0, 22), 120, y);
      doc.text(v.status, 245, y);
      doc.text(`${v.speedKmh} km/h`, 305, y);
      doc.text(`${v.distanceTodayKm}`, 355, y);
      doc.text(v.odometerKm !== null ? `${Math.round(v.odometerKm)}` : 'Restricted', 415, y);
      const batt = v.batteryVoltage !== null ? `${v.batteryVoltage}V` : '—';
      const ac = v.acOn === null ? '—' : v.acOn ? 'ON' : 'OFF';
      doc.text(`${batt} / ${ac}`, 485, y);
      doc.text(`${v.fuelPercent}%`, 555, y);
      doc.text(`${v.overspeedCount} / ${v.overstoppageCount}`, 600, y);
      doc.text(v.address.slice(0, 30), 690, y);
      y += 15;
    }
    doc.save(`vstrackpro-${role}-${reportRange}-report.pdf`);
    actions.notify(`Downloaded PDF fleet report (${vehiclesToExport.length} vehicles).`, 'success');
  };

  // Shared card class
  const cardCls =
    'rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1834] p-4';
  const inputCls =
    'w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500';
  const btnPrimary =
    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00D4FF] text-[#0A1128] font-semibold text-xs px-3.5 py-2 hover:bg-[#33DDFF] transition-colors cursor-pointer';
  const btnGhost =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 font-medium text-xs px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer';

  // =========================================================================
  // 1. ROLE-ADAPTIVE DASHBOARD (SUPER ADMIN / ADMIN / CLIENT / CUSTOMER HOME)
  // =========================================================================
  if (screenId === 'dashboard' || (role === 'customer' && screenId === 'home')) {
    return (
      <RoleAdaptiveDashboard
        data={data}
        filteredVehicles={filteredVehicles}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={onSelectVehicle}
        onNavigateScreen={onNavigateScreen}
        onSelectRtoVehicle={onSelectRtoVehicle}
        onExportCsv={exportCsv}
        actions={actions}
        platform={platform}
        compact={compact}
        isFullscreenMap={isFullscreenMap}
        onToggleFullscreenMap={onToggleFullscreenMap}
      />
    );
  }

  // =========================================================================
  // 2. LIVE MAP / HOME / LIVE TRACKING (SPLIT VIEW ON LAPTOP, MAP-FIRST ON MOBILE)
  // =========================================================================
  if (screenId === 'live-map' || screenId === 'home' || screenId === 'live-tracking') {
    return (
      <div className="space-y-3" data-testid="platform-live-tracking-view">
        {activeRtoLookup && onDismissRtoLookup && (
          <RtoMetadataBanner
            record={activeRtoLookup}
            onDismiss={onDismissRtoLookup}
            compact={compact}
          />
        )}
        <div
          className={`grid gap-3 ${
            compact || isFullscreenMap ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-12'
          }`}
        >
          {/* Left Vehicle Selector List (Laptop Split View) */}
          {!compact && !isFullscreenMap && (
            <div className="xl:col-span-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1834] p-3 flex flex-col max-h-[600px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Vehicles ({filteredVehicles.length})
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  {metrics.running} running
                </span>
              </div>
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
                {filteredVehicles.map((v) => {
                  const active = v.id === selectedVehicle?.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onSelectVehicle(v.id)}
                      className={`w-full text-left rounded-lg border p-2.5 transition-colors cursor-pointer ${
                        active
                          ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-500/15 dark:border-[#00D4FF]'
                          : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {v.vehicleNumber}
                        </span>
                        <span className={`text-[11px] font-semibold ${statusTextColor(v.status)}`}>
                          {v.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {v.vehicleType} · {v.speedKmh} km/h
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {v.address}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Center Interactive Map */}
          <div className={compact || isFullscreenMap ? '' : 'xl:col-span-6'}>
            <PlatformLiveMap
              vehicles={filteredVehicles}
              selectedVehicleId={selectedVehicle?.id || null}
              onSelectVehicle={onSelectVehicle}
              geofences={data.geofences}
              showGeofences
              showPlannedRoute
              platform={platform}
              heightClass={
                isFullscreenMap ? 'h-[78vh]' : compact ? 'h-[290px]' : 'h-[600px]'
              }
              isFullscreen={isFullscreenMap}
              onToggleFullscreen={onToggleFullscreenMap}
            />
          </div>

          {/* Right Live Telemetry Inspector (myFleetvigilPro + VehicleStatus) */}
          {!isFullscreenMap && selectedVehicle && (
            <div className={`${compact ? '' : 'xl:col-span-3'} space-y-3`}>
              <VehicleStatus
                {...toVehicleStatusProp(selectedVehicle)}
                variant="dashboard"
                compact
              />
              <div className={cardCls}>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF]" />
                  <span>Pin-Point Telemetry</span>
                </h4>
                <dl className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] p-2">
                    <dt className="text-slate-500">Latitude / Lng</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                      {selectedVehicle.lat.toFixed(4)}, {selectedVehicle.lng.toFixed(4)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] p-2">
                    <dt className="text-slate-500">Speed / Limit</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                      {selectedVehicle.speedKmh} / {selectedVehicle.speedLimitKmh} km/h
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] p-2">
                    <dt className="text-slate-500">Odometer</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                      {selectedVehicle.odometerKm !== null
                        ? `${selectedVehicle.odometerKm.toLocaleString()} km`
                        : 'Restricted'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] p-2">
                    <dt className="text-slate-500">Battery Voltage</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                      {selectedVehicle.batteryVoltage !== null
                        ? `${selectedVehicle.batteryVoltage} V`
                        : 'Restricted'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] p-2">
                    <dt className="text-slate-500">A/C Status</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedVehicle.acOn === null
                        ? 'Restricted'
                        : selectedVehicle.acOn
                        ? 'A/C ON'
                        : 'A/C OFF'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] p-2">
                    <dt className="text-slate-500">Overspeed / Stops</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                      {selectedVehicle.overspeedCount} / {selectedVehicle.overstoppageCount}
                    </dd>
                  </div>
                </dl>
                <p className="mt-2.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedVehicle.address}
                </p>
                {compact && data.vehicles.length > 1 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-white/10">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                      Switch Tracked Vehicle
                    </label>
                    <select
                      value={selectedVehicle.id}
                      onChange={(e) => onSelectVehicle(e.target.value)}
                      className={`${inputCls} mt-1`}
                    >
                      {data.vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vehicleNumber} · {v.status} ({v.speedKmh} km/h)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. VEHICLE DETAILS (CLIENT) & VEHICLE INFO (CUSTOMER WITH PERMISSION GATES)
  // =========================================================================
  if (screenId === 'vehicle-details' || screenId === 'vehicle-info' || screenId === 'vehicles') {
    if (screenId === 'vehicles') {
      return (
        <div className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                All Platform Vehicles ({filteredVehicles.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time global telemetry across all admins & clients
              </p>
            </div>
            <button type="button" onClick={() => exportCsv(filteredVehicles)} className={btnGhost}>
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-[11px] text-slate-500">
                  <th className="py-2 pr-3">Vehicle / IMEI</th>
                  <th className="py-2 pr-3">Type & Device</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Speed</th>
                  <th className="py-2 pr-3">Odometer</th>
                  <th className="py-2 pr-3">Battery / A/C</th>
                  <th className="py-2 pr-3">Fuel</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredVehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2.5 pr-3">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{v.vehicleNumber}</div>
                      <div className="text-[10px] font-mono text-slate-500">{v.imei}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="text-slate-800 dark:text-slate-200">{v.vehicleType}</div>
                      <div className="text-[10px] text-slate-500">{v.deviceModel}</div>
                    </td>
                    <td className={`py-2.5 pr-3 font-semibold ${statusTextColor(v.status)}`}>{v.status}</td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">{v.speedKmh} km/h</td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">{v.odometerKm?.toLocaleString()} km</td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">
                      {v.batteryVoltage}V · {v.acOn ? 'ON' : 'OFF'}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">{v.fuelPercent}%</td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectVehicle(v.id);
                          onNavigateScreen('live-map');
                        }}
                        className="text-cyan-600 dark:text-[#00D4FF] font-semibold hover:underline cursor-pointer"
                      >
                        Track
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (!selectedVehicle) {
      return (
        <div className={cardCls}>
          <p className="text-xs text-slate-500">No vehicles available in your account scope.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold font-mono text-slate-900 dark:text-white">
              {selectedVehicle.vehicleNumber} · {selectedVehicle.nickname}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedVehicle.vehicleType} · Driver: {selectedVehicle.driverName} ({selectedVehicle.driverPhone})
            </p>
          </div>
          {data.vehicles.length > 1 && (
            <select
              value={selectedVehicle.id}
              onChange={(e) => onSelectVehicle(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0F1834] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
            >
              {data.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber} ({v.status})
                </option>
              ))}
            </select>
          )}
        </div>

        <VehicleStatus
          {...toVehicleStatusProp(selectedVehicle)}
          variant="dashboard"
          compact={compact}
        />

        <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
          <div className={cardCls}>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF]" />
              <span>Coordinates</span>
            </div>
            <div className="mt-1.5 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
              {selectedVehicle.lat.toFixed(5)}, {selectedVehicle.lng.toFixed(5)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Heading {selectedVehicle.headingDeg}°</div>
          </div>

          <div className={cardCls}>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Gauge className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF]" />
              <span>Odometer Reading</span>
            </div>
            <div className="mt-1.5 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
              {selectedVehicle.odometerKm !== null ? (
                `${selectedVehicle.odometerKm.toLocaleString()} km`
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-sans">
                  <Lock className="w-3.5 h-3.5" /> Restricted by Fleet Owner
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Today: {selectedVehicle.distanceTodayKm} km
            </div>
          </div>

          <div className={cardCls}>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <BatteryCharging className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF]" />
              <span>Vehicle Battery Voltage</span>
            </div>
            <div className="mt-1.5 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
              {selectedVehicle.batteryVoltage !== null ? (
                `${selectedVehicle.batteryVoltage} V`
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-sans">
                  <Lock className="w-3.5 h-3.5" /> Restricted by Fleet Owner
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Ignition {selectedVehicle.ignitionOn ? 'ON' : 'OFF'}
            </div>
          </div>

          <div className={cardCls}>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Snowflake className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF]" />
              <span>A/C Compressor Status</span>
            </div>
            <div className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
              {selectedVehicle.acOn !== null ? (
                selectedVehicle.acOn ? 'A/C ON (Cooling Active)' : 'A/C OFF'
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
                  <Lock className="w-3.5 h-3.5" /> Restricted by Fleet Owner
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Fuel {selectedVehicle.fuelPercent}% ({selectedVehicle.fuelLiters}L / {selectedVehicle.tankCapacityLiters}L)
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1">Live Street Address</div>
          <p className="text-xs text-slate-600 dark:text-slate-300">{selectedVehicle.address}</p>
          <div className="mt-2 text-[11px] text-slate-500">
            Hardware: {selectedVehicle.deviceModel} ({selectedVehicle.deviceProtocol}) · IMEI {selectedVehicle.imei}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. HISTORY & 6-MONTH ROUTE PLAYBACK (CLIENT & CUSTOMER)
  // =========================================================================
  if (screenId === 'history' || screenId === 'trip-history') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <History className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
              <span>
                {role === 'customer'
                  ? `Shared Trip History (${data.user.permissions?.historyDaysLimit || 14}-Day Window)`
                  : '6-Month Route History & Interactive Map Playback'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scrub through recorded GNSS breadcrumb points and inspect trip fuel & speed metrics
            </p>
          </div>
          {data.vehicles.length > 1 && (
            <select
              value={selectedVehicle?.id || ''}
              onChange={(e) => {
                onSelectVehicle(e.target.value);
                setSelectedTripId('');
                setPlaybackIdx(0);
              }}
              className="rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0F1834] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
            >
              {data.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber} ({v.trips.length} trips)
                </option>
              ))}
            </select>
          )}
        </div>

        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
          <div className={`${compact ? '' : 'lg:col-span-8'} space-y-3`}>
            <PlatformLiveMap
              vehicles={selectedVehicle ? [selectedVehicle] : []}
              selectedVehicleId={selectedVehicle?.id || null}
              onSelectVehicle={onSelectVehicle}
              playbackPoints={activeTrip?.points || []}
              playbackIndex={Math.min(playbackIdx, maxPlaybackIdx)}
              platform={platform}
              heightClass={compact ? 'h-[240px]' : 'h-[360px]'}
            />
            {activeTrip && (
              <div className={`${cardCls} flex flex-wrap items-center gap-3`}>
                <button type="button" onClick={handleTogglePlayback} className={btnPrimary}>
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play Route'}</span>
                </button>
                <input
                  type="range"
                  min={0}
                  max={maxPlaybackIdx}
                  value={Math.min(playbackIdx, maxPlaybackIdx)}
                  onChange={(e) => setPlaybackIdx(Number(e.target.value))}
                  aria-label="Playback timeline scrubber"
                  className="flex-1 accent-cyan-500"
                />
                <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  Waypoint {Math.min(playbackIdx, maxPlaybackIdx) + 1}/{activeTrip.points.length}
                </span>
              </div>
            )}
          </div>

          <div className={`${compact ? '' : 'lg:col-span-4'} ${cardCls} space-y-2.5`}>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
              Recorded Trips (Up to 6 Months)
            </h4>
            {activeTrips.length === 0 ? (
              <p className="text-xs text-slate-500">No archived trips for this vehicle yet.</p>
            ) : (
              activeTrips.map((t) => {
                const chosen = activeTrip?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTripId(t.id);
                      setPlaybackIdx(0);
                      setIsPlaying(false);
                    }}
                    className={`w-full text-left rounded-lg border p-2.5 text-xs transition-colors cursor-pointer ${
                      chosen
                        ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-500/15 dark:border-[#00D4FF]'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                      <span>{t.date}</span>
                      <span className="font-mono tabular-nums text-cyan-700 dark:text-[#00D4FF]">
                        {t.distanceKm} km
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                      {t.startLocation} → {t.endLocation}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono tabular-nums">
                      Max {t.maxSpeedKmh} km/h · Avg {t.avgSpeedKmh} km/h · {t.fuelConsumedLiters}L fuel
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. GEOFENCES & POI (ADMIN TEMPLATES & CLIENT)
  // =========================================================================
  if (screenId === 'geofences') {
    const submitGeofence = async (e: FormEvent) => {
      e.preventDefault();
      const res = await actions.apiPost('/api/platform/geofences', {
        ...geofenceForm,
        lat: Number(geofenceForm.lat),
        lng: Number(geofenceForm.lng),
        radiusMeters: Number(geofenceForm.radiusMeters),
        assignedVehicleIds: selectedVehicle ? [selectedVehicle.id] : [],
      });
      if (res.ok) {
        setGeofenceForm((f) => ({ ...f, name: '' }));
        actions.notify('Geofence / POI saved and synced to live alerts.', 'success');
      }
    };

    return (
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        <div className={`${compact ? '' : 'lg:col-span-7'} space-y-3`}>
          <PlatformLiveMap
            vehicles={filteredVehicles}
            selectedVehicleId={selectedVehicle?.id || null}
            onSelectVehicle={onSelectVehicle}
            geofences={data.geofences}
            showGeofences
            platform={platform}
            heightClass={compact ? 'h-[230px]' : 'h-[360px]'}
          />
          <div className={cardCls}>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
              Active Geofences & POIs ({data.geofences.length})
            </h4>
            <div className="space-y-2">
              {data.geofences.map((gf) => (
                <div
                  key={gf.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-white/10 p-2.5 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {gf.name} <span className="text-[10px] font-mono text-cyan-600 dark:text-[#00D4FF]">· {gf.kind}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {gf.lat.toFixed(4)}, {gf.lng.toFixed(4)} · Radius {gf.radiusMeters}m
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase">
                    {gf.ownerRole}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={submitGeofence} className={`${compact ? '' : 'lg:col-span-5'} ${cardCls} space-y-3 h-fit`}>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
            <span>{role === 'admin' ? 'Create Geofence / POI Template' : 'Add Geofence or POI'}</span>
          </h4>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Zone Name</label>
            <input
              required
              value={geofenceForm.name}
              onChange={(e) => setGeofenceForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Peenya Warehouse Gate 2"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Type</label>
              <select
                value={geofenceForm.kind}
                onChange={(e) => setGeofenceForm((f) => ({ ...f, kind: e.target.value }))}
                className={inputCls}
              >
                <option value="Geofence">Geofence Boundary</option>
                <option value="POI">Point of Interest (POI)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Radius (m)</label>
              <input
                type="number"
                min={100}
                max={25000}
                value={geofenceForm.radiusMeters}
                onChange={(e) => setGeofenceForm((f) => ({ ...f, radiusMeters: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Latitude</label>
              <input
                value={geofenceForm.lat}
                onChange={(e) => setGeofenceForm((f) => ({ ...f, lat: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Longitude</label>
              <input
                value={geofenceForm.lng}
                onChange={(e) => setGeofenceForm((f) => ({ ...f, lng: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          <button type="submit" className={`${btnPrimary} w-full`}>
            Save Geofence / POI
          </button>
        </form>
      </div>
    );
  }

  // =========================================================================
  // 6. ROUTE DEVIATION (CLIENT)
  // =========================================================================
  if (screenId === 'route-deviation') {
    const deviated = data.vehicles.filter((v) => v.routeDeviated);
    return (
      <div className="space-y-4">
        <div className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Route className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
                <span>Planned Corridors & Route Deviation Monitor</span>
              </h3>
              <p className="text-xs text-slate-500">
                Dashed indigo line = approved highway corridor · Solid cyan line = actual live GPS path · Threshold {data.alertRules.routeDeviationMeters}m
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
              {deviated.length} Active Deviation{deviated.length === 1 ? '' : 's'}
            </span>
          </div>
          <PlatformLiveMap
            vehicles={filteredVehicles}
            selectedVehicleId={selectedVehicle?.id || null}
            onSelectVehicle={onSelectVehicle}
            showPlannedRoute
            platform={platform}
            heightClass={compact ? 'h-[240px]' : 'h-[360px]'}
          />
        </div>

        <div className={cardCls}>
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">Corridor Compliance Status</h4>
          <div className="space-y-2">
            {data.vehicles.map((v) => (
              <div
                key={v.id}
                onClick={() => onSelectVehicle(v.id)}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-white/10 p-2.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{v.vehicleNumber}</span>
                  <span className="text-slate-500 ml-2">{v.address}</span>
                </div>
                <span
                  className={`font-semibold ${
                    v.routeDeviated
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {v.routeDeviated ? 'Off-Route Alert' : 'On Planned Route'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 7. FUEL MONITORING (CLIENT)
  // =========================================================================
  if (screenId === 'fuel') {
    const allFuelEvents = data.vehicles.flatMap((v) =>
      v.fuelEvents.map((fe) => ({ ...fe, vehicleNumber: v.vehicleNumber }))
    );
    return (
      <div className="space-y-4">
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
          {data.vehicles.map((v) => {
            const low = v.fuelPercent <= 25;
            return (
              <div key={v.id} className={cardCls}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {v.vehicleNumber}
                  </span>
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      low ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {v.fuelPercent}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full ${low ? 'bg-rose-500' : 'bg-cyan-500'}`}
                    style={{ width: `${v.fuelPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                  <span>{v.fuelLiters}L / {v.tankCapacityLiters}L</span>
                  <span>{v.vehicleType}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={cardCls}>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1.5">
            <Fuel className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
            <span>Refuel & Sudden Fuel Drop Audit Log</span>
          </h4>
          <div className="space-y-2">
            {allFuelEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-white/10 p-2.5 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{ev.vehicleNumber}</span>
                  <span
                    className={`ml-2 font-semibold ${
                      ev.type === 'Drop' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {ev.type === 'Drop' ? `-${ev.liters}L Pilferage Drop` : `+${ev.liters}L Refuel`}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5">{ev.location} · {ev.timestamp}</div>
                </div>
                {ev.type === 'Drop' && <Flame className="w-4 h-4 text-rose-500 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 8. OVERSPEED & OVERSTOPPAGE (CLIENT)
  // =========================================================================
  if (screenId === 'violations') {
    const overspeeds = data.vehicles.flatMap((v) =>
      v.overspeedEvents.map((e) => ({ ...e, vehicleNumber: v.vehicleNumber }))
    );
    const overstops = data.vehicles.flatMap((v) =>
      v.overstoppageEvents.map((e) => ({ ...e, vehicleNumber: v.vehicleNumber }))
    );
    return (
      <div className="space-y-4">
        <PlatformLiveMap
          vehicles={filteredVehicles}
          selectedVehicleId={selectedVehicle?.id || null}
          onSelectVehicle={onSelectVehicle}
          showViolations
          platform={platform}
          heightClass={compact ? 'h-[230px]' : 'h-[320px]'}
        />
        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          <div className={cardCls}>
            <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">
              Overspeed Incidents ({metrics.overspeedCount})
            </h4>
            <div className="space-y-2">
              {overspeeds.map((e) => (
                <div key={e.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{e.vehicleNumber}</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {e.speedKmh} km/h (Limit {e.limitKmh})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {e.location} · {e.lat.toFixed(4)}, {e.lng.toFixed(4)} · {e.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cardCls}>
            <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
              Overstoppage Incidents ({metrics.overstoppageCount})
            </h4>
            <div className="space-y-2">
              {overstops.map((e) => (
                <div key={e.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{e.vehicleNumber}</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {e.durationMins} mins stopped
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {e.location} · {e.lat.toFixed(4)}, {e.lng.toFixed(4)} · {e.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 9. ALERTS, GLOBAL ALERT SETTINGS & CUSTOMER NOTIFICATIONS
  // =========================================================================
  if (screenId === 'alerts' || screenId === 'alerts-settings' || screenId === 'notifications') {
    const saveRules = async (e: FormEvent) => {
      e.preventDefault();
      const res = await actions.apiPatch('/api/platform/alert-rules', rulesForm as unknown as Record<string, unknown>);
      if (res.ok) actions.notify('Alert thresholds saved across live telemetry monitors.', 'success');
    };

    return (
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        <div className={`${role === 'customer' || compact ? '' : 'lg:col-span-7'} ${cardCls}`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
            <span>Live Alerts & Notifications ({data.alerts.length})</span>
          </h3>
          <div className="space-y-2">
            {data.alerts.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 dark:border-white/10 p-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{a.vehicleNumber}</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{a.type}</span>
                    <span className="text-[10px] text-slate-500">{a.timestamp}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">{a.message}</p>
                  <div className="text-[10px] text-slate-500 mt-0.5">{a.location}</div>
                </div>
                {!a.acknowledged ? (
                  <button
                    type="button"
                    onClick={() => actions.apiPatch(`/api/platform/alerts/${a.id}/ack`, {})}
                    className={btnGhost}
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Acknowledged
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {role !== 'customer' && (
          <form onSubmit={saveRules} className={`${compact ? '' : 'lg:col-span-5'} ${cardCls} space-y-3 h-fit`}>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
              <span>{role === 'super_admin' ? 'Global Alert Rule Engine' : 'Custom Alert Rules'}</span>
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Overspeed Limit (km/h)</label>
                <input
                  type="number"
                  value={rulesForm.overspeedLimitKmh}
                  onChange={(e) => setRulesForm((r) => ({ ...r, overspeedLimitKmh: Number(e.target.value) }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Overstoppage (mins)</label>
                <input
                  type="number"
                  value={rulesForm.overstoppageMinutes}
                  onChange={(e) => setRulesForm((r) => ({ ...r, overstoppageMinutes: Number(e.target.value) }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Route Deviation (m)</label>
                <input
                  type="number"
                  value={rulesForm.routeDeviationMeters}
                  onChange={(e) => setRulesForm((r) => ({ ...r, routeDeviationMeters: Number(e.target.value) }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Fuel Drop Alert (L)</label>
                <input
                  type="number"
                  value={rulesForm.fuelDropThresholdLiters}
                  onChange={(e) => setRulesForm((r) => ({ ...r, fuelDropThresholdLiters: Number(e.target.value) }))}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Custom Rule Note</label>
              <input
                value={rulesForm.customRuleNote}
                onChange={(e) => setRulesForm((r) => ({ ...r, customRuleNote: e.target.value }))}
                className={inputCls}
              />
            </div>
            <button type="submit" className={`${btnPrimary} w-full`}>
              Save Alert Rules
            </button>
          </form>
        )}
      </div>
    );
  }

  // =========================================================================
  // 10. MULTIPLE PODS (CLIENT CAPTURE + CUSTOMER READ-ONLY VIEW)
  // =========================================================================
  if (screenId === 'pods') {
    const submitPod = async (e: FormEvent) => {
      e.preventDefault();
      const res = await actions.apiPost('/api/platform/pods', {
        ...podForm,
        vehicleId: podForm.vehicleId || data.vehicles[0]?.id,
      });
      if (res.ok) {
        setPodForm((p) => ({ ...p, consignmentNo: '', recipientName: '', signatureText: '', notes: '', photoDataUrl: '' }));
        actions.notify('Proof of Delivery (POD) recorded with GPS & signature.', 'success');
      }
    };

    return (
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        <div className={`${role === 'customer' || compact ? '' : 'lg:col-span-7'} space-y-3`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Verified Proof of Delivery Ledger ({data.pods.length})
          </h3>
          {data.pods.map((p) => (
            <div key={p.id} className={cardCls}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-cyan-700 dark:text-[#00D4FF]">
                    {p.consignmentNo}
                  </span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                    {p.vehicleNumber}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">{p.timestamp}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px]">Recipient: </span>
                  <span className="font-medium text-slate-900 dark:text-white">{p.recipientName}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Digital Signature: </span>
                  <span className="font-serif italic text-slate-900 dark:text-white">{p.signatureText}</span>
                </div>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                {p.location} ({p.lat.toFixed(4)}, {p.lng.toFixed(4)})
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Attachment: {p.photoLabel} · {p.notes}
              </div>
              {p.photoDataUrl && (
                <img
                  src={p.photoDataUrl}
                  alt={p.photoLabel}
                  className="mt-2.5 h-28 w-auto rounded-lg border border-slate-200 dark:border-white/10 object-cover"
                />
              )}
            </div>
          ))}
        </div>

        {role !== 'customer' && (
          <form onSubmit={submitPod} className={`${compact ? '' : 'lg:col-span-5'} ${cardCls} space-y-2.5 h-fit`}>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Capture New POD</h4>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Vehicle</label>
              <select
                value={podForm.vehicleId || data.vehicles[0]?.id || ''}
                onChange={(e) => setPodForm((p) => ({ ...p, vehicleId: e.target.value }))}
                className={inputCls}
              >
                {data.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Consignment / LR #</label>
                <input
                  required
                  value={podForm.consignmentNo}
                  onChange={(e) => setPodForm((p) => ({ ...p, consignmentNo: e.target.value }))}
                  placeholder="LR-2026-9105"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Recipient Name</label>
                <input
                  required
                  value={podForm.recipientName}
                  onChange={(e) => setPodForm((p) => ({ ...p, recipientName: e.target.value }))}
                  placeholder="R. Deshmukh"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Signature Name / Stamp</label>
              <input
                required
                value={podForm.signatureText}
                onChange={(e) => setPodForm((p) => ({ ...p, signatureText: e.target.value }))}
                placeholder="Signed: R. Deshmukh (Bay 4)"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Delivery Photo (optional)</label>
              <input type="file" accept="image/*" onChange={handlePodPhotoChange} className="text-xs text-slate-500" />
            </div>
            <button type="submit" className={`${btnPrimary} w-full`}>
              Record Delivery Proof
            </button>
          </form>
        )}
      </div>
    );
  }

  // =========================================================================
  // 11. NEARBY AMENITIES & NAVIGATION (CLIENT & CUSTOMER)
  // =========================================================================
  if (screenId === 'amenities') {
    const shown = liveAmenities.filter((a) => amenityFilter === 'All' || a.category === amenityFilter);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {(['All', 'Fuel Pump', 'Hospital', 'Garage'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setAmenityFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  amenityFilter === cat
                    ? 'bg-[#00D4FF] text-[#0A1128] font-semibold'
                    : 'bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {selectedVehicle && (
            <span className="text-xs text-slate-500">
              Near <strong className="font-mono text-slate-900 dark:text-white">{selectedVehicle.vehicleNumber}</strong>
            </span>
          )}
        </div>

        <PlatformLiveMap
          vehicles={selectedVehicle ? [selectedVehicle] : filteredVehicles}
          selectedVehicleId={selectedVehicle?.id || null}
          onSelectVehicle={onSelectVehicle}
          amenities={shown}
          showAmenities
          platform={platform}
          heightClass={compact ? 'h-[230px]' : 'h-[320px]'}
        />

        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {shown.map((a) => (
            <div key={a.id} className={`${cardCls} flex items-center justify-between gap-3`}>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">{a.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {a.category} · {a.distanceKm} km away · {a.open24x7 ? 'Open 24×7' : 'Day Hours'}
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">{a.phone}</div>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className={btnPrimary}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Navigate</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 12. REPORTS & EXPORT (DAILY / 6-MONTH / CUSTOM CSV + PDF)
  // =========================================================================
  if (screenId === 'reports') {
    const reportRows = [...filteredVehicles]
      .filter((v) => reportFilterClient === 'All' || v.clientId === reportFilterClient)
      .sort((a, b) => {
        if (reportSortBy === 'vehicleNumber') return a.vehicleNumber.localeCompare(b.vehicleNumber);
        return (b[reportSortBy] as number) - (a[reportSortBy] as number);
      });

    return (
      <div className="space-y-4">
        <div className={`${cardCls} flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex flex-wrap items-center gap-2">
            {([
              ['daily', 'Daily Report'],
              ['30d', '30-Day Summary'],
              ['180d', '6-Month History'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setReportRange(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  reportRange === key
                    ? 'bg-[#00D4FF] text-[#0A1128]'
                    : 'border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
            {data.clients.length > 0 && (
              <select
                value={reportFilterClient}
                onChange={(e) => setReportFilterClient(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="All">All Clients</option>
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.company}</option>
                ))}
              </select>
            )}
            <select
              value={reportSortBy}
              onChange={(e) => setReportSortBy(e.target.value as typeof reportSortBy)}
              className="rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="distanceTodayKm">Sort: Distance</option>
              <option value="overspeedCount">Sort: Overspeeds</option>
              <option value="fuelPercent">Sort: Fuel Level</option>
              <option value="vehicleNumber">Sort: Vehicle No.</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => exportCsv(reportRows)} className={btnGhost}>
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel (CSV)</span>
            </button>
            <button type="button" onClick={() => exportPdf(reportRows)} className={btnPrimary}>
              <FileText className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        <div className={`${cardCls} overflow-x-auto`}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-[11px] text-slate-500">
                <th className="py-2 pr-3">Vehicle</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Distance ({reportRange})</th>
                <th className="py-2 pr-3">Odometer</th>
                <th className="py-2 pr-3">Battery / A/C</th>
                <th className="py-2 pr-3">Fuel</th>
                <th className="py-2">Overspeed / Stops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {reportRows.map((v) => {
                const mult = reportRange === 'daily' ? 1 : reportRange === '30d' ? 24 : 138;
                return (
                  <tr key={v.id}>
                    <td className="py-2.5 pr-3 font-mono font-semibold text-slate-900 dark:text-white">
                      {v.vehicleNumber}
                    </td>
                    <td className={`py-2.5 pr-3 font-semibold ${statusTextColor(v.status)}`}>{v.status}</td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">
                      {Math.round(v.distanceTodayKm * mult).toLocaleString()} km
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">
                      {v.odometerKm !== null ? `${v.odometerKm.toLocaleString()} km` : 'Restricted'}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">
                      {v.batteryVoltage ?? '—'}V · {v.acOn ? 'ON' : 'OFF'}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">{v.fuelPercent}%</td>
                    <td className="py-2.5 font-mono tabular-nums">
                      {v.overspeedCount} / {v.overstoppageCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 13. ADMIN MANAGEMENT (SUPER ADMIN)
  // =========================================================================
  if (screenId === 'admins') {
    const addAdmin = async (e: FormEvent) => {
      e.preventDefault();
      const res = await actions.apiPost('/api/platform/admins', adminForm);
      if (res.ok) {
        setAdminForm({ name: '', email: '', phone: '', company: '' });
        actions.notify('Regional Admin account created (Password@123).', 'success');
      }
    };

    return (
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        <div className={`${compact ? '' : 'lg:col-span-7'} ${cardCls} space-y-2.5`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Regional Admins ({data.admins.length})
          </h3>
          {data.admins.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-white/10 p-3 text-xs"
            >
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {a.name} · <span className="text-slate-500 font-normal">{a.company}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {a.email} · {a.phone}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-semibold ${
                    a.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {a.status}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    actions.apiPatch(`/api/platform/admins/${a.id}`, {
                      status: a.status === 'Active' ? 'Blocked' : 'Active',
                    })
                  }
                  className={btnGhost}
                >
                  {a.status === 'Active' ? 'Block' : 'Unblock'}
                </button>
                <button
                  type="button"
                  onClick={() => actions.apiDelete(`/api/platform/admins/${a.id}`)}
                  aria-label={`Delete ${a.name}`}
                  className="p-1.5 rounded-lg border border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={addAdmin} className={`${compact ? '' : 'lg:col-span-5'} ${cardCls} space-y-2.5 h-fit`}>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
            <span>Add New Regional Admin</span>
          </h4>
          <input required placeholder="Full Name" value={adminForm.name} onChange={(e) => setAdminForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          <input required type="email" placeholder="Work Email" value={adminForm.email} onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
          <input required placeholder="Phone (+91...)" value={adminForm.phone} onChange={(e) => setAdminForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
          <input placeholder="Region / Company Name" value={adminForm.company} onChange={(e) => setAdminForm((f) => ({ ...f, company: e.target.value }))} className={inputCls} />
          <button type="submit" className={`${btnPrimary} w-full`}>Create Admin Account</button>
        </form>
      </div>
    );
  }

  // =========================================================================
  // 14. ALL CLIENTS & CUSTOMERS (SUPER ADMIN) / CLIENT MANAGEMENT (ADMIN)
  // =========================================================================
  if (screenId === 'accounts' || screenId === 'clients') {
    const addClient = async (e: FormEvent) => {
      e.preventDefault();
      const res = await actions.apiPost('/api/platform/clients', clientForm);
      if (res.ok) {
        setClientForm({ name: '', email: '', phone: '', company: '', adminId: 'admin-1' });
        actions.notify('Client fleet account created.', 'success');
      }
    };

    return (
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        <div className={`${compact ? '' : 'lg:col-span-7'} space-y-4`}>
          <div className={cardCls}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
              Client Fleet Accounts ({data.clients.length})
            </h3>
            <div className="space-y-2">
              {data.clients.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-white/10 p-2.5 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {c.company} · <span className="font-normal text-slate-500">{c.name}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">{c.email} · {c.phone}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={c.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-500 font-semibold'}>
                      {c.status}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        actions.apiPatch(`/api/platform/clients/${c.id}`, {
                          status: c.status === 'Active' ? 'Blocked' : 'Active',
                        })
                      }
                      className={btnGhost}
                    >
                      {c.status === 'Active' ? 'Block' : 'Unblock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cardCls}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
              Linked End-Customers ({data.customers.length})
            </h3>
            <div className="space-y-2">
              {data.customers.map((cu) => (
                <div key={cu.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-2.5 text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">{cu.name} · {cu.company}</div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {cu.email} · Shared Vehicles: {cu.sharedVehicleIds?.length || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={addClient} className={`${compact ? '' : 'lg:col-span-5'} ${cardCls} space-y-2.5 h-fit`}>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Onboard New Client</h4>
          <input required placeholder="Fleet Owner Name" value={clientForm.name} onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          <input required placeholder="Transport Company" value={clientForm.company} onChange={(e) => setClientForm((f) => ({ ...f, company: e.target.value }))} className={inputCls} />
          <input required type="email" placeholder="Client Email" value={clientForm.email} onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
          <input required placeholder="Mobile Number" value={clientForm.phone} onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
          <button type="submit" className={`${btnPrimary} w-full`}>Add Client</button>
        </form>
      </div>
    );
  }

  // =========================================================================
  // 15. CUSTOMERS & VEHICLE SHARING PERMISSIONS (CLIENT)
  // =========================================================================
  if (screenId === 'customers') {
    const addCustomer = async (e: FormEvent) => {
      e.preventDefault();
      const res = await actions.apiPost('/api/platform/customers', {
        name: customerForm.name,
        email: customerForm.email,
        phone: customerForm.phone,
        company: customerForm.company,
        sharedVehicleIds: customerForm.vehicleId ? [customerForm.vehicleId] : [],
        permissions: {
          canViewOdometer: customerForm.canViewOdometer,
          canViewBattery: customerForm.canViewBattery,
          canViewAc: customerForm.canViewAc,
          historyDaysLimit: customerForm.historyDaysLimit,
        },
      });
      if (res.ok) {
        setCustomerForm((f) => ({ ...f, name: '', email: '', phone: '', company: '' }));
        actions.notify('Customer added with vehicle sharing permissions.', 'success');
      }
    };

    const togglePerm = async (
      cu: PlatformBootstrapData['customers'][number],
      field: 'canViewOdometer' | 'canViewBattery' | 'canViewAc'
    ) => {
      const next = {
        canViewOdometer: cu.permissions?.canViewOdometer ?? true,
        canViewBattery: cu.permissions?.canViewBattery ?? true,
        canViewAc: cu.permissions?.canViewAc ?? false,
        historyDaysLimit: cu.permissions?.historyDaysLimit ?? 14,
        [field]: !(cu.permissions?.[field] ?? false),
      };
      const res = await actions.apiPatch(`/api/platform/customers/${cu.id}/permissions`, next);
      if (res.ok) actions.notify(`Updated ${cu.name}'s telemetry permissions.`, 'success');
    };

    return (
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        <div className={`${compact ? '' : 'lg:col-span-7'} ${cardCls} space-y-3`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
            <span>Shared Customers & Telemetry Visibility Controls</span>
          </h3>
          {data.customers.map((cu) => (
            <div key={cu.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{cu.name} · {cu.company}</div>
                  <div className="text-[11px] font-mono text-slate-500">{cu.email} · {cu.sharedVehicleIds?.length || 0} shared vehicle(s)</div>
                </div>
                <span className="text-[11px] font-mono text-cyan-600 dark:text-[#00D4FF]">
                  {cu.permissions?.historyDaysLimit || 14}d history
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {([
                  ['canViewOdometer', 'Odometer'],
                  ['canViewBattery', 'Battery Voltage'],
                  ['canViewAc', 'A/C Status'],
                ] as const).map(([key, label]) => {
                  const enabled = Boolean(cu.permissions?.[key]);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => togglePerm(cu, key)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${
                        enabled
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-300 dark:border-white/15 text-slate-500'
                      }`}
                    >
                      {label}: {enabled ? 'Visible' : 'Hidden'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={addCustomer} className={`${compact ? '' : 'lg:col-span-5'} ${cardCls} space-y-2.5 h-fit`}>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Share Vehicle with Customer</h4>
          <input required placeholder="Customer Name" value={customerForm.name} onChange={(e) => setCustomerForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          <input required placeholder="Consignee Company" value={customerForm.company} onChange={(e) => setCustomerForm((f) => ({ ...f, company: e.target.value }))} className={inputCls} />
          <input required type="email" placeholder="Customer Email" value={customerForm.email} onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
          <input required placeholder="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Select Vehicle to Share</label>
            <select
              value={customerForm.vehicleId}
              onChange={(e) => setCustomerForm((f) => ({ ...f, vehicleId: e.target.value }))}
              className={inputCls}
            >
              {data.vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.vehicleNumber} · {v.vehicleType}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-700 dark:text-slate-300 pt-1">
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={customerForm.canViewOdometer} onChange={(e) => setCustomerForm((f) => ({ ...f, canViewOdometer: e.target.checked }))} />
              Odometer
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={customerForm.canViewBattery} onChange={(e) => setCustomerForm((f) => ({ ...f, canViewBattery: e.target.checked }))} />
              Battery
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={customerForm.canViewAc} onChange={(e) => setCustomerForm((f) => ({ ...f, canViewAc: e.target.checked }))} />
              A/C
            </label>
          </div>
          <button type="submit" className={`${btnPrimary} w-full`}>Add & Share Vehicle</button>
        </form>
      </div>
    );
  }

  // =========================================================================
  // 16. DEVICE MANAGEMENT (250+ CATALOG) & VEHICLE/DEVICE ASSIGNMENT (ADMIN)
  // =========================================================================
  if (screenId === 'devices' || screenId === 'assignment') {
    const addDevice = async (e: FormEvent) => {
      e.preventDefault();
      const res = await actions.apiPost('/api/platform/devices', deviceForm);
      if (res.ok) {
        setDeviceForm({ imei: '', model: 'VS VST-PRO-4G-Pro', category: 'Wired', simNumber: '' });
        actions.notify('GPS device registered in live inventory.', 'success');
      }
    };

    const assignDevice = async (e: FormEvent) => {
      e.preventDefault();
      const res = await actions.apiPost('/api/platform/assign', assignForm);
      if (res.ok) {
        setAssignForm((f) => ({ ...f, vehicleNumber: '' }));
        actions.notify('GPS device assigned and vehicle activated on live map!', 'success');
      }
    };

    const filteredCatalog = data.deviceCatalog.filter(
      (d) =>
        (catalogCategory === 'All' || d.category === catalogCategory) &&
        (!catalogSearch ||
          `${d.brand} ${d.model} ${d.protocol}`.toLowerCase().includes(catalogSearch.toLowerCase()))
    );

    return (
      <div className="space-y-4">
        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
          <div className={`${compact ? '' : 'lg:col-span-7'} ${cardCls}`}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
              Provisioned GPS Hardware ({data.devices.length})
            </h3>
            <div className="space-y-2">
              {data.devices.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-white/10 p-2.5 text-xs">
                  <div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{d.imei}</div>
                    <div className="text-[11px] text-slate-500">{d.model} · {d.category} · {d.assignedVehicleNumber || 'Unassigned inventory'}</div>
                  </div>
                  <span className={d.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {screenId === 'assignment' ? (
            <form onSubmit={assignDevice} className={`${compact ? '' : 'lg:col-span-5'} ${cardCls} space-y-2.5 h-fit`}>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Assign GPS Device to Client Vehicle</h4>
              <select value={assignForm.deviceId} onChange={(e) => setAssignForm((f) => ({ ...f, deviceId: e.target.value }))} className={inputCls}>
                {data.devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.imei} ({d.model} · {d.status})</option>
                ))}
              </select>
              <select value={assignForm.clientId} onChange={(e) => setAssignForm((f) => ({ ...f, clientId: e.target.value }))} className={inputCls}>
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.company} ({c.name})</option>
                ))}
              </select>
              <input required placeholder="Vehicle Registration (e.g. KA-04-MN-8821)" value={assignForm.vehicleNumber} onChange={(e) => setAssignForm((f) => ({ ...f, vehicleNumber: e.target.value }))} className={inputCls} />
              <select value={assignForm.vehicleType} onChange={(e) => setAssignForm((f) => ({ ...f, vehicleType: e.target.value }))} className={inputCls}>
                {data.vehicleTypes.slice(0, 40).map((vt) => (
                  <option key={vt.id} value={vt.name}>{vt.name}</option>
                ))}
              </select>
              <button type="submit" className={`${btnPrimary} w-full`}>Assign & Activate Tracking</button>
            </form>
          ) : (
            <form onSubmit={addDevice} className={`${compact ? '' : 'lg:col-span-5'} ${cardCls} space-y-2.5 h-fit`}>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Register New GPS Device</h4>
              <input required maxLength={15} placeholder="15-digit IMEI (e.g. 864209051299444)" value={deviceForm.imei} onChange={(e) => setDeviceForm((f) => ({ ...f, imei: e.target.value }))} className={inputCls} />
              <select value={deviceForm.category} onChange={(e) => setDeviceForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                <option value="Wired">Wired GPS Tracker</option>
                <option value="OBD">OBD Plug & Play</option>
                <option value="Non-Wired">Non-Wired / Magnetic</option>
                <option value="Fuel Sensor">Capacitive Fuel Sensor</option>
                <option value="AI Dashcam">4G AI Dashcam</option>
              </select>
              <input placeholder="Device Model" value={deviceForm.model} onChange={(e) => setDeviceForm((f) => ({ ...f, model: e.target.value }))} className={inputCls} />
              <button type="submit" className={`${btnPrimary} w-full`}>Add Device to Registry</button>
            </form>
          )}
        </div>

        {/* 250+ Supported GPS Devices Catalog */}
        <div className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Supported GPS Hardware Directory ({data.deviceCatalogCount}+ Models)
              </h4>
              <p className="text-xs text-slate-500">OBD, wired, non-wired magnetic, fuel probes & 4G AI dashcams</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search brand, model or protocol..."
                className="rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <select
                value={catalogCategory}
                onChange={(e) => setCatalogCategory(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="All">All Categories</option>
                <option value="OBD">OBD</option>
                <option value="Wired">Wired</option>
                <option value="Non-Wired">Non-Wired</option>
                <option value="Fuel Sensor">Fuel Sensor</option>
                <option value="AI Dashcam">AI Dashcam</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto">
            {filteredCatalog.slice(0, 60).map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-2 text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">{m.brand} {m.model}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {m.category} · {m.protocol} · {m.voltageRange} {m.ais140Certified ? '· AIS-140' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 17. VEHICLE TYPES (150+ CATALOG — SUPER ADMIN)
  // =========================================================================
  if (screenId === 'vehicle-types') {
    const addType = async (e: FormEvent) => {
      e.preventDefault();
      const res = await actions.apiPost('/api/platform/vehicle-types', vtForm);
      if (res.ok) {
        setVtForm((f) => ({ ...f, name: '' }));
        actions.notify('Added custom vehicle/equipment type to catalog.', 'success');
      }
    };
    const filteredTypes = data.vehicleTypes.filter(
      (t) =>
        (catalogCategory === 'All' || t.category === catalogCategory) &&
        (!catalogSearch || t.name.toLowerCase().includes(catalogSearch.toLowerCase()))
    );

    return (
      <div className="space-y-4">
        <form onSubmit={addType} className={`${cardCls} grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end`}>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-slate-500 mb-1">Add Custom Vehicle / Heavy Equipment Type</label>
            <input required placeholder="e.g. Electric Refuse Loader" value={vtForm.name} onChange={(e) => setVtForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Category</label>
            <select value={vtForm.category} onChange={(e) => setVtForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
              <option value="Heavy Commercial">Heavy Commercial</option>
              <option value="Passenger & Taxi">Passenger & Taxi</option>
              <option value="Two & Three Wheeler">Two & Three Wheeler</option>
              <option value="Construction & Earthmover">Construction & Earthmover</option>
              <option value="Agriculture & Equipment">Agriculture & Equipment</option>
              <option value="Cold Chain & Specialized">Cold Chain & Specialized</option>
            </select>
          </div>
          <button type="submit" className={btnPrimary}>Add Type</button>
        </form>

        <div className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Vehicle & Equipment Catalog ({data.vehicleTypesCount} Supported Types)
            </h3>
            <div className="flex items-center gap-2">
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search e-rickshaw, excavator, truck..."
                className="rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto">
            {filteredTypes.slice(0, 90).map((vt) => (
              <div key={vt.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-2.5 text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{vt.name}</div>
                  <div className="text-[11px] text-slate-500">{vt.category}</div>
                </div>
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {vt.defaultSpeedLimitKmh} km/h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 18. API INTEGRATIONS (100+ — SUPER ADMIN)
  // =========================================================================
  if (screenId === 'api-integrations') {
    const filteredApis = data.apiIntegrations.filter(
      (a) =>
        (catalogCategory === 'All' || a.category === catalogCategory) &&
        (!catalogSearch || a.name.toLowerCase().includes(catalogSearch.toLowerCase()))
    );
    const connectedCount = data.apiIntegrations.filter((a) => a.status === 'Connected').length;

    return (
      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
              <span>API Integrations Hub ({data.apiIntegrationsCount} Connectors · {connectedCount} Connected)</span>
            </h3>
            <p className="text-xs text-slate-500">ERP, FASTag, ULIP, VAHAN AIS-140, WhatsApp Business & Fuel Cards</p>
          </div>
          <input
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder="Search SAP, FASTag, VAHAN, Tally..."
            className="rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto">
          {filteredApis.slice(0, 60).map((api) => (
            <div key={api.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-3 text-xs flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white truncate">{api.name}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {api.category} · <span className="font-mono">{api.apiKeyMask}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => actions.apiPost(`/api/platform/api-keys/${api.id}/toggle`, {})}
                className={api.status === 'Connected' ? btnGhost : btnPrimary}
              >
                {api.status === 'Connected' ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 19. ANNOUNCEMENTS (SUPER ADMIN & ADMIN)
  // =========================================================================
  if (screenId === 'announcements') {
    const sendAnn = async (e: FormEvent) => {
      e.preventDefault();
      const res = await actions.apiPost('/api/platform/announcements', annForm);
      if (res.ok) {
        setAnnForm({ title: '', body: '' });
        actions.notify('Announcement broadcast pushed in real time.', 'success');
      }
    };

    return (
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        <div className={`${compact ? '' : 'lg:col-span-7'} ${cardCls} space-y-2.5`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
            <span>Broadcast Announcements ({data.announcements.length})</span>
          </h3>
          {data.announcements.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">{a.title}</span>
                <span className="text-[10px] text-slate-500">{a.createdAt}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mt-1">{a.body}</p>
              <div className="text-[10px] text-cyan-700 dark:text-[#00D4FF] mt-1.5">
                {a.senderName} · Audience: {a.audience}
              </div>
            </div>
          ))}
        </div>

        {(role === 'super_admin' || role === 'admin') && (
          <form onSubmit={sendAnn} className={`${compact ? '' : 'lg:col-span-5'} ${cardCls} space-y-2.5 h-fit`}>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Send Broadcast to {role === 'super_admin' ? 'All Users' : 'My Clients & Customers'}
            </h4>
            <input required placeholder="Announcement Headline" value={annForm.title} onChange={(e) => setAnnForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} />
            <textarea required rows={3} placeholder="Message details..." value={annForm.body} onChange={(e) => setAnnForm((f) => ({ ...f, body: e.target.value }))} className={inputCls} />
            <button type="submit" className={`${btnPrimary} w-full`}>Broadcast Now</button>
          </form>
        )}
      </div>
    );
  }

  // =========================================================================
  // 20. 24x7 SUPPORT DESK (+ ANNOUNCEMENTS FOR CLIENT)
  // =========================================================================
  if (screenId === 'support') {
    const createTicket = async (e: FormEvent) => {
      e.preventDefault();
      const res = await actions.apiPost('/api/platform/tickets', ticketForm);
      if (res.ok) {
        setTicketForm({ subject: '', message: '', priority: 'Normal' });
        actions.notify('24×7 Support ticket created.', 'success');
      }
    };

    return (
      <div className="space-y-4">
        {role === 'client' && data.announcements.length > 0 && (
          <div className={cardCls}>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
              Latest Platform Announcements
            </h4>
            <div className="space-y-2">
              {data.announcements.slice(0, 2).map((a) => (
                <div key={a.id} className="rounded-lg bg-slate-50 dark:bg-[#0A1128] p-2.5 text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">{a.title}</div>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
          <div className={`${compact ? '' : 'lg:col-span-7'} ${cardCls} space-y-2.5`}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
              <span>24×7 Technical Support Tickets ({data.tickets.length})</span>
            </h3>
            {data.tickets.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-3 text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">{t.subject}</span>
                  <span
                    className={`font-semibold text-[11px] ${
                      t.status === 'Resolved'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : t.status === 'Escalated to Super Admin'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{t.message}</p>
                <div className="text-[10px] text-slate-500">
                  By {t.createdByName} ({t.createdByRole.replace('_', ' ')}) · {t.createdAt}
                </div>
                {t.reply && (
                  <div className="rounded bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                    Reply: {t.reply}
                  </div>
                )}
                {(role === 'admin' || role === 'super_admin') && t.status !== 'Resolved' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {role === 'admin' && t.status !== 'Escalated to Super Admin' && (
                      <button
                        type="button"
                        onClick={() =>
                          actions.apiPatch(`/api/platform/tickets/${t.id}`, {
                            status: 'Escalated to Super Admin',
                          })
                        }
                        className={btnGhost}
                      >
                        Escalate to Super Admin
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        actions.apiPatch(`/api/platform/tickets/${t.id}`, {
                          status: 'Resolved',
                          reply: 'Resolved by 24×7 NOC engineering desk.',
                        })
                      }
                      className={btnPrimary}
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={createTicket} className={`${compact ? '' : 'lg:col-span-5'} ${cardCls} space-y-2.5 h-fit`}>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Raise 24×7 Support Ticket</h4>
            <input required placeholder="Issue Subject" value={ticketForm.subject} onChange={(e) => setTicketForm((f) => ({ ...f, subject: e.target.value }))} className={inputCls} />
            <textarea required rows={3} placeholder="Describe vehicle IMEI or tracking question..." value={ticketForm.message} onChange={(e) => setTicketForm((f) => ({ ...f, message: e.target.value }))} className={inputCls} />
            <select value={ticketForm.priority} onChange={(e) => setTicketForm((f) => ({ ...f, priority: e.target.value }))} className={inputCls}>
              <option value="Normal">Normal Priority</option>
              <option value="High">High Priority (Urgent)</option>
            </select>
            <button type="submit" className={`${btnPrimary} w-full`}>Submit to 24×7 NOC</button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 21. SETTINGS & PROFILE (ALL ROLES)
  // =========================================================================
  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
          <UserCheck className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
          <span>Account & Access Profile</span>
        </h3>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1.5">
            <dt className="text-slate-500">Name</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">{data.user.name}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1.5">
            <dt className="text-slate-500">Portal Role</dt>
            <dd className="font-mono font-semibold text-cyan-700 dark:text-[#00D4FF] uppercase">
              {data.user.role.replace('_', ' ')}
            </dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1.5">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">{data.user.email}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1.5">
            <dt className="text-slate-500">Organization</dt>
            <dd className="text-slate-800 dark:text-slate-200">{data.user.company}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Security</dt>
            <dd className="text-emerald-600 dark:text-emerald-400 font-semibold">HTTPS · OTP · Biometric Ready</dd>
          </div>
        </dl>
        <button type="button" onClick={actions.logout} className={`${btnGhost} mt-4 w-full`}>
          Sign Out of {data.user.role.replace('_', ' ')} Portal
        </button>
      </div>

      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
          <Globe className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF]" />
          <span>PAN India Cloud & 99.9% Uptime SLA</span>
        </h3>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1.5">
            <dt className="text-slate-500">Measured Uptime</dt>
            <dd className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {data.uptimeStats.uptimePercent}% SLA
            </dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1.5">
            <dt className="text-slate-500">Active Region</dt>
            <dd className="text-slate-800 dark:text-slate-200">{data.uptimeStats.region}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1.5">
            <dt className="text-slate-500">Telemetry Stream</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">
              Socket.io · every {data.uptimeStats.telemetryIntervalSec}s
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Support Desk</dt>
            <dd className="text-slate-800 dark:text-slate-200">{data.uptimeStats.supportSla}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
