import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAiMessageCreatePayload,
  buildAiSessionCreatePayload,
  buildAiSessionUpdatePayload,
  buildSavedMediaCreatePayload,
  buildUserPrivateCreatePayload,
  buildUserPrivateUpdatePayload,
  buildUserWorkspaceCreatePayload,
  buildUserWorkspaceUpdatePayload,
  buildVehicleDeviceCreatePayload,
  buildVehicleDeviceUpdatePayload,
  buildVehicleMaintenanceCreatePayload,
  buildVehicleMaintenanceDocId,
  buildVehicleMaintenanceUpdatePayload,
  buildWishlistCreatePayload,
  buildWishlistUpdatePayload,
  sanitizeFirestoreId,
} from './firestorePayloads.ts';

const MOCK_TIME = { _mockServerTime: true };

test('buildUserWorkspaceCreatePayload omits disallowed role field and stays within rules allowlist', () => {
  const payload = buildUserWorkspaceCreatePayload('uid_123', '  Deeksha R  ', MOCK_TIME, 'VS Fleet');
  assert.deepEqual(Object.keys(payload).sort(), ['company', 'createdAt', 'displayName', 'uid', 'updatedAt']);
  assert.equal('role' in payload, false);
  assert.equal(payload.displayName, 'Deeksha R');
});

test('buildUserWorkspaceUpdatePayload includes only update-allowed fields', () => {
  const payload = buildUserWorkspaceUpdatePayload('Updated Name', MOCK_TIME);
  assert.deepEqual(Object.keys(payload).sort(), ['displayName', 'updatedAt']);
});

test('buildUserPrivateCreatePayload and update payload honor PII rules', () => {
  const created = buildUserPrivateCreatePayload('u1', 'vstechnology999@gmail.com', MOCK_TIME, '9740640650');
  assert.deepEqual(Object.keys(created).sort(), ['createdAt', 'email', 'phone', 'uid', 'updatedAt']);
  const updated = buildUserPrivateUpdatePayload('vstechnology999@gmail.com', MOCK_TIME);
  assert.deepEqual(Object.keys(updated).sort(), ['email', 'updatedAt']);
});

test('wishlist payloads cap productIds at 50 deduplicated items', () => {
  const oversized = Array.from({ length: 65 }, (_, i) => `prod-${i}`);
  oversized.push('prod-0');
  const created = buildWishlistCreatePayload('u1', oversized, MOCK_TIME);
  assert.equal(created.productIds.length, 50);
  assert.deepEqual(Object.keys(created).sort(), ['createdAt', 'productIds', 'uid', 'updatedAt']);

  const updated = buildWishlistUpdatePayload(oversized, MOCK_TIME);
  assert.equal(updated.productIds.length, 50);
  assert.deepEqual(Object.keys(updated).sort(), ['productIds', 'updatedAt']);
});

test('AI session and message payloads strictly match firestore.rules fields and bounds', () => {
  const sess = buildAiSessionCreatePayload('user-u1-main', 'u1', 'Fleet Support', 'gemini-4-hydrogen', MOCK_TIME);
  assert.deepEqual(
    Object.keys(sess).sort(),
    ['createdAt', 'model', 'ownerId', 'sessionId', 'title', 'updatedAt']
  );

  const sessUpd = buildAiSessionUpdatePayload('Fleet Support', 'gemini-4-carbon', MOCK_TIME);
  assert.deepEqual(Object.keys(sessUpd).sort(), ['model', 'title', 'updatedAt']);

  const msg = buildAiMessageCreatePayload(
    'msg_abc',
    'user-u1-main',
    'u1',
    'model',
    'x'.repeat(9000),
    'gemini-4-hydrogen',
    MOCK_TIME
  );
  assert.equal(msg.text.length, 8000);
  assert.deepEqual(
    Object.keys(msg).sort(),
    ['createdAt', 'messageId', 'model', 'ownerId', 'role', 'sessionId', 'text']
  );
});

test('buildSavedMediaCreatePayload enforces allowed keys and truncates prompt/summaryText', () => {
  const media = buildSavedMediaCreatePayload(
    'media_01',
    'u1',
    'transcript',
    'Driver Call #4',
    'p'.repeat(2500),
    MOCK_TIME,
    's'.repeat(9000)
  );
  assert.equal(media.prompt.length, 2000);
  assert.equal(media.summaryText?.length, 8000);
  assert.deepEqual(
    Object.keys(media).sort(),
    ['createdAt', 'kind', 'mediaId', 'ownerId', 'prompt', 'summaryText', 'title']
  );
});

test('buildVehicleDeviceCreatePayload and update payload strictly match VehicleDevice rules contract', () => {
  const created = buildVehicleDeviceCreatePayload({
    deviceId: 'veh_864291053829555_u1',
    ownerId: 'u1',
    imei: '864291053829555',
    nickname: `  ${'K'.repeat(95)}  `,
    vehicleType: 'Refrigerated Van',
    model: 'VS Ultra Wireless GPS Tracker',
    simExpiry: '2027-11-17',
    timestamp: MOCK_TIME,
  });

  assert.deepEqual(
    Object.keys(created).sort(),
    ['createdAt', 'deviceId', 'imei', 'model', 'nickname', 'ownerId', 'simExpiry', 'status', 'updatedAt', 'vehicleType']
  );
  assert.equal(created.imei, '864291053829555');
  assert.equal(created.nickname.length, 80);
  assert.equal(created.status, 'Idle');
  assert.equal(created.vehicleType, 'Refrigerated Van');

  const updated = buildVehicleDeviceUpdatePayload({
    nickname: 'KA-05-FL-7721 (Cold Chain)',
    vehicleType: 'Commercial Truck / Fleet',
    status: 'Moving',
    timestamp: MOCK_TIME,
  });
  assert.deepEqual(Object.keys(updated).sort(), ['nickname', 'status', 'updatedAt', 'vehicleType']);
});

test('buildVehicleMaintenance payloads clamp mileage 0..2000000 and match firestore.rules keys', () => {
  const maintenanceId = buildVehicleMaintenanceDocId('dev-1', 'u1');
  assert.equal(maintenanceId, 'mnt_dev-1_u1');

  const created = buildVehicleMaintenanceCreatePayload({
    maintenanceId,
    ownerId: 'u1',
    deviceId: 'dev-1',
    imei: '864291053829104',
    odometerKm: 49350.6,
    oilChangeLastKm: -100,
    airFilterLastKm: 35000,
    fuelFilterLastKm: 40000,
    brakeCheckLastKm: 25000,
    transmissionLastKm: 3500000,
    timestamp: MOCK_TIME,
  });

  assert.deepEqual(Object.keys(created).sort(), [
    'airFilterLastKm',
    'brakeCheckLastKm',
    'createdAt',
    'deviceId',
    'fuelFilterLastKm',
    'imei',
    'maintenanceId',
    'odometerKm',
    'oilChangeLastKm',
    'ownerId',
    'transmissionLastKm',
    'updatedAt',
  ]);
  assert.equal(created.odometerKm, 49351);
  assert.equal(created.oilChangeLastKm, 0);
  assert.equal(created.transmissionLastKm, 2000000);

  const updated = buildVehicleMaintenanceUpdatePayload({
    odometerKm: 50120,
    oilChangeLastKm: 50120,
    airFilterLastKm: 35000,
    fuelFilterLastKm: 40000,
    brakeCheckLastKm: 25000,
    transmissionLastKm: 20000,
    timestamp: MOCK_TIME,
  });
  assert.deepEqual(Object.keys(updated).sort(), [
    'airFilterLastKm',
    'brakeCheckLastKm',
    'fuelFilterLastKm',
    'odometerKm',
    'oilChangeLastKm',
    'transmissionLastKm',
    'updatedAt',
  ]);
});

test('sanitizeFirestoreId strips unsafe characters and respects 128-char cap', () => {
  assert.equal(sanitizeFirestoreId('user/123$abc'), 'user_123_abc');
  assert.equal(sanitizeFirestoreId('a'.repeat(200)).length, 128);
});
