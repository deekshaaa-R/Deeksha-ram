import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Database,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { useStore } from '../context/StoreContext';
import type { RtoVehicleMetadata } from '../utils/rtoRegistryDatabase';
import type { PlatformVehicle } from '../utils/unifiedPlatformLogic';
import {
  resolveVehicleSearchAction,
  searchVehicleDatabaseByRto,
} from '../utils/vehicleSearchLogic';

export type VehicleSearchVariant = 'header-trigger' | 'topbar' | 'hero' | 'compact';

export interface VehicleSearchProps {
  /** Optional live fleet vehicles to merge with the PAN-India RTO vehicle database */
  liveVehicles?: PlatformVehicle[];
  /** Optional callback when an authenticated user selects a vehicle for live tracking */
  onTrackVehicle?: (record: RtoVehicleMetadata) => void;
  /** Optional visual layout variant */
  variant?: VehicleSearchVariant;
  /** Restrict search strictly to RTO registration numbers (default: false — prioritizes RTO then driver/office) */
  rtoOnly?: boolean;
  /** Optional controlled/initial search text */
  initialQuery?: string;
  onQueryChange?: (q: string) => void;
  placeholder?: string;
  /** Optional override for authentication status (defaults to PlatformAuthContext + StoreContext) */
  isAuthenticatedOverride?: boolean;
  /** Enable Ctrl+K / Cmd+K global focus shortcut (useful for header-trigger) */
  enableShortcut?: boolean;
  testIdPrefix?: string;
}

const SAMPLE_RTO_PLATES = [
  'KA-06-TR-4821',
  'MH-12-EV-9045',
  'TN-01-BL-4410',
  'GJ-01-HT-6192',
];

function statusColorClass(status: PlatformVehicle['status']) {
  if (status === 'Running') return 'text-emerald-600 dark:text-emerald-400';
  if (status === 'Idle') return 'text-amber-600 dark:text-amber-400';
  if (status === 'Stationary') return 'text-sky-600 dark:text-sky-400';
  return 'text-slate-500 dark:text-slate-400';
}

/**
 * Reusable global VehicleSearch component.
 * Queries the vehicle database by RTO registration number (and metadata),
 * linking results directly to the Live Map Tracking view for authenticated users
 * and providing a seamless sign-in handoff for guests.
 */
export function VehicleSearch({
  liveVehicles = [],
  onTrackVehicle,
  variant = 'topbar',
  rtoOnly = false,
  initialQuery = '',
  onQueryChange,
  placeholder,
  isAuthenticatedOverride,
  enableShortcut = false,
  testIdPrefix = 'vehicle-search',
}: VehicleSearchProps) {
  const { identity, activeRole } = usePlatformAuth();
  const { user, liveTracking, triggerLiveTracking, showToast } = useStore();

  const isAuthenticated =
    isAuthenticatedOverride !== undefined
      ? isAuthenticatedOverride
      : Boolean(identity.isAuthenticated || user.isAuthenticated || onTrackVehicle);

  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const searchResult = useMemo(
    () =>
      searchVehicleDatabaseByRto({
        query,
        liveVehicles,
        rtoOnly,
        limit: 7,
      }),
    [query, liveVehicles, rtoOnly]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Global Cmd+K / Ctrl+K shortcut when enabled (e.g., site-wide header trigger)
  useEffect(() => {
    if (!enableShortcut) return;
    const onGlobalKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (variant === 'header-trigger') {
          setModalOpen(true);
          setOpen(true);
        } else {
          setOpen(true);
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, [enableShortcut, variant]);

  // Autofocus input when header modal opens
  useEffect(() => {
    if (variant === 'header-trigger' && modalOpen) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [variant, modalOpen]);

  // Close inline dropdown on outside click
  useEffect(() => {
    if (!open || variant === 'header-trigger') return;
    const handlePointerDown = (e: globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, variant]);

  const handleInputChange = (next: string) => {
    setQuery(next);
    setOpen(true);
    onQueryChange?.(next);
  };

  const handleSelectRecord = (
    record: RtoVehicleMetadata,
    e?: ReactMouseEvent<HTMLAnchorElement | HTMLButtonElement>
  ) => {
    // Allow standard middle-click / Cmd+click to open the live-map href in a new tab
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) {
      return;
    }
    e?.preventDefault();

    setQuery(record.vehicleNumber);
    setOpen(false);
    setModalOpen(false);
    onQueryChange?.(record.vehicleNumber);

    const resolution = resolveVehicleSearchAction({
      record,
      isAuthenticated,
      userRole: activeRole,
    });

    // Always update global application state with the selected vehicle metadata
    // and trigger the Live Tracking map view (unless parent handles routing via onTrackVehicle).
    if (onTrackVehicle) {
      triggerLiveTracking(record, { openView: false });
      onTrackVehicle(record);
    } else {
      triggerLiveTracking(record, { openView: true });
      showToast(
        `Live Tracking active for ${record.vehicleNumber} (${record.rtoOffice}).`,
        'success'
      );
    }
    void resolution;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const list = searchResult.results;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      if (list.length > 0) {
        setActiveIndex((idx) => (idx + 1) % list.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (list.length > 0) {
        setActiveIndex((idx) => (idx - 1 + list.length) % list.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = searchResult.exactMatch || list[activeIndex] || list[0];
      if (target) {
        handleSelectRecord(target);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setModalOpen(false);
    }
  };

  const renderResultsList = (isModalContext: boolean) => (
    <div
      id={listboxId}
      role="listbox"
      data-testid={`${testIdPrefix}-dropdown`}
      className={
        isModalContext
          ? 'border-t border-slate-200 dark:border-white/10 overflow-hidden'
          : `absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0F1834] shadow-xl overflow-hidden ${
              variant === 'hero' ? '' : 'min-w-[340px] sm:min-w-[430px]'
            }`
      }
    >
      {/* Results Meta Header */}
      <div className="px-3.5 py-2 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0A1128]/90 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Database className="w-3 h-3 text-cyan-600 dark:text-[#00D4FF]" aria-hidden="true" />
          <span>
            {query.trim()
              ? `${searchResult.results.length} match${
                  searchResult.results.length === 1 ? '' : 'es'
                } in RTO Vehicle Database`
              : `RTO Vehicle Registry (${searchResult.totalIndexed} indexed)`}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-mono">
          <Navigation className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span className="text-emerald-700 dark:text-emerald-400">
            {isAuthenticated ? 'Fleet Live Map Ready' : 'Live Map Ready'}
          </span>
        </span>
      </div>

      {/* Results Body */}
      {searchResult.results.length === 0 ? (
        <div
          data-testid={`${testIdPrefix}-empty`}
          className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400"
        >
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            No vehicle found for RTO &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-[11px]">
            Try a registered RTO plate such as{' '}
            <span className="font-mono text-cyan-600 dark:text-[#00D4FF]">KA-06-TR-4821</span>,{' '}
            <span className="font-mono text-cyan-600 dark:text-[#00D4FF]">TN-01-BL-4410</span>, or{' '}
            <span className="font-mono text-cyan-600 dark:text-[#00D4FF]">GJ-01-HT-6192</span>.
          </p>
        </div>
      ) : (
        <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
          {searchResult.results.map((rec, idx) => {
            const isActive = idx === activeIndex;
            const resolution = resolveVehicleSearchAction({
              record: rec,
              isAuthenticated,
              userRole: activeRole,
            });
            return (
              <a
                key={rec.id}
                href={resolution.href}
                role="option"
                aria-selected={isActive}
                data-testid={`${testIdPrefix}-option-${rec.vehicleNumber}`}
                data-auth-action={resolution.action}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={(e) => handleSelectRecord(rec, e)}
                className={`block w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-cyan-50/80 dark:bg-cyan-500/15'
                    : 'hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Truck
                      className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {rec.vehicleNumber}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {rec.rtoCode}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        rec.source === 'live-fleet'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-sky-700 dark:text-sky-400'
                      }`}
                    >
                      · {rec.source === 'live-fleet' ? 'Active Fleet' : 'RTO DB'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono tabular-nums">
                    <span className={`font-semibold font-sans ${statusColorClass(rec.status)}`}>
                      {rec.status}
                    </span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">
                      {rec.speedKmh} km/h
                    </span>
                  </div>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {rec.makeModel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Building2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{rec.rtoOffice}</span>
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 min-w-0 truncate">
                    <MapPin
                      className="w-3 h-3 shrink-0 text-cyan-600 dark:text-[#00D4FF]"
                      aria-hidden="true"
                    />
                    <span className="truncate">{rec.address}</span>
                  </span>
                  <span className="inline-flex items-center gap-2.5 shrink-0">
                    <span className="inline-flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                      <Phone className="w-2.5 h-2.5" aria-hidden="true" />
                      <span>{rec.driverName}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-cyan-700 dark:text-[#00D4FF]">
                      <Navigation className="w-2.5 h-2.5" aria-hidden="true" />
                      <span>Track Live</span>
                    </span>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Keyboard & Global State Footer */}
      <div className="px-3.5 py-2 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#0A1128]/70 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck
            className="w-3 h-3 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <span>
            {liveTracking.selectedVehicle
              ? `Active Live Track: ${liveTracking.selectedVehicle.vehicleNumber} · Select any RTO to switch`
              : 'Select any RTO registration number to open Live Tracking Map'}
          </span>
        </span>
        <span className="font-mono">↑↓ Select · Enter Track · Esc Close</span>
      </div>
    </div>
  );

  // =========================================================================
  // VARIANT: HEADER-TRIGGER (Compact Global Site Navbar Button + Search Dialog)
  // =========================================================================
  if (variant === 'header-trigger') {
    return (
      <>
        <button
          type="button"
          data-testid={`${testIdPrefix}-trigger`}
          onClick={() => {
            setModalOpen(true);
            setOpen(true);
          }}
          aria-label="Search vehicle database by RTO registration number"
          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#111B3A] text-xs font-medium text-slate-600 dark:text-[#A9B4D0] hover:border-cyan-500 dark:hover:border-[#00D4FF] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
        >
          <Search className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF]" aria-hidden="true" />
          <span className="hidden xl:inline">RTO Search</span>
          <kbd className="hidden xl:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            ⌘K
          </kbd>
        </button>

        {modalOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Global RTO Vehicle Database Search"
              data-testid={`${testIdPrefix}-modal`}
              className="fixed inset-0 z-[1200] flex items-start justify-center bg-slate-950/65 backdrop-blur-sm px-4 pt-16 sm:pt-24"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setModalOpen(false);
                  setOpen(false);
                }
              }}
            >
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0F1834] shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3">
                <Search
                  className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF] shrink-0"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded
                  aria-controls={listboxId}
                  aria-label="Query vehicle database by RTO registration number"
                  data-testid={`${testIdPrefix}-input`}
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    placeholder ||
                    'Search RTO registration number (e.g., KA-06-TR-4821, TN-01-BL-4410)...'
                  }
                  className="w-full bg-transparent text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close global RTO search"
                  data-testid={`${testIdPrefix}-close`}
                  onClick={() => {
                    setModalOpen(false);
                    setOpen(false);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/15 text-[11px] font-mono text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  ESC
                </button>
              </div>

              {/* Quick Sample RTO Plates */}
              <div className="px-4 pb-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Quick RTO lookup:</span>
                {SAMPLE_RTO_PLATES.map((plate) => (
                  <button
                    key={plate}
                    type="button"
                    data-testid={`${testIdPrefix}-sample-${plate}`}
                    onClick={() => {
                      setQuery(plate);
                      inputRef.current?.focus();
                    }}
                    className="font-mono text-[11px] px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] text-slate-700 dark:text-slate-200 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    {plate}
                  </button>
                ))}
              </div>

              {renderResultsList(true)}
            </div>
          </div>,
            document.body
          )}
      </>
    );
  }

  // =========================================================================
  // VARIANTS: TOPBAR / HERO / COMPACT (Inline Combobox)
  // =========================================================================
  const isHero = variant === 'hero';
  const isCompact = variant === 'compact';

  const resolvedPlaceholder =
    placeholder ||
    (isHero
      ? 'Enter RTO / Vehicle Number (e.g., KA-06-TR-4821, TN-01-BL-4410), Driver, or RTO Office...'
      : isCompact
      ? 'Search RTO / Vehicle No...'
      : 'RTO / Vehicle No. (e.g. KA-06-TR-4821)...');

  return (
    <div
      ref={containerRef}
      data-testid={testIdPrefix}
      className={`relative ${
        isHero ? 'w-full' : isCompact ? 'w-full' : 'flex-1 min-w-[170px] max-w-[235px]'
      }`}
    >
      <div
        className={`flex items-center gap-2 transition-colors ${
          isHero
            ? 'rounded-xl border border-slate-300 dark:border-cyan-500/35 bg-white dark:bg-[#0A1128] px-3.5 py-2.5 focus-within:border-cyan-500 dark:focus-within:border-[#00D4FF]'
            : 'rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-1.5 focus-within:border-cyan-500 dark:focus-within:border-[#00D4FF]'
        }`}
      >
        <Search
          className={`${
            isHero ? 'w-4 h-4 text-cyan-600 dark:text-[#00D4FF]' : 'w-3.5 h-3.5 text-slate-400'
          } shrink-0`}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label="Global RTO and Vehicle Number search"
          data-testid={`${testIdPrefix}-input`}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={resolvedPlaceholder}
          className={`w-full bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-mono ${
            isHero ? 'text-xs sm:text-sm' : 'text-xs'
          }`}
        />

        {query && (
          <button
            type="button"
            aria-label="Clear RTO search"
            data-testid={`${testIdPrefix}-clear`}
            onClick={() => {
              setQuery('');
              onQueryChange?.('');
              inputRef.current?.focus();
            }}
            className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {isHero && (
          <button
            type="button"
            data-testid={`${testIdPrefix}-track-btn`}
            onClick={() => {
              const target =
                searchResult.exactMatch ||
                searchResult.results[activeIndex] ||
                searchResult.results[0];
              if (target) {
                handleSelectRecord(target);
              } else {
                setOpen(true);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00D4FF] text-[#0A1128] font-semibold text-xs px-3 py-1.5 hover:bg-[#33DDFF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Track Live</span>
          </button>
        )}
      </div>

      {isHero && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 mr-1">
            <Database className="w-3 h-3 text-cyan-600 dark:text-[#00D4FF]" aria-hidden="true" />
            <span>RTO Registry ({searchResult.totalIndexed} vehicles):</span>
          </span>
          {SAMPLE_RTO_PLATES.map((rto) => (
            <button
              key={rto}
              type="button"
              data-testid={`${testIdPrefix}-sample-${rto}`}
              onClick={() => {
                setQuery(rto);
                setOpen(true);
                inputRef.current?.focus();
              }}
              className="font-mono text-[11px] px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] text-slate-700 dark:text-slate-200 hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors cursor-pointer"
            >
              {rto}
            </button>
          ))}
        </div>
      )}

      {open && renderResultsList(false)}
    </div>
  );
}
