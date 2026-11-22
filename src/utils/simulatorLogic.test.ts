import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_CRITICAL_ALERTS,
  INITIAL_LIVE_VEHICLES,
  applyScenarioToVehicle,
  applySpeedOverride,
  filterAlertFeed,
  formatCoordinates,
  generateDynamicSimulationAlert,
  stepSimulatedFleet,
  summarizeAlertFeed,
} from './simulatorLogic';

test('applySpeedOverride transitions status indicators across idle, moving, and overspeed alert', () => {
  const base = INITIAL_LIVE_VEHICLES[0];

  const idleRes = applySpeedOverride(base, 0);
  assert.equal(idleRes.vehicle.speed, 0);
  assert.equal(idleRes.vehicle.status, 'Idle');
  assert.equal(idleRes.alert, null);

  const movingRes = applySpeedOverride(base, 58);
  assert.equal(movingRes.vehicle.speed, 58);
  assert.equal(movingRes.vehicle.status, 'Moving');
  assert.equal(movingRes.alert, null);

  const alertRes = applySpeedOverride(base, 94);
  assert.equal(alertRes.vehicle.speed, 94);
  assert.equal(alertRes.vehicle.status, 'Alert');
  assert.ok(alertRes.alert?.title.includes('Overspeed'));
  assert.equal(alertRes.alert?.severity, 'critical');
});

test('applyScenarioToVehicle applies geofence, harsh-braking, overspeed, idle, cruise, and immobilize scenarios', () => {
  const base = INITIAL_LIVE_VEHICLES[0];

  const geo = applyScenarioToVehicle(base, 'geofence');
  assert.equal(geo.vehicle.status, 'Alert');
  assert.ok(geo.alert?.title.includes('Geofence'));
  assert.equal(geo.alert?.severity, 'critical');

  const brake = applyScenarioToVehicle(base, 'harsh-braking');
  assert.equal(brake.vehicle.status, 'Alert');
  assert.equal(brake.vehicle.speed, 24);
  assert.equal(brake.alert?.category, 'Harsh Braking');
  assert.equal(brake.alert?.severity, 'critical');

  const idle = applyScenarioToVehicle(base, 'idle');
  assert.equal(idle.vehicle.status, 'Idle');
  assert.equal(idle.alert?.category, 'Engine Idle Too Long');
  assert.equal(idle.alert?.severity, 'warning');

  const imm = applyScenarioToVehicle(base, 'immobilize');
  assert.equal(imm.vehicle.speed, 0);
  assert.equal(imm.vehicle.status, 'Idle');
  assert.equal(imm.vehicle.ignitionOn, false);
  assert.equal(imm.vehicle.immobilized, true);
  assert.ok(imm.alert?.title.includes('Cut-Off'));
  assert.equal(imm.alert?.severity, 'warning');

  const cruise = applyScenarioToVehicle(imm.vehicle, 'cruise');
  assert.equal(cruise.vehicle.status, 'Moving');
  assert.equal(cruise.vehicle.ignitionOn, true);
  assert.equal(cruise.vehicle.immobilized, false);
  assert.equal(cruise.alert, null);
});

test('stepSimulatedFleet moves active vehicles and coordinates while keeping idle vehicles stationary', () => {
  const next = stepSimulatedFleet(INITIAL_LIVE_VEHICLES, 3);
  const idleVehicle = next.find((v) => v.id === 'v3');
  assert.equal(idleVehicle?.speed, 0);
  assert.equal(idleVehicle?.x, INITIAL_LIVE_VEHICLES[2].x);
  assert.equal(idleVehicle?.lat, INITIAL_LIVE_VEHICLES[2].lat);

  const movingVehicle = next.find((v) => v.id === 'v1');
  assert.ok(movingVehicle && movingVehicle.speed >= 42);
  assert.notEqual(movingVehicle?.lng, INITIAL_LIVE_VEHICLES[0].lng);
});

test('INITIAL_CRITICAL_ALERTS and generateDynamicSimulationAlert cover Geofence Breach, Engine Idle Too Long, and Harsh Braking with Red/Amber severities', () => {
  const categories = new Set(INITIAL_CRITICAL_ALERTS.map((a) => a.category));
  assert.ok(categories.has('Geofence Breach'));
  assert.ok(categories.has('Engine Idle Too Long'));
  assert.ok(categories.has('Harsh Braking'));

  assert.equal(generateDynamicSimulationAlert(INITIAL_LIVE_VEHICLES, 1), null);
  const tick3 = generateDynamicSimulationAlert(INITIAL_LIVE_VEHICLES, 3);
  const tick6 = generateDynamicSimulationAlert(INITIAL_LIVE_VEHICLES, 6);
  const tick9 = generateDynamicSimulationAlert(INITIAL_LIVE_VEHICLES, 9);

  assert.equal(tick3?.category, 'Engine Idle Too Long');
  assert.equal(tick3?.severity, 'warning');

  assert.equal(tick6?.category, 'Geofence Breach');
  assert.equal(tick6?.severity, 'critical');

  assert.equal(tick9?.category, 'Harsh Braking');
  assert.equal(tick9?.severity, 'critical');
});

test('filterAlertFeed and summarizeAlertFeed compute active severity counts accurately', () => {
  const summary = summarizeAlertFeed(INITIAL_CRITICAL_ALERTS);
  assert.equal(summary.total, 3);
  assert.equal(summary.unacknowledged, 3);
  assert.equal(summary.criticalCount, 2);
  assert.equal(summary.warningCount, 1);

  assert.equal(filterAlertFeed(INITIAL_CRITICAL_ALERTS, 'critical').length, 2);
  assert.equal(filterAlertFeed(INITIAL_CRITICAL_ALERTS, 'warning').length, 1);
  assert.equal(filterAlertFeed(INITIAL_CRITICAL_ALERTS, 'all').length, 3);
});

test('formatCoordinates formats latitude and longitude cleanly', () => {
  assert.equal(formatCoordinates(12.8985, 77.6382), '12.8985° N, 77.6382° E');
});
