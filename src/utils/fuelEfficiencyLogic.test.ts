import test from 'node:test';
import assert from 'node:assert/strict';
import type { TrackedDevice } from '../types';
import {
  buildFuelEfficiencySeries,
  generateFuelEfficiencyCsv,
  summarizeFuelEfficiency,
} from './fuelEfficiencyLogic';

const INITIAL_DEVICES: TrackedDevice[] = [
  {
    id: 'dev-1',
    imei: '864291053829104',
    model: 'VS Pro 4G Wired GPS Tracker',
    vehicleLabel: 'KA-01-TR-4821 (Cargo Van)',
    status: 'Moving',
    speedKmh: 58,
    lastUpdated: 'Just now',
    simExpiry: '2027-10-28',
  },
  {
    id: 'dev-2',
    imei: '864291053829889',
    model: 'VS AI 4G Dashcam (ADAS + DMS)',
    vehicleLabel: 'MH-12-FL-9032 (Express Coach)',
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
    status: 'Alert',
    speedKmh: 42,
    lastUpdated: '1 min ago',
    simExpiry: '2027-06-05',
  },
];

test('buildFuelEfficiencySeries returns expected period counts for each timeframe', () => {
  assert.equal(buildFuelEfficiencySeries(INITIAL_DEVICES, 'all', '30d').length, 4);
  assert.equal(buildFuelEfficiencySeries(INITIAL_DEVICES, 'all', '90d').length, 6);
  assert.equal(buildFuelEfficiencySeries(INITIAL_DEVICES, 'all', '6m').length, 6);
  assert.equal(buildFuelEfficiencySeries(INITIAL_DEVICES, 'all', '12m').length, 12);
});

test('buildFuelEfficiencySeries handles empty devices list gracefully', () => {
  const points = buildFuelEfficiencySeries([], 'all', '6m');
  assert.deepEqual(points, []);
  const summary = summarizeFuelEfficiency(points);
  assert.equal(summary.avgKmPerL, 0);
  assert.equal(summary.estimatedSavingsInr, 0);
});

test('buildFuelEfficiencySeries scopes metrics per selected vehicle and shows upward efficiency trend', () => {
  const allSeries = buildFuelEfficiencySeries(INITIAL_DEVICES, 'all', '6m');
  const vanSeries = buildFuelEfficiencySeries(INITIAL_DEVICES, 'dev-1', '6m');
  const coachSeries = buildFuelEfficiencySeries(INITIAL_DEVICES, 'dev-2', '6m');

  assert.ok(vanSeries[0].actualKmPerL > coachSeries[0].actualKmPerL);
  assert.ok(vanSeries[vanSeries.length - 1].actualKmPerL > vanSeries[0].actualKmPerL);
  assert.ok(allSeries[0].fuelUsedLiters > vanSeries[0].fuelUsedLiters);

  for (const pt of vanSeries) {
    assert.ok(pt.actualKmPerL > pt.baselineKmPerL);
    assert.ok(pt.fuelSavedLiters > 0);
    assert.ok(pt.savingsInr > 0);
  }
});

test('summarizeFuelEfficiency aggregates totals and percentage improvement accurately', () => {
  const points = buildFuelEfficiencySeries(INITIAL_DEVICES, 'all', '6m');
  const summary = summarizeFuelEfficiency(points);

  assert.ok(summary.avgKmPerL > summary.baselineAvgKmPerL);
  assert.ok(summary.improvementPct > 5);
  assert.ok(summary.totalFuelSavedLiters > 100);
  assert.ok(summary.estimatedSavingsInr > 10000);
  assert.equal(summary.latestKmPerL, points[points.length - 1].actualKmPerL);
  assert.ok(summary.peakKmPerL >= summary.latestKmPerL);
});

test('generateFuelEfficiencyCsv escapes headers and includes all period rows', () => {
  const points = buildFuelEfficiencySeries(INITIAL_DEVICES, 'dev-1', '30d');
  const csv = generateFuelEfficiencyCsv(points, 'KA-01-TR-4821 (Cargo Van)', '30d');
  const lines = csv.trim().split('\n');

  assert.equal(lines.length, 5);
  assert.ok(lines[0].includes('Actual Efficiency (km/L)'));
  assert.ok(lines[1].includes('KA-01-TR-4821 (Cargo Van)'));
  assert.ok(lines[1].includes('30D'));
});
