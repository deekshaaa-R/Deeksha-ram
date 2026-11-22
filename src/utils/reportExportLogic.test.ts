import assert from 'node:assert/strict';
import test from 'node:test';
import type { TrackedDevice } from '../types/index.ts';
import {
  buildAdministrativeReportBundle,
  buildReportFilename,
  buildVehicleTrackingLogs,
  generateAdministrativeCsv,
  generateTrackingLogsCsv,
} from './reportExportLogic.ts';

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
];

test('buildVehicleTrackingLogs respects device scope and incorporates updated odometer readings', () => {
  const maint = {
    '864291053829104': {
      deviceId: 'dev-1',
      imei: '864291053829104',
      odometerKm: 51200,
      lastServiceOdometers: {
        oil_change: 40000,
        air_filter: 35000,
        fuel_filter: 40000,
        brake_inspection: 25000,
        transmission_oil: 20000,
      },
      updatedAt: '2026-11-17',
    },
  };

  const allLogs = buildVehicleTrackingLogs(MOCK_DEVICES, maint, 'all', '30d');
  assert.equal(allLogs.length, 8); // 4 per vehicle in 30d

  const singleLogs = buildVehicleTrackingLogs(MOCK_DEVICES, maint, 'dev-1', '6m');
  assert.equal(singleLogs.length, 6);
  assert.ok(singleLogs.every((l) => l.deviceId === 'dev-1'));
  assert.equal(singleLogs[0]?.odometerKm, 51200);
});

test('generateTrackingLogsCsv produces properly escaped RFC-4180 CSV with tracking headers', () => {
  const logs = buildVehicleTrackingLogs(MOCK_DEVICES, {}, 'all', '30d');
  const csv = generateTrackingLogsCsv(logs, 'All Fleet Units (2)', '30d');
  const lines = csv.split('\n');

  assert.equal(lines.length, 9); // 1 header + 8 entries
  assert.match(lines[0] ?? '', /^Timestamp,Vehicle,IMEI,Vehicle Type,Event Type,Status,Speed \(km\/h\),Odometer \(km\)/);
  assert.match(csv, /864291053829104/);
});

test('generateAdministrativeCsv builds combined audit report containing both fuel and tracking sections', () => {
  const bundle = buildAdministrativeReportBundle({
    devices: MOCK_DEVICES,
    maintenanceByImei: {},
    selectedDeviceId: 'all',
    timeRange: '6m',
    scope: 'combined',
    accountName: 'Arjun Mehta',
    companyName: 'Mehta Logistics Pvt. Ltd.',
    generatedAt: '2026-11-17 22:35 UTC',
  });

  const csv = generateAdministrativeCsv(bundle);
  assert.match(csv, /SECTION 1: FUEL EFFICIENCY & SAVINGS SUMMARY/);
  assert.match(csv, /SECTION 2: VEHICLE TRACKING & ODOMETER LOGS/);
  assert.match(csv, /Arjun Mehta/);
  assert.match(csv, /Mehta Logistics Pvt\. Ltd\./);
  assert.equal(bundle.trackingLogs.length, 12);
  assert.equal(bundle.fuelSeries.length, 6);
});

test('buildReportFilename generates descriptive filenames per scope, vehicle, timeframe, and format', () => {
  assert.equal(
    buildReportFilename('combined', 'pdf', '6m', 'all', MOCK_DEVICES),
    'vs-fleet-audit-all-units-6m.pdf'
  );
  assert.equal(
    buildReportFilename('tracking', 'csv', '30d', 'dev-1', MOCK_DEVICES),
    'vs-tracking-logs-ka01tr4821-30d.csv'
  );
  assert.equal(
    buildReportFilename('fuel', 'pdf', '12m', 'dev-2', MOCK_DEVICES),
    'vs-fuel-efficiency-mh12fl9032-12m.pdf'
  );
});
