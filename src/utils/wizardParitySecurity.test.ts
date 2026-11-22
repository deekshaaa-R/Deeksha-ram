import test from 'node:test';
import assert from 'node:assert/strict';
import trackingLayout from '../config/tracking_layout.json' with { type: 'json' };
import {
  buildWizardSteps,
  isValidImeiLuhn,
  STATIC_DROPDOWN_OPTIONS,
  validateStepForm,
} from './wizardSchema';
import {
  canRoleAccessFeature,
  canRoleEditFeature,
  decryptWizardDraft,
  encryptWizardDraft,
  evaluatePasswordPolicy,
  generateDraftAesKey,
  maskSecretTail4,
  requiresStepUpAuth,
  sanitizeDraftPayload,
  signWizardRequest,
  type PermissionMatrixConfig,
} from './wizardSecurity';
import { createWizardBackendEngine } from '../server/newVehicleWizardStore';

// ============================================================================
// PART A + E-2 PARITY CHECKLIST TESTS
// ============================================================================

test('PARITY: Step counts, titles, exact field counts, checkboxes, switches, and original spellings match Part A (6-step flow)', () => {
  const fixedDate = new Date(2026, 4, 15); // 15/05/2026
  const steps = buildWizardSteps(fixedDate);
  assert.equal(steps.length, 6);

  // Step 1 = 18 fields + 3 checkboxes
  const s1 = steps[0];
  assert.equal(s1.title, 'Add Transporter');
  assert.equal(s1.previousTitle, null);
  assert.equal(s1.nextTitle, 'Add Device');
  assert.equal(s1.fields.length, 18);
  assert.equal(s1.checkboxes.length, 3);
  assert.equal(s1.fields[0].label, 'Username');
  assert.equal(s1.fields[0].helperText, 'Only contains [ A-z, 0-9, _ , - , *, @ ]');
  assert.equal(s1.fields[4].defaultValue, '(GMT+5:30) Asia/Calcutta');
  assert.equal(s1.fields[5].defaultValue, '12');
  assert.equal(s1.fields[6].defaultValue, 'English');
  assert.equal(s1.fields[11].defaultValue, '15/05/2026');
  assert.equal(s1.fields[12].defaultValue, '15/05/2027');
  assert.equal(s1.fields[14].defaultValue, '10');
  // Original spelling preserved verbatim:
  assert.equal(s1.fields[17].label, 'Data Restrication (in Days)');
  assert.equal(s1.fields[17].placeholder, '');
  assert.equal(s1.fields[17].noIcon, true);
  assert.equal(s1.checkboxes[0].label, 'Active');
  assert.equal(s1.checkboxes[0].defaultValue, true);

  // Step 2 = Add Device (7 fields + 2 switches + 4 checkboxes)
  const s2 = steps[1];
  assert.equal(s2.title, 'Add Device');
  assert.equal(s2.previousTitle, 'Add Transporter');
  assert.equal(s2.nextTitle, 'Add Vehicle');
  assert.equal(s2.fields.length, 7);
  assert.equal(s2.switches.length, 2);
  assert.equal(s2.checkboxes.length, 4);
  assert.equal(s2.fields[0].label, 'Imei');
  assert.equal(s2.fields[0].rightActionLabel, 'Import From Inventory');
  assert.equal(s2.fields[1].helperText, 'Only contains 24 digits');
  assert.equal(s2.fields[2].defaultValue, 'Bsnl (bsnl)');
  assert.equal(STATIC_DROPDOWN_OPTIONS.simOperators[0], 'Bsnl (bsnl)');
  assert.equal(s2.fields[5].defaultValue, 'Seaworld-R12 (5023)');
  assert.equal(STATIC_DROPDOWN_OPTIONS.deviceTypes[0], 'Seaworld-R12 (5023)');
  assert.equal(s2.switches[0].label, 'Attendance');
  assert.equal(s2.switches[1].label, 'Timezone Setting');

  // Step 3 = Add Vehicle (18 fields including Driver Name & Driver Phone + 1 checkbox)
  const s3 = steps[2];
  assert.equal(s3.title, 'Add Vehicle');
  assert.equal(s3.previousTitle, 'Add Device');
  assert.equal(s3.nextTitle, 'Payment Details');
  assert.equal(s3.fields.length, 18);
  assert.equal(s3.checkboxes.length, 1);
  assert.equal(s3.fields[0].placeholder, 'Add Vehicle Number');
  assert.equal(s3.fields[1].defaultValue, '1');
  assert.equal(s3.fields[4].type, 'idle_split');
  assert.equal(s3.fields[9].defaultValue, '0');
  assert.equal(s3.fields[12].defaultValue, '0');
  assert.equal(s3.fields[16].key, 'driverName');
  assert.equal(s3.fields[17].key, 'driverPhone');
  assert.equal(s3.checkboxes[0].label, 'Parking violation alarm on Ignition on');

  // Step 4 = Payment Details (9 fields)
  const s4 = steps[3];
  assert.equal(s4.title, 'Payment Details');
  assert.equal(s4.previousTitle, 'Add Vehicle');
  assert.equal(s4.nextTitle, 'Add Vehicle Detail');
  assert.equal(s4.fields.length, 9);
  assert.equal(s4.fields[2].defaultValue, '0');
  assert.equal(s4.fields[8].helperText, 'Max 50 chars');
  assert.equal(s4.fields[8].maxLength, 50);

  // Step 5 = Add Vehicle Detail (10 fields)
  const s5 = steps[4];
  assert.equal(s5.title, 'Add Vehicle Detail');
  assert.equal(s5.previousTitle, 'Payment Details');
  assert.equal(s5.nextTitle, 'Custom Fields');
  assert.equal(s5.fields.length, 10);
  assert.equal(s5.fields[7].defaultValue, '0');

  // Step 6 = Custom Fields (dynamic empty state)
  const s6 = steps[5];
  assert.equal(s6.title, 'Custom Fields');
  assert.equal(s6.previousTitle, 'Add Vehicle Detail');
  assert.equal(s6.nextTitle, null);
  assert.equal(s6.fields.length, 0);
});

test('PARITY: Validation enforces required fields, password match, 15-digit IMEI Luhn, 24-digit SIM, 50-char Remark, and dual-ignition warning', () => {
  assert.equal(isValidImeiLuhn('356938035643809'), true);
  assert.equal(isValidImeiLuhn('356938035643801'), false);

  const steps = buildWizardSteps();
  const s1Res = validateStepForm(steps[0], {
    username: 'good_user',
    password: 'Strong#Password1',
    confirmPassword: 'Mismatch#Password2',
    companyName: 'Test Co',
    timezone: '(GMT+5:30) Asia/Calcutta',
    inactiveTime: '12',
    language: 'English',
    subscriptionStartDate: '15/05/2026',
    subscriptionDueDate: '15/05/2027',
  });
  assert.equal(s1Res.valid, false);
  assert.ok(s1Res.fieldErrors.confirmPassword?.includes('match'));

  const s2Res = validateStepForm(steps[1], {
    imei: '864209051284928',
    simNumber: '12345',
    simOperator: 'Bsnl (bsnl)',
    deviceType: 'Seaworld-R12 (5023)',
    ignitionWirePositive: true,
    ignitionWireNotConnected: true,
  });
  assert.equal(s2Res.valid, false);
  assert.equal(s2Res.fieldErrors.simNumber, 'Only contains 24 digits');
  assert.equal(s2Res.warnings.length, 1);

  const s4Res = validateStepForm(steps[3], {
    type: 'New Sale',
    transporter: 'Deccan Logistics Pvt Ltd',
    paymentTerm: 'Prepaid Annual',
    remark: 'x'.repeat(51),
  });
  assert.equal(s4Res.valid, false);
  assert.ok(s4Res.fieldErrors.remark?.includes('50'));

  // Part B TurboTrackers strictly 9 allowed fields
  assert.equal(trackingLayout.allowedVehicleFields.length, 9);
});

// ============================================================================
// PART C + E-4 SECURITY CHECKLIST TESTS
// ============================================================================

test('SECURITY: Password policy enforces 10+ chars, upper, lower, digit, symbol, non-common, and not equal username', () => {
  assert.equal(evaluatePasswordPolicy('short1!A', 'alice').valid, false);
  assert.equal(evaluatePasswordPolicy('Password@123', 'alice').valid, false); // common blocklist
  assert.equal(evaluatePasswordPolicy('Alice#2026!', 'Alice#2026!').valid, false); // equals username
  assert.equal(evaluatePasswordPolicy('Fleet#Secure2026!', 'superadmin').valid, true);
});

test('SECURITY: Lockout after 5 failed attempts, generic errors, OTP expiry & single-use, and refresh token reuse family revocation', () => {
  const engine = createWizardBackendEngine();
  let t = 1_700_000_000_000;

  // 4 failed attempts give generic error + backoff; 5th triggers 15-min lock
  for (let i = 1; i <= 4; i++) {
    const r = engine.attemptLogin({
      username: 'superadmin',
      password: 'WrongPassword!1',
      deviceId: 'dev-test',
      ip: '10.0.0.1',
      nowMs: t,
    });
    assert.equal(r.ok, false);
    assert.equal(r.error, 'Invalid username or password.');
    t += 30_000; // advance past backoff
  }
  const locked = engine.attemptLogin({
    username: 'superadmin',
    password: 'WrongPassword!1',
    deviceId: 'dev-test',
    ip: '10.0.0.1',
    nowMs: t,
  });
  assert.equal(locked.status, 429);

  // Advance past 15-min lockout -> valid login issues 6-digit OTP
  t += 16 * 60 * 1000;
  const loginOk = engine.attemptLogin({
    username: 'superadmin',
    password: 'Fleet#Secure2026!',
    deviceId: 'dev-test',
    ip: '10.0.0.1',
    nowMs: t,
  });
  assert.equal(loginOk.ok, true);
  assert.ok(loginOk.challengeId && loginOk.demoOtp);

  // OTP expiry after 5 minutes
  const expiredRes = engine.verifyOtpAndCreateSession({
    challengeId: loginOk.challengeId!,
    code: loginOk.demoOtp!,
    deviceId: 'dev-test',
    deviceLabel: 'Pixel',
    devicePublicKey: 'pk-1',
    ip: '10.0.0.1',
    nowMs: t + 6 * 60 * 1000,
  });
  assert.equal(expiredRes.ok, false);

  // Fresh login + OTP verification succeeds, and reusing same OTP fails (single-use)
  const login2 = engine.attemptLogin({
    username: 'superadmin',
    password: 'Fleet#Secure2026!',
    deviceId: 'dev-test',
    ip: '10.0.0.1',
    nowMs: t + 7 * 60 * 1000,
  });
  const verified = engine.verifyOtpAndCreateSession({
    challengeId: login2.challengeId!,
    code: login2.demoOtp!,
    deviceId: 'dev-test',
    deviceLabel: 'Pixel',
    devicePublicKey: 'pk-1',
    ip: '10.0.0.1',
    nowMs: t + 7 * 60 * 1000 + 5000,
  });
  assert.equal(verified.ok, true);
  const rt1 = verified.refreshToken!;

  const replayOtp = engine.verifyOtpAndCreateSession({
    challengeId: login2.challengeId!,
    code: login2.demoOtp!,
    deviceId: 'dev-test',
    deviceLabel: 'Pixel',
    devicePublicKey: 'pk-1',
    ip: '10.0.0.1',
    nowMs: t + 7 * 60 * 1000 + 6000,
  });
  assert.equal(replayOtp.ok, false);

  // Rotating refresh token succeeds -> replaying rt1 revokes entire session family!
  const rotated = engine.rotateRefreshToken({
    refreshToken: rt1,
    deviceId: 'dev-test',
    ip: '10.0.0.1',
    nowMs: t + 8 * 60 * 1000,
  });
  assert.equal(rotated.ok, true);
  const rt2 = rotated.refreshToken!;
  assert.notEqual(rt1, rt2);

  const reuseAttack = engine.rotateRefreshToken({
    refreshToken: rt1,
    deviceId: 'dev-test',
    ip: '10.0.0.1',
    nowMs: t + 8 * 60 * 1000 + 1000,
  });
  assert.equal(reuseAttack.ok, false);
  assert.ok(reuseAttack.error?.includes('reuse detected'));

  // Even the newer rt2 in the same family is now revoked!
  const afterRevoke = engine.rotateRefreshToken({
    refreshToken: rt2,
    deviceId: 'dev-test',
    ip: '10.0.0.1',
    nowMs: t + 8 * 60 * 1000 + 2000,
  });
  assert.equal(afterRevoke.ok, false);
});

test('SECURITY: Config-driven permissions.json guards + sample custom matrix check (E-4)', () => {
  // Default permissions.json matrix (6-step wizard)
  assert.equal(canRoleEditFeature('Super Admin', 'step_1'), true);
  assert.equal(canRoleEditFeature('Technician', 'step_2'), true);
  assert.equal(canRoleEditFeature('Technician', 'step_4'), false);
  assert.equal(canRoleEditFeature('Transporter Admin', 'step_3'), true);
  assert.equal(canRoleEditFeature('Transporter Admin', 'step_1'), false);
  assert.equal(canRoleAccessFeature('Viewer', 'live_tracking'), true);
  assert.equal(canRoleEditFeature('Viewer', 'live_tracking'), false);

  // Step-up rules: always on 1,2,4; 10-min window on 3,5,6
  const now = 1_700_000_000_000;
  assert.equal(requiresStepUpAuth('step_1', now - 1000, now), true);
  assert.equal(requiresStepUpAuth('step_2', now - 1000, now), true);
  assert.equal(requiresStepUpAuth('step_4', now - 1000, now), true);
  assert.equal(requiresStepUpAuth('step_3', now - 2 * 60 * 1000, now), false);
  assert.equal(requiresStepUpAuth('step_3', now - 11 * 60 * 1000, now), true);

  // Sample custom matrix override (Part E-4 requirement)
  const sampleMatrix: PermissionMatrixConfig = {
    roles: ['Super Admin', 'Admin', 'Transporter Admin', 'Technician', 'Viewer'],
    dataScope: { Viewer: 'own_vehicles' },
    matrix: {
      step_4: {
        label: 'Step 4 Payment Details',
        access: {
          'Super Admin': 'Y',
          Admin: 'N',
          'Transporter Admin': 'N',
          Technician: 'N',
          Viewer: 'N',
        },
        stepUpRequired: true,
        stepUpMode: 'always',
      },
    },
  };
  assert.equal(canRoleEditFeature('Admin', 'step_4', sampleMatrix), false);
  assert.equal(canRoleEditFeature('Super Admin', 'step_4', sampleMatrix), true);
});

test('SECURITY: AES-GCM encrypted draft excludes passwords/OTPs/tokens and expires after 24h', async () => {
  const rawDraft = {
    step1: {
      username: 'fleet_user',
      password: 'SuperSecret#Password1',
      confirmPassword: 'SuperSecret#Password1',
      accessToken: 'tok-abc',
      otp: '123456',
      companyName: 'Safe Transport Co',
    },
  };
  const sanitized = sanitizeDraftPayload(rawDraft);
  assert.equal(sanitized.step1.password, undefined);
  assert.equal(sanitized.step1.confirmPassword, undefined);
  assert.equal(sanitized.step1.accessToken, undefined);
  assert.equal(sanitized.step1.otp, undefined);
  assert.equal(sanitized.step1.companyName, 'Safe Transport Co');

  const key = await generateDraftAesKey();
  const now = 1_700_000_000_000;
  const envelope = await encryptWizardDraft(key, rawDraft, now);
  assert.equal(envelope.ciphertextBase64.includes('SuperSecret'), false);

  const decrypted = await decryptWizardDraft(key, envelope, now + 60_000);
  assert.equal(decrypted?.step1.companyName, 'Safe Transport Co');
  assert.equal(decrypted?.step1.password, undefined);

  // Expires after 24h
  const expired = await decryptWizardDraft(
    key,
    envelope,
    now + 24 * 60 * 60 * 1000 + 1
  );
  assert.equal(expired, null);

  // Masking helper shows last 4 digits only
  assert.ok(maskSecretTail4('899100001234567890123456').endsWith('3456'));
  assert.equal(maskSecretTail4('899100001234567890123456').includes('8991'), false);
});

test('SECURITY: Signed + replay-safe + idempotent Save with mandatory Step-Up on Step 4 (Payment Details)', async () => {
  const engine = createWizardBackendEngine();
  const now = 1_700_000_000_000;

  const login = engine.attemptLogin({
    username: 'superadmin',
    password: 'Fleet#Secure2026!',
    deviceId: 'android-99',
    ip: '127.0.0.1',
    nowMs: now,
  });
  const verified = engine.verifyOtpAndCreateSession({
    challengeId: login.challengeId!,
    code: login.demoOtp!,
    deviceId: 'android-99',
    deviceLabel: 'Pixel 9',
    devicePublicKey: 'pk-99',
    ip: '127.0.0.1',
    nowMs: now + 1000,
  });
  const session = Array.from(engine.sessions.values())[0];

  const payload = {
    values: {
      type: 'New Sale',
      transporter: 'Deccan Logistics Pvt Ltd',
      sellingPrice: '4500',
      paymentTerm: 'Prepaid Annual',
      remark: 'Verified install',
    },
  };
  const bodyString = JSON.stringify(payload);
  const ts = String(now + 2000);
  const nonce = 'nonce-abc-1';
  const idempotencyKey = 'idem-step4-1';

  const sig = await signWizardRequest({
    signingKey: verified.signingKey!,
    method: 'POST',
    path: '/api/wizard/step/4',
    timestamp: ts,
    nonce,
    idempotencyKey,
    bodyString,
  });

  // 1. Without Step-Up token on Step 4 -> 428 Precondition Required
  const missingStepUp = engine.verifySignedSave({
    session,
    stepNumber: 4,
    body: payload,
    rawBodyString: bodyString,
    headers: {
      deviceId: 'android-99',
      idempotencyKey,
      timestamp: ts,
      nonce,
      signature: sig,
    },
    ip: '127.0.0.1',
    nowMs: now + 2000,
  });
  assert.equal(missingStepUp.status, 428);

  // 2. Complete Step-Up via salted PIN -> Save succeeds (201)
  const stepUp = engine.issueStepUp({
    session,
    method: 'pin',
    credential: '246810',
    ip: '127.0.0.1',
    nowMs: now + 2500,
  });
  assert.equal(stepUp.ok, true);

  const saved = engine.verifySignedSave({
    session,
    stepNumber: 4,
    body: payload,
    rawBodyString: bodyString,
    headers: {
      deviceId: 'android-99',
      idempotencyKey,
      timestamp: ts,
      nonce,
      signature: sig,
      stepUpToken: stepUp.stepUpToken,
    },
    ip: '127.0.0.1',
    nowMs: now + 3000,
  });
  assert.equal(saved.status, 201);

  // 3. Same idempotency key safely replays without duplicating record
  const replayIdem = engine.verifySignedSave({
    session,
    stepNumber: 4,
    body: payload,
    rawBodyString: bodyString,
    headers: {
      deviceId: 'android-99',
      idempotencyKey,
      timestamp: ts,
      nonce,
      signature: sig,
    },
    ip: '127.0.0.1',
    nowMs: now + 3500,
  });
  assert.equal(replayIdem.status, 201);
  assert.equal(replayIdem.body.idempotentReplay, true);
  assert.equal(engine.payments.length, 1);

  // 4. Different idempotency key reusing same nonce -> blocked as replay (409)
  const sig2 = await signWizardRequest({
    signingKey: verified.signingKey!,
    method: 'POST',
    path: '/api/wizard/step/4',
    timestamp: ts,
    nonce, // reused nonce!
    idempotencyKey: 'idem-step4-2',
    bodyString,
  });
  const replayNonce = engine.verifySignedSave({
    session,
    stepNumber: 4,
    body: payload,
    rawBodyString: bodyString,
    headers: {
      deviceId: 'android-99',
      idempotencyKey: 'idem-step4-2',
      timestamp: ts,
      nonce,
      signature: sig2,
    },
    ip: '127.0.0.1',
    nowMs: now + 4000,
  });
  assert.equal(replayNonce.status, 409);
});

test('RTO LOOKUP: Onboarding a new vehicle with Driver Name & Phone immediately exposes full profile and exact live location', async () => {
  const engine = createWizardBackendEngine();
  const now = 1_700_000_000_000;

  const login = engine.attemptLogin({
    username: 'superadmin',
    password: 'Fleet#Secure2026!',
    deviceId: 'laptop-web-1',
    ip: '127.0.0.1',
    nowMs: now,
  });
  const verified = engine.verifyOtpAndCreateSession({
    challengeId: login.challengeId!,
    code: login.demoOtp!,
    deviceId: 'laptop-web-1',
    deviceLabel: 'Laptop Chrome',
    devicePublicKey: 'pk-laptop',
    ip: '127.0.0.1',
    nowMs: now + 1000,
  });
  const session = Array.from(engine.sessions.values())[0];

  const signAndSave = async (stepNumber: number, values: Record<string, unknown>, idx: number) => {
    const stepUp = engine.issueStepUp({
      session,
      method: 'pin',
      credential: '246810',
      ip: '127.0.0.1',
      nowMs: now + idx * 1000,
    });
    const body = { values };
    const bodyString = JSON.stringify(body);
    const ts = String(now + idx * 1000 + 100);
    const nonce = `rto-nonce-${idx}`;
    const idempotencyKey = `rto-idem-${idx}`;
    const sig = await signWizardRequest({
      signingKey: verified.signingKey!,
      method: 'POST',
      path: `/api/wizard/step/${stepNumber}`,
      timestamp: ts,
      nonce,
      idempotencyKey,
      bodyString,
    });
    const res = engine.verifySignedSave({
      session,
      stepNumber,
      body,
      rawBodyString: bodyString,
      headers: {
        deviceId: 'laptop-web-1',
        idempotencyKey,
        timestamp: ts,
        nonce,
        signature: sig,
        stepUpToken: stepUp.stepUpToken,
      },
      ip: '127.0.0.1',
      nowMs: now + idx * 1000 + 200,
    });
    assert.equal(res.status, 201);
  };

  // Save Step 3 (Add Vehicle) with RTO number, Driver Name, and Driver Phone
  await signAndSave(
    3,
    {
      vehicle: 'KA-05-NV-9999',
      mileage: '4',
      vehicleType: 'Truck',
      overspeed: '75',
      device: '864209051284928',
      transporter: 'Deccan Logistics Pvt Ltd',
      subscriptionStartDate: '15/05/2026',
      subscriptionDueDate: '15/05/2027',
      driverName: 'Kiran Gowda',
      driverPhone: '+91 98801 44556',
      vehicleNickname: 'Mysuru Express',
    },
    1
  );

  // Save Step 5 (Add Vehicle Detail) with Owner Name, Brand, Model
  await signAndSave(
    5,
    {
      transporter: 'Deccan Logistics Pvt Ltd',
      vehicle: 'KA-05-NV-9999',
      ownerName: 'Nandi Logistics',
      ownedBy: 'Company Owned',
      vehicleBrand: 'BharatBenz',
      vehicleModel: '1923C',
      vehicleBody: 'Closed Container',
      capacity: '16000',
    },
    2
  );

  // Lookup by normalized RTO without dashes/spaces
  const lookup = engine.lookupVehicleByRto({
    query: 'ka05nv9999',
    role: 'Super Admin',
    transporterId: 'tr-1',
  });
  assert.ok(lookup.vehicle);
  assert.equal(lookup.vehicle!.vehicleNumber, 'KA-05-NV-9999');
  assert.equal(lookup.vehicle!.driverName, 'Kiran Gowda');
  assert.equal(lookup.vehicle!.driverPhone, '+91 98801 44556');
  assert.equal(lookup.vehicle!.onboardingProfile.vehicleDetail?.ownerName, 'Nandi Logistics');
  assert.equal(lookup.vehicle!.onboardingProfile.vehicleDetail?.vehicleBrand, 'BharatBenz');
  assert.equal(lookup.vehicle!.onboardingProfile.vehicleDetail?.vehicleModel, '1923C');
  assert.ok(lookup.vehicle!.exactLocation.address.length > 5);
  assert.ok(lookup.vehicle!.exactLocation.landmark.length > 3);
  assert.ok(lookup.vehicle!.routeTrail.length >= 1);
});

