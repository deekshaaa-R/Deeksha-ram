import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTrackedDeviceFromRegistration,
  buildVehicleDeviceId,
  computeDefaultSimExpiry,
  defaultModelForVehicleType,
  filterRegisteredVehicles,
  normalizeImeiInput,
  validateVehicleRegistrationFields,
  VEHICLE_TYPE_OPTIONS,
} from './vehicleDeviceLogic.ts';
import type { TrackedDevice } from '../types';

test('normalizeImeiInput strips non-digits and enforces 15-digit limit', () => {
  assert.equal(normalizeImeiInput('8642-9105 3829 555999'), '864291053829555');
  assert.equal(normalizeImeiInput('abc123def'), '123');
});

test('validateVehicleRegistrationFields rejects invalid IMEI, duplicate IMEI, bad nickname, and invalid vehicleType', () => {
  const emptyErrors = validateVehicleRegistrationFields({
    imei: '',
    nickname: 'A',
    vehicleType: 'Invalid Type',
  });
  assert.ok(emptyErrors.imei);
  assert.ok(emptyErrors.nickname);
  assert.ok(emptyErrors.vehicleType);

  const duplicateErrors = validateVehicleRegistrationFields(
    {
      imei: '864291053829104',
      nickname: 'KA-05-FL-7721',
      vehicleType: 'Refrigerated Van',
    },
    ['864291053829104']
  );
  assert.match(duplicateErrors.imei ?? '', /already registered/i);
  assert.equal(duplicateErrors.nickname, undefined);
  assert.equal(duplicateErrors.vehicleType, undefined);

  const oversizedNicknameErrors = validateVehicleRegistrationFields({
    imei: '864291053829555',
    nickname: 'X'.repeat(81),
    vehicleType: 'Cargo Van / LCV',
  });
  assert.ok(oversizedNicknameErrors.nickname);
});

test('validateVehicleRegistrationFields accepts valid 15-digit IMEI, nickname, and all blueprint vehicle types', () => {
  assert.equal(VEHICLE_TYPE_OPTIONS.length, 7);
  for (const vehicleType of VEHICLE_TYPE_OPTIONS) {
    const errors = validateVehicleRegistrationFields({
      imei: '864291053829555',
      nickname: 'KA-05-FL-7721 (Cold Chain)',
      vehicleType,
      model: defaultModelForVehicleType(vehicleType),
    });
    assert.deepEqual(errors, {});
  }
});

test('buildVehicleDeviceId and buildTrackedDeviceFromRegistration create compliant device records', () => {
  const deviceId = buildVehicleDeviceId('864291053829555', 'uid/test@123');
  assert.match(deviceId, /^[a-zA-Z0-9_-]{1,128}$/);
  assert.ok(deviceId.startsWith('veh_864291053829555_'));

  const simExpiry = computeDefaultSimExpiry(new Date('2026-11-17T00:00:00Z'));
  assert.equal(simExpiry, '2027-11-17');

  const device = buildTrackedDeviceFromRegistration({
    deviceId,
    imei: '864291053829555',
    nickname: 'KA-05-FL-7721 (Cold Chain)',
    vehicleType: 'Refrigerated Van',
    simExpiry,
    cloudSynced: true,
  });

  assert.equal(device.id, deviceId);
  assert.equal(device.imei, '864291053829555');
  assert.equal(device.vehicleLabel, 'KA-05-FL-7721 (Cold Chain)');
  assert.equal(device.vehicleType, 'Refrigerated Van');
  assert.equal(device.model, 'VS Ultra Wireless GPS Tracker');
  assert.equal(device.status, 'Idle');
  assert.equal(device.speedKmh, 0);
  assert.equal(device.cloudSynced, true);
});

test('filterRegisteredVehicles filters by vehicle nickname or IMEI (partial, case-insensitive, and formatted)', () => {
  const sampleDevices: TrackedDevice[] = [
    {
      id: 'dev-1',
      imei: '864291053829104',
      model: 'VS Pro 4G Wired GPS Tracker',
      vehicleLabel: 'KA-01-TR-4821 (Cargo Van)',
      vehicleType: 'Cargo Van / LCV',
      status: 'Moving',
      speedKmh: 58,
      lastUpdated: 'Just now',
      simExpiry: '2027-06-15',
    },
    {
      id: 'dev-2',
      imei: '864291053829881',
      model: 'VS AI 4G Dashcam (ADAS + DMS)',
      vehicleLabel: 'MH-12-FL-9032 (Express Coach)',
      vehicleType: 'Bus / Coach',
      status: 'Moving',
      speedKmh: 66,
      lastUpdated: '1 min ago',
      simExpiry: '2027-08-20',
    },
    {
      id: 'dev-3',
      imei: '861049203992014',
      model: 'VS Ultra Wireless GPS Tracker',
      vehicleLabel: 'TRL-8812 (Reefer Container)',
      vehicleType: 'Refrigerated Van',
      status: 'Idle',
      speedKmh: 0,
      lastUpdated: '12 mins ago',
      simExpiry: '2027-04-01',
    },
  ];

  // Blank or whitespace query returns all
  assert.equal(filterRegisteredVehicles(sampleDevices, '').length, 3);
  assert.equal(filterRegisteredVehicles(sampleDevices, '   ').length, 3);

  // Case-insensitive nickname / plate match
  const byNickname = filterRegisteredVehicles(sampleDevices, 'cargo van');
  assert.equal(byNickname.length, 1);
  assert.equal(byNickname[0]?.id, 'dev-1');

  const byPlate = filterRegisteredVehicles(sampleDevices, 'trl-8812');
  assert.equal(byPlate.length, 1);
  assert.equal(byPlate[0]?.id, 'dev-3');

  // Partial IMEI & formatted IMEI (spaces/dashes) match
  const byPartialImei = filterRegisteredVehicles(sampleDevices, '992014');
  assert.equal(byPartialImei.length, 1);
  assert.equal(byPartialImei[0]?.id, 'dev-3');

  const byFormattedImei = filterRegisteredVehicles(sampleDevices, '8642 9105-3829 881');
  assert.equal(byFormattedImei.length, 1);
  assert.equal(byFormattedImei[0]?.id, 'dev-2');

  // Shared IMEI prefix matches multiple units
  const bySharedPrefix = filterRegisteredVehicles(sampleDevices, '864291');
  assert.equal(bySharedPrefix.length, 2);

  // Unmatched query returns empty list
  assert.deepEqual(filterRegisteredVehicles(sampleDevices, '999999999'), []);
});

