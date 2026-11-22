import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_WORLD_FLEET } from './fleetMapLogic';
import {
  applyWorldVehiclePatches,
  mergeRegisteredFleetUpdates,
  mergeWorldFleetSnapshot,
  sanitizeRoomId,
  syncTrailsFromDevices,
  validateTelemetryPushPayload,
} from './realtimeFleetLogic';
import type { TrackedDevice } from '../types';

const SAMPLE_DEVICES: TrackedDevice[] = [
  {
    id: 'dev-1',
    imei: '864291049281723',
    model: 'VS Pro 4G Wired GPS Tracker',
    vehicleLabel: 'KA-01-AB-9921 (Logistics Truck)',
    status: 'Moving',
    speedKmh: 52,
    lastUpdated: 'Just now',
    simExpiry: '2027-08-15',
    latitude: 13.3379,
    longitude: 77.1173,
    headingDeg: 120,
    telemetrySource: 'simulated',
  },
  {
    id: 'dev-2',
    imei: '864291049281884',
    model: 'VS 4G Dual AI Dashcam',
    vehicleLabel: 'MH-12-TR-3044 (Express Coach)',
    status: 'Idle',
    speedKmh: 0,
    lastUpdated: '1 min ago',
    simExpiry: '2027-09-20',
    latitude: 18.5987,
    longitude: 73.7611,
    headingDeg: 90,
    telemetrySource: 'simulated',
  },
];

test('validateTelemetryPushPayload accepts valid live coordinates and clamps fields', () => {
  const result = validateTelemetryPushPayload({
    deviceId: 'dev-1',
    imei: '864291049281723',
    roomId: 'uid_abc-123',
    latitude: 13.40123456,
    longitude: 77.21234567,
    speedKmh: 67.6,
    headingDeg: 405,
    telemetrySource: 'gps',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.roomId, 'uid_abc-123');
    assert.equal(result.event.latitude, 13.401235);
    assert.equal(result.event.longitude, 77.212346);
    assert.equal(result.event.speedKmh, 68);
    assert.equal(result.event.headingDeg, 45);
    assert.equal(result.event.status, 'Moving');
    assert.equal(result.event.telemetrySource, 'gps');
  }
});

test('validateTelemetryPushPayload rejects missing identifier or invalid coordinates', () => {
  const missingId = validateTelemetryPushPayload({
    latitude: 13.33,
    longitude: 77.11,
  });
  assert.equal(missingId.ok, false);

  const badLat = validateTelemetryPushPayload({
    deviceId: 'dev-1',
    latitude: 112,
    longitude: 77.11,
  });
  assert.equal(badLat.ok, false);

  const badSpeed = validateTelemetryPushPayload({
    deviceId: 'dev-1',
    latitude: 13.33,
    longitude: 77.11,
    speedKmh: 350,
  });
  assert.equal(badSpeed.ok, false);
});

test('mergeWorldFleetSnapshot deduplicates incoming full-state reconnect frames', () => {
  const duplicated = [INITIAL_WORLD_FLEET[0], INITIAL_WORLD_FLEET[0], INITIAL_WORLD_FLEET[1]];
  const merged = mergeWorldFleetSnapshot(INITIAL_WORLD_FLEET, duplicated);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, INITIAL_WORLD_FLEET[0].id);
  assert.equal(merged[1].id, INITIAL_WORLD_FLEET[1].id);
});

test('applyWorldVehiclePatches updates matching units without altering untouched fields', () => {
  const updated = applyWorldVehiclePatches(INITIAL_WORLD_FLEET, [
    {
      id: 'gm-1',
      lat: 14.1234,
      lng: 78.5678,
      headingDeg: 88,
      status: 'Moving',
      speedKmh: 72,
      fuelPercent: 75,
      fuelLiters: 225,
      lastPing: '1s ago',
    },
  ]);

  const target = updated.find((v) => v.id === 'gm-1');
  assert.ok(target);
  assert.equal(target.lat, 14.1234);
  assert.equal(target.lng, 78.5678);
  assert.equal(target.speedKmh, 72);
  assert.equal(target.plate, INITIAL_WORLD_FLEET[0].plate);
  assert.equal(updated.length, INITIAL_WORLD_FLEET.length);
});

test('mergeRegisteredFleetUpdates matches by deviceId or IMEI and respects skipDeviceId', () => {
  const merged = mergeRegisteredFleetUpdates(
    SAMPLE_DEVICES,
    [
      {
        deviceId: 'dev-1',
        latitude: 13.5,
        longitude: 77.3,
        speedKmh: 64,
        headingDeg: 145,
        status: 'Moving',
        telemetrySource: 'gps',
        lastUpdated: 'Live GPS Push',
        lastPingAt: '2026-11-19T00:00:00.000Z',
      },
      {
        deviceId: 'external-id',
        imei: '864291049281884',
        latitude: 18.65,
        longitude: 73.81,
        speedKmh: 44,
        headingDeg: 70,
        status: 'Moving',
        telemetrySource: 'manual',
        lastUpdated: 'Manual Push',
        lastPingAt: '2026-11-19T00:00:00.000Z',
      },
    ],
    { skipDeviceId: 'dev-1' }
  );

  // dev-1 was skipped because local GPS watch owns it
  assert.equal(merged[0].latitude, 13.3379);
  // dev-2 matched by IMEI and updated
  assert.equal(merged[1].latitude, 18.65);
  assert.equal(merged[1].longitude, 73.81);
  assert.equal(merged[1].speedKmh, 44);
  assert.equal(merged[1].status, 'Moving');
});

test('syncTrailsFromDevices appends pushed coordinates and deduplicates identical fixes', () => {
  const initialTrails = syncTrailsFromDevices({}, SAMPLE_DEVICES);
  assert.equal(initialTrails['dev-1'].length, 1);

  // Re-running with identical coordinates should be a no-op
  const unchanged = syncTrailsFromDevices(initialTrails, SAMPLE_DEVICES);
  assert.equal(unchanged, initialTrails);

  // Moving dev-1 via pushed update appends a new point to its trail
  const movedDevices: TrackedDevice[] = [
    { ...SAMPLE_DEVICES[0], latitude: 13.349, longitude: 77.129 },
    SAMPLE_DEVICES[1],
  ];
  const extended = syncTrailsFromDevices(initialTrails, movedDevices);
  assert.equal(extended['dev-1'].length, 2);
  assert.deepEqual(extended['dev-1'][1], [13.349, 77.129]);
  assert.equal(extended['dev-2'].length, 1);
});

test('sanitizeRoomId cleans unsafe room characters', () => {
  assert.equal(sanitizeRoomId('user/123@abc.com'), 'user_123_abc_com');
  assert.equal(sanitizeRoomId('   ', 'demo'), 'demo');
});
