import { normalizeRtoNumber } from './rtoLookup';
import {
  mergeLiveFleetWithRtoRegistry,
  queryRtoVehicleDatabase,
  type RtoVehicleMetadata,
} from './rtoRegistryDatabase';
import type { PlatformRole, PlatformVehicle } from './unifiedPlatformLogic';

export interface VehicleSearchResolution {
  action: 'track-live' | 'require-auth';
  trackRto: string;
  targetScreen: 'live-map' | 'live-tracking';
  href: string;
  ctaLabel: string;
  noticeMessage: string;
}

/**
 * Builds a clean deep-link URL to open Live Map Tracking for a specific RTO registration number.
 */
export function buildLiveTrackHref(vehicleNumber: string): string {
  const clean = String(vehicleNumber || '').trim().toUpperCase();
  const params = new URLSearchParams({ view: 'platform' });
  if (clean) {
    params.set('trackRto', clean);
  }
  return `/?${params.toString()}`;
}

/**
 * Parses an optional ?trackRto= parameter from a URL search string.
 */
export function parseTrackRtoFromSearch(search: string): string | null {
  const params = new URLSearchParams(search || '');
  const raw = params.get('trackRto')?.trim();
  if (!raw) return null;
  return raw.toUpperCase();
}

/**
 * Resolves what happens when a user selects a vehicle from VehicleSearch:
 * - Authenticated users link directly to the Live Map Tracking view (scoped to their role).
 * - Unauthenticated users are routed to Portal Sign-In with the target RTO preserved
 *   so Live Map Tracking launches immediately after authentication.
 */
export function resolveVehicleSearchAction(input: {
  record: Pick<RtoVehicleMetadata, 'vehicleNumber' | 'rtoOffice'>;
  isAuthenticated: boolean;
  userRole?: PlatformRole | null;
}): VehicleSearchResolution {
  const targetScreen: 'live-map' | 'live-tracking' =
    input.userRole === 'customer' ? 'live-tracking' : 'live-map';
  const href = buildLiveTrackHref(input.record.vehicleNumber);

  if (input.isAuthenticated) {
    return {
      action: 'track-live',
      trackRto: input.record.vehicleNumber,
      targetScreen,
      href,
      ctaLabel: 'Open Live Map',
      noticeMessage: `Live map tracking opened for ${input.record.vehicleNumber} (${input.record.rtoOffice}).`,
    };
  }

  return {
    action: 'require-auth',
    trackRto: input.record.vehicleNumber,
    targetScreen,
    href,
    ctaLabel: 'Sign In to Track',
    noticeMessage: `Sign in to view live GPS tracking for ${input.record.vehicleNumber}.`,
  };
}

/**
 * Queries the merged vehicle database (live fleet + PAN-India RTO registry)
 * with RTO registration number lookup prioritized first.
 */
export function searchVehicleDatabaseByRto(input: {
  query: string;
  liveVehicles?: PlatformVehicle[];
  rtoOnly?: boolean;
  limit?: number;
}): {
  query: string;
  normalizedQuery: string;
  totalIndexed: number;
  results: RtoVehicleMetadata[];
  exactMatch: RtoVehicleMetadata | null;
} {
  const catalog = mergeLiveFleetWithRtoRegistry(input.liveVehicles ?? [], true);
  const trimmed = String(input.query || '').trim();
  const normalizedQuery = normalizeRtoNumber(trimmed);
  const limit = input.limit ?? 7;

  if (!trimmed) {
    return {
      query: '',
      normalizedQuery: '',
      totalIndexed: catalog.length,
      results: catalog.slice(0, limit),
      exactMatch: null,
    };
  }

  if (input.rtoOnly) {
    const rtoMatches = catalog
      .filter((rec) => {
        const normPlate = normalizeRtoNumber(rec.vehicleNumber);
        const normCode = normalizeRtoNumber(rec.rtoCode);
        return (
          normalizedQuery.length > 0 &&
          (normPlate.includes(normalizedQuery) || normCode.includes(normalizedQuery))
        );
      })
      .sort((a, b) => {
        const aExact = normalizeRtoNumber(a.vehicleNumber) === normalizedQuery ? 2 : normalizeRtoNumber(a.vehicleNumber).startsWith(normalizedQuery) ? 1 : 0;
        const bExact = normalizeRtoNumber(b.vehicleNumber) === normalizedQuery ? 2 : normalizeRtoNumber(b.vehicleNumber).startsWith(normalizedQuery) ? 1 : 0;
        return bExact - aExact || a.vehicleNumber.localeCompare(b.vehicleNumber);
      });

    const exact =
      rtoMatches.find((r) => normalizeRtoNumber(r.vehicleNumber) === normalizedQuery) ||
      (rtoMatches.length === 1 && normalizedQuery.length >= 4 ? rtoMatches[0] : null);

    return {
      query: trimmed,
      normalizedQuery,
      totalIndexed: catalog.length,
      results: rtoMatches.slice(0, limit),
      exactMatch: exact,
    };
  }

  const res = queryRtoVehicleDatabase(catalog, trimmed, limit);
  return {
    query: res.query,
    normalizedQuery: res.normalizedQuery,
    totalIndexed: res.totalCatalogCount,
    results: res.results,
    exactMatch: res.exactMatch,
  };
}

/**
 * Finds a single RTO record by registration number from the merged vehicle database.
 */
export function lookupVehicleRecordByRto(
  rtoNumber: string,
  liveVehicles?: PlatformVehicle[]
): RtoVehicleMetadata | null {
  const norm = normalizeRtoNumber(rtoNumber);
  if (!norm) return null;
  const catalog = mergeLiveFleetWithRtoRegistry(liveVehicles ?? [], true);
  return catalog.find((r) => normalizeRtoNumber(r.vehicleNumber) === norm) || null;
}
