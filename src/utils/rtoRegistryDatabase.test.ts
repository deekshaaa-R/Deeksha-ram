import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOCK_RTO_REGISTRY,
  mergeLiveFleetWithRtoRegistry,
  queryRtoVehicleDatabase,
  toPlatformVehicleFromRtoRecord,
} from './rtoRegistryDatabase';
import type { PlatformVehicle } from './unifiedPlatformLogic';

const sampleLiveVehicle: PlatformVehicle = {
  id: 'veh-live-1',
  vehicleNumber: 'KA-06-TR-4821',
  nickname: 'NH-48 Express',
  vehicleType: '12-Wheeler Truck',
  vehicleCategory: 'Heavy Commercial',
  deviceModel: 'VS VST-PRO-4G-Pro',
  deviceProtocol: 'AIS-140 / 4G-LTE',
  imei: '862941054821001',
  clientId: 'client-1',
  adminId: 'admin-1',
  sharedWithCustomerIds: [],
  driverName: 'Ramesh Deshpande',
  driverPhone: '+91 98450 11223',
  status: 'Running',
  lat: 13.3512,
  lng: 77.1299,
  speedKmh: 76,
  speedLimitKmh: 75,
  headingDeg: 145,
  ignitionOn: true,
  acOn: true,
  odometerKm: 84295,
  batteryVoltage: 24.6,
  fuelPercent: 72,
  fuelLiters: 216,
  tankCapacityLiters: 300,
  distanceTodayKm: 214.5,
  overspeedCount: 2,
  overstoppageCount: 1,
  routeDeviated: false,
  address: 'NH-48 Tumakuru Bypass Live',
  lastUpdated: 'Just now',
  trail: [[13.3512, 77.1299]],
  plannedRoute: [[13.3512, 77.1299]],
  overspeedEvents: [],
  overstoppageEvents: [],
  fuelEvents: [],
  trips: [],
};

test('mergeLiveFleetWithRtoRegistry enriches live fleet records with RTO metadata and appends PAN-India mock records', () => {
  const merged = mergeLiveFleetWithRtoRegistry([sampleLiveVehicle], true);
  assert.equal(merged.length, MOCK_RTO_REGISTRY.length);

  const liveMerged = merged.find((r) => r.vehicleNumber === 'KA-06-TR-4821');
  assert.ok(liveMerged);
  assert.equal(liveMerged.source, 'live-fleet');
  assert.equal(liveMerged.matchedLiveVehicleId, 'veh-live-1');
  assert.equal(liveMerged.speedKmh, 76); // Live speed overrides static mock
  assert.equal(liveMerged.rtoOffice, 'Tumakuru RTO, Karnataka'); // RTO metadata preserved
  assert.equal(liveMerged.chassisNumber, 'MAT448216N2C04821');

  const registryOnly = merged.find((r) => r.vehicleNumber === 'TN-01-BL-4410');
  assert.ok(registryOnly);
  assert.equal(registryOnly.source, 'rto-registry');
  assert.equal(registryOnly.rtoCode, 'TN-01');
});

test('queryRtoVehicleDatabase resolves flexible RTO numbers, partial digits, RTO offices, and driver names', () => {
  const catalog = mergeLiveFleetWithRtoRegistry([sampleLiveVehicle], true);

  // Exact match ignoring spaces, hyphens, and case
  const exactRes = queryRtoVehicleDatabase(catalog, 'tn 01 bl 4410');
  assert.ok(exactRes.exactMatch);
  assert.equal(exactRes.exactMatch.vehicleNumber, 'TN-01-BL-4410');
  assert.equal(exactRes.results[0].vehicleNumber, 'TN-01-BL-4410');

  // Prefix match returns multiple Karnataka vehicles
  const kaRes = queryRtoVehicleDatabase(catalog, 'KA-06');
  assert.equal(kaRes.exactMatch, null);
  assert.ok(kaRes.results.length >= 2);
  assert.ok(kaRes.results.every((r) => r.vehicleNumber.startsWith('KA-06')));

  // Trailing 4 digits unambiguous match
  const digitsRes = queryRtoVehicleDatabase(catalog, '6192');
  assert.ok(digitsRes.exactMatch);
  assert.equal(digitsRes.exactMatch.vehicleNumber, 'GJ-01-HT-6192');

  // Search by RTO office / city / driver
  const hydRes = queryRtoVehicleDatabase(catalog, 'Kondapur');
  assert.equal(hydRes.results.length, 1);
  assert.equal(hydRes.results[0].vehicleNumber, 'TS-07-UC-7234');

  // Non-existent RTO returns empty list gracefully
  const missingRes = queryRtoVehicleDatabase(catalog, 'ZZ-99-XX-0000');
  assert.equal(missingRes.results.length, 0);
  assert.equal(missingRes.exactMatch, null);
});

test('toPlatformVehicleFromRtoRecord synthesizes a valid live-trackable PlatformVehicle with breadcrumb trail', () => {
  const tnRecord = MOCK_RTO_REGISTRY.find((r) => r.vehicleNumber === 'TN-01-BL-4410');
  assert.ok(tnRecord);

  const liveObj = toPlatformVehicleFromRtoRecord(tnRecord);
  assert.equal(liveObj.vehicleNumber, 'TN-01-BL-4410');
  assert.equal(liveObj.driverName, 'Murugan Selvam');
  assert.equal(liveObj.status, 'Running');
  assert.ok(liveObj.trail.length >= 3);
  assert.equal(liveObj.lat, tnRecord.lat);
  assert.equal(liveObj.lng, tnRecord.lng);
});
