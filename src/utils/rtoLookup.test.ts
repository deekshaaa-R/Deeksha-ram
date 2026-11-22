import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceVehicleAlongCorridor,
  computeHeadingLabel,
  CUSTOMER_STAGE_SPECS,
  detectDefaultCustomerStage,
  findVehicleByRtoNumber,
  formatRtoDisplay,
  INDIAN_CORRIDORS,
  normalizeRtoNumber,
  parseCustomerStage,
  validateIndianRtoInput,
  type LiveTrackVehicleRecord,
} from './rtoLookup';

const SAMPLE_VEHICLES: LiveTrackVehicleRecord[] = [
  {
    id: 'v1',
    vehicleNumber: 'KA-06-TR-4821',
    transporterId: 'tr-1',
    transporterName: 'Deccan Logistics Pvt Ltd',
    deviceImeiMasked: '•••••••••••3809',
    driverName: 'Manjunath Gowda',
    driverPhone: '+91 98452 71340',
    lat: 13.3379,
    lng: 77.1173,
    speedKmh: 58,
    vehicleState: 'Move',
    currentStatus: 'Moving · Ignition ON',
    acOn: true,
    fuelPercent: 74,
    fuelLiters: 222,
    odometerKm: 84214.6,
    batteryVoltage: 24.4,
    updatedAt: '2026-11-20T12:00:00.000Z',
    exactLocation: {
      address: 'NH-48 Service Road, Kyathasandra, Tumakuru, Karnataka 572104',
      road: 'NH-48 Tumakuru–Bengaluru Expressway',
      landmark: 'Near Kyathasandra Toll Gate',
      city: 'Tumakuru',
      state: 'Karnataka',
      pincode: '572104',
      headingDeg: 132,
      headingLabel: 'South-East',
      accuracyMeters: 5,
    },
    routeTrail: [[13.3379, 77.1173]],
    onboardingProfile: {
      transporter: { companyName: 'Deccan Logistics Pvt Ltd', phone: '+91 80 4123 9900' },
      device: {
        imeiMasked: '•••••••••••3809',
        simMasked: '••••••••••••••••••••3456',
        simOperator: 'Bsnl (bsnl)',
        deviceType: 'Seaworld-R12 (5023)',
      },
      vehicle: {
        vehicleNumber: 'KA-06-TR-4821',
        vehicleType: 'Truck',
        vehicleNickname: 'Deccan Hauler 01',
      },
    },
  },
  {
    id: 'v2',
    vehicleNumber: 'MH-12-SC-9044',
    transporterId: 'tr-2',
    transporterName: 'Sahyadri Cold-Chain Express',
    deviceImeiMasked: '•••••••••••7518',
    driverName: 'Prakash Kulkarni',
    driverPhone: '+91 97641 22089',
    lat: 18.5913,
    lng: 73.7389,
    speedKmh: 0,
    vehicleState: 'Stop',
    currentStatus: 'Stopped · Ignition OFF',
    acOn: false,
    fuelPercent: 61,
    fuelLiters: 110,
    odometerKm: 41890.2,
    batteryVoltage: 12.6,
    updatedAt: '2026-11-20T12:00:00.000Z',
    exactLocation: {
      address: 'Mumbai–Bengaluru Bypass, Wakad, Pimpri-Chinchwad, Pune, Maharashtra 411057',
      road: 'Mumbai–Pune Expressway (NH-48)',
      landmark: 'Near Hinjawadi Phase 1 Flyover',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411057',
      headingDeg: 310,
      headingLabel: 'North-West',
      accuracyMeters: 6,
    },
    routeTrail: [[18.5913, 73.7389]],
    onboardingProfile: {
      transporter: { companyName: 'Sahyadri Cold-Chain Express', phone: '+91 20 2765 8810' },
      device: {
        imeiMasked: '•••••••••••7518',
        simMasked: '••••••••••••••••••••7654',
        simOperator: 'Airtel M2M (airtel)',
        deviceType: 'Concox GT06N (5023)',
      },
      vehicle: {
        vehicleNumber: 'MH-12-SC-9044',
        vehicleType: 'Refrigerated Van',
      },
    },
  },
];

test('RTO normalization & formatting handle spaces, hyphens, and lowercase input', () => {
  assert.equal(normalizeRtoNumber('ka-06 tr 4821'), 'KA06TR4821');
  assert.equal(normalizeRtoNumber('MH12SC9044'), 'MH12SC9044');
  assert.equal(formatRtoDisplay('ka06tr4821'), 'KA-06-TR-4821');
});

test('findVehicleByRtoNumber resolves exact normalized RTO, partial unique RTO, and driver phone', () => {
  const exact = findVehicleByRtoNumber(SAMPLE_VEHICLES, 'ka06tr4821');
  assert.equal(exact.exactMatch?.vehicleNumber, 'KA-06-TR-4821');
  assert.equal(exact.exactMatch?.driverPhone, '+91 98452 71340');

  const hyphenated = findVehicleByRtoNumber(SAMPLE_VEHICLES, 'MH-12-SC-9044');
  assert.equal(hyphenated.exactMatch?.driverName, 'Prakash Kulkarni');

  const partial = findVehicleByRtoNumber(SAMPLE_VEHICLES, '9044');
  assert.equal(partial.exactMatch?.vehicleNumber, 'MH-12-SC-9044');

  const missing = findVehicleByRtoNumber(SAMPLE_VEHICLES, 'DL-01-ZZ-9999');
  assert.equal(missing.exactMatch, null);
  assert.equal(missing.suggestions.length, 0);
});

test('advanceVehicleAlongCorridor moves Moving vehicles along road corridor and preserves Stopped vehicles', () => {
  const moved = advanceVehicleAlongCorridor(
    SAMPLE_VEHICLES[0],
    INDIAN_CORRIDORS.tumakuruBengaluru,
    1,
    '2026-11-20T12:00:04.000Z'
  );
  assert.notEqual(moved.lat, SAMPLE_VEHICLES[0].lat);
  assert.equal(moved.routeTrail.length, 2);
  assert.ok(moved.exactLocation.address.includes('Dabaspete'));
  assert.ok(moved.odometerKm > SAMPLE_VEHICLES[0].odometerKm);

  const stopped = advanceVehicleAlongCorridor(
    SAMPLE_VEHICLES[1],
    INDIAN_CORRIDORS.puneMumbai,
    1,
    '2026-11-20T12:00:04.000Z'
  );
  assert.equal(stopped.lat, SAMPLE_VEHICLES[1].lat);
  assert.equal(stopped.lng, SAMPLE_VEHICLES[1].lng);
});

test('3-stage customer platform detection, URL parsing, and install specs work for Android, iPhone, and Laptop/PC', () => {
  assert.equal(parseCustomerStage('android'), 'android');
  assert.equal(parseCustomerStage('ios'), 'iphone');
  assert.equal(parseCustomerStage('iphone'), 'iphone');
  assert.equal(parseCustomerStage('laptop'), 'web');
  assert.equal(parseCustomerStage('pc'), 'web');

  assert.equal(detectDefaultCustomerStage('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 390), 'iphone');
  assert.equal(detectDefaultCustomerStage('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 412), 'android');
  assert.equal(detectDefaultCustomerStage('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 1440), 'web');

  assert.equal(Object.keys(CUSTOMER_STAGE_SPECS).length, 3);
  assert.equal(CUSTOMER_STAGE_SPECS.android.installSteps.length, 3);
  assert.equal(CUSTOMER_STAGE_SPECS.iphone.installSteps.length, 3);
  assert.equal(CUSTOMER_STAGE_SPECS.web.installSteps.length, 3);
  assert.equal(computeHeadingLabel(90), 'East');
  assert.equal(computeHeadingLabel(225), 'South-West');
});

test('validateIndianRtoInput accepts valid standard Indian RTO and Bharat Series formats', () => {
  const stdHyphen = validateIndianRtoInput('KA-01-AB-1234');
  assert.equal(stdHyphen.isValid, true);
  assert.equal(stdHyphen.status, 'valid');
  assert.equal(stdHyphen.formattedValue, 'KA-01-AB-1234');
  assert.equal(stdHyphen.stateCode, 'KA');
  assert.equal(stdHyphen.stateName, 'Karnataka');
  assert.deepEqual(stdHyphen.segments, {
    state: 'valid',
    rto: 'valid',
    series: 'valid',
    number: 'valid',
  });

  // Lowercase & compact input without hyphens
  const compact = validateIndianRtoInput('mh12sc9044');
  assert.equal(compact.isValid, true);
  assert.equal(compact.formattedValue, 'MH-12-SC-9044');
  assert.equal(compact.stateName, 'Maharashtra');

  // Spaces, 1-letter series, and 3-letter series
  assert.equal(validateIndianRtoInput('DL 01 C 4821').formattedValue, 'DL-01-C-4821');
  assert.equal(validateIndianRtoInput('HR-55-LOG-8812').isValid, true);

  // Bharat Series (BH)
  const bh = validateIndianRtoInput('22-BH-1234-AA');
  assert.equal(bh.isValid, true);
  assert.equal(bh.formatKind, 'bharat');
  assert.equal(bh.formattedValue, '22-BH-1234-AA');
});

test('validateIndianRtoInput gives progressive incomplete feedback while typing and rejects malformed plates', () => {
  // Empty input
  const empty = validateIndianRtoInput('');
  assert.equal(empty.isValid, false);
  assert.equal(empty.status, 'empty');

  // Progressive valid prefixes
  const stateOnly = validateIndianRtoInput('KA');
  assert.equal(stateOnly.isValid, false);
  assert.equal(stateOnly.status, 'incomplete');
  assert.equal(stateOnly.segments.state, 'valid');
  assert.equal(stateOnly.segments.rto, 'idle');

  const stateAndDistrict = validateIndianRtoInput('KA-01');
  assert.equal(stateAndDistrict.status, 'incomplete');
  assert.equal(stateAndDistrict.segments.state, 'valid');
  assert.equal(stateAndDistrict.segments.rto, 'valid');
  assert.equal(stateAndDistrict.segments.series, 'idle');

  const partialDigits = validateIndianRtoInput('KA-01-AB-12');
  assert.equal(partialDigits.status, 'incomplete');
  assert.equal(partialDigits.segments.series, 'valid');
  assert.equal(partialDigits.segments.number, 'idle');

  // Invalid state code
  const badState = validateIndianRtoInput('XX-01-AB-1234');
  assert.equal(badState.isValid, false);
  assert.equal(badState.status, 'invalid');
  assert.equal(badState.segments.state, 'invalid');

  // Invalid district 00
  const badDistrict = validateIndianRtoInput('KA-00-AB-1234');
  assert.equal(badDistrict.isValid, false);
  assert.equal(badDistrict.status, 'invalid');
  assert.equal(badDistrict.segments.rto, 'invalid');

  // Invalid number 0000
  const zeroPlate = validateIndianRtoInput('KA-01-AB-0000');
  assert.equal(zeroPlate.isValid, false);
  assert.equal(zeroPlate.status, 'invalid');
  assert.equal(zeroPlate.segments.number, 'invalid');

  // Missing series letters, too many series letters, too many digits, or special chars
  assert.equal(validateIndianRtoInput('KA-01-1234').status, 'invalid');
  assert.equal(validateIndianRtoInput('KA-01-ABCD-1234').status, 'invalid');
  assert.equal(validateIndianRtoInput('KA-01-AB-12345').status, 'invalid');
  assert.equal(validateIndianRtoInput('KA-01-AB-1234!').status, 'invalid');
  assert.equal(validateIndianRtoInput('KA--01-AB-1234').status, 'invalid');
  assert.equal(validateIndianRtoInput('12345').status, 'invalid');
});
