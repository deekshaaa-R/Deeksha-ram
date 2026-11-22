import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendRoutePoint,
  buildGeolocationTelemetry,
  computeHeadingDeg,
  formatCoordinatesShort,
  formatTelemetrySourceLabel,
  getAnchorCoordinatesForDevice,
  haversineMeters,
  resolveVehiclePosition,
  stepRegisteredVehicles,
  validateManualPing,
} from './registeredVehicleTracking.ts';
import {
  buildVehicleDeviceCreatePayload,
  buildVehicleDeviceTelemetryUpdatePayload,
} from './firestorePayloads.ts';
import type { TrackedDevice } from '../types/index.ts';

function makeDevice(overrides: Partial<TrackedDevice> = {}): TrackedDevice {
  return {
    id: 'veh_864291053829777',
    imei: '864291053829777',
    model: 'VS Pro 4G Wired GPS Tracker',
    vehicleLabel: 'KA-06-VS-2026 (Tumkuru Express)',
    vehicleType: 'Commercial Truck / Fleet',
    status: 'Moving',
    speedKmh: 48,
    lastUpdated: 'Just now',
    simExpiry: '2027-11-19',
    ...overrides,
  };
}

test('getAnchorCoordinatesForDevice returns deterministic bounded coordinates per IMEI', () => {
  const a1 = getAnchorCoordinatesForDevice({ imei: '864291053829777' });
  const a2 = getAnchorCoordinatesForDevice({ imei: '864291053829777' });
  const b = getAnchorCoordinatesForDevice({ imei: '864291053829999' });

  assert.deepEqual(a1, a2);
  assert.ok(a1.lat >= -90 && a1.lat <= 90);
  assert.ok(a1.lng >= -180 && a1.lng <= 180);
  assert.notEqual(`${a1.lat},${a1.lng}`, `${b.lat},${b.lng}`);
});

test('resolveVehiclePosition preserves explicit coordinates and falls back cleanly when missing', () => {
  const withoutCoords = makeDevice();
  const resolvedFallback = resolveVehiclePosition(withoutCoords);
  assert.ok(resolvedFallback.latitude >= -90 && resolvedFallback.latitude <= 90);
  assert.ok(resolvedFallback.longitude >= -180 && resolvedFallback.longitude <= 180);
  assert.equal(resolvedFallback.telemetrySource, 'simulated');

  const withCoords = makeDevice({
    latitude: 13.3379,
    longitude: 77.1173,
    speedKmh: 62,
    headingDeg: 145,
    telemetrySource: 'manual',
  });
  const resolvedExplicit = resolveVehiclePosition(withCoords);
  assert.equal(resolvedExplicit.latitude, 13.3379);
  assert.equal(resolvedExplicit.longitude, 77.1173);
  assert.equal(resolvedExplicit.speedKmh, 62);
  assert.equal(resolvedExplicit.headingDeg, 145);
  assert.equal(resolvedExplicit.telemetrySource, 'manual');
});

test('stepRegisteredVehicles advances moving simulated vehicles and preserves live GPS & manual pins', () => {
  const movingSim = makeDevice({
    id: 'sim-1',
    imei: '864291053829111',
    status: 'Moving',
    latitude: 13.3379,
    longitude: 77.1173,
    telemetrySource: 'simulated',
  });
  const liveGps = makeDevice({
    id: 'gps-1',
    imei: '864291053829222',
    status: 'Moving',
    latitude: 12.9716,
    longitude: 77.5946,
    speedKmh: 36,
    telemetrySource: 'gps',
  });
  const manualPinned = makeDevice({
    id: 'man-1',
    imei: '864291053829333',
    status: 'Moving',
    latitude: 18.5204,
    longitude: 73.8567,
    speedKmh: 62,
    telemetrySource: 'manual',
  });
  const idleSim = makeDevice({
    id: 'idle-1',
    imei: '864291053829444',
    status: 'Idle',
    speedKmh: 0,
    latitude: 13.0042,
    longitude: 80.0048,
    telemetrySource: 'simulated',
  });

  const { devices, trails } = stepRegisteredVehicles(
    [movingSim, liveGps, manualPinned, idleSim],
    {},
    1,
    'gps-1'
  );

  // Moving simulated vehicle advanced and appended a trail point
  assert.notEqual(devices[0].latitude, movingSim.latitude);
  assert.notEqual(devices[0].longitude, movingSim.longitude);
  assert.equal(trails['sim-1'].length, 2);

  // Live GPS device was NOT overwritten by simulation
  assert.equal(devices[1].latitude, 12.9716);
  assert.equal(devices[1].longitude, 77.5946);

  // Manual ping device remained pinned at exact coordinates
  assert.equal(devices[2].latitude, 18.5204);
  assert.equal(devices[2].longitude, 73.8567);

  // Idle device stayed parked at 0 km/h
  assert.equal(devices[3].speedKmh, 0);
  assert.equal(devices[3].latitude, 13.0042);
});

test('appendRoutePoint deduplicates adjacent identical points and respects maxPoints', () => {
  let trail: Array<[number, number]> = [];
  trail = appendRoutePoint(trail, [13.3379, 77.1173], 3);
  trail = appendRoutePoint(trail, [13.3379, 77.1173], 3);
  assert.equal(trail.length, 1);

  trail = appendRoutePoint(trail, [13.34, 77.12], 3);
  trail = appendRoutePoint(trail, [13.35, 77.13], 3);
  trail = appendRoutePoint(trail, [13.36, 77.14], 3);
  assert.equal(trail.length, 3);
  assert.deepEqual(trail[0], [13.34, 77.12]);
  assert.deepEqual(trail[2], [13.36, 77.14]);
});

test('buildGeolocationTelemetry converts m/s to km/h and classifies moving vs idle', () => {
  const moving = buildGeolocationTelemetry({
    latitude: 13.3379123,
    longitude: 77.1173456,
    speed: 15, // 54 km/h
    heading: 92.4,
    accuracy: 11.7,
  });
  assert.equal(moving.latitude, 13.337912);
  assert.equal(moving.longitude, 77.117346);
  assert.equal(moving.speedKmh, 54);
  assert.equal(moving.headingDeg, 92);
  assert.equal(moving.status, 'Moving');
  assert.equal(moving.telemetrySource, 'gps');
  assert.equal(moving.accuracyMeters, 12);

  const stationary = buildGeolocationTelemetry(
    {
      latitude: 12.9716,
      longitude: 77.5946,
      speed: null,
      heading: null,
      accuracy: 18,
    },
    180
  );
  assert.equal(stationary.speedKmh, 0);
  assert.equal(stationary.status, 'Idle');
  assert.equal(stationary.headingDeg, 180);
});

test('validateManualPing enforces geographic bounds and speed limits', () => {
  const valid = validateManualPing('13.3379', '77.1173', '62');
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.latitude, 13.3379);
    assert.equal(valid.longitude, 77.1173);
    assert.equal(valid.speedKmh, 62);
    assert.equal(valid.status, 'Moving');
  }

  const idleValid = validateManualPing(12.9, 77.6, 0);
  assert.equal(idleValid.ok, true);
  if (idleValid.ok) {
    assert.equal(idleValid.status, 'Idle');
  }

  assert.equal(validateManualPing('95', '77.1', '40').ok, false);
  assert.equal(validateManualPing('13.3', '200', '40').ok, false);
  assert.equal(validateManualPing('13.3', '77.1', '310').ok, false);
  assert.equal(validateManualPing('', '77.1', '40').ok, false);
});

test('computeHeadingDeg, haversineMeters, and formatting helpers behave accurately', () => {
  assert.equal(computeHeadingDeg(13.0, 77.0, 14.0, 77.0), 0); // North
  assert.equal(computeHeadingDeg(13.0, 77.0, 13.0, 78.0), 90); // East
  const dist = haversineMeters(13.3379, 77.1173, 13.3389, 77.1173);
  assert.ok(dist > 100 && dist < 125);
  assert.equal(formatCoordinatesShort(13.3379, 77.1173), '13.3379° N, 77.1173° E');
  assert.equal(formatTelemetrySourceLabel('gps'), 'Phone / Browser GPS Live');
});

test('Firestore vehicle telemetry payload builders emit rules-compliant bounded fields', () => {
  const created = buildVehicleDeviceCreatePayload({
    deviceId: 'veh_864291053829777',
    ownerId: 'user_123',
    imei: '864291053829777',
    nickname: 'KA-06-VS-2026',
    vehicleType: 'Commercial Truck / Fleet',
    model: 'VS Pro 4G Wired GPS Tracker',
    status: 'Moving',
    simExpiry: '2027-11-19',
    latitude: 13.3379,
    longitude: 77.1173,
    speedKmh: 54,
    headingDeg: 138,
    telemetrySource: 'simulated',
    timestamp: 'SERVER_TS',
  });
  assert.equal(created.latitude, 13.3379);
  assert.equal(created.longitude, 77.1173);
  assert.equal(created.speedKmh, 54);
  assert.equal(created.telemetrySource, 'simulated');

  const updated = buildVehicleDeviceTelemetryUpdatePayload({
    status: 'Moving',
    latitude: 120, // clamped to 90
    longitude: -220, // clamped to -180
    speedKmh: 400, // clamped to 240
    headingDeg: 380, // normalized to 20
    telemetrySource: 'gps',
    timestamp: 'SERVER_TS',
  });
  assert.deepEqual(Object.keys(updated).sort(), [
    'headingDeg',
    'latitude',
    'longitude',
    'speedKmh',
    'status',
    'telemetrySource',
    'updatedAt',
  ]);
  assert.equal(updated.latitude, 90);
  assert.equal(updated.longitude, -180);
  assert.equal(updated.speedKmh, 240);
  assert.equal(updated.headingDeg, 20);
});
