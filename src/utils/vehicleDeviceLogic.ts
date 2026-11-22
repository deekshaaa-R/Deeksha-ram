import type { TelemetrySource, TrackedDevice, VehicleType } from '../types';
import { sanitizeFirestoreId } from './firestorePayloads.ts';
import {
  getAnchorCoordinatesForDevice,
  isValidCoordinatePair,
} from './registeredVehicleTracking.ts';
import type { FieldErrors } from './storeLogic.ts';

export const VEHICLE_TYPE_OPTIONS: readonly VehicleType[] = [
  'Commercial Truck / Fleet',
  'Cargo Van / LCV',
  'Passenger Car / SUV',
  'Two-Wheeler / Scooter',
  'Bus / Coach',
  'Refrigerated Van',
  'Tractor / Harvester',
] as const;

export const TRACKER_MODEL_OPTIONS = [
  'VS Pro 4G Wired GPS Tracker',
  'VS Lite Wired GPS Tracker',
  'VS OBD-II 4G Plug & Play Tracker',
  'VS Ultra Wireless GPS Tracker',
  'VS AI 4G Dashcam (ADAS + DMS)',
  'VS Agri Smart Farming GPS',
] as const;

export const IMEI_REGEX = /^[0-9]{15}$/;
export const NICKNAME_MIN_LEN = 2;
export const NICKNAME_MAX_LEN = 80;
export const MODEL_MAX_LEN = 80;

export function normalizeImeiInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 15);
}

export function isAllowedVehicleType(value: string): value is VehicleType {
  return (VEHICLE_TYPE_OPTIONS as readonly string[]).includes(value);
}

export function defaultModelForVehicleType(vehicleType: VehicleType): string {
  switch (vehicleType) {
    case 'Two-Wheeler / Scooter':
      return 'VS Lite Wired GPS Tracker';
    case 'Passenger Car / SUV':
      return 'VS OBD-II 4G Plug & Play Tracker';
    case 'Bus / Coach':
      return 'VS AI 4G Dashcam (ADAS + DMS)';
    case 'Refrigerated Van':
      return 'VS Ultra Wireless GPS Tracker';
    case 'Tractor / Harvester':
      return 'VS Agri Smart Farming GPS';
    case 'Commercial Truck / Fleet':
    case 'Cargo Van / LCV':
    default:
      return 'VS Pro 4G Wired GPS Tracker';
  }
}

export interface VehicleRegistrationInput {
  imei: string;
  nickname: string;
  vehicleType: string;
  model?: string;
}

export type VehicleRegistrationField =
  | 'imei'
  | 'nickname'
  | 'vehicleType'
  | 'model';

export function validateVehicleRegistrationFields(
  input: VehicleRegistrationInput,
  existingImeis: readonly string[] = []
): FieldErrors<VehicleRegistrationField> {
  const errors: FieldErrors<VehicleRegistrationField> = {};

  const cleanImei = input.imei.trim();
  if (!cleanImei) {
    errors.imei = '15-digit device IMEI is required.';
  } else if (!IMEI_REGEX.test(cleanImei)) {
    errors.imei = 'IMEI must be exactly 15 numeric digits (0–9).';
  } else if (existingImeis.some((existing) => existing.trim() === cleanImei)) {
    errors.imei = 'A vehicle with this IMEI is already registered in your fleet.';
  }

  const cleanNickname = input.nickname.trim();
  if (!cleanNickname) {
    errors.nickname = 'Vehicle nickname or plate label is required.';
  } else if (cleanNickname.length < NICKNAME_MIN_LEN) {
    errors.nickname = `Nickname must be at least ${NICKNAME_MIN_LEN} characters.`;
  } else if (cleanNickname.length > NICKNAME_MAX_LEN) {
    errors.nickname = `Nickname must be ${NICKNAME_MAX_LEN} characters or fewer.`;
  }

  if (!input.vehicleType.trim() || !isAllowedVehicleType(input.vehicleType)) {
    errors.vehicleType = 'Please select a valid vehicle type.';
  }

  if (input.model !== undefined && input.model.trim().length > 0) {
    const cleanModel = input.model.trim();
    if (cleanModel.length < 2 || cleanModel.length > MODEL_MAX_LEN) {
      errors.model = `Tracker model must be between 2 and ${MODEL_MAX_LEN} characters.`;
    }
  }

  return errors;
}

export function buildVehicleDeviceId(imei: string, ownerId?: string): string {
  const digits = normalizeImeiInput(imei).padEnd(15, '0');
  if (ownerId && ownerId.trim().length > 0) {
    const uidPart = sanitizeFirestoreId(ownerId, 'user').slice(0, 12);
    return sanitizeFirestoreId(`veh_${digits}_${uidPart}`, `veh_${digits}`);
  }
  return sanitizeFirestoreId(`veh_${digits}`, 'veh_device');
}

export function computeDefaultSimExpiry(now = new Date()): string {
  const nextYear = now.getUTCFullYear() + 1;
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${month}-${day}`;
}

export function buildTrackedDeviceFromRegistration(params: {
  deviceId: string;
  imei: string;
  nickname: string;
  vehicleType: VehicleType;
  model?: string;
  simExpiry?: string;
  status?: TrackedDevice['status'];
  speedKmh?: number;
  latitude?: number;
  longitude?: number;
  headingDeg?: number;
  telemetrySource?: TelemetrySource;
  cloudSynced?: boolean;
  lastUpdated?: string;
  lastPingAt?: string;
}): TrackedDevice {
  const cleanImei = normalizeImeiInput(params.imei);
  const resolvedModel =
    params.model && params.model.trim().length >= 2
      ? params.model.trim().slice(0, MODEL_MAX_LEN)
      : defaultModelForVehicleType(params.vehicleType);
  const anchor = getAnchorCoordinatesForDevice({
    imei: cleanImei,
    id: params.deviceId,
    vehicleLabel: params.nickname,
  });
  const hasValidCoords = isValidCoordinatePair(params.latitude, params.longitude);

  return {
    id: params.deviceId,
    imei: cleanImei,
    model: resolvedModel,
    vehicleLabel: params.nickname.trim().slice(0, NICKNAME_MAX_LEN),
    vehicleType: params.vehicleType,
    status: params.status ?? 'Idle',
    speedKmh:
      typeof params.speedKmh === 'number' && Number.isFinite(params.speedKmh)
        ? Math.min(240, Math.max(0, Math.round(params.speedKmh)))
        : 0,
    lastUpdated: params.lastUpdated ?? 'Just registered',
    simExpiry: params.simExpiry ?? computeDefaultSimExpiry(),
    cloudSynced: params.cloudSynced ?? false,
    latitude: hasValidCoords ? Number(params.latitude!.toFixed(6)) : anchor.lat,
    longitude: hasValidCoords ? Number(params.longitude!.toFixed(6)) : anchor.lng,
    headingDeg:
      typeof params.headingDeg === 'number' && Number.isFinite(params.headingDeg)
        ? ((Math.round(params.headingDeg) % 360) + 360) % 360
        : anchor.baseHeadingDeg,
    telemetrySource: params.telemetrySource ?? 'simulated',
    ...(params.lastPingAt ? { lastPingAt: params.lastPingAt } : {}),
  };
}

export function filterRegisteredVehicles(
  devices: readonly TrackedDevice[],
  rawQuery: string
): TrackedDevice[] {
  const trimmed = rawQuery.trim().toLowerCase();
  if (!trimmed) {
    return [...devices];
  }

  const normalizedNumericQuery = trimmed.replace(/[\s-]+/g, '');

  return devices.filter((device) => {
    const labelMatch = device.vehicleLabel.toLowerCase().includes(trimmed);
    const imeiLower = device.imei.toLowerCase();
    const imeiMatch =
      imeiLower.includes(trimmed) ||
      (normalizedNumericQuery.length > 0 && imeiLower.includes(normalizedNumericQuery));
    return labelMatch || imeiMatch;
  });
}

