const ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function sanitizeFirestoreId(raw: string, fallback = 'item'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return ID_REGEX.test(cleaned) ? cleaned : fallback;
}

function clampString(val: string, min: number, max: number, fallback: string): string {
  const trimmed = val.trim();
  if (trimmed.length < min) return fallback.slice(0, max);
  return trimmed.slice(0, max);
}

export function buildUserWorkspaceCreatePayload<TTime>(
  uid: string,
  displayName: string,
  timestamp: TTime,
  company?: string
) {
  const cleanCompany = company?.trim().slice(0, 120);
  return {
    uid: sanitizeFirestoreId(uid, 'user'),
    displayName: clampString(displayName, 1, 100, 'VS Fleet User'),
    ...(cleanCompany ? { company: cleanCompany } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildUserWorkspaceUpdatePayload<TTime>(
  displayName: string,
  timestamp: TTime,
  company?: string
) {
  const cleanCompany = company?.trim().slice(0, 120);
  return {
    displayName: clampString(displayName, 1, 100, 'VS Fleet User'),
    ...(cleanCompany ? { company: cleanCompany } : {}),
    updatedAt: timestamp,
  };
}

export function buildUserPrivateCreatePayload<TTime>(
  uid: string,
  email: string,
  timestamp: TTime,
  phone?: string
) {
  const cleanEmail = clampString(email, 3, 160, `${sanitizeFirestoreId(uid, 'user')}@users.vstech.local`);
  const cleanPhone = phone?.trim().slice(0, 32);
  return {
    uid: sanitizeFirestoreId(uid, 'user'),
    email: cleanEmail,
    ...(cleanPhone ? { phone: cleanPhone } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildUserPrivateUpdatePayload<TTime>(
  email: string,
  timestamp: TTime,
  phone?: string
) {
  const cleanPhone = phone?.trim().slice(0, 32);
  return {
    email: clampString(email, 3, 160, 'user@users.vstech.local'),
    ...(cleanPhone ? { phone: cleanPhone } : {}),
    updatedAt: timestamp,
  };
}

export function sanitizeProductIds(productIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of productIds) {
    const clean = String(id).trim().slice(0, 64);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= 50) break;
  }
  return out;
}

export function buildWishlistCreatePayload<TTime>(
  uid: string,
  productIds: string[],
  timestamp: TTime
) {
  return {
    uid: sanitizeFirestoreId(uid, 'user'),
    productIds: sanitizeProductIds(productIds),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildWishlistUpdatePayload<TTime>(
  productIds: string[],
  timestamp: TTime
) {
  return {
    productIds: sanitizeProductIds(productIds),
    updatedAt: timestamp,
  };
}

export function buildAiSessionCreatePayload<TTime>(
  sessionId: string,
  ownerId: string,
  title: string,
  model: string,
  timestamp: TTime
) {
  return {
    sessionId: sanitizeFirestoreId(sessionId, 'session_main'),
    ownerId: sanitizeFirestoreId(ownerId, 'user'),
    title: clampString(title, 1, 160, 'Fleet Copilot Session'),
    model: clampString(model, 1, 64, 'gemini-4-hydrogen'),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildAiSessionUpdatePayload<TTime>(
  title: string,
  model: string,
  timestamp: TTime
) {
  return {
    title: clampString(title, 1, 160, 'Fleet Copilot Session'),
    model: clampString(model, 1, 64, 'gemini-4-hydrogen'),
    updatedAt: timestamp,
  };
}

export function buildAiMessageCreatePayload<TTime>(
  messageId: string,
  sessionId: string,
  ownerId: string,
  role: 'user' | 'model',
  text: string,
  model: string,
  timestamp: TTime
) {
  return {
    messageId: sanitizeFirestoreId(messageId, 'msg_1'),
    sessionId: sanitizeFirestoreId(sessionId, 'session_main'),
    ownerId: sanitizeFirestoreId(ownerId, 'user'),
    role: role === 'user' ? ('user' as const) : ('model' as const),
    text: clampString(text, 1, 8000, ' '),
    model: clampString(model, 1, 64, 'gemini-4-hydrogen'),
    createdAt: timestamp,
  };
}

export function buildSavedMediaCreatePayload<TTime>(
  mediaId: string,
  ownerId: string,
  kind: 'image' | 'video' | 'transcript',
  title: string,
  prompt: string,
  timestamp: TTime,
  summaryText?: string
) {
  const cleanSummary = summaryText?.trim().slice(0, 8000);
  return {
    mediaId: sanitizeFirestoreId(mediaId, 'media_1'),
    ownerId: sanitizeFirestoreId(ownerId, 'user'),
    kind,
    title: clampString(title, 1, 160, 'VS Studio Output'),
    prompt: clampString(prompt, 1, 2000, 'Generated via VS AI Studio'),
    ...(cleanSummary ? { summaryText: cleanSummary } : {}),
    createdAt: timestamp,
  };
}

export const VEHICLE_DEVICE_TYPES = [
  'Commercial Truck / Fleet',
  'Cargo Van / LCV',
  'Passenger Car / SUV',
  'Two-Wheeler / Scooter',
  'Bus / Coach',
  'Refrigerated Van',
  'Tractor / Harvester',
] as const;

export type BlueprintVehicleType = (typeof VEHICLE_DEVICE_TYPES)[number];

export const TELEMETRY_SOURCES = ['gps', 'simulated', 'manual'] as const;
export type BlueprintTelemetrySource = (typeof TELEMETRY_SOURCES)[number];

function clampLatitude(val: number): number {
  if (!Number.isFinite(val)) return 13.3379;
  return Number(Math.min(90, Math.max(-90, val)).toFixed(6));
}

function clampLongitude(val: number): number {
  if (!Number.isFinite(val)) return 77.1173;
  return Number(Math.min(180, Math.max(-180, val)).toFixed(6));
}

function clampSpeedKmh(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.min(240, Math.max(0, Math.round(val)));
}

function clampHeadingDeg(val: number): number {
  if (!Number.isFinite(val)) return 0;
  const normalized = ((Math.round(val) % 360) + 360) % 360;
  return Math.min(360, Math.max(0, normalized));
}

function normalizeTelemetrySource(source?: string): BlueprintTelemetrySource {
  if (source === 'gps' || source === 'manual' || source === 'simulated') {
    return source;
  }
  return 'simulated';
}

export function buildVehicleDeviceCreatePayload<TTime>(params: {
  deviceId: string;
  ownerId: string;
  imei: string;
  nickname: string;
  vehicleType: string;
  model: string;
  status?: 'Moving' | 'Idle' | 'Alert';
  simExpiry: string;
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  headingDeg?: number;
  telemetrySource?: BlueprintTelemetrySource;
  timestamp: TTime;
}) {
  const cleanImei = params.imei.replace(/\D/g, '').slice(0, 15).padEnd(15, '0');
  const resolvedVehicleType: BlueprintVehicleType = (
    VEHICLE_DEVICE_TYPES as readonly string[]
  ).includes(params.vehicleType)
    ? (params.vehicleType as BlueprintVehicleType)
    : 'Commercial Truck / Fleet';
  const resolvedStatus =
    params.status === 'Moving' || params.status === 'Alert' || params.status === 'Idle'
      ? params.status
      : 'Idle';

  return {
    deviceId: sanitizeFirestoreId(params.deviceId, 'veh_device'),
    ownerId: sanitizeFirestoreId(params.ownerId, 'user'),
    imei: cleanImei,
    nickname: clampString(params.nickname, 2, 80, 'Fleet Vehicle'),
    vehicleType: resolvedVehicleType,
    model: clampString(params.model, 2, 80, 'VS Pro 4G Wired GPS Tracker'),
    status: resolvedStatus,
    simExpiry: clampString(params.simExpiry, 4, 20, '2027-11-17'),
    ...(params.latitude !== undefined ? { latitude: clampLatitude(params.latitude) } : {}),
    ...(params.longitude !== undefined ? { longitude: clampLongitude(params.longitude) } : {}),
    ...(params.speedKmh !== undefined ? { speedKmh: clampSpeedKmh(params.speedKmh) } : {}),
    ...(params.headingDeg !== undefined ? { headingDeg: clampHeadingDeg(params.headingDeg) } : {}),
    ...(params.telemetrySource !== undefined
      ? { telemetrySource: normalizeTelemetrySource(params.telemetrySource) }
      : {}),
    createdAt: params.timestamp,
    updatedAt: params.timestamp,
  };
}

export function buildVehicleDeviceUpdatePayload<TTime>(params: {
  nickname: string;
  vehicleType: string;
  status: 'Moving' | 'Idle' | 'Alert';
  timestamp: TTime;
}) {
  const resolvedVehicleType: BlueprintVehicleType = (
    VEHICLE_DEVICE_TYPES as readonly string[]
  ).includes(params.vehicleType)
    ? (params.vehicleType as BlueprintVehicleType)
    : 'Commercial Truck / Fleet';

  return {
    nickname: clampString(params.nickname, 2, 80, 'Fleet Vehicle'),
    vehicleType: resolvedVehicleType,
    status: params.status,
    updatedAt: params.timestamp,
  };
}

export function buildVehicleDeviceTelemetryUpdatePayload<TTime>(params: {
  status: 'Moving' | 'Idle' | 'Alert';
  latitude: number;
  longitude: number;
  speedKmh: number;
  headingDeg: number;
  telemetrySource: BlueprintTelemetrySource;
  timestamp: TTime;
}) {
  const resolvedStatus =
    params.status === 'Moving' || params.status === 'Alert' || params.status === 'Idle'
      ? params.status
      : 'Moving';

  return {
    status: resolvedStatus,
    latitude: clampLatitude(params.latitude),
    longitude: clampLongitude(params.longitude),
    speedKmh: clampSpeedKmh(params.speedKmh),
    headingDeg: clampHeadingDeg(params.headingDeg),
    telemetrySource: normalizeTelemetrySource(params.telemetrySource),
    updatedAt: params.timestamp,
  };
}

function clampMileageKm(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.min(2000000, Math.max(0, Math.round(val)));
}

export function buildVehicleMaintenanceDocId(
  deviceId: string,
  ownerId: string
): string {
  return sanitizeFirestoreId(
    `mnt_${sanitizeFirestoreId(deviceId, 'dev')}_${sanitizeFirestoreId(ownerId, 'user')}`,
    'mnt_vehicle'
  );
}

export function buildVehicleMaintenanceCreatePayload<TTime>(params: {
  maintenanceId: string;
  ownerId: string;
  deviceId: string;
  imei: string;
  odometerKm: number;
  oilChangeLastKm: number;
  airFilterLastKm: number;
  fuelFilterLastKm: number;
  brakeCheckLastKm: number;
  transmissionLastKm: number;
  timestamp: TTime;
}) {
  const cleanImei = params.imei.replace(/\D/g, '').slice(0, 15).padEnd(15, '0');
  return {
    maintenanceId: sanitizeFirestoreId(params.maintenanceId, 'mnt_vehicle'),
    ownerId: sanitizeFirestoreId(params.ownerId, 'user'),
    deviceId: sanitizeFirestoreId(params.deviceId, 'dev'),
    imei: cleanImei,
    odometerKm: clampMileageKm(params.odometerKm),
    oilChangeLastKm: clampMileageKm(params.oilChangeLastKm),
    airFilterLastKm: clampMileageKm(params.airFilterLastKm),
    fuelFilterLastKm: clampMileageKm(params.fuelFilterLastKm),
    brakeCheckLastKm: clampMileageKm(params.brakeCheckLastKm),
    transmissionLastKm: clampMileageKm(params.transmissionLastKm),
    createdAt: params.timestamp,
    updatedAt: params.timestamp,
  };
}

export function buildVehicleMaintenanceUpdatePayload<TTime>(params: {
  odometerKm: number;
  oilChangeLastKm: number;
  airFilterLastKm: number;
  fuelFilterLastKm: number;
  brakeCheckLastKm: number;
  transmissionLastKm: number;
  timestamp: TTime;
}) {
  return {
    odometerKm: clampMileageKm(params.odometerKm),
    oilChangeLastKm: clampMileageKm(params.oilChangeLastKm),
    airFilterLastKm: clampMileageKm(params.airFilterLastKm),
    fuelFilterLastKm: clampMileageKm(params.fuelFilterLastKm),
    brakeCheckLastKm: clampMileageKm(params.brakeCheckLastKm),
    transmissionLastKm: clampMileageKm(params.transmissionLastKm),
    updatedAt: params.timestamp,
  };
}

