import type { TelemetrySource, TrackedDevice } from '../types/index.ts';
import type { FleetMapStatus, FleetMapVehicle } from './fleetMapLogic.ts';
import {
  appendRoutePoint,
  computeHeadingDeg,
  isValidCoordinatePair,
  resolveVehiclePosition,
  type RouteTrailMap,
} from './registeredVehicleTracking.ts';

export interface VehicleLocationPushEvent {
  deviceId: string;
  imei?: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  headingDeg: number;
  status: TrackedDevice['status'];
  telemetrySource: TelemetrySource;
  accuracyMeters?: number;
  lastUpdated: string;
  lastPingAt: string;
}

export interface WorldVehiclePatchEvent {
  id: string;
  lat: number;
  lng: number;
  headingDeg: number;
  status: FleetMapStatus;
  speedKmh: number;
  fuelPercent: number;
  fuelLiters: number;
  lastPing: string;
}

export interface RawTelemetryPushInput {
  deviceId?: unknown;
  imei?: unknown;
  roomId?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  speedKmh?: unknown;
  headingDeg?: unknown;
  status?: unknown;
  telemetrySource?: unknown;
  accuracyMeters?: unknown;
  lastUpdated?: unknown;
}

export type TelemetryPushValidationResult =
  | {
      ok: true;
      roomId: string;
      event: VehicleLocationPushEvent;
    }
  | {
      ok: false;
      error: string;
    };

export function sanitizeRoomId(raw: unknown, fallback = 'demo'): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function normalizeTelemetryStatus(
  rawStatus: unknown,
  speedKmh: number
): TrackedDevice['status'] {
  if (rawStatus === 'Moving' || rawStatus === 'Idle' || rawStatus === 'Alert') {
    return rawStatus;
  }
  return speedKmh > 0 ? 'Moving' : 'Idle';
}

export function normalizeTelemetrySourceValue(raw: unknown): TelemetrySource {
  if (raw === 'gps' || raw === 'manual' || raw === 'simulated') {
    return raw;
  }
  return 'gps';
}

export function validateTelemetryPushPayload(
  input: RawTelemetryPushInput
): TelemetryPushValidationResult {
  const deviceId = typeof input.deviceId === 'string' ? input.deviceId.trim() : '';
  const imei = typeof input.imei === 'string' ? input.imei.replace(/\D/g, '').trim() : '';

  if (!deviceId && !imei) {
    return {
      ok: false,
      error: 'Either deviceId or a 15-digit imei is required.',
    };
  }

  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  if (!isValidCoordinatePair(lat, lng)) {
    return {
      ok: false,
      error: 'Valid latitude (-90..90) and longitude (-180..180) are required.',
    };
  }

  const rawSpeed =
    input.speedKmh === undefined || input.speedKmh === null || input.speedKmh === ''
      ? 0
      : Number(input.speedKmh);
  if (!Number.isFinite(rawSpeed) || rawSpeed < 0 || rawSpeed > 240) {
    return {
      ok: false,
      error: 'speedKmh must be a number between 0 and 240.',
    };
  }

  const rawHeading =
    input.headingDeg === undefined || input.headingDeg === null || input.headingDeg === ''
      ? 0
      : Number(input.headingDeg);
  const headingDeg = Number.isFinite(rawHeading)
    ? ((Math.round(rawHeading) % 360) + 360) % 360
    : 0;

  const speedKmh = Math.round(rawSpeed);
  const telemetrySource = normalizeTelemetrySourceValue(input.telemetrySource);
  const status = normalizeTelemetryStatus(input.status, speedKmh);

  const accuracyMeters =
    typeof input.accuracyMeters === 'number' &&
    Number.isFinite(input.accuracyMeters) &&
    input.accuracyMeters >= 0
      ? Math.round(input.accuracyMeters)
      : undefined;

  const defaultLabel =
    telemetrySource === 'gps'
      ? 'Live GPS Push · just now'
      : telemetrySource === 'manual'
      ? 'Manual GPS Ping · just now'
      : 'Live Socket Push · just now';

  const lastUpdated =
    typeof input.lastUpdated === 'string' && input.lastUpdated.trim().length > 0
      ? input.lastUpdated.trim().slice(0, 64)
      : defaultLabel;

  return {
    ok: true,
    roomId: sanitizeRoomId(input.roomId, 'demo'),
    event: {
      deviceId: deviceId || `imei_${imei}`,
      ...(imei ? { imei } : {}),
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      speedKmh,
      headingDeg,
      status,
      telemetrySource,
      ...(accuracyMeters !== undefined ? { accuracyMeters } : {}),
      lastUpdated,
      lastPingAt: new Date().toISOString(),
    },
  };
}

/**
 * Idempotently merges a full server-pushed world fleet snapshot without creating duplicates.
 */
export function mergeWorldFleetSnapshot(
  current: readonly FleetMapVehicle[],
  incoming: readonly FleetMapVehicle[]
): FleetMapVehicle[] {
  if (incoming.length === 0) return [...current];
  const byId = new Map<string, FleetMapVehicle>();
  for (const item of incoming) {
    if (!item.id) continue;
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

/**
 * Applies incremental world vehicle location deltas pushed by the server.
 */
export function applyWorldVehiclePatches(
  current: readonly FleetMapVehicle[],
  patches: readonly WorldVehiclePatchEvent[]
): FleetMapVehicle[] {
  if (patches.length === 0) return [...current];
  const patchMap = new Map<string, WorldVehiclePatchEvent>();
  for (const patch of patches) {
    patchMap.set(patch.id, patch);
  }

  return current.map((vehicle) => {
    const patch = patchMap.get(vehicle.id);
    if (!patch) return vehicle;
    return {
      ...vehicle,
      lat: patch.lat,
      lng: patch.lng,
      headingDeg: patch.headingDeg,
      status: patch.status,
      speedKmh: patch.speedKmh,
      fuelPercent: patch.fuelPercent,
      fuelLiters: patch.fuelLiters,
      lastPing: patch.lastPing,
    };
  });
}

/**
 * Applies one or more pushed vehicle location updates (from Socket.io or Firestore)
 * onto the registered fleet device list idempotently.
 */
export function mergeRegisteredFleetUpdates(
  devices: readonly TrackedDevice[],
  updates: readonly VehicleLocationPushEvent[],
  options?: {
    skipDeviceId?: string | null;
  }
): TrackedDevice[] {
  if (updates.length === 0) return [...devices];

  const byId = new Map<string, VehicleLocationPushEvent>();
  const byImei = new Map<string, VehicleLocationPushEvent>();

  for (const u of updates) {
    if (u.deviceId) byId.set(u.deviceId, u);
    if (u.imei) byImei.set(u.imei.trim(), u);
  }

  return devices.map((device) => {
    if (options?.skipDeviceId && device.id === options.skipDeviceId) {
      return device;
    }

    const match = byId.get(device.id) ?? byImei.get(device.imei.trim());
    if (!match) return device;

    const prevPos = resolveVehiclePosition(device);
    const derivedHeading =
      match.headingDeg ||
      computeHeadingDeg(
        prevPos.latitude,
        prevPos.longitude,
        match.latitude,
        match.longitude
      ) ||
      prevPos.headingDeg;

    return {
      ...device,
      latitude: match.latitude,
      longitude: match.longitude,
      speedKmh: match.speedKmh,
      headingDeg: derivedHeading,
      status: match.status,
      telemetrySource: match.telemetrySource,
      accuracyMeters: match.accuracyMeters ?? device.accuracyMeters,
      lastUpdated: match.lastUpdated,
      lastPingAt: match.lastPingAt,
    };
  });
}

/**
 * Synchronizes polyline route trails whenever device coordinates change via
 * Firestore onSnapshot or Socket.io pushes.
 */
export function syncTrailsFromDevices(
  prevTrails: RouteTrailMap,
  devices: readonly TrackedDevice[],
  maxPoints = 35
): RouteTrailMap {
  let changed = false;
  const nextTrails: RouteTrailMap = { ...prevTrails };

  for (const device of devices) {
    const pos = resolveVehiclePosition(device);
    const existing = nextTrails[device.id];
    const updated = appendRoutePoint(
      existing,
      [pos.latitude, pos.longitude],
      maxPoints
    );
    if (!existing || updated.length !== existing.length) {
      nextTrails[device.id] = updated;
      changed = true;
    }
  }

  return changed ? nextTrails : prevTrails;
}
