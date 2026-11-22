import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GPS_DEVICE_CATALOG,
  ROLE_NAV_MATRIX,
  VEHICLE_TYPES_CATALOG,
  buildApiIntegrationsCatalog,
  buildNearbyAmenities,
  filterVehiclesBySearch,
  generateVehiclesCsvReport,
  getPrimaryMobileTabs,
  maskVehicleForCustomer,
  scopeVehiclesForUser,
  stepPlatformTelemetry,
  summarizeFleetMetrics,
  type PlatformUser,
  type PlatformVehicle,
} from './unifiedPlatformLogic';

const SAMPLE_VEHICLES: PlatformVehicle[] = [
  {
    id: 'veh-1',
    vehicleNumber: 'KA-06-TR-4821',
    nickname: 'NH-48 Express Truck',
    vehicleType: '12-Wheeler Truck',
    vehicleCategory: 'Heavy Commercial',
    deviceModel: 'VS VST-PRO-4G-Pro',
    deviceProtocol: 'GT06/VST4G',
    imei: '864209051284921',
    adminId: 'admin-1',
    clientId: 'client-1',
    sharedWithCustomerIds: ['cust-1'],
    driverName: 'R. Deshpande',
    driverPhone: '+91 98450 11223',
    status: 'Running',
    lat: 13.3379,
    lng: 77.1173,
    headingDeg: 45,
    speedKmh: 62,
    speedLimitKmh: 75,
    odometerKm: 84210.5,
    distanceTodayKm: 194.2,
    batteryVoltage: 24.4,
    acOn: true,
    ignitionOn: true,
    fuelPercent: 74,
    fuelLiters: 237,
    tankCapacityLiters: 320,
    address: 'NH-48 Tumkuru Bypass, Karnataka',
    lastUpdated: 'Live · just now',
    overspeedCount: 1,
    overstoppageCount: 0,
    routeDeviated: false,
    plannedRoute: [[13.33, 77.11], [13.35, 77.13]],
    trail: [[13.3379, 77.1173]],
    overspeedEvents: [],
    overstoppageEvents: [],
    fuelEvents: [],
    trips: [
      { id: 't1', date: '2026-11-20', startLocation: 'Tumkuru', endLocation: 'Bengaluru', distanceKm: 72, maxSpeedKmh: 74, avgSpeedKmh: 52, durationMins: 83, fuelConsumedLiters: 17, points: [[13.33, 77.11], [12.97, 77.59]] },
      { id: 't2', date: '2026-11-18', startLocation: 'Bengaluru', endLocation: 'Hosur', distanceKm: 42, maxSpeedKmh: 68, avgSpeedKmh: 45, durationMins: 56, fuelConsumedLiters: 10, points: [[12.97, 77.59], [12.74, 77.82]] },
      { id: 't3', date: '2026-11-12', startLocation: 'Hosur', endLocation: 'Salem', distanceKm: 158, maxSpeedKmh: 76, avgSpeedKmh: 58, durationMins: 162, fuelConsumedLiters: 36, points: [[12.74, 77.82], [11.66, 78.14]] },
    ],
  },
  {
    id: 'veh-2',
    vehicleNumber: 'MH-12-EV-9032',
    nickname: 'Pune E-Rickshaw Cargo',
    vehicleType: 'E-Rickshaw Cargo Loader',
    vehicleCategory: 'Two & Three Wheeler',
    deviceModel: 'Teltonika FMB-920',
    deviceProtocol: 'Codec8E',
    imei: '864209051289889',
    adminId: 'admin-2',
    clientId: 'client-2',
    sharedWithCustomerIds: [],
    driverName: 'S. Kulkarni',
    driverPhone: '+91 98220 44551',
    status: 'Stationary',
    lat: 18.5204,
    lng: 73.8567,
    headingDeg: 180,
    speedKmh: 0,
    speedLimitKmh: 45,
    odometerKm: 12440.0,
    distanceTodayKm: 34.8,
    batteryVoltage: 12.6,
    acOn: false,
    ignitionOn: false,
    fuelPercent: 60,
    fuelLiters: 8,
    tankCapacityLiters: 14,
    address: 'Chakan MIDC Gate 2, Pune',
    lastUpdated: 'Stationary · live',
    overspeedCount: 0,
    overstoppageCount: 2,
    routeDeviated: true,
    plannedRoute: [[18.52, 73.85], [18.54, 73.87]],
    trail: [[18.5204, 73.8567]],
    overspeedEvents: [],
    overstoppageEvents: [],
    fuelEvents: [],
    trips: [],
  },
];

test('catalogs meet 150+ vehicle types, 250+ GPS devices, and 100+ API integrations requirements', () => {
  assert.ok(VEHICLE_TYPES_CATALOG.length >= 150, `Expected >=150 vehicle types, got ${VEHICLE_TYPES_CATALOG.length}`);
  assert.ok(GPS_DEVICE_CATALOG.length >= 250, `Expected >=250 GPS devices, got ${GPS_DEVICE_CATALOG.length}`);
  const apis = buildApiIntegrationsCatalog();
  assert.ok(apis.length >= 100, `Expected >=100 API integrations, got ${apis.length}`);
});

test('ROLE_NAV_MATRIX defines all 4 roles x 3 platforms (12 versions) and <=5 mobile tabs', () => {
  const roles = ['super_admin', 'admin', 'client', 'customer'] as const;
  for (const role of roles) {
    const spec = ROLE_NAV_MATRIX[role];
    assert.ok(spec.screens.length >= 9);
    assert.ok(spec.defaultScreens.laptop);
    assert.ok(spec.defaultScreens.android);
    assert.ok(spec.defaultScreens.iphone);
    const mobileTabs = getPrimaryMobileTabs(role);
    assert.ok(mobileTabs.length >= 4 && mobileTabs.length <= 5);
  }
  assert.equal(ROLE_NAV_MATRIX.client.androidLayoutMode, 'map-first');
  assert.equal(ROLE_NAV_MATRIX.customer.androidLayoutMode, 'map-first');
  assert.equal(ROLE_NAV_MATRIX.super_admin.androidLayoutMode, 'dashboard-first');
  assert.equal(ROLE_NAV_MATRIX.admin.androidLayoutMode, 'dashboard-first');
});

test('scopeVehiclesForUser enforces strict role isolation and customer permission masking', () => {
  const superAdmin: PlatformUser = { id: 'sa-1', name: 'SA', email: 'sa@v.in', phone: '1', role: 'super_admin', company: 'VS', status: 'Active', createdAt: '2026-01-01' };
  const admin1: PlatformUser = { id: 'admin-1', name: 'A1', email: 'a1@v.in', phone: '2', role: 'admin', company: 'West', status: 'Active', createdAt: '2026-01-01' };
  const client1: PlatformUser = { id: 'client-1', name: 'C1', email: 'c1@v.in', phone: '3', role: 'client', company: 'Logi', status: 'Active', adminId: 'admin-1', createdAt: '2026-01-01' };
  const customerRestricted: PlatformUser = {
    id: 'cust-1',
    name: 'Cust',
    email: 'cu@v.in',
    phone: '4',
    role: 'customer',
    company: 'Retail',
    status: 'Active',
    adminId: 'admin-1',
    clientId: 'client-1',
    sharedVehicleIds: ['veh-1'],
    permissions: { canViewOdometer: false, canViewBattery: false, canViewAc: true, historyDaysLimit: 2 },
    createdAt: '2026-01-01',
  };

  assert.equal(scopeVehiclesForUser(SAMPLE_VEHICLES, superAdmin).length, 2);
  assert.equal(scopeVehiclesForUser(SAMPLE_VEHICLES, admin1).length, 1);
  assert.equal(scopeVehiclesForUser(SAMPLE_VEHICLES, client1).length, 1);

  const custScoped = scopeVehiclesForUser(SAMPLE_VEHICLES, customerRestricted);
  assert.equal(custScoped.length, 1);
  assert.equal(custScoped[0].odometerKm, null);
  assert.equal(custScoped[0].batteryVoltage, null);
  assert.equal(custScoped[0].acOn, true);
  assert.equal(custScoped[0].trips.length, 1);

  const allowedMask = maskVehicleForCustomer(SAMPLE_VEHICLES[0], {
    canViewOdometer: true,
    canViewBattery: true,
    canViewAc: false,
    historyDaysLimit: 10,
  });
  assert.equal(allowedMask.odometerKm, 84210.5);
  assert.equal(allowedMask.acOn, null);
});

test('stepPlatformTelemetry advances Running vehicles and preserves Stationary vehicles', () => {
  const next = stepPlatformTelemetry(SAMPLE_VEHICLES, 3);
  assert.notEqual(next[0].lat, SAMPLE_VEHICLES[0].lat);
  assert.ok((next[0].odometerKm ?? 0) > (SAMPLE_VEHICLES[0].odometerKm ?? 0));
  assert.equal(next[1].speedKmh, 0);
  assert.equal(next[1].lat, SAMPLE_VEHICLES[1].lat);
});

test('filterVehiclesBySearch, summarizeFleetMetrics, CSV report, and nearby amenities behave accurately', () => {
  assert.equal(filterVehiclesBySearch(SAMPLE_VEHICLES, 'KA-06').length, 1);
  assert.equal(filterVehiclesBySearch(SAMPLE_VEHICLES, '', 'Stationary').length, 1);

  const summary = summarizeFleetMetrics(SAMPLE_VEHICLES);
  assert.equal(summary.total, 2);
  assert.equal(summary.running, 1);
  assert.equal(summary.stationary, 1);
  assert.equal(summary.overspeedCount, 1);
  assert.equal(summary.overstoppageCount, 2);

  const csv = generateVehiclesCsvReport(SAMPLE_VEHICLES);
  assert.ok(csv.includes('Vehicle Number,Type,Status'));
  assert.ok(csv.includes('KA-06-TR-4821'));

  const amenities = buildNearbyAmenities(13.3379, 77.1173);
  assert.equal(amenities.length, 5);
  assert.ok(amenities.some((a) => a.category === 'Fuel Pump'));
  assert.ok(amenities.some((a) => a.category === 'Hospital'));
  assert.ok(amenities.some((a) => a.category === 'Garage'));
});
