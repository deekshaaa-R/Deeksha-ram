import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertCircle,
  BatteryCharging,
  Building2,
  Car,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Cpu,
  CreditCard,
  Crosshair,
  ExternalLink,
  Fuel,
  Gauge,
  MapPin,
  Navigation,
  Phone,
  Search,
  Share2,
  Snowflake,
  User,
  X,
} from 'lucide-react';
import {
  findVehicleByRtoNumber,
  validateIndianRtoInput,
  type CustomerStage,
  type LiveTrackVehicleRecord,
  type RtoSegmentStatus,
} from '../../utils/rtoLookup';

type ProfileSectionTab = 'vehicle' | 'owner' | 'device' | 'transporter' | 'payment';

function EmbeddedVehicleLiveMap({
  vehicle,
  isMobileStage,
  onOpenFullMap,
}: {
  vehicle: LiveTrackVehicleRecord;
  isMobileStage?: boolean;
  onOpenFullMap?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const pulseRingRef = useRef<L.CircleMarker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [vehicle.lat, vehicle.lng],
      zoom: 14,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      pulseRingRef.current = null;
      trailRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pos: [number, number] = [vehicle.lat, vehicle.lng];
    const color =
      vehicle.vehicleState === 'Move'
        ? '#00A88F'
        : vehicle.vehicleState === 'Start'
        ? '#D97706'
        : '#4B2166';

    if (pulseRingRef.current) {
      pulseRingRef.current.setLatLng(pos);
      pulseRingRef.current.setStyle({ color, fillColor: color });
    } else {
      pulseRingRef.current = L.circleMarker(pos, {
        radius: 18,
        color,
        fillColor: color,
        weight: 1.5,
        fillOpacity: 0.16,
      }).addTo(map);
    }

    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
      markerRef.current.setStyle({ fillColor: color });
      markerRef.current.setTooltipContent(
        `${vehicle.vehicleNumber} · ${vehicle.speedKmh} km/h · ${vehicle.exactLocation.landmark}`
      );
    } else {
      markerRef.current = L.circleMarker(pos, {
        radius: 9,
        fillColor: color,
        color: '#FFFFFF',
        weight: 3,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(
          `${vehicle.vehicleNumber} · ${vehicle.speedKmh} km/h · ${vehicle.exactLocation.landmark}`,
          { direction: 'top' }
        );
    }

    const trailPoints =
      vehicle.routeTrail && vehicle.routeTrail.length > 0 ? vehicle.routeTrail : [pos];
    if (trailRef.current) {
      trailRef.current.setLatLngs(trailPoints);
      trailRef.current.setStyle({ color });
    } else {
      trailRef.current = L.polyline(trailPoints, {
        color,
        weight: 4,
        opacity: 0.78,
      }).addTo(map);
    }

    map.panTo(pos, { animate: true });
    window.setTimeout(() => map.invalidateSize(), 120);
  }, [vehicle]);

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView([vehicle.lat, vehicle.lng], 15, { animate: true });
    }
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${vehicle.lat},${vehicle.lng}`;

  return (
    <div className="relative isolate rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#120F1B]">
      <div
        ref={containerRef}
        data-testid="rto-live-map"
        className={`w-full ${isMobileStage ? 'h-56' : 'h-64 sm:h-72 lg:h-80'} z-0`}
      />
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleRecenter}
          aria-label="Recenter map on vehicle"
          className="px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-[#191524]/95 text-slate-800 dark:text-white border border-slate-200 dark:border-white/15 text-xs font-semibold shadow-sm inline-flex items-center gap-1 cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Recenter</span>
        </button>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-lg bg-[#4B2166] text-white text-xs font-semibold shadow-sm inline-flex items-center gap-1"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Google Maps</span>
        </a>
        {onOpenFullMap && !isMobileStage && (
          <button
            type="button"
            onClick={onOpenFullMap}
            className="hidden sm:inline-flex px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-[#191524]/95 text-slate-800 dark:text-white border border-slate-200 dark:border-white/15 text-xs font-semibold shadow-sm items-center gap-1 cursor-pointer"
          >
            <span>Full Map</span>
          </button>
        )}
      </div>
    </div>
  );
}

function ProfileFieldRow({ label, value }: { label: string; value?: string | number | null }) {
  const display =
    value !== undefined && value !== null && String(value).trim() !== ''
      ? String(value)
      : '—';
  return (
    <div className="py-2 flex items-baseline justify-between gap-4 border-b border-slate-100 dark:border-white/5 last:border-b-0 text-xs">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="font-medium text-slate-900 dark:text-white text-right break-words">
        {display}
      </span>
    </div>
  );
}

export function RtoLiveTrackerCard({
  vehicles,
  accessToken,
  stage,
  focusedVehicleNumber,
  onSelectVehicleOnMap,
}: {
  vehicles: LiveTrackVehicleRecord[];
  accessToken: string;
  stage: CustomerStage;
  focusedVehicleNumber?: string;
  onSelectVehicleOnMap: (vehicleId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [trackedVehicleId, setTrackedVehicleId] = useState<string | null>(
    vehicles[0]?.id ?? null
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [profileTab, setProfileTab] = useState<ProfileSectionTab>('vehicle');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const rtoValidation = useMemo(() => validateIndianRtoInput(query), [query]);
  const canSearch = !lookupBusy && rtoValidation.isValid;

  useEffect(() => {
    if (focusedVehicleNumber) {
      const matched = findVehicleByRtoNumber(vehicles, focusedVehicleNumber).exactMatch;
      if (matched) {
        setTrackedVehicleId(matched.id);
        return;
      }
    }
    if (!trackedVehicleId && vehicles.length > 0) {
      setTrackedVehicleId(vehicles[0].id);
    }
  }, [vehicles, trackedVehicleId, focusedVehicleNumber]);

  // Keep tracked vehicle synced with live 4-second polling updates
  const activeVehicle = useMemo(() => {
    if (!trackedVehicleId) return vehicles[0] || null;
    return vehicles.find((v) => v.id === trackedVehicleId) || vehicles[0] || null;
  }, [vehicles, trackedVehicleId]);

  const liveSuggestions = useMemo(() => {
    return findVehicleByRtoNumber(vehicles, query).suggestions;
  }, [vehicles, query]);

  const handleRtoSearch = async (e?: React.FormEvent, overrideRto?: string) => {
    if (e) e.preventDefault();
    const raw = (overrideRto ?? query).trim();
    const check = validateIndianRtoInput(raw);

    if (!check.isValid) {
      setSubmitAttempted(true);
      setLookupError(
        raw
          ? check.message
          : 'Enter a valid Indian RTO number (e.g., KA-01-AB-1234) before searching.'
      );
      return;
    }

    const canonicalRto = check.formattedValue || raw.toUpperCase();
    setSubmitAttempted(false);
    setLookupError(null);
    setLookupBusy(true);

    // 1. Instant local match for immediate zero-latency UX
    const localResult = findVehicleByRtoNumber(vehicles, canonicalRto);
    if (localResult.exactMatch) {
      setTrackedVehicleId(localResult.exactMatch.id);
      setQuery(localResult.exactMatch.vehicleNumber);
      setLookupBusy(false);
      return;
    }

    // 2. Authoritative backend RTO lookup (catches newly added vehicles immediately)
    try {
      const res = await fetch(
        `/api/wizard/vehicle-lookup?rto=${encodeURIComponent(canonicalRto)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.vehicle) {
          setTrackedVehicleId(data.vehicle.id);
          setQuery(data.vehicle.vehicleNumber);
          setLookupBusy(false);
          return;
        }
      }
    } catch {
      // Fallback to local result message
    }

    setLookupBusy(false);
    setLookupError(
      `No vehicle found matching "${canonicalRto}". Try one of the registered RTO numbers below or add it in New Vehicle.`
    );
  };

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      window.setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleShareLocation = async (v: LiveTrackVehicleRecord) => {
    const shareText = `Live Vehicle ${v.vehicleNumber} (${v.vehicleState}, ${v.speedKmh} km/h)\nDriver: ${v.driverName} (${v.driverPhone})\nLocation: ${v.exactLocation.address}\nMap: https://www.google.com/maps?q=${v.lat},${v.lng}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Live Tracking · ${v.vehicleNumber}`,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareFeedback('Live location & driver contact copied to clipboard.');
        window.setTimeout(() => setShareFeedback(null), 2600);
      }
    } catch {
      // User cancelled native share
    }
  };

  const isIos = stage === 'iphone';
  const isMobileStage = stage !== 'web';
  const accentBtn = isIos
    ? 'bg-[#007AFF] hover:bg-[#0066D6] text-white shadow-sm'
    : 'bg-[#4B2166] hover:bg-[#5E2A7F] dark:bg-[#00A88F] dark:hover:bg-[#00947D] text-white shadow-sm';

  const quickPickVehicles =
    liveSuggestions.length > 1 ? liveSuggestions.slice(0, 6) : vehicles.slice(0, 6);

  return (
    <section
      data-testid="rto-live-tracker-panel"
      aria-label="Vehicle RTO Live Tracking Search"
      className="bg-white dark:bg-[#191524] rounded-2xl border border-slate-200 dark:border-white/10 p-4 sm:p-5 space-y-4"
    >
      {/* Search Bar Header */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
            Track Any Vehicle by RTO Number
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Exact live location · Driver phone · Full vehicle record
          </span>
        </div>
      </div>

      {/* Prominent Dashboard RTO Search Form */}
      <div className="space-y-2">
        <form
          onSubmit={(e) => handleRtoSearch(e)}
          noValidate
          className={
            isMobileStage
              ? 'flex flex-col items-stretch gap-2.5'
              : 'flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5'
          }
        >
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="dashboard-rto-search-input"
              type="text"
              data-testid="dashboard-rto-search-input"
              data-validation-status={rtoValidation.status}
              aria-label="Enter Vehicle RTO Number"
              aria-invalid={
                rtoValidation.status === 'invalid' ||
                (submitAttempted && !rtoValidation.isValid)
              }
              aria-describedby="rto-search-validation-hint"
              autoComplete="off"
              spellCheck={false}
              maxLength={16}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value.toUpperCase());
                setLookupError(null);
                setSubmitAttempted(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !rtoValidation.isValid) {
                  e.preventDefault();
                  setSubmitAttempted(true);
                  setLookupError(
                    query.trim()
                      ? rtoValidation.message
                      : 'Enter a valid Indian RTO number (e.g., KA-01-AB-1234) before searching.'
                  );
                }
              }}
              placeholder={
                isMobileStage
                  ? 'Enter RTO No. (e.g. KA-01-AB-1234)'
                  : 'Enter Indian RTO Number (e.g. KA-01-AB-1234, KA-06-TR-4821)'
              }
              className={`w-full min-h-[48px] pl-10 pr-16 py-2.5 rounded-xl bg-slate-50 dark:bg-[#120F1B] border text-sm font-mono font-semibold text-slate-900 dark:text-white placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none transition-colors ${
                rtoValidation.status === 'valid'
                  ? 'border-emerald-500 dark:border-emerald-400 focus:border-emerald-600 dark:focus:border-emerald-300 ring-1 ring-emerald-500/20'
                  : rtoValidation.status === 'invalid' ||
                    (submitAttempted && !rtoValidation.isValid)
                  ? 'border-rose-500 dark:border-rose-400 focus:border-rose-600 dark:focus:border-rose-300 ring-1 ring-rose-500/20'
                  : rtoValidation.status === 'incomplete'
                  ? 'border-amber-400 dark:border-amber-500/70 focus:border-amber-500 dark:focus:border-amber-400'
                  : 'border-slate-300 dark:border-white/15 focus:border-[#4B2166] dark:focus:border-purple-400'
              }`}
            />
            {query && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {rtoValidation.status === 'valid' && (
                  <CheckCircle2
                    data-testid="rto-input-valid-icon"
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {(rtoValidation.status === 'invalid' ||
                  (submitAttempted && !rtoValidation.isValid)) && (
                  <AlertCircle
                    data-testid="rto-input-invalid-icon"
                    className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setLookupError(null);
                    setSubmitAttempted(false);
                  }}
                  aria-label="Clear RTO search"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <button
            type="submit"
            data-testid="dashboard-rto-search-submit"
            disabled={!canSearch}
            aria-disabled={!canSearch}
            title={rtoValidation.isValid ? 'Track vehicle live' : rtoValidation.message}
            className={`min-h-[48px] px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
              canSearch
                ? `${accentBtn} cursor-pointer`
                : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            <Navigation className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{lookupBusy ? 'Searching...' : 'Track Live'}</span>
          </button>
        </form>

        {/* Real-Time Indian RTO Format Validation Bar */}
        <div
          id="rto-search-validation-hint"
          data-testid="rto-validation-feedback"
          data-validation-status={rtoValidation.status}
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-2 text-xs px-0.5"
        >
          <div
            className={`inline-flex items-center gap-1.5 font-medium ${
              rtoValidation.status === 'valid'
                ? 'text-emerald-700 dark:text-emerald-300'
                : rtoValidation.status === 'invalid' ||
                  (submitAttempted && !rtoValidation.isValid)
                ? 'text-rose-700 dark:text-rose-300'
                : rtoValidation.status === 'incomplete'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {rtoValidation.status === 'valid' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : rtoValidation.status === 'invalid' ||
              (submitAttempted && !rtoValidation.isValid) ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : null}
            <span>{rtoValidation.message}</span>
          </div>

          <div
            data-testid="rto-format-segments"
            aria-label="Indian RTO format segments"
            className="inline-flex items-center gap-1 font-mono text-[11px]"
          >
            {(
              (rtoValidation.formatKind === 'bharat'
                ? [
                    ['YY', rtoValidation.segments.state, 'Year (2 digits)'],
                    ['BH', rtoValidation.segments.rto, 'Bharat Series'],
                    ['1234', rtoValidation.segments.number, '4 digits'],
                    ['AA', rtoValidation.segments.series, '1–2 letters'],
                  ]
                : [
                    ['ST', rtoValidation.segments.state, 'State code (2 letters, e.g. KA, MH, DL)'],
                    ['00', rtoValidation.segments.rto, 'RTO district code (01–99)'],
                    ['AA', rtoValidation.segments.series, 'Series (1–3 letters)'],
                    ['0000', rtoValidation.segments.number, 'Registration number (4 digits)'],
                  ]) as Array<[string, RtoSegmentStatus, string]>
            ).map(([sample, segStatus, title], idx) => (
              <React.Fragment key={`${sample}-${idx}`}>
                {idx > 0 && (
                  <span className="text-slate-300 dark:text-white/20" aria-hidden="true">
                    -
                  </span>
                )}
                <span
                  title={title}
                  data-segment-status={segStatus}
                  className={`px-1.5 py-0.5 rounded font-semibold border transition-colors ${
                    segStatus === 'valid'
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                      : segStatus === 'invalid'
                      ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-white/10'
                  }`}
                >
                  {sample}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Quick-Pick Registered RTO Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Registered RTOs:
        </span>
        {quickPickVehicles.map((v) => {
          const isCurrent = activeVehicle?.id === v.id;
          return (
            <button
              key={v.id}
              type="button"
              data-testid={`rto-quick-pick-${v.vehicleNumber}`}
              onClick={() => {
                setQuery(v.vehicleNumber);
                setTrackedVehicleId(v.id);
                setLookupError(null);
                setSubmitAttempted(false);
              }}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                isCurrent
                  ? isIos
                    ? 'bg-[#007AFF] text-white border-[#007AFF]'
                    : 'bg-[#4B2166] text-white border-[#4B2166]'
                  : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-[#4B2166]'
              }`}
            >
              {v.vehicleNumber}
            </button>
          );
        })}
      </div>

      {lookupError && (
        <div
          role="alert"
          data-testid="rto-lookup-error"
          className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-xs font-medium text-rose-800 dark:text-rose-200"
        >
          {lookupError}
        </div>
      )}

      {/* Active Live Tracked Vehicle Spotlight */}
      {activeVehicle && (
        <div
          data-testid="rto-live-result"
          className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-4"
        >
          {/* Vehicle Status Header Row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3
                  data-testid="rto-result-number"
                  className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight"
                >
                  {activeVehicle.vehicleNumber}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeVehicle.vehicleState === 'Move'
                        ? 'bg-emerald-500 animate-pulse'
                        : activeVehicle.vehicleState === 'Start'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>
                    {activeVehicle.vehicleState === 'Move'
                      ? 'Live Tracking Active'
                      : activeVehicle.currentStatus}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeVehicle.onboardingProfile?.vehicleDetail?.vehicleBrand
                  ? `${activeVehicle.onboardingProfile.vehicleDetail.vehicleBrand} ${activeVehicle.onboardingProfile.vehicleDetail.vehicleModel || ''} · `
                  : ''}
                {activeVehicle.onboardingProfile?.vehicle?.vehicleType || 'Fleet Vehicle'} ·{' '}
                {activeVehicle.transporterName} · Updated{' '}
                {new Date(activeVehicle.updatedAt).toLocaleTimeString()}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleShareLocation(activeVehicle)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Share Live Location</span>
            </button>
          </div>

          {shareFeedback && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {shareFeedback}
            </p>
          )}

          {/* Main Grid: Live Map + Exact Location & Driver Phone */}
          <div
            className={
              isMobileStage
                ? 'grid grid-cols-1 gap-4'
                : 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch'
            }
          >
            <div className={isMobileStage ? '' : 'lg:col-span-7'}>
              <EmbeddedVehicleLiveMap
                vehicle={activeVehicle}
                isMobileStage={isMobileStage}
                onOpenFullMap={() => onSelectVehicleOnMap(activeVehicle.id)}
              />
            </div>

            <div
              className={
                isMobileStage
                  ? 'flex flex-col gap-3'
                  : 'lg:col-span-5 flex flex-col justify-between gap-3'
              }
            >
              {/* Exact Live Location Details */}
              <div
                data-testid="rto-exact-location-box"
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#120F1B] border border-slate-200/80 dark:border-white/10 space-y-2.5 flex-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <MapPin
                      className="w-4 h-4 text-[#00A88F] shrink-0"
                      aria-hidden="true"
                    />
                    <span>Exact Live Location</span>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    ±{activeVehicle.exactLocation.accuracyMeters}m GPS
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {activeVehicle.exactLocation.landmark}
                  </div>
                  <p
                    data-testid="rto-exact-address"
                    className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                  >
                    {activeVehicle.exactLocation.address}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/70 dark:border-white/10 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Coordinates
                    </div>
                    <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {activeVehicle.lat.toFixed(5)}, {activeVehicle.lng.toFixed(5)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Heading &amp; Road
                    </div>
                    <div className="font-medium text-slate-900 dark:text-white mt-0.5 truncate">
                      {activeVehicle.exactLocation.headingLabel} ({activeVehicle.exactLocation.headingDeg}°)
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver Phone Number & Direct Call Box */}
              <div
                data-testid="rto-driver-contact-box"
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#120F1B] border border-slate-200/80 dark:border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#4B2166]/12 dark:bg-purple-500/20 text-[#4B2166] dark:text-purple-200 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Assigned Driver
                      </div>
                      <div
                        data-testid="rto-driver-name"
                        className="text-sm font-bold text-slate-900 dark:text-white truncate"
                      >
                        {activeVehicle.driverName}
                      </div>
                      <div
                        data-testid="rto-driver-phone"
                        className="text-sm font-mono font-bold tabular-nums text-[#007B68] dark:text-teal-300"
                      >
                        {activeVehicle.driverPhone}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${activeVehicle.driverPhone.replace(/\s+/g, '')}`}
                    data-testid="rto-call-driver-link"
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-[#00A88F] hover:bg-[#00947D] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Call Driver</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(activeVehicle.driverPhone)}
                    className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#191524] text-slate-800 dark:text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedPhone ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Phone</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live Telemetry Summary Strip */}
          <div
            className={
              isMobileStage
                ? 'grid grid-cols-2 gap-2.5'
                : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5'
            }
          >
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#120F1B] border border-slate-200/70 dark:border-white/10">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-[#00A88F]" aria-hidden="true" />
                <span>Speed</span>
              </div>
              <div className="text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {activeVehicle.speedKmh} km/h
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#120F1B] border border-slate-200/70 dark:border-white/10">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-[#4B2166] dark:text-purple-300" aria-hidden="true" />
                <span>Status</span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {activeVehicle.vehicleState}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#120F1B] border border-slate-200/70 dark:border-white/10">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Snowflake className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
                <span>A/C</span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {activeVehicle.acOn ? 'ON' : 'OFF'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#120F1B] border border-slate-200/70 dark:border-white/10">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                <span>Fuel</span>
              </div>
              <div className="text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {activeVehicle.fuelPercent}% ({activeVehicle.fuelLiters}L)
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#120F1B] border border-slate-200/70 dark:border-white/10">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Odometer
              </div>
              <div className="text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {activeVehicle.odometerKm.toLocaleString()} km
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#120F1B] border border-slate-200/70 dark:border-white/10">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                <span>Battery</span>
              </div>
              <div className="text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {activeVehicle.batteryVoltage.toFixed(1)} V
              </div>
            </div>
          </div>

          {/* Complete Information from the New Vehicle Section */}
          <div
            data-testid="rto-onboarding-details"
            className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Complete Vehicle Information (from New Vehicle Registration)
              </h4>
              <div
                role="tablist"
                aria-label="Vehicle information sections"
                className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5"
              >
                {(
                  [
                    ['vehicle', 'Vehicle & Specs', Car],
                    ['owner', 'Owner & Body', User],
                    ['device', 'GPS Device & SIM', Cpu],
                    ['transporter', 'Transporter', Building2],
                    ['payment', 'Payment & Install', CreditCard],
                  ] as const
                ).map(([key, label, Icon]) => {
                  const active = profileTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setProfileTab(key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-white dark:bg-[#191524] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#120F1B] border border-slate-200/70 dark:border-white/10 grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {profileTab === 'vehicle' && (
                <>
                  <div>
                    <ProfileFieldRow
                      label="RTO Vehicle Number"
                      value={activeVehicle.onboardingProfile?.vehicle?.vehicleNumber || activeVehicle.vehicleNumber}
                    />
                    <ProfileFieldRow
                      label="Vehicle Type"
                      value={activeVehicle.onboardingProfile?.vehicle?.vehicleType}
                    />
                    <ProfileFieldRow
                      label="Vehicle Nickname"
                      value={activeVehicle.onboardingProfile?.vehicle?.vehicleNickname}
                    />
                    <ProfileFieldRow
                      label="Driver Name"
                      value={activeVehicle.driverName}
                    />
                    <ProfileFieldRow
                      label="Driver Phone Number"
                      value={activeVehicle.driverPhone}
                    />
                  </div>
                  <div>
                    <ProfileFieldRow
                      label="Chassis Number"
                      value={activeVehicle.onboardingProfile?.vehicle?.chassisNumber}
                    />
                    <ProfileFieldRow
                      label="Motor Number"
                      value={activeVehicle.onboardingProfile?.vehicle?.motorNumber}
                    />
                    <ProfileFieldRow
                      label="Mileage / Overspeed Limit"
                      value={`${activeVehicle.onboardingProfile?.vehicle?.mileage || '—'} km/l · ${activeVehicle.onboardingProfile?.vehicle?.overspeedLimit || '—'}`}
                    />
                    <ProfileFieldRow
                      label="Subscription Validity"
                      value={`${activeVehicle.onboardingProfile?.vehicle?.subscriptionStartDate || '—'} to ${activeVehicle.onboardingProfile?.vehicle?.subscriptionDueDate || '—'}`}
                    />
                    <ProfileFieldRow
                      label="Remark"
                      value={activeVehicle.onboardingProfile?.vehicle?.remark}
                    />
                  </div>
                </>
              )}

              {profileTab === 'owner' && (
                <>
                  <div>
                    <ProfileFieldRow
                      label="Owner Name"
                      value={activeVehicle.onboardingProfile?.vehicleDetail?.ownerName}
                    />
                    <ProfileFieldRow
                      label="Owned By"
                      value={activeVehicle.onboardingProfile?.vehicleDetail?.ownedBy}
                    />
                    <ProfileFieldRow
                      label="Vehicle Brand"
                      value={activeVehicle.onboardingProfile?.vehicleDetail?.vehicleBrand}
                    />
                    <ProfileFieldRow
                      label="Vehicle Model"
                      value={activeVehicle.onboardingProfile?.vehicleDetail?.vehicleModel}
                    />
                  </div>
                  <div>
                    <ProfileFieldRow
                      label="Vehicle Body"
                      value={activeVehicle.onboardingProfile?.vehicleDetail?.vehicleBody}
                    />
                    <ProfileFieldRow
                      label="Capacity"
                      value={activeVehicle.onboardingProfile?.vehicleDetail?.capacity}
                    />
                    <ProfileFieldRow
                      label="Manufacture Date"
                      value={activeVehicle.onboardingProfile?.vehicleDetail?.manufactureDate}
                    />
                    <ProfileFieldRow
                      label="Purchase Date"
                      value={activeVehicle.onboardingProfile?.vehicleDetail?.purchaseDate}
                    />
                  </div>
                </>
              )}

              {profileTab === 'device' && (
                <>
                  <div>
                    <ProfileFieldRow
                      label="Device Type"
                      value={activeVehicle.onboardingProfile?.device?.deviceType}
                    />
                    <ProfileFieldRow
                      label="IMEI (Masked)"
                      value={activeVehicle.onboardingProfile?.device?.imeiMasked || activeVehicle.deviceImeiMasked}
                    />
                    <ProfileFieldRow
                      label="SIM Number (Masked)"
                      value={activeVehicle.onboardingProfile?.device?.simMasked}
                    />
                  </div>
                  <div>
                    <ProfileFieldRow
                      label="SIM Operator"
                      value={activeVehicle.onboardingProfile?.device?.simOperator}
                    />
                    <ProfileFieldRow
                      label="Ignition Wire (+ve)"
                      value={activeVehicle.onboardingProfile?.device?.ignitionWirePositive ? 'Connected' : 'Not Connected'}
                    />
                    <ProfileFieldRow
                      label="A/C Wire (+ve)"
                      value={activeVehicle.onboardingProfile?.device?.acWirePositive ? 'Connected' : 'Not Connected'}
                    />
                  </div>
                </>
              )}

              {profileTab === 'transporter' && (
                <>
                  <div>
                    <ProfileFieldRow
                      label="Company Name"
                      value={activeVehicle.onboardingProfile?.transporter?.companyName || activeVehicle.transporterName}
                    />
                    <ProfileFieldRow
                      label="Contact Person"
                      value={activeVehicle.onboardingProfile?.transporter?.contactName}
                    />
                    <ProfileFieldRow
                      label="Transporter Phone"
                      value={activeVehicle.onboardingProfile?.transporter?.phone}
                    />
                    <ProfileFieldRow
                      label="Email"
                      value={activeVehicle.onboardingProfile?.transporter?.email}
                    />
                  </div>
                  <div>
                    <ProfileFieldRow
                      label="Office Address"
                      value={activeVehicle.onboardingProfile?.transporter?.address}
                    />
                    <ProfileFieldRow
                      label="Timezone"
                      value={activeVehicle.onboardingProfile?.transporter?.timezone}
                    />
                    <ProfileFieldRow
                      label="Subscription Start"
                      value={activeVehicle.onboardingProfile?.transporter?.subscriptionStartDate}
                    />
                    <ProfileFieldRow
                      label="Subscription Due"
                      value={activeVehicle.onboardingProfile?.transporter?.subscriptionDueDate}
                    />
                  </div>
                </>
              )}

              {profileTab === 'payment' && (
                <>
                  <div>
                    <ProfileFieldRow
                      label="Payment Type"
                      value={activeVehicle.onboardingProfile?.payment?.type}
                    />
                    <ProfileFieldRow
                      label="Payment Term"
                      value={activeVehicle.onboardingProfile?.payment?.paymentTerm}
                    />
                    <ProfileFieldRow
                      label="Selling Price"
                      value={
                        activeVehicle.onboardingProfile?.payment?.sellingPrice !== undefined
                          ? `₹${activeVehicle.onboardingProfile.payment.sellingPrice.toLocaleString()}`
                          : '—'
                      }
                    />
                    <ProfileFieldRow
                      label="Rental Plan"
                      value={activeVehicle.onboardingProfile?.payment?.rental}
                    />
                  </div>
                  <div>
                    <ProfileFieldRow
                      label="Installation Date"
                      value={activeVehicle.onboardingProfile?.payment?.installationDate}
                    />
                    <ProfileFieldRow
                      label="Rental Due Date"
                      value={activeVehicle.onboardingProfile?.payment?.rentalDueDate}
                    />
                    <ProfileFieldRow
                      label="Technician Name"
                      value={activeVehicle.onboardingProfile?.payment?.technicianName}
                    />
                    <ProfileFieldRow
                      label="Payment Remark"
                      value={activeVehicle.onboardingProfile?.payment?.remark}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
