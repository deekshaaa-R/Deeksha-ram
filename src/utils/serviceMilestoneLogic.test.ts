import assert from 'node:assert/strict';
import test from 'node:test';
import type { TrackedDevice } from '../types/index.ts';
import {
  applyOdometerUpdate,
  applyServiceCompletion,
  createSeededMaintenanceRecord,
  evaluateVehicleMilestones,
  getFleetServiceAlerts,
  resolveMaintenanceRecord,
  summarizeServiceHealth,
  validateOdometerInput,
  type MaintenanceMap,
} from './serviceMilestoneLogic.ts';

const MOCK_DEVICES: TrackedDevice[] = [
  {
    id: 'dev-1',
    imei: '864291053829104',
    model: 'VS Pro 4G Wired GPS Tracker',
    vehicleLabel: 'KA-01-TR-4821 (Cargo Van)',
    vehicleType: 'Cargo Van / LCV',
    status: 'Moving',
    speedKmh: 58,
    lastUpdated: 'Just now',
    simExpiry: '2027-10-28',
  },
  {
    id: 'dev-2',
    imei: '864291053829889',
    model: 'VS AI 4G Dashcam',
    vehicleLabel: 'MH-12-FL-9032 (Express Coach)',
    vehicleType: 'Bus / Coach',
    status: 'Idle',
    speedKmh: 0,
    lastUpdated: '2 min ago',
    simExpiry: '2027-08-14',
  },
  {
    id: 'dev-3',
    imei: '864291053824512',
    model: 'VS Ultra Wireless GPS Tracker',
    vehicleLabel: 'TRL-8812 (Reefer Container)',
    vehicleType: 'Refrigerated Van',
    status: 'Alert',
    speedKmh: 42,
    lastUpdated: '1 min ago',
    simExpiry: '2027-06-05',
  },
];

test('validateOdometerInput rejects negative, non-numeric, and out-of-range inputs', () => {
  assert.equal(validateOdometerInput('').ok, false);
  assert.equal(validateOdometerInput('-100').ok, false);
  assert.equal(validateOdometerInput('49500abc').ok, false);
  assert.equal(validateOdometerInput('2500000').ok, false);

  const valid = validateOdometerInput('51,240');
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.odometerKm, 51240);
  }
});

test('seeded demo devices surface Overdue and Approaching service milestones sorted by urgency', () => {
  const map: MaintenanceMap = {};
  const summary = summarizeServiceHealth(MOCK_DEVICES, map);

  assert.equal(summary.totalVehicles, 3);
  assert.equal(summary.vehiclesWithAlerts, 3);
  assert.equal(summary.overdueCount, 3); // dev-2 oil, fuel, transmission at 81,420 vs 80,000 due
  assert.equal(summary.approachingCount, 4); // dev-1 (3 items @ 650km left) + dev-3 (brake @ 1,200km left)
  assert.ok(summary.mostUrgentAlert);
  assert.equal(summary.mostUrgentAlert?.deviceId, 'dev-2');
  assert.equal(summary.mostUrgentAlert?.remainingKm, -1420);
  assert.equal(summary.mostUrgentAlert?.severity, 'Overdue');
});

test('updating odometer transitions a Scheduled milestone into Approaching and Overdue alerts', () => {
  const newVehicle: TrackedDevice = {
    id: 'dev-new',
    imei: '864291053829777',
    model: 'VS Pro 4G Wired GPS Tracker',
    vehicleLabel: 'DL-01-CG-1102',
    vehicleType: 'Commercial Truck / Fleet',
    status: 'Idle',
    speedKmh: 0,
    lastUpdated: 'Just registered',
    simExpiry: '2027-11-17',
  };

  let record = createSeededMaintenanceRecord(newVehicle);
  assert.equal(record.odometerKm, 1250);
  assert.equal(
    evaluateVehicleMilestones(record).filter((m) => m.severity !== 'Scheduled').length,
    0
  );

  // Advance odometer to 9,300 km -> Oil Change due at 10,000 km (700 km remaining <= 1,000 warning window)
  record = applyOdometerUpdate(record, 9300, '2026-11-17');
  const approachingAlerts = evaluateVehicleMilestones(record).filter(
    (m) => m.severity === 'Approaching'
  );
  assert.equal(approachingAlerts.length, 1);
  assert.equal(approachingAlerts[0]?.milestoneId, 'oil_change');
  assert.equal(approachingAlerts[0]?.remainingKm, 700);

  // Advance odometer past 10,000 km to 10,250 km -> Overdue by 250 km
  record = applyOdometerUpdate(record, 10250, '2026-11-17');
  const overdueAlerts = evaluateVehicleMilestones(record).filter(
    (m) => m.severity === 'Overdue'
  );
  assert.equal(overdueAlerts.length, 1);
  assert.equal(overdueAlerts[0]?.milestoneId, 'oil_change');
  assert.equal(overdueAlerts[0]?.remainingKm, -250);
  assert.equal(overdueAlerts[0]?.progressPercent, 100);
});

test('applyServiceCompletion resets milestone baseline to current odometer and clears the alert', () => {
  const dev2 = MOCK_DEVICES[1];
  const initialRecord = resolveMaintenanceRecord(dev2, {});

  const beforeOverdue = evaluateVehicleMilestones(initialRecord).filter(
    (m) => m.severity === 'Overdue'
  );
  assert.equal(beforeOverdue.length, 3);

  const completedOil = applyServiceCompletion(initialRecord, 'oil_change', '2026-11-17');
  const afterOil = evaluateVehicleMilestones(completedOil).find(
    (m) => m.milestoneId === 'oil_change'
  );
  assert.ok(afterOil);
  assert.equal(afterOil?.severity, 'Scheduled');
  assert.equal(afterOil?.lastServicedKm, 81420);
  assert.equal(afterOil?.nextDueKm, 91420);
  assert.equal(afterOil?.remainingKm, 10000);
});

test('getFleetServiceAlerts filters cleanly by severity and deviceId', () => {
  const overdueOnly = getFleetServiceAlerts(MOCK_DEVICES, {}, 'overdue', 'all');
  assert.equal(overdueOnly.length, 3);
  assert.ok(overdueOnly.every((a) => a.severity === 'Overdue'));

  const dev1Approaching = getFleetServiceAlerts(MOCK_DEVICES, {}, 'approaching', 'dev-1');
  assert.equal(dev1Approaching.length, 3);
  assert.ok(dev1Approaching.every((a) => a.deviceId === 'dev-1'));
});
