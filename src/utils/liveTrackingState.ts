import type { RtoVehicleMetadata } from './rtoRegistryDatabase';
import type { PlatformVehicle } from './unifiedPlatformLogic';

export interface LiveTrackingState {
  active: boolean;
  selectedVehicle: RtoVehicleMetadata | null;
  recentRtoNumbers: string[];
  lastTriggeredAt: number | null;
}

const MAX_RECENT_RTO = 6;

export function createInitialLiveTrackingState(
  initialVehicle: RtoVehicleMetadata | null = null
): LiveTrackingState {
  if (!initialVehicle) {
    return {
      active: false,
      selectedVehicle: null,
      recentRtoNumbers: [],
      lastTriggeredAt: null,
    };
  }
  return {
    active: true,
    selectedVehicle: initialVehicle,
    recentRtoNumbers: [initialVehicle.vehicleNumber],
    lastTriggeredAt: Date.now(),
  };
}

/**
 * Pure state transition when a user selects a vehicle from VehicleSearch.
 * Activates global Live Tracking, stores the full RTO metadata payload,
 * and deduplicates + caps recent RTO registration numbers.
 */
export function applyLiveTrackingSelection(
  state: LiveTrackingState,
  record: RtoVehicleMetadata,
  now: number = Date.now()
): LiveTrackingState {
  const plate = record.vehicleNumber.trim().toUpperCase();
  const nextRecent = [
    plate,
    ...state.recentRtoNumbers.filter((item) => item.toUpperCase() !== plate),
  ].slice(0, MAX_RECENT_RTO);

  // Guarantee strictly increasing timestamp even if called twice in the same millisecond
  const nextTimestamp =
    state.lastTriggeredAt !== null && now <= state.lastTriggeredAt
      ? state.lastTriggeredAt + 1
      : now;

  return {
    active: true,
    selectedVehicle: record,
    recentRtoNumbers: nextRecent,
    lastTriggeredAt: nextTimestamp,
  };
}

/**
 * Clears the active live tracking selection while retaining recent RTO lookup history.
 */
export function clearLiveTrackingSelection(
  state: LiveTrackingState
): LiveTrackingState {
  return {
    ...state,
    active: false,
    selectedVehicle: null,
  };
}

/**
 * Advances a running live-tracked vehicle along its current GPS heading for real-time map telemetry.
 * Non-running (Idle / Stationary / Offline) vehicles remain anchored at their exact coordinates.
 */
export function stepLiveTrackedVehicle(
  vehicle: PlatformVehicle,
  speedDelta: number = 0
): PlatformVehicle {
  if (vehicle.status !== 'Running') {
    return vehicle;
  }

  const rad = (vehicle.headingDeg * Math.PI) / 180;
  const nextLat = Number((vehicle.lat + Math.cos(rad) * 0.00055).toFixed(5));
  const nextLng = Number((vehicle.lng + Math.sin(rad) * 0.00055).toFixed(5));
  const nextSpeed = Math.max(
    24,
    Math.min(vehicle.speedLimitKmh + 6, Math.round(vehicle.speedKmh + speedDelta))
  );
  const nextOdometer =
    vehicle.odometerKm !== null
      ? Number((vehicle.odometerKm + 0.1).toFixed(1))
      : null;

  return {
    ...vehicle,
    lat: nextLat,
    lng: nextLng,
    speedKmh: nextSpeed,
    odometerKm: nextOdometer,
    distanceTodayKm: Number((vehicle.distanceTodayKm + 0.1).toFixed(1)),
    lastUpdated: 'Just now (Live GPS)',
    trail: [...vehicle.trail.slice(-14), [nextLat, nextLng]],
  };
}
