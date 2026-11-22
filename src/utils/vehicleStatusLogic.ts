import type { VehicleType } from '../types';

export type EngineState = 'Running' | 'Idling' | 'Off' | 'Immobilized';
export type SpeedBand = 'Stopped' | 'City' | 'Highway' | 'Overspeed';
export type FuelBand = 'Critical' | 'Low' | 'Healthy';
export type VehicleTelemetryStatus = 'Moving' | 'Idle' | 'Offline' | 'Alert';

export interface VehicleStatusInput {
  label: string;
  subtitle?: string;
  status: VehicleTelemetryStatus;
  speedKmh: number;
  headingDeg?: number;
  latitude?: number;
  longitude?: number;
  fuelPercent?: number;
  fuelLiters?: number;
  tankCapacityLiters?: number;
  vehicleType?: VehicleType;
  imei?: string;
  trailPointsCount?: number;
  ignitionOn?: boolean;
  immobilized?: boolean;
  telemetrySourceLabel?: string;
  driver?: string;
  lastUpdated?: string;
  cloudSynced?: boolean;
}

export interface SpeedGaugeArcMetrics {
  ratio: number;
  arcLength: number;
  dashArray: number;
  dashOffset: number;
  maxSpeedKmh: number;
}

export interface ResolvedVehicleStatus {
  label: string;
  subtitle?: string;
  status: VehicleTelemetryStatus;
  speedKmh: number;
  speedBand: SpeedBand;
  speedBandLabel: string;
  engineState: EngineState;
  engineLabel: string;
  engineDetail: string;
  ignitionOn: boolean;
  fuelPercent: number;
  fuelLiters: number;
  tankCapacityLiters: number;
  fuelBand: FuelBand;
  fuelAlertLabel: string | null;
  estimatedRangeKm: number;
  headingDeg: number;
  headingCardinal: string;
  formattedCoords: string | null;
  gaugeArc: SpeedGaugeArcMetrics;
}

const CARDINAL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function deriveEngineState(params: {
  status: VehicleTelemetryStatus;
  speedKmh: number;
  ignitionOn?: boolean;
  immobilized?: boolean;
}): EngineState {
  if (params.immobilized) return 'Immobilized';
  if (params.status === 'Offline' || params.ignitionOn === false) return 'Off';
  const safeSpeed = Number.isFinite(params.speedKmh) ? Math.max(0, params.speedKmh) : 0;
  if (safeSpeed > 0) return 'Running';
  return 'Idling';
}

export function getEngineStateDescriptor(
  engineState: EngineState,
  status: VehicleTelemetryStatus
): { label: string; detail: string; ignitionOn: boolean } {
  switch (engineState) {
    case 'Running':
      return {
        label: 'Engine Running',
        detail:
          status === 'Alert'
            ? 'Ignition ON · Alert flagged'
            : 'Ignition ON · In motion',
        ignitionOn: true,
      };
    case 'Idling':
      return {
        label: 'Engine Idling',
        detail:
          status === 'Alert'
            ? 'Ignition ON · Alert stationary'
            : 'Ignition ON · Stationary',
        ignitionOn: true,
      };
    case 'Immobilized':
      return {
        label: 'Engine Immobilized',
        detail: 'Remote relay cut-off active',
        ignitionOn: false,
      };
    case 'Off':
    default:
      return {
        label: 'Engine Off',
        detail: 'Ignition OFF · Last known fix',
        ignitionOn: false,
      };
  }
}

export function classifySpeedBand(speedKmh: number): SpeedBand {
  const safeSpeed = Number.isFinite(speedKmh) ? Math.max(0, speedKmh) : 0;
  if (safeSpeed <= 0) return 'Stopped';
  if (safeSpeed <= 55) return 'City';
  if (safeSpeed <= 80) return 'Highway';
  return 'Overspeed';
}

export function getSpeedBandLabel(band: SpeedBand): string {
  switch (band) {
    case 'Stopped':
      return 'Stopped';
    case 'City':
      return 'City Cruise';
    case 'Highway':
      return 'Highway Pace';
    case 'Overspeed':
      return 'Overspeed Alert';
  }
}

export function classifyFuelBand(fuelPercent: number): FuelBand {
  const safe = clampNumber(fuelPercent, 0, 100);
  if (safe <= 15) return 'Critical';
  if (safe <= 30) return 'Low';
  return 'Healthy';
}

export function getDefaultTankCapacityLiters(vehicleType?: VehicleType): number {
  switch (vehicleType) {
    case 'Commercial Truck / Fleet':
      return 300;
    case 'Bus / Coach':
      return 260;
    case 'Refrigerated Van':
      return 140;
    case 'Cargo Van / LCV':
      return 110;
    case 'Tractor / Harvester':
      return 90;
    case 'Passenger Car / SUV':
      return 55;
    case 'Two-Wheeler / Scooter':
      return 14;
    default:
      return 120;
  }
}

export function getDefaultKmPerLiter(vehicleType?: VehicleType): number {
  switch (vehicleType) {
    case 'Commercial Truck / Fleet':
      return 4.2;
    case 'Bus / Coach':
      return 4.8;
    case 'Refrigerated Van':
      return 7.5;
    case 'Cargo Van / LCV':
      return 10.5;
    case 'Tractor / Harvester':
      return 5.5;
    case 'Passenger Car / SUV':
      return 15.5;
    case 'Two-Wheeler / Scooter':
      return 45.0;
    default:
      return 8.5;
  }
}

export function estimateRegisteredVehicleFuel(
  seed: string,
  vehicleType?: VehicleType,
  trailPointsCount = 1
): { fuelPercent: number; fuelLiters: number; tankCapacityLiters: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const basePercent = 28 + (hash % 59); // Deterministic 28%..86%
  const burnSteps = Math.max(0, trailPointsCount - 1);
  const burnedPercent = burnSteps * 0.15;
  const fuelPercent = Math.round(clampNumber(basePercent - burnedPercent, 12, 98));
  const tankCapacityLiters = getDefaultTankCapacityLiters(vehicleType);
  const fuelLiters = Math.round((fuelPercent / 100) * tankCapacityLiters);

  return {
    fuelPercent,
    fuelLiters,
    tankCapacityLiters,
  };
}

export function computeSpeedGaugeArc(
  speedKmh: number,
  maxSpeedKmh = 120,
  radius = 42
): SpeedGaugeArcMetrics {
  const safeMax = maxSpeedKmh > 0 ? maxSpeedKmh : 120;
  const ratio = clampNumber(speedKmh / safeMax, 0, 1);
  const arcLength = Number((Math.PI * radius).toFixed(2));
  const dashOffset = Number((arcLength * (1 - ratio)).toFixed(2));
  return {
    ratio,
    arcLength,
    dashArray: arcLength,
    dashOffset,
    maxSpeedKmh: safeMax,
  };
}

export function formatHeadingCardinal(headingDeg: number): string {
  if (!Number.isFinite(headingDeg)) return 'N';
  const normalized = ((headingDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return CARDINAL_DIRECTIONS[index];
}

export function resolveVehicleStatus(
  input: VehicleStatusInput
): ResolvedVehicleStatus {
  const safeSpeed = Math.round(clampNumber(input.speedKmh, 0, 240));
  const speedBand = classifySpeedBand(safeSpeed);
  const engineState = deriveEngineState({
    status: input.status,
    speedKmh: safeSpeed,
    ignitionOn: input.ignitionOn,
    immobilized: input.immobilized,
  });
  const engineDescriptor = getEngineStateDescriptor(engineState, input.status);

  const hasExplicitFuel =
    typeof input.fuelPercent === 'number' && Number.isFinite(input.fuelPercent);

  let fuelPercent: number;
  let tankCapacityLiters: number;
  let fuelLiters: number;

  if (hasExplicitFuel) {
    fuelPercent = Math.round(clampNumber(input.fuelPercent as number, 0, 100));
    tankCapacityLiters =
      typeof input.tankCapacityLiters === 'number' &&
      input.tankCapacityLiters > 0
        ? Math.round(input.tankCapacityLiters)
        : getDefaultTankCapacityLiters(input.vehicleType);
    fuelLiters =
      typeof input.fuelLiters === 'number' && Number.isFinite(input.fuelLiters)
        ? Math.max(0, Math.round(input.fuelLiters))
        : Math.round((fuelPercent / 100) * tankCapacityLiters);
  } else {
    const estimated = estimateRegisteredVehicleFuel(
      input.imei || input.label,
      input.vehicleType,
      input.trailPointsCount ?? 1
    );
    fuelPercent = estimated.fuelPercent;
    fuelLiters = estimated.fuelLiters;
    tankCapacityLiters = estimated.tankCapacityLiters;
  }

  const fuelBand = classifyFuelBand(fuelPercent);
  const fuelAlertLabel =
    fuelBand === 'Critical'
      ? 'Critical Reserve · Refuel Now'
      : fuelBand === 'Low'
      ? 'Low Fuel · Plan Refuel'
      : null;

  const kmPerLiter = getDefaultKmPerLiter(input.vehicleType);
  const estimatedRangeKm = Math.round(fuelLiters * kmPerLiter);

  const headingDeg =
    typeof input.headingDeg === 'number' && Number.isFinite(input.headingDeg)
      ? Math.round(((input.headingDeg % 360) + 360) % 360)
      : 0;
  const headingCardinal = formatHeadingCardinal(headingDeg);

  const formattedCoords =
    typeof input.latitude === 'number' &&
    typeof input.longitude === 'number' &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
      ? `${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)}`
      : null;

  return {
    label: input.label,
    subtitle: input.subtitle,
    status: input.status,
    speedKmh: safeSpeed,
    speedBand,
    speedBandLabel: getSpeedBandLabel(speedBand),
    engineState,
    engineLabel: engineDescriptor.label,
    engineDetail: engineDescriptor.detail,
    ignitionOn: engineDescriptor.ignitionOn,
    fuelPercent,
    fuelLiters,
    tankCapacityLiters,
    fuelBand,
    fuelAlertLabel,
    estimatedRangeKm,
    headingDeg,
    headingCardinal,
    formattedCoords,
    gaugeArc: computeSpeedGaugeArc(safeSpeed, 120, 42),
  };
}
