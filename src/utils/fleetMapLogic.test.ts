import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_WORLD_FLEET,
  filterWorldFleet,
  formatLatLng,
  stepWorldFleet,
  summarizeWorldFleet,
} from './fleetMapLogic';

test('INITIAL_WORLD_FLEET covers Moving, Idle, and Offline statuses', () => {
  const summary = summarizeWorldFleet(INITIAL_WORLD_FLEET);
  assert.equal(summary.total, 8);
  assert.ok(summary.moving >= 1);
  assert.ok(summary.idle >= 1);
  assert.ok(summary.offline >= 1);
  assert.equal(summary.moving + summary.idle + summary.offline, summary.total);
});

test('stepWorldFleet advances Moving vehicles and preserves Offline vehicles at 0 km/h', () => {
  const stepped = stepWorldFleet(INITIAL_WORLD_FLEET, 1);

  const movingOrig = INITIAL_WORLD_FLEET.find((v) => v.status === 'Moving')!;
  const movingNext = stepped.find((v) => v.id === movingOrig.id)!;
  assert.notEqual(
    `${movingNext.lat},${movingNext.lng}`,
    `${movingOrig.lat},${movingOrig.lng}`
  );
  assert.ok(movingNext.speedKmh >= 42 && movingNext.speedKmh <= 88);
  assert.ok(movingNext.fuelLiters <= movingOrig.fuelLiters);

  const offlineOrig = INITIAL_WORLD_FLEET.find((v) => v.status === 'Offline')!;
  const offlineNext = stepped.find((v) => v.id === offlineOrig.id)!;
  assert.equal(offlineNext.speedKmh, 0);
  assert.equal(offlineNext.lat, offlineOrig.lat);
  assert.equal(offlineNext.lng, offlineOrig.lng);
  assert.equal(offlineNext.fuelLiters, offlineOrig.fuelLiters);
});

test('filterWorldFleet filters cleanly by status and search text', () => {
  const offlineOnly = filterWorldFleet(INITIAL_WORLD_FLEET, 'Offline');
  assert.equal(offlineOnly.length, 2);
  assert.ok(offlineOnly.every((v) => v.status === 'Offline'));

  const dubaiQuery = filterWorldFleet(INITIAL_WORLD_FLEET, 'All', 'Dubai');
  assert.equal(dubaiQuery.length, 0);

  const uaeQuery = filterWorldFleet(INITIAL_WORLD_FLEET, 'All', 'UAE');
  assert.equal(uaeQuery.length, 1);
  assert.equal(uaeQuery[0].plate, 'DXB-84-TR-209');
});

test('formatLatLng formats cardinal directions accurately', () => {
  assert.equal(formatLatLng(51.5074, -0.1278), '51.51° N, 0.13° W');
  assert.equal(formatLatLng(-33.8688, 151.2093), '33.87° S, 151.21° E');
});
