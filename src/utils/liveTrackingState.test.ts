import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOCK_RTO_REGISTRY,
  toPlatformVehicleFromRtoRecord,
} from './rtoRegistryDatabase';
import {
  applyLiveTrackingSelection,
  clearLiveTrackingSelection,
  createInitialLiveTrackingState,
  stepLiveTrackedVehicle,
} from './liveTrackingState';

test('applyLiveTrackingSelection updates global live tracking state and deduplicates recent RTO history', () => {
  let state = createInitialLiveTrackingState();
  assert.equal(state.active, false);
  assert.equal(state.selectedVehicle, null);
  assert.deepEqual(state.recentRtoNumbers, []);

  const first = MOCK_RTO_REGISTRY[0];
  const second = MOCK_RTO_REGISTRY[1];

  state = applyLiveTrackingSelection(state, first, 1000);
  assert.equal(state.active, true);
  assert.equal(state.selectedVehicle?.vehicleNumber, first.vehicleNumber);
  assert.deepEqual(state.recentRtoNumbers, [first.vehicleNumber]);
  assert.equal(state.lastTriggeredAt, 1000);

  state = applyLiveTrackingSelection(state, second, 2000);
  assert.equal(state.selectedVehicle?.vehicleNumber, second.vehicleNumber);
  assert.deepEqual(state.recentRtoNumbers, [
    second.vehicleNumber,
    first.vehicleNumber,
  ]);

  // Re-selecting the same vehicle moves it to front and guarantees a newer trigger timestamp
  state = applyLiveTrackingSelection(state, first, 2000);
  assert.equal(state.selectedVehicle?.vehicleNumber, first.vehicleNumber);
  assert.deepEqual(state.recentRtoNumbers, [
    first.vehicleNumber,
    second.vehicleNumber,
  ]);
  assert.ok((state.lastTriggeredAt ?? 0) > 2000);
});

test('applyLiveTrackingSelection caps recent RTO searches at 6 and clearLiveTrackingSelection preserves history', () => {
  let state = createInitialLiveTrackingState();
  for (let i = 0; i < Math.min(8, MOCK_RTO_REGISTRY.length); i += 1) {
    state = applyLiveTrackingSelection(state, MOCK_RTO_REGISTRY[i], 1000 + i);
  }
  assert.equal(state.recentRtoNumbers.length, 6);

  const cleared = clearLiveTrackingSelection(state);
  assert.equal(cleared.active, false);
  assert.equal(cleared.selectedVehicle, null);
  assert.equal(cleared.recentRtoNumbers.length, 6);
});

test('stepLiveTrackedVehicle advances Running vehicles and keeps non-running vehicles anchored', () => {
  const runningRec = MOCK_RTO_REGISTRY.find((r) => r.status === 'Running');
  const stationaryRec = MOCK_RTO_REGISTRY.find((r) => r.status !== 'Running');
  assert.ok(runningRec, 'Expected at least one Running mock RTO vehicle');
  assert.ok(stationaryRec, 'Expected at least one non-Running mock RTO vehicle');

  const runningVehicle = toPlatformVehicleFromRtoRecord(runningRec);
  const nextRunning = stepLiveTrackedVehicle(runningVehicle, 2);
  assert.notEqual(nextRunning.lat, runningVehicle.lat);
  assert.equal(nextRunning.trail.length, runningVehicle.trail.length + 1);
  assert.equal(nextRunning.lastUpdated, 'Just now (Live GPS)');

  const parkedVehicle = toPlatformVehicleFromRtoRecord(stationaryRec);
  const nextParked = stepLiveTrackedVehicle(parkedVehicle, 5);
  assert.equal(nextParked.lat, parkedVehicle.lat);
  assert.equal(nextParked.lng, parkedVehicle.lng);
  assert.equal(nextParked.speedKmh, parkedVehicle.speedKmh);
});
