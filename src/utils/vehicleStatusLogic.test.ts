import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyFuelBand,
  classifySpeedBand,
  computeSpeedGaugeArc,
  deriveEngineState,
  estimateRegisteredVehicleFuel,
  formatHeadingCardinal,
  resolveVehicleStatus,
} from './vehicleStatusLogic';

test('deriveEngineState classifies Running, Idling, Off, and Immobilized accurately', () => {
  assert.equal(
    deriveEngineState({ status: 'Moving', speedKmh: 62 }),
    'Running'
  );
  assert.equal(
    deriveEngineState({ status: 'Idle', speedKmh: 0 }),
    'Idling'
  );
  assert.equal(
    deriveEngineState({ status: 'Alert', speedKmh: 0 }),
    'Idling'
  );
  assert.equal(
    deriveEngineState({ status: 'Alert', speedKmh: 45 }),
    'Running'
  );
  assert.equal(
    deriveEngineState({ status: 'Offline', speedKmh: 0 }),
    'Off'
  );
  assert.equal(
    deriveEngineState({ status: 'Moving', speedKmh: 50, ignitionOn: false }),
    'Off'
  );
  assert.equal(
    deriveEngineState({ status: 'Moving', speedKmh: 50, immobilized: true }),
    'Immobilized'
  );
});

test('classifySpeedBand separates Stopped, City, Highway, and Overspeed thresholds', () => {
  assert.equal(classifySpeedBand(0), 'Stopped');
  assert.equal(classifySpeedBand(-4), 'Stopped');
  assert.equal(classifySpeedBand(38), 'City');
  assert.equal(classifySpeedBand(55), 'City');
  assert.equal(classifySpeedBand(56), 'Highway');
  assert.equal(classifySpeedBand(80), 'Highway');
  assert.equal(classifySpeedBand(81), 'Overspeed');
  assert.equal(classifySpeedBand(112), 'Overspeed');
});

test('classifyFuelBand triggers Critical <= 15%, Low <= 30%, Healthy > 30%', () => {
  assert.equal(classifyFuelBand(10), 'Critical');
  assert.equal(classifyFuelBand(15), 'Critical');
  assert.equal(classifyFuelBand(16), 'Low');
  assert.equal(classifyFuelBand(30), 'Low');
  assert.equal(classifyFuelBand(31), 'Healthy');
  assert.equal(classifyFuelBand(88), 'Healthy');
});

test('computeSpeedGaugeArc clamps ratios and dash offsets between 0 and max speed', () => {
  const stopped = computeSpeedGaugeArc(0, 120, 42);
  assert.equal(stopped.ratio, 0);
  assert.equal(stopped.dashOffset, stopped.arcLength);

  const half = computeSpeedGaugeArc(60, 120, 42);
  assert.equal(half.ratio, 0.5);
  assert.ok(Math.abs(half.dashOffset - half.arcLength / 2) < 0.05);

  const clamped = computeSpeedGaugeArc(180, 120, 42);
  assert.equal(clamped.ratio, 1);
  assert.equal(clamped.dashOffset, 0);
});

test('formatHeadingCardinal maps 0-360 degrees to 8-point compass bearings', () => {
  assert.equal(formatHeadingCardinal(0), 'N');
  assert.equal(formatHeadingCardinal(45), 'NE');
  assert.equal(formatHeadingCardinal(90), 'E');
  assert.equal(formatHeadingCardinal(135), 'SE');
  assert.equal(formatHeadingCardinal(180), 'S');
  assert.equal(formatHeadingCardinal(225), 'SW');
  assert.equal(formatHeadingCardinal(270), 'W');
  assert.equal(formatHeadingCardinal(315), 'NW');
  assert.equal(formatHeadingCardinal(359), 'N');
  assert.equal(formatHeadingCardinal(-90), 'W');
});

test('estimateRegisteredVehicleFuel is deterministic per IMEI and decreases slightly over trail', () => {
  const first = estimateRegisteredVehicleFuel(
    '864209051284921',
    'Commercial Truck / Fleet',
    1
  );
  const repeat = estimateRegisteredVehicleFuel(
    '864209051284921',
    'Commercial Truck / Fleet',
    1
  );
  assert.deepEqual(first, repeat);
  assert.equal(first.tankCapacityLiters, 300);
  assert.ok(first.fuelPercent >= 28 && first.fuelPercent <= 86);

  const later = estimateRegisteredVehicleFuel(
    '864209051284921',
    'Commercial Truck / Fleet',
    25
  );
  assert.ok(later.fuelPercent <= first.fuelPercent);
});

test('resolveVehicleStatus preserves explicit world fleet fuel and computes full telemetry', () => {
  const resolved = resolveVehicleStatus({
    label: 'KA-06-TR-4821',
    subtitle: 'Tumkuru Hub · India',
    status: 'Moving',
    speedKmh: 88,
    headingDeg: 132,
    latitude: 13.3379,
    longitude: 77.1173,
    fuelPercent: 22,
    fuelLiters: 66,
    tankCapacityLiters: 300,
    vehicleType: 'Commercial Truck / Fleet',
  });

  assert.equal(resolved.engineState, 'Running');
  assert.equal(resolved.engineLabel, 'Engine Running');
  assert.equal(resolved.speedBand, 'Overspeed');
  assert.equal(resolved.fuelPercent, 22);
  assert.equal(resolved.fuelLiters, 66);
  assert.equal(resolved.tankCapacityLiters, 300);
  assert.equal(resolved.fuelBand, 'Low');
  assert.equal(resolved.fuelAlertLabel, 'Low Fuel · Plan Refuel');
  assert.equal(resolved.headingCardinal, 'SE');
  assert.equal(resolved.formattedCoords, '13.3379, 77.1173');
  assert.ok(resolved.estimatedRangeKm > 0);
});

test('resolveVehicleStatus derives deterministic fuel for registered devices without explicit fuel fields', () => {
  const resolved = resolveVehicleStatus({
    label: 'KA-06-TR-4821 (NH-48 Logistics)',
    subtitle: 'IMEI 864209051284921 · VT-PRO 4G',
    status: 'Idle',
    speedKmh: 0,
    headingDeg: 185,
    latitude: 13.3412,
    longitude: 77.1095,
    imei: '864209051284921',
    vehicleType: 'Cargo Van / LCV',
    trailPointsCount: 4,
  });

  assert.equal(resolved.engineState, 'Idling');
  assert.equal(resolved.engineLabel, 'Engine Idling');
  assert.equal(resolved.speedBand, 'Stopped');
  assert.equal(resolved.tankCapacityLiters, 110);
  assert.ok(resolved.fuelPercent >= 12 && resolved.fuelPercent <= 98);
  assert.equal(resolved.headingCardinal, 'S');
});
