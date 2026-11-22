import type { TelemetrySource, TrackedDevice } from '../types';

export interface CorridorAnchor {
  corridorName: string;
  lat: number;
  lng: number;
  baseSpeedKmh: number;
  baseHeadingDeg: number;
  stepLat: number;
  stepLng: number;
}

export const CORRIDOR_ANCHORS: readonly CorridorAnchor[] = [
  {
    corridorName: 'NH-48 Tumkuru–Bengaluru Highway',
    lat: 13.3379,
    lng: 77.1173,
    baseSpeedKmh: 54,
    baseHeadingDeg: 138,
    stepLat: -0.0011,
    stepLng: 0.0014,
  },
  {
    corridorName: 'Bengaluru Electronic City Logistics Belt',
    lat: 12.8985,
    lng: 77.6382,
    baseSpeedKmh: 58,
    baseHeadingDeg: 112,
    stepLat: -0.0007,
    stepLng: 0.0015,
  },
  {
    corridorName: 'Pune–Mumbai Expressway Corridor',
    lat: 18.5987,
    lng: 73.7611,
    baseSpeedKmh: 62,
    baseHeadingDeg: 298,
    stepLat: 0.0009,
    stepLng: -0.0014,
  },
  {
    corridorName: 'Chennai Sriperumbudur Freight Corridor',
    lat: 13.0042,
    lng: 80.0048,
    baseSpeedKmh: 48,
    baseHeadingDeg: 84,
    stepLat: 0.0004,
    stepLng: 0.0016,
  },
  {
    corridorName: 'Hyderabad Outer Ring Road',
    lat: 17.4422,
    lng: 78.3489,
    baseSpeedKmh: 66,
    baseHeadingDeg: 45,
    stepLat: 0.0012,
    stepLng: 0.0012,
  },
  {
    corridorName: 'Delhi NCR NH-48 Gurugram Corridor',
    lat: 28.4946,
    lng: 77.0887,
    baseSpeedKmh: 51,
    baseHeadingDeg: 215,
    stepLat: -0.0013,
    stepLng: -0.0009,
  },
] as const;

export type RoutePoint = [number, number];
export type RouteTrailMap = Record<string, RoutePoint[]>;

export interface ResolvedVehiclePosition {
  latitude: number;
  longitude: number;
  speedKmh: number;
  headingDeg: number;
  telemetrySource: TelemetrySource;
  status: TrackedDevice['status'];
  corridorName: string;
}

export function hashStringDeterministic(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function getAnchorCoordinatesForDevice(device: {
  imei?: string;
  id?: string;
  vehicleLabel?: string;
}): CorridorAnchor {
  const seed = (device.imei || device.id || device.vehicleLabel || 'vs-default').trim();
  const h = hashStringDeterministic(seed);
  const base = CORRIDOR_ANCHORS[h % CORRIDOR_ANCHORS.length];
  // Small deterministic offset (~0.3–1.8 km) so multiple devices on same corridor never stack identically
  const latOffset = (((h >> 4) % 21) - 10) * 0.0016;
  const lngOffset = (((h >> 9) % 21) - 10) * 0.0016;

  return {
    ...base,
    lat: Number((base.lat + latOffset).toFixed(6)),
    lng: Number((base.lng + lngOffset).toFixed(6)),
  };
}

export function isValidCoordinatePair(
  lat: unknown,
  lng: unknown
): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function resolveVehiclePosition(
  device: TrackedDevice
): ResolvedVehiclePosition {
  const anchor = getAnchorCoordinatesForDevice(device);
  const hasCoords = isValidCoordinatePair(device.latitude, device.longitude);
  const latitude = hasCoords ? Number(device.latitude!.toFixed(6)) : anchor.lat;
  const longitude = hasCoords ? Number(device.longitude!.toFixed(6)) : anchor.lng;
  const speedKmh =
    typeof device.speedKmh === 'number' && Number.isFinite(device.speedKmh)
      ? Math.min(240, Math.max(0, Math.round(device.speedKmh)))
      : device.status === 'Idle'
      ? 0
      : anchor.baseSpeedKmh;
  const headingDeg =
    typeof device.headingDeg === 'number' && Number.isFinite(device.headingDeg)
      ? ((Math.round(device.headingDeg) % 360) + 360) % 360
      : anchor.baseHeadingDeg;
  const telemetrySource: TelemetrySource =
    device.telemetrySource === 'gps' ||
    device.telemetrySource === 'manual' ||
    device.telemetrySource === 'simulated'
      ? device.telemetrySource
      : 'simulated';

  return {
    latitude,
    longitude,
    speedKmh,
    headingDeg,
    telemetrySource,
    status: device.status,
    corridorName: anchor.corridorName,
  };
}

export function computeHeadingDeg(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const dLat = toLat - fromLat;
  const dLng = toLng - fromLng;
  if (Math.abs(dLat) < 1e-8 && Math.abs(dLng) < 1e-8) {
    return 0;
  }
  const rad = Math.atan2(dLng, dLat);
  const deg = (rad * 180) / Math.PI;
  return ((Math.round(deg) % 360) + 360) % 360;
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function appendRoutePoint(
  trail: readonly RoutePoint[] | undefined,
  point: RoutePoint,
  maxPoints = 35
): RoutePoint[] {
  const existing = trail ? [...trail] : [];
  const last = existing[existing.length - 1];
  if (
    last &&
    Math.abs(last[0] - point[0]) < 1e-6 &&
    Math.abs(last[1] - point[1]) < 1e-6
  ) {
    return existing;
  }
  existing.push([Number(point[0].toFixed(6)), Number(point[1].toFixed(6))]);
  if (existing.length > maxPoints) {
    return existing.slice(existing.length - maxPoints);
  }
  return existing;
}

export function stepRegisteredVehicles(
  devices: readonly TrackedDevice[],
  trails: RouteTrailMap,
  tick: number,
  liveGpsDeviceId?: string | null
): { devices: TrackedDevice[]; trails: RouteTrailMap } {
  const nextTrails: RouteTrailMap = { ...trails };

  const nextDevices = devices.map((device, idx) => {
    const resolved = resolveVehiclePosition(device);

    // Ensure every vehicle has at least its current coordinate in the trail
    if (!nextTrails[device.id] || nextTrails[device.id].length === 0) {
      nextTrails[device.id] = [[resolved.latitude, resolved.longitude]];
    }

    // Never override a vehicle actively streaming real browser/phone GPS or pinned by manual ping
    if (
      device.id === liveGpsDeviceId ||
      resolved.telemetrySource === 'gps' ||
      resolved.telemetrySource === 'manual'
    ) {
      return {
        ...device,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        headingDeg: resolved.headingDeg,
        telemetrySource: resolved.telemetrySource,
      };
    }

    // Idle simulated devices remain parked at their anchor
    if (device.status === 'Idle') {
      return {
        ...device,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        speedKmh: 0,
        headingDeg: resolved.headingDeg,
        telemetrySource: 'simulated' as const,
      };
    }

    const anchor = getAnchorCoordinatesForDevice(device);
    const phase = (tick + idx * 3) * 0.45;
    // Gentle road-corridor curvature so marker visibly advances and draws a clean polyline
    const curveFactor = Math.sin(phase) * 0.35;
    const dLat = anchor.stepLat + anchor.stepLng * curveFactor;
    const dLng = anchor.stepLng - anchor.stepLat * curveFactor;

    let nextLat = Number((resolved.latitude + dLat).toFixed(6));
    let nextLng = Number((resolved.longitude + dLng).toFixed(6));

    // Keep vehicle within ~22 km of its corridor anchor by gently looping back if far
    if (
      Math.abs(nextLat - anchor.lat) > 0.2 ||
      Math.abs(nextLng - anchor.lng) > 0.2
    ) {
      nextLat = Number((anchor.lat + dLat).toFixed(6));
      nextLng = Number((anchor.lng + dLng).toFixed(6));
    }

    const nextHeading = computeHeadingDeg(
      resolved.latitude,
      resolved.longitude,
      nextLat,
      nextLng
    );
    const speedDelta = Math.round(Math.sin(phase * 1.3) * 6);
    const baseSpeed = Math.max(24, anchor.baseSpeedKmh);
    const nextSpeed = Math.min(110, Math.max(18, baseSpeed + speedDelta));

    nextTrails[device.id] = appendRoutePoint(nextTrails[device.id], [
      nextLat,
      nextLng,
    ]);

    return {
      ...device,
      latitude: nextLat,
      longitude: nextLng,
      speedKmh: nextSpeed,
      headingDeg: nextHeading,
      telemetrySource: 'simulated' as const,
      lastUpdated: 'Live stream · just now',
      lastPingAt: new Date().toISOString(),
    };
  });

  return { devices: nextDevices, trails: nextTrails };
}

export interface GeolocationTelemetryInput {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
}

export interface TelemetryUpdatePayload {
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

export function buildGeolocationTelemetry(
  coords: GeolocationTelemetryInput,
  fallbackHeadingDeg = 0
): TelemetryUpdatePayload {
  const latitude = Number(Math.min(90, Math.max(-90, coords.latitude)).toFixed(6));
  const longitude = Number(
    Math.min(180, Math.max(-180, coords.longitude)).toFixed(6)
  );
  // GeolocationCoordinates.speed is in m/s (or null if stationary/unsupported)
  const rawKmh =
    typeof coords.speed === 'number' && Number.isFinite(coords.speed) && coords.speed >= 0
      ? coords.speed * 3.6
      : 0;
  const speedKmh = Math.min(240, Math.max(0, Math.round(rawKmh)));
  const headingDeg =
    typeof coords.heading === 'number' &&
    Number.isFinite(coords.heading) &&
    coords.heading >= 0
      ? ((Math.round(coords.heading) % 360) + 360) % 360
      : ((Math.round(fallbackHeadingDeg) % 360) + 360) % 360;
  const accuracyMeters =
    typeof coords.accuracy === 'number' &&
    Number.isFinite(coords.accuracy) &&
    coords.accuracy >= 0
      ? Math.round(coords.accuracy)
      : undefined;

  return {
    latitude,
    longitude,
    speedKmh,
    headingDeg,
    status: speedKmh >= 3 ? 'Moving' : 'Idle',
    telemetrySource: 'gps',
    accuracyMeters,
    lastUpdated: 'Live Device GPS · just now',
    lastPingAt: new Date().toISOString(),
  };
}

export type ManualPingValidationResult =
  | {
      ok: true;
      latitude: number;
      longitude: number;
      speedKmh: number;
      status: TrackedDevice['status'];
    }
  | { ok: false; error: string };

export function validateManualPing(
  rawLat: string | number,
  rawLng: string | number,
  rawSpeed: string | number
): ManualPingValidationResult {
  const latStr = String(rawLat).trim();
  const lngStr = String(rawLng).trim();
  const speedStr = String(rawSpeed).trim();

  if (!latStr || !lngStr) {
    return { ok: false, error: 'Latitude and longitude are required.' };
  }

  const lat = Number(latStr);
  const lng = Number(lngStr);
  const speed = speedStr === '' ? 0 : Number(speedStr);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return {
      ok: false,
      error: 'Latitude must be a valid number between -90 and 90.',
    };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return {
      ok: false,
      error: 'Longitude must be a valid number between -180 and 180.',
    };
  }
  if (!Number.isFinite(speed) || speed < 0 || speed > 240) {
    return {
      ok: false,
      error: 'Speed must be between 0 and 240 km/h.',
    };
  }

  const roundedSpeed = Math.round(speed);
  return {
    ok: true,
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    speedKmh: roundedSpeed,
    status: roundedSpeed > 0 ? 'Moving' : 'Idle',
  };
}

export function formatCoordinatesShort(lat: number, lng: number): string {
  const latHem = lat >= 0 ? 'N' : 'S';
  const lngHem = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latHem}, ${Math.abs(lng).toFixed(4)}° ${lngHem}`;
}

export function formatTelemetrySourceLabel(source?: TelemetrySource): string {
  switch (source) {
    case 'gps':
      return 'Phone / Browser GPS Live';
    case 'manual':
      return 'Manual GPS Ping';
    case 'simulated':
    default:
      return 'Simulated Telemetry';
  }
}
