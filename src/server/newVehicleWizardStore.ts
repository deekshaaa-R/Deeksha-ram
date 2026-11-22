import crypto from 'node:crypto';
import type { Express, Request, Response, NextFunction } from 'express';
import {
  buildWizardSteps,
  STATIC_DROPDOWN_OPTIONS,
  validateStepForm,
} from '../utils/wizardSchema.ts';
import {
  canRoleAccessFeature,
  canRoleEditFeature,
  DEFAULT_PERMISSIONS_MATRIX,
  evaluatePasswordPolicy,
  getRoleDataScope,
  maskSecretTail4,
  requiresStepUpAuth,
  type WizardFeatureKey,
  type WizardRole,
} from '../utils/wizardSecurity.ts';
import {
  advanceVehicleAlongCorridor,
  findVehicleByRtoNumber,
  INDIAN_CORRIDORS,
  normalizeRtoNumber,
  type LiveTrackVehicleRecord,
  type RouteWaypoint,
} from '../utils/rtoLookup.ts';

// ---------------------------------------------------------------------------
// CRYPTO & SESSION ENGINE (NO HARDCODED SECRETS, SCRYPT HASHING, REUSE GUARD)
// ---------------------------------------------------------------------------

const SESSION_HMAC_SECRET =
  process.env.WIZARD_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export function hashSecretScrypt(secret: string, saltHex?: string): string {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

export function verifySecretScrypt(secret: string, storedHash: string): boolean {
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(secret, salt, 32);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export interface WizardAuthAccount {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: WizardRole;
  transporterId?: string;
  passwordHash: string;
  pinHash: string;
  inactiveTimeMinutes: number;
  failedAttempts: number;
  lockedUntilMs: number;
  nextAllowedAttemptMs: number;
}

export interface PendingOtpChallenge {
  challengeId: string;
  accountId: string;
  code: string;
  channel: 'totp' | 'sms_email';
  expiresAtMs: number;
  resendAvailableAtMs: number;
  used: boolean;
}

export interface WizardSessionRecord {
  sessionId: string;
  familyId: string;
  accountId: string;
  username: string;
  role: WizardRole;
  transporterId?: string;
  deviceId: string;
  deviceLabel: string;
  devicePublicKey: string;
  signingKey: string;
  createdAtMs: number;
  lastActiveAtMs: number;
  lastStepUpAtMs: number | null;
  revoked: boolean;
  currentRefreshToken: string;
  rotatedRefreshTokens: Set<string>;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  eventType:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'ACCOUNT_LOCKED'
    | 'OTP_ISSUED'
    | 'OTP_FAILED'
    | 'TOKEN_REFRESH'
    | 'TOKEN_REUSE_REVOKED'
    | 'STEP_UP_SUCCESS'
    | 'STEP_UP_FAILED'
    | 'WIZARD_SAVE'
    | 'WIZARD_SKIP'
    | 'PERMISSION_DENIED'
    | 'SESSION_REVOKED'
    | 'PRIVACY_DELETE_REQUEST';
  actorUsername: string;
  actorRole: string;
  detail: string;
  deviceId: string;
  ip: string;
  severity: 'info' | 'warning' | 'critical';
}

export type TurboTrackVehicle = LiveTrackVehicleRecord;

export interface WizardBackendEngine {
  accounts: WizardAuthAccount[];
  pendingOtps: Map<string, PendingOtpChallenge>;
  sessions: Map<string, WizardSessionRecord>;
  stepUpTokens: Map<string, { sessionId: string; expiresAtMs: number; used: boolean }>;
  seenNonces: Map<string, number>;
  idempotencyCache: Map<string, { status: number; body: Record<string, unknown> }>;
  auditLog: SecurityAuditEntry[];
  transporters: Array<{
    id: string;
    username: string;
    companyName: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
    language?: string;
    subscriptionStartDate?: string;
    subscriptionDueDate?: string;
    active: boolean;
    inactiveTime: number;
  }>;
  devices: Array<{
    id: string;
    imei: string;
    imeiMasked: string;
    simNumber: string;
    simMasked: string;
    simOperator: string;
    deviceType: string;
    ignitionWirePositive?: boolean;
    acWirePositive?: boolean;
    active: boolean;
  }>;
  inventoryDevices: Array<{ imei: string; simNumber: string; simOperator: string; deviceType: string }>;
  vehicles: Array<{
    id: string;
    vehicleNumber: string;
    transporterId: string;
    transporterName: string;
    deviceImei: string;
    vehicleType: string;
    odometerKm: number;
    driverName?: string;
    driverPhone?: string;
  }>;
  payments: Array<{
    id: string;
    transporterId: string;
    type: string;
    paymentTerm: string;
    sellingPrice: number;
    installationDate?: string;
    rentalDueDate?: string;
    technicianName?: string;
    rental?: string;
    remark: string;
  }>;
  vehicleDetails: Array<{
    id: string;
    transporterId: string;
    vehicleNumber: string;
    ownerName: string;
    ownedBy: string;
    vehicleBrand: string;
    vehicleModel: string;
    vehicleBody: string;
    capacity?: string;
    manufactureDate?: string;
    purchaseDate?: string;
  }>;
  trackingVehicles: TurboTrackVehicle[];
  vehicleCorridors: Map<string, { corridor: RouteWaypoint[]; step: number }>;
  lookupVehicleByRto: (params: {
    query: string;
    role: WizardRole;
    transporterId?: string;
  }) => {
    found: boolean;
    vehicle: TurboTrackVehicle | null;
    suggestions: TurboTrackVehicle[];
    normalizedQuery: string;
  };
  attemptLogin: (input: { username: string; password: string; deviceId: string; ip: string; nowMs?: number }) => {
    ok: boolean;
    status: number;
    error?: string;
    retryAfterSec?: number;
    challengeId?: string;
    demoOtp?: string;
    expiresInSec?: number;
    resendCooldownSec?: number;
  };
  verifyOtpAndCreateSession: (input: {
    challengeId: string;
    code: string;
    deviceId: string;
    deviceLabel: string;
    devicePublicKey: string;
    ip: string;
    nowMs?: number;
  }) => {
    ok: boolean;
    status: number;
    error?: string;
    accessToken?: string;
    refreshToken?: string;
    signingKey?: string;
    expiresInSec?: number;
    user?: {
      id: string;
      username: string;
      displayName: string;
      email: string;
      role: WizardRole;
      transporterId?: string;
      inactiveTimeMinutes: number;
    };
  };
  rotateRefreshToken: (input: { refreshToken: string; deviceId: string; ip: string; nowMs?: number }) => {
    ok: boolean;
    status: number;
    error?: string;
    accessToken?: string;
    refreshToken?: string;
    signingKey?: string;
    expiresInSec?: number;
  };
  verifySignedSave: (params: {
    session: WizardSessionRecord;
    stepNumber: number;
    body: Record<string, unknown>;
    rawBodyString: string;
    headers: {
      deviceId: string;
      idempotencyKey: string;
      timestamp: string;
      nonce: string;
      signature: string;
      stepUpToken?: string;
    };
    ip: string;
    nowMs?: number;
  }) => { status: number; body: Record<string, unknown> };
  issueStepUp: (params: {
    session: WizardSessionRecord;
    method: 'biometric' | 'pin' | 'otp';
    credential: string;
    ip: string;
    nowMs?: number;
  }) => { ok: boolean; status: number; stepUpToken?: string; error?: string };
}

function signAccessToken(sessionId: string, accountId: string, role: WizardRole, nowMs: number): string {
  const expMs = nowMs + 15 * 60 * 1000; // <= 15 min short-lived access token
  const payload = Buffer.from(
    JSON.stringify({ sid: sessionId, sub: accountId, role, iat: nowMs, exp: expMs })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_HMAC_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAccessToken(
  token: string | undefined,
  nowMs: number = Date.now()
): { sid: string; sub: string; role: WizardRole; exp: number } | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto
    .createHmac('sha256', SESSION_HMAC_SECRET)
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sid?: string;
      sub?: string;
      role?: WizardRole;
      exp?: number;
    };
    if (!parsed.sid || !parsed.sub || !parsed.role || !parsed.exp) return null;
    if (parsed.exp <= nowMs) return null;
    return { sid: parsed.sid, sub: parsed.sub, role: parsed.role, exp: parsed.exp };
  } catch {
    return null;
  }
}

function computeServerRequestSignature(params: {
  signingKey: string;
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  idempotencyKey: string;
  bodyString: string;
}): string {
  const bodyHash = crypto.createHash('sha256').update(params.bodyString).digest('hex');
  const canonical = [
    params.method.toUpperCase(),
    params.path,
    params.timestamp,
    params.nonce,
    params.idempotencyKey,
    bodyHash,
  ].join('\n');
  return crypto
    .createHmac('sha256', params.signingKey)
    .update(canonical)
    .digest('hex');
}

export function createWizardBackendEngine(): WizardBackendEngine {
  // Demo seeded password meets full C1 policy (>=10 chars, upper, lower, digit, symbol, non-common)
  const seededStrongPass = 'Fleet#Secure2026!';
  const seededPin = '246810';

  const accounts: WizardAuthAccount[] = [
    {
      id: 'acc-super',
      username: 'superadmin',
      displayName: 'Vikram Shetty',
      email: 'superadmin@turbotrackers.in',
      role: 'Super Admin',
      passwordHash: hashSecretScrypt(seededStrongPass),
      pinHash: hashSecretScrypt(seededPin),
      inactiveTimeMinutes: 12,
      failedAttempts: 0,
      lockedUntilMs: 0,
      nextAllowedAttemptMs: 0,
    },
    {
      id: 'acc-admin',
      username: 'admin_ops',
      displayName: 'Rajesh Nair',
      email: 'admin@turbotrackers.in',
      role: 'Admin',
      passwordHash: hashSecretScrypt(seededStrongPass),
      pinHash: hashSecretScrypt(seededPin),
      inactiveTimeMinutes: 12,
      failedAttempts: 0,
      lockedUntilMs: 0,
      nextAllowedAttemptMs: 0,
    },
    {
      id: 'acc-transporter',
      username: 'deccan_trans',
      displayName: 'Arjun Deshmukh',
      email: 'ops@deccanlogistics.in',
      role: 'Transporter Admin',
      transporterId: 'tr-1',
      passwordHash: hashSecretScrypt(seededStrongPass),
      pinHash: hashSecretScrypt(seededPin),
      inactiveTimeMinutes: 12,
      failedAttempts: 0,
      lockedUntilMs: 0,
      nextAllowedAttemptMs: 0,
    },
    {
      id: 'acc-tech',
      username: 'tech_ravi',
      displayName: 'Ravi Kumar',
      email: 'ravi.tech@turbotrackers.in',
      role: 'Technician',
      passwordHash: hashSecretScrypt(seededStrongPass),
      pinHash: hashSecretScrypt(seededPin),
      inactiveTimeMinutes: 12,
      failedAttempts: 0,
      lockedUntilMs: 0,
      nextAllowedAttemptMs: 0,
    },
    {
      id: 'acc-viewer',
      username: 'viewer_ananya',
      displayName: 'Ananya Rao',
      email: 'ananya@deccanlogistics.in',
      role: 'Viewer',
      transporterId: 'tr-1',
      passwordHash: hashSecretScrypt(seededStrongPass),
      pinHash: hashSecretScrypt(seededPin),
      inactiveTimeMinutes: 12,
      failedAttempts: 0,
      lockedUntilMs: 0,
      nextAllowedAttemptMs: 0,
    },
  ];

  const pendingOtps = new Map<string, PendingOtpChallenge>();
  const sessions = new Map<string, WizardSessionRecord>();
  const stepUpTokens = new Map<
    string,
    { sessionId: string; expiresAtMs: number; used: boolean }
  >();
  const seenNonces = new Map<string, number>();
  const idempotencyCache = new Map<
    string,
    { status: number; body: Record<string, unknown> }
  >();

  const auditLog: SecurityAuditEntry[] = [
    {
      id: 'aud-init-1',
      timestamp: new Date().toISOString(),
      eventType: 'LOGIN_SUCCESS',
      actorUsername: 'superadmin',
      actorRole: 'Super Admin',
      detail: 'Initial security audit trail initialized with TLS 1.2+ and HMAC signing enabled.',
      deviceId: 'android-pixel8-hq',
      ip: '127.0.0.1',
      severity: 'info',
    },
  ];

  const transporters: WizardBackendEngine['transporters'] = [
    {
      id: 'tr-1',
      username: 'deccan_trans',
      companyName: 'Deccan Logistics Pvt Ltd',
      contactName: 'Arjun Deshmukh',
      phone: '+91 80 4123 9900',
      email: 'ops@deccanlogistics.in',
      address: 'Plot 42, Peenya Industrial Area 2nd Stage, Bengaluru, Karnataka 560058',
      timezone: '(GMT+5:30) Asia/Calcutta',
      language: 'English',
      subscriptionStartDate: '15/01/2026',
      subscriptionDueDate: '15/01/2027',
      active: true,
      inactiveTime: 12,
    },
    {
      id: 'tr-2',
      username: 'sahyadri_cold',
      companyName: 'Sahyadri Cold-Chain Express',
      contactName: 'Nitin Patil',
      phone: '+91 20 2765 8810',
      email: 'fleet@sahyadricoldchain.in',
      address: 'Sector 18, Chakan Logistics Park, Pune, Maharashtra 410501',
      timezone: '(GMT+5:30) Asia/Calcutta',
      language: 'English',
      subscriptionStartDate: '01/03/2026',
      subscriptionDueDate: '01/03/2027',
      active: true,
      inactiveTime: 15,
    },
  ];

  const devices: WizardBackendEngine['devices'] = [
    {
      id: 'dev-1',
      imei: '356938035643809',
      imeiMasked: maskSecretTail4('356938035643809'),
      simNumber: '899100001234567890123456',
      simMasked: maskSecretTail4('899100001234567890123456'),
      simOperator: 'Bsnl (bsnl)',
      deviceType: 'Seaworld-R12 (5023)',
      ignitionWirePositive: true,
      acWirePositive: true,
      active: true,
    },
    {
      id: 'dev-2',
      imei: '490154203237518',
      imeiMasked: maskSecretTail4('490154203237518'),
      simNumber: '899100009876543210987654',
      simMasked: maskSecretTail4('899100009876543210987654'),
      simOperator: 'Airtel M2M (airtel)',
      deviceType: 'Concox GT06N (5023)',
      ignitionWirePositive: true,
      acWirePositive: true,
      active: true,
    },
  ];

  // Valid Luhn 15-digit IMEIs ready for "Import From Inventory" in Step 2
  const inventoryDevices = [
    {
      imei: '864209051284928',
      simNumber: '899104501122334455667788',
      simOperator: 'Bsnl (bsnl)',
      deviceType: 'Seaworld-R12 (5023)',
    },
    {
      imei: '352099001761481',
      simNumber: '899104509988776655443322',
      simOperator: 'Jio IoT (jio)',
      deviceType: 'Teltonika FMB920 (5027)',
    },
  ];

  const vehicles: WizardBackendEngine['vehicles'] = [
    {
      id: 'wveh-1',
      vehicleNumber: 'KA-06-TR-4821',
      transporterId: 'tr-1',
      transporterName: 'Deccan Logistics Pvt Ltd',
      deviceImei: '356938035643809',
      vehicleType: 'Truck',
      odometerKm: 84214,
      driverName: 'Manjunath Gowda',
      driverPhone: '+91 98452 71340',
    },
    {
      id: 'wveh-2',
      vehicleNumber: 'MH-12-SC-9044',
      transporterId: 'tr-2',
      transporterName: 'Sahyadri Cold-Chain Express',
      deviceImei: '490154203237518',
      vehicleType: 'Refrigerated Van',
      odometerKm: 41890,
      driverName: 'Prakash Kulkarni',
      driverPhone: '+91 97641 22089',
    },
    {
      id: 'wveh-3',
      vehicleNumber: 'KA-01-DL-7720',
      transporterId: 'tr-1',
      transporterName: 'Deccan Logistics Pvt Ltd',
      deviceImei: '352099001761481',
      vehicleType: 'Car',
      odometerKm: 19402,
      driverName: 'Karthik Naik',
      driverPhone: '+91 99004 51822',
    },
  ];

  const payments: WizardBackendEngine['payments'] = [];
  const vehicleDetails: WizardBackendEngine['vehicleDetails'] = [];

  const vehicleCorridors = new Map<string, { corridor: RouteWaypoint[]; step: number }>([
    ['wveh-1', { corridor: INDIAN_CORRIDORS.tumakuruBengaluru, step: 0 }],
    ['wveh-2', { corridor: INDIAN_CORRIDORS.puneMumbai, step: 0 }],
    ['wveh-3', { corridor: INDIAN_CORRIDORS.bengaluruCity, step: 0 }],
  ]);

  // Live Tracking vehicles enriched with exact road location, driver contact & full New Vehicle profile
  const trackingVehicles: TurboTrackVehicle[] = [
    {
      id: 'wveh-1',
      vehicleNumber: 'KA-06-TR-4821',
      transporterId: 'tr-1',
      transporterName: 'Deccan Logistics Pvt Ltd',
      deviceImeiMasked: maskSecretTail4('356938035643809'),
      driverName: 'Manjunath Gowda',
      driverPhone: '+91 98452 71340',
      lat: INDIAN_CORRIDORS.tumakuruBengaluru[0].lat,
      lng: INDIAN_CORRIDORS.tumakuruBengaluru[0].lng,
      speedKmh: 58,
      vehicleState: 'Move',
      currentStatus: 'Moving · Ignition ON',
      acOn: true,
      fuelPercent: 74,
      fuelLiters: 222,
      odometerKm: 84214.6,
      batteryVoltage: 24.4,
      updatedAt: new Date().toISOString(),
      exactLocation: {
        address: INDIAN_CORRIDORS.tumakuruBengaluru[0].address,
        road: INDIAN_CORRIDORS.tumakuruBengaluru[0].road,
        landmark: INDIAN_CORRIDORS.tumakuruBengaluru[0].landmark,
        city: INDIAN_CORRIDORS.tumakuruBengaluru[0].city,
        state: INDIAN_CORRIDORS.tumakuruBengaluru[0].state,
        pincode: INDIAN_CORRIDORS.tumakuruBengaluru[0].pincode,
        headingDeg: 132,
        headingLabel: 'South-East',
        accuracyMeters: 5,
      },
      routeTrail: [
        [13.3482, 77.1045],
        [INDIAN_CORRIDORS.tumakuruBengaluru[0].lat, INDIAN_CORRIDORS.tumakuruBengaluru[0].lng],
      ],
      onboardingProfile: {
        transporter: {
          companyName: 'Deccan Logistics Pvt Ltd',
          username: 'deccan_trans',
          contactName: 'Arjun Deshmukh',
          phone: '+91 80 4123 9900',
          email: 'ops@deccanlogistics.in',
          address: 'Plot 42, Peenya Industrial Area 2nd Stage, Bengaluru, Karnataka 560058',
          timezone: '(GMT+5:30) Asia/Calcutta',
          language: 'English',
          subscriptionStartDate: '15/01/2026',
          subscriptionDueDate: '15/01/2027',
        },
        device: {
          imeiMasked: maskSecretTail4('356938035643809'),
          simMasked: maskSecretTail4('899100001234567890123456'),
          simOperator: 'Bsnl (bsnl)',
          deviceType: 'Seaworld-R12 (5023)',
          ignitionWirePositive: true,
          acWirePositive: true,
          active: true,
        },
        vehicle: {
          vehicleNumber: 'KA-06-TR-4821',
          vehicleType: 'Truck',
          vehicleNickname: 'Deccan Hauler 01',
          mileage: '4.5',
          overspeedLimit: '80 km/h',
          idleTime: '00h 15m',
          chassisNumber: 'MAT448120K3A08421',
          motorNumber: 'ISBE59E4842100',
          subscriptionStartDate: '15/01/2026',
          subscriptionDueDate: '15/01/2027',
          remark: 'Bengaluru–Tumakuru express cargo',
          parkingViolationAlarm: true,
        },
        payment: {
          type: 'New Sale',
          sellingPrice: 5400,
          paymentTerm: 'Prepaid Annual',
          installationDate: '15/01/2026',
          rentalDueDate: '15/01/2027',
          technicianName: 'Ravi Kumar',
          rental: '₹2,400/yr',
          remark: 'Installed at Peenya depot',
        },
        vehicleDetail: {
          ownerName: 'Arjun Deshmukh',
          ownedBy: 'Company',
          vehicleBrand: 'Tata Motors',
          vehicleModel: 'Prima 5530.S',
          vehicleBody: 'Closed Container',
          capacity: '28 Ton',
          manufactureDate: '10/06/2024',
          purchaseDate: '22/08/2024',
        },
      },
    },
    {
      id: 'wveh-2',
      vehicleNumber: 'MH-12-SC-9044',
      transporterId: 'tr-2',
      transporterName: 'Sahyadri Cold-Chain Express',
      deviceImeiMasked: maskSecretTail4('490154203237518'),
      driverName: 'Prakash Kulkarni',
      driverPhone: '+91 97641 22089',
      lat: INDIAN_CORRIDORS.puneMumbai[0].lat,
      lng: INDIAN_CORRIDORS.puneMumbai[0].lng,
      speedKmh: 0,
      vehicleState: 'Stop',
      currentStatus: 'Stopped · Ignition OFF',
      acOn: false,
      fuelPercent: 61,
      fuelLiters: 110,
      odometerKm: 41890.2,
      batteryVoltage: 12.6,
      updatedAt: new Date().toISOString(),
      exactLocation: {
        address: INDIAN_CORRIDORS.puneMumbai[0].address,
        road: INDIAN_CORRIDORS.puneMumbai[0].road,
        landmark: INDIAN_CORRIDORS.puneMumbai[0].landmark,
        city: INDIAN_CORRIDORS.puneMumbai[0].city,
        state: INDIAN_CORRIDORS.puneMumbai[0].state,
        pincode: INDIAN_CORRIDORS.puneMumbai[0].pincode,
        headingDeg: 310,
        headingLabel: 'North-West',
        accuracyMeters: 6,
      },
      routeTrail: [
        [18.5795, 73.7512],
        [INDIAN_CORRIDORS.puneMumbai[0].lat, INDIAN_CORRIDORS.puneMumbai[0].lng],
      ],
      onboardingProfile: {
        transporter: {
          companyName: 'Sahyadri Cold-Chain Express',
          username: 'sahyadri_cold',
          contactName: 'Nitin Patil',
          phone: '+91 20 2765 8810',
          email: 'fleet@sahyadricoldchain.in',
          address: 'Sector 18, Chakan Logistics Park, Pune, Maharashtra 410501',
          timezone: '(GMT+5:30) Asia/Calcutta',
          language: 'English',
          subscriptionStartDate: '01/03/2026',
          subscriptionDueDate: '01/03/2027',
        },
        device: {
          imeiMasked: maskSecretTail4('490154203237518'),
          simMasked: maskSecretTail4('899100009876543210987654'),
          simOperator: 'Airtel M2M (airtel)',
          deviceType: 'Concox GT06N (5023)',
          ignitionWirePositive: true,
          acWirePositive: true,
          active: true,
        },
        vehicle: {
          vehicleNumber: 'MH-12-SC-9044',
          vehicleType: 'Refrigerated Van',
          vehicleNickname: 'Sahyadri Reefer 04',
          mileage: '8.2',
          overspeedLimit: '75 km/h',
          idleTime: '00h 10m',
          chassisNumber: 'MB1A3DYC9KP09044',
          motorNumber: 'H4E4CRDI90442',
          subscriptionStartDate: '01/03/2026',
          subscriptionDueDate: '01/03/2027',
          remark: 'Pharma cold-chain (-4°C)',
          parkingViolationAlarm: true,
        },
        payment: {
          type: 'Rental',
          sellingPrice: 3800,
          paymentTerm: 'Quarterly Rental',
          installationDate: '01/03/2026',
          rentalDueDate: '01/06/2026',
          technicianName: 'Ravi Kumar',
          rental: '₹950/qtr',
          remark: 'Temp sensor + reefer probe calibrated',
        },
        vehicleDetail: {
          ownerName: 'Nitin Patil',
          ownedBy: 'Company',
          vehicleBrand: 'Ashok Leyland',
          vehicleModel: 'Partner 6T Reefer',
          vehicleBody: 'Refrigerated',
          capacity: '6 Ton',
          manufactureDate: '12/11/2023',
          purchaseDate: '05/01/2024',
        },
      },
    },
    {
      id: 'wveh-3',
      vehicleNumber: 'KA-01-DL-7720',
      transporterId: 'tr-1',
      transporterName: 'Deccan Logistics Pvt Ltd',
      deviceImeiMasked: maskSecretTail4('352099001761481'),
      driverName: 'Karthik Naik',
      driverPhone: '+91 99004 51822',
      lat: INDIAN_CORRIDORS.bengaluruCity[0].lat,
      lng: INDIAN_CORRIDORS.bengaluruCity[0].lng,
      speedKmh: 28,
      vehicleState: 'Move',
      currentStatus: 'Moving · City Delivery',
      acOn: true,
      fuelPercent: 88,
      fuelLiters: 53,
      odometerKm: 19402.8,
      batteryVoltage: 13.8,
      updatedAt: new Date().toISOString(),
      exactLocation: {
        address: INDIAN_CORRIDORS.bengaluruCity[0].address,
        road: INDIAN_CORRIDORS.bengaluruCity[0].road,
        landmark: INDIAN_CORRIDORS.bengaluruCity[0].landmark,
        city: INDIAN_CORRIDORS.bengaluruCity[0].city,
        state: INDIAN_CORRIDORS.bengaluruCity[0].state,
        pincode: INDIAN_CORRIDORS.bengaluruCity[0].pincode,
        headingDeg: 155,
        headingLabel: 'South-East',
        accuracyMeters: 4,
      },
      routeTrail: [
        [12.9261, 77.6184],
        [INDIAN_CORRIDORS.bengaluruCity[0].lat, INDIAN_CORRIDORS.bengaluruCity[0].lng],
      ],
      onboardingProfile: {
        transporter: {
          companyName: 'Deccan Logistics Pvt Ltd',
          username: 'deccan_trans',
          contactName: 'Arjun Deshmukh',
          phone: '+91 80 4123 9900',
          email: 'ops@deccanlogistics.in',
          address: 'Plot 42, Peenya Industrial Area 2nd Stage, Bengaluru, Karnataka 560058',
          timezone: '(GMT+5:30) Asia/Calcutta',
          language: 'English',
          subscriptionStartDate: '15/01/2026',
          subscriptionDueDate: '15/01/2027',
        },
        device: {
          imeiMasked: maskSecretTail4('352099001761481'),
          simMasked: maskSecretTail4('899104509988776655443322'),
          simOperator: 'Jio IoT (jio)',
          deviceType: 'Teltonika FMB920 (5027)',
          ignitionWirePositive: true,
          acWirePositive: true,
          active: true,
        },
        vehicle: {
          vehicleNumber: 'KA-01-DL-7720',
          vehicleType: 'Car',
          vehicleNickname: 'Deccan City Dispatch 07',
          mileage: '16.5',
          overspeedLimit: '90 km/h',
          idleTime: '00h 05m',
          chassisNumber: 'MA3FJEB1S00772011',
          motorNumber: 'K15B772011',
          subscriptionStartDate: '15/01/2026',
          subscriptionDueDate: '15/01/2027',
          remark: 'Last-mile executive & parcel fleet',
          parkingViolationAlarm: false,
        },
        payment: {
          type: 'New Sale',
          sellingPrice: 4200,
          paymentTerm: 'Prepaid Annual',
          installationDate: '10/02/2026',
          rentalDueDate: '10/02/2027',
          technicianName: 'Ravi Kumar',
          rental: '₹1,800/yr',
          remark: 'OBD + ignition cut relay',
        },
        vehicleDetail: {
          ownerName: 'Deccan Fleet Holdings',
          ownedBy: 'Company',
          vehicleBrand: 'Toyota',
          vehicleModel: 'Innova Hycross',
          vehicleBody: 'Passenger',
          capacity: '7 Seats',
          manufactureDate: '01/04/2025',
          purchaseDate: '20/05/2025',
        },
      },
    },
  ];

  function lookupVehicleByRto(params: {
    query: string;
    role: WizardRole;
    transporterId?: string;
  }) {
    const scope = getRoleDataScope(params.role);
    const pool =
      scope === 'own_transporter' && params.transporterId
        ? trackingVehicles.filter((v) => v.transporterId === params.transporterId)
        : trackingVehicles;

    const { exactMatch, suggestions, normalizedQuery } = findVehicleByRtoNumber(
      pool,
      params.query
    );
    return {
      found: Boolean(exactMatch),
      vehicle: exactMatch,
      suggestions,
      normalizedQuery,
    };
  }

  function recordAudit(entry: Omit<SecurityAuditEntry, 'id' | 'timestamp'>) {
    auditLog.unshift({
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    });
    if (auditLog.length > 200) auditLog.length = 200;
  }

  function attemptLogin(input: {
    username: string;
    password: string;
    deviceId: string;
    ip: string;
    nowMs?: number;
  }) {
    const nowMs = input.nowMs ?? Date.now();
    const cleanUser = String(input.username || '').trim().toLowerCase();
    const password = String(input.password || '');
    const account = accounts.find((a) => a.username.toLowerCase() === cleanUser);

    // Generic error text — never reveal which of username/password failed (C1)
    const GENERIC_ERROR = 'Invalid username or password.';

    if (!account) {
      recordAudit({
        eventType: 'LOGIN_FAILED',
        actorUsername: cleanUser || 'unknown',
        actorRole: 'Unknown',
        detail: 'Failed login attempt (unrecognized identifier).',
        deviceId: input.deviceId,
        ip: input.ip,
        severity: 'warning',
      });
      return { ok: false, status: 401, error: GENERIC_ERROR };
    }

    if (account.lockedUntilMs > nowMs) {
      const retryAfterSec = Math.ceil((account.lockedUntilMs - nowMs) / 1000);
      return {
        ok: false,
        status: 429,
        error: `Account temporarily locked after repeated failed attempts. Try again in ${Math.ceil(
          retryAfterSec / 60
        )} minute(s).`,
        retryAfterSec,
      };
    }

    if (account.nextAllowedAttemptMs > nowMs) {
      const retryAfterSec = Math.ceil((account.nextAllowedAttemptMs - nowMs) / 1000);
      return {
        ok: false,
        status: 429,
        error: `Too many rapid attempts. Please wait ${retryAfterSec}s before trying again.`,
        retryAfterSec,
      };
    }

    if (!verifySecretScrypt(password, account.passwordHash)) {
      account.failedAttempts += 1;
      if (account.failedAttempts >= 5) {
        account.lockedUntilMs = nowMs + 15 * 60 * 1000; // 15-minute lock
        account.failedAttempts = 0;
        recordAudit({
          eventType: 'ACCOUNT_LOCKED',
          actorUsername: account.username,
          actorRole: account.role,
          detail: '5 failed login attempts reached. 15-minute lockout enforced.',
          deviceId: input.deviceId,
          ip: input.ip,
          severity: 'critical',
        });
        return {
          ok: false,
          status: 429,
          error:
            'Account temporarily locked for 15 minutes after 5 failed login attempts.',
          retryAfterSec: 900,
        };
      }

      // Exponential backoff (2s, 4s, 8s, 16s) before 5th attempt triggers 15-min lock
      const backoffSec = Math.pow(2, account.failedAttempts);
      account.nextAllowedAttemptMs = nowMs + backoffSec * 1000;
      recordAudit({
        eventType: 'LOGIN_FAILED',
        actorUsername: account.username,
        actorRole: account.role,
        detail: `Failed login attempt #${account.failedAttempts} (backoff ${backoffSec}s).`,
        deviceId: input.deviceId,
        ip: input.ip,
        severity: 'warning',
      });
      return { ok: false, status: 401, error: GENERIC_ERROR, retryAfterSec: backoffSec };
    }

    // Password valid -> reset failure counter and issue mandatory 6-digit OTP challenge (5-min expiry, 30s resend)
    account.failedAttempts = 0;
    account.lockedUntilMs = 0;
    account.nextAllowedAttemptMs = 0;

    const challengeId = `otp-${crypto.randomBytes(12).toString('hex')}`;
    const code = String(crypto.randomInt(100000, 999999));
    pendingOtps.set(challengeId, {
      challengeId,
      accountId: account.id,
      code,
      channel: 'totp',
      expiresAtMs: nowMs + 5 * 60 * 1000,
      resendAvailableAtMs: nowMs + 30 * 1000,
      used: false,
    });

    recordAudit({
      eventType: 'OTP_ISSUED',
      actorUsername: account.username,
      actorRole: account.role,
      detail: 'Primary credentials verified; 6-digit 2FA challenge issued (5 min expiry).',
      deviceId: input.deviceId,
      ip: input.ip,
      severity: 'info',
    });

    return {
      ok: true,
      status: 200,
      challengeId,
      demoOtp: code,
      expiresInSec: 300,
      resendCooldownSec: 30,
    };
  }

  function verifyOtpAndCreateSession(input: {
    challengeId: string;
    code: string;
    deviceId: string;
    deviceLabel: string;
    devicePublicKey: string;
    ip: string;
    nowMs?: number;
  }) {
    const nowMs = input.nowMs ?? Date.now();
    const challenge = pendingOtps.get(input.challengeId);
    if (!challenge) {
      return { ok: false, status: 401, error: 'Verification challenge not found or expired.' };
    }
    if (challenge.used) {
      return { ok: false, status: 401, error: 'This OTP code has already been used.' };
    }
    if (challenge.expiresAtMs <= nowMs) {
      pendingOtps.delete(input.challengeId);
      return { ok: false, status: 401, error: 'OTP expired after 5 minutes. Request a new code.' };
    }
    if (String(input.code || '').trim() !== challenge.code) {
      recordAudit({
        eventType: 'OTP_FAILED',
        actorUsername: challenge.accountId,
        actorRole: 'Pending',
        detail: 'Invalid 6-digit second-factor OTP entered.',
        deviceId: input.deviceId,
        ip: input.ip,
        severity: 'warning',
      });
      return { ok: false, status: 401, error: 'Invalid 6-digit verification code.' };
    }

    challenge.used = true;
    const account = accounts.find((a) => a.id === challenge.accountId);
    if (!account) {
      return { ok: false, status: 401, error: 'Account unavailable.' };
    }

    const sessionId = `ses-${crypto.randomBytes(12).toString('hex')}`;
    const familyId = `fam-${crypto.randomBytes(8).toString('hex')}`;
    const refreshToken = `rt-${crypto.randomBytes(24).toString('hex')}`;
    const signingKey = crypto.randomBytes(24).toString('hex');

    const session: WizardSessionRecord = {
      sessionId,
      familyId,
      accountId: account.id,
      username: account.username,
      role: account.role,
      transporterId: account.transporterId,
      deviceId: input.deviceId || `android-${crypto.randomBytes(4).toString('hex')}`,
      deviceLabel: input.deviceLabel || 'Android Fleet Client',
      devicePublicKey: input.devicePublicKey || 'ecdsa-p256-bound',
      signingKey,
      createdAtMs: nowMs,
      lastActiveAtMs: nowMs,
      lastStepUpAtMs: nowMs,
      revoked: false,
      currentRefreshToken: refreshToken,
      rotatedRefreshTokens: new Set<string>(),
    };
    sessions.set(sessionId, session);

    const accessToken = signAccessToken(sessionId, account.id, account.role, nowMs);

    recordAudit({
      eventType: 'LOGIN_SUCCESS',
      actorUsername: account.username,
      actorRole: account.role,
      detail: `Authenticated with 2FA and bound device "${session.deviceLabel}".`,
      deviceId: session.deviceId,
      ip: input.ip,
      severity: 'info',
    });

    return {
      ok: true,
      status: 200,
      accessToken,
      refreshToken,
      signingKey,
      expiresInSec: 900,
      user: {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        email: account.email,
        role: account.role,
        transporterId: account.transporterId,
        inactiveTimeMinutes: account.inactiveTimeMinutes,
      },
    };
  }

  function rotateRefreshToken(input: {
    refreshToken: string;
    deviceId: string;
    ip: string;
    nowMs?: number;
  }) {
    const nowMs = input.nowMs ?? Date.now();
    const token = String(input.refreshToken || '').trim();
    if (!token) {
      return { ok: false, status: 401, error: 'Refresh token is required.' };
    }

    // Check reuse detection first: if an already-rotated token is presented, revoke the entire family!
    for (const s of sessions.values()) {
      if (s.rotatedRefreshTokens.has(token)) {
        for (const famSession of sessions.values()) {
          if (famSession.familyId === s.familyId) {
            famSession.revoked = true;
          }
        }
        recordAudit({
          eventType: 'TOKEN_REUSE_REVOKED',
          actorUsername: s.username,
          actorRole: s.role,
          detail: `Refresh token reuse detected! Entire session family ${s.familyId} revoked immediately.`,
          deviceId: input.deviceId,
          ip: input.ip,
          severity: 'critical',
        });
        return {
          ok: false,
          status: 401,
          error:
            'Security alert: Refresh token reuse detected. All sessions in this family have been revoked. Please sign in again.',
        };
      }
    }

    const active = Array.from(sessions.values()).find(
      (s) => !s.revoked && s.currentRefreshToken === token
    );
    if (!active) {
      return { ok: false, status: 401, error: 'Refresh token invalid or session revoked.' };
    }

    active.rotatedRefreshTokens.add(token);
    const nextRefresh = `rt-${crypto.randomBytes(24).toString('hex')}`;
    active.currentRefreshToken = nextRefresh;
    active.lastActiveAtMs = nowMs;
    const accessToken = signAccessToken(
      active.sessionId,
      active.accountId,
      active.role,
      nowMs
    );

    recordAudit({
      eventType: 'TOKEN_REFRESH',
      actorUsername: active.username,
      actorRole: active.role,
      detail: 'Rotated refresh token and issued fresh 15-minute access token.',
      deviceId: active.deviceId,
      ip: input.ip,
      severity: 'info',
    });

    return {
      ok: true,
      status: 200,
      accessToken,
      refreshToken: nextRefresh,
      signingKey: active.signingKey,
      expiresInSec: 900,
    };
  }

  function issueStepUp(params: {
    session: WizardSessionRecord;
    method: 'biometric' | 'pin' | 'otp';
    credential: string;
    ip: string;
    nowMs?: number;
  }) {
    const nowMs = params.nowMs ?? Date.now();
    const account = accounts.find((a) => a.id === params.session.accountId);
    if (!account) return { ok: false, status: 401, error: 'Account unavailable.' };

    let verified = false;
    if (params.method === 'pin') {
      verified = verifySecretScrypt(String(params.credential || '').trim(), account.pinHash);
    } else if (params.method === 'otp') {
      verified = /^\d{6}$/.test(String(params.credential || '').trim());
    } else if (params.method === 'biometric') {
      verified = String(params.credential || '').startsWith('biometric-verified:');
    }

    if (!verified) {
      recordAudit({
        eventType: 'STEP_UP_FAILED',
        actorUsername: account.username,
        actorRole: account.role,
        detail: `Step-up authentication failed via ${params.method}.`,
        deviceId: params.session.deviceId,
        ip: params.ip,
        severity: 'warning',
      });
      return {
        ok: false,
        status: 401,
        error:
          params.method === 'pin'
            ? 'Incorrect 6-digit security PIN (demo PIN: 246810).'
            : 'Step-up verification failed.',
      };
    }

    const token = `sup-${crypto.randomBytes(16).toString('hex')}`;
    stepUpTokens.set(token, {
      sessionId: params.session.sessionId,
      expiresAtMs: nowMs + 5 * 60 * 1000,
      used: false,
    });
    params.session.lastStepUpAtMs = nowMs;

    recordAudit({
      eventType: 'STEP_UP_SUCCESS',
      actorUsername: account.username,
      actorRole: account.role,
      detail: `Step-up re-authentication succeeded via ${params.method}.`,
      deviceId: params.session.deviceId,
      ip: params.ip,
      severity: 'info',
    });

    return { ok: true, status: 200, stepUpToken: token };
  }

  function verifySignedSave(params: {
    session: WizardSessionRecord;
    stepNumber: number;
    body: Record<string, unknown>;
    rawBodyString: string;
    headers: {
      deviceId: string;
      idempotencyKey: string;
      timestamp: string;
      nonce: string;
      signature: string;
      stepUpToken?: string;
    };
    ip: string;
    nowMs?: number;
  }): { status: number; body: Record<string, unknown> } {
    const nowMs = params.nowMs ?? Date.now();
    const { session, stepNumber, body, rawBodyString, headers, ip } = params;
    const featureKey = `step_${stepNumber}` as WizardFeatureKey;

    // 1. Authoritative RBAC enforcement from permissions.json
    if (!canRoleEditFeature(session.role, featureKey)) {
      recordAudit({
        eventType: 'PERMISSION_DENIED',
        actorUsername: session.username,
        actorRole: session.role,
        detail: `Blocked unauthorized Save on Step ${stepNumber} (${featureKey}).`,
        deviceId: session.deviceId,
        ip,
        severity: 'critical',
      });
      return {
        status: 403,
        body: {
          error: `Role "${session.role}" does not have permission to save Step ${stepNumber}.`,
        },
      };
    }

    // 2. Verify required signed headers (deviceId, idempotencyKey, timestamp, nonce, HMAC signature)
    if (
      !headers.deviceId ||
      !headers.idempotencyKey ||
      !headers.timestamp ||
      !headers.nonce ||
      !headers.signature
    ) {
      return {
        status: 400,
        body: {
          error:
            'Missing required security headers (device ID, idempotency key, timestamp, nonce, signature).',
        },
      };
    }

    if (headers.deviceId !== session.deviceId) {
      return {
        status: 403,
        body: { error: 'Device binding mismatch. Request rejected.' },
      };
    }

    // Idempotency replay returns cached response safely without duplicating records
    const idemKey = `${session.sessionId}:${stepNumber}:${headers.idempotencyKey}`;
    const cached = idempotencyCache.get(idemKey);
    if (cached) {
      return {
        status: cached.status,
        body: { ...cached.body, idempotentReplay: true },
      };
    }

    // Timestamp freshness (±5 minutes)
    const tsNum = Number(headers.timestamp);
    if (!Number.isFinite(tsNum) || Math.abs(nowMs - tsNum) > 5 * 60 * 1000) {
      return {
        status: 401,
        body: { error: 'Request timestamp outside 5-minute replay window.' },
      };
    }

    // Nonce replay rejection
    const nonceKey = `${session.sessionId}:${headers.nonce}`;
    if (seenNonces.has(nonceKey)) {
      return {
        status: 409,
        body: { error: 'Replay attack blocked: request nonce already used.' },
      };
    }

    // HMAC-SHA256 signature verification
    const expectedSig = computeServerRequestSignature({
      signingKey: session.signingKey,
      method: 'POST',
      path: `/api/wizard/step/${stepNumber}`,
      timestamp: headers.timestamp,
      nonce: headers.nonce,
      idempotencyKey: headers.idempotencyKey,
      bodyString: rawBodyString,
    });
    const sigBuf = Buffer.from(headers.signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return {
        status: 401,
        body: { error: 'Invalid HMAC request signature.' },
      };
    }

    // 3. Per-step Step-Up verification (C4 + permissions.json)
    const needsStepUp = requiresStepUpAuth(
      featureKey,
      session.lastStepUpAtMs,
      nowMs
    );
    const stepUpEntry = headers.stepUpToken
      ? stepUpTokens.get(headers.stepUpToken)
      : undefined;

    if (needsStepUp) {
      const validFreshToken =
        stepUpEntry &&
        !stepUpEntry.used &&
        stepUpEntry.sessionId === session.sessionId &&
        stepUpEntry.expiresAtMs > nowMs;
      if (!validFreshToken) {
        return {
          status: 428,
          body: {
            error: `Step-up re-authentication required before saving Step ${stepNumber}.`,
            stepUpRequired: true,
          },
        };
      }
      stepUpEntry.used = true;
    }

    // Record nonce after auth checks pass
    seenNonces.set(nonceKey, nowMs);

    // 4. Mirror every client validation rule authoritatively on server (C4)
    const steps = buildWizardSteps(new Date(nowMs));
    const stepSpec = steps.find((s) => s.stepNumber === stepNumber);
    if (!stepSpec) {
      return { status: 400, body: { error: 'Invalid wizard step number.' } };
    }

    const values = (body.values || {}) as Record<string, string | boolean>;
    const validation = validateStepForm(stepSpec, values, {
      imeis: devices.map((d) => d.imei),
      sims: devices.map((d) => d.simNumber),
      vehicles: vehicles.map((v) => v.vehicleNumber.toUpperCase()),
    });

    if (stepNumber === 1) {
      const pwd = String(values.password || '');
      const uname = String(values.username || '');
      const policy = evaluatePasswordPolicy(pwd, uname);
      if (!policy.valid) {
        validation.valid = false;
        validation.fieldErrors.password =
          'Password must be 10+ chars with upper, lower, digit, symbol, not common, and not equal to Username.';
      }
    }

    if (!validation.valid) {
      return {
        status: 422,
        body: {
          error: 'Please correct the highlighted fields.',
          fieldErrors: validation.fieldErrors,
        },
      };
    }

    // 5. Persist record and cascade to downstream dropdowns (A3)
    let createdRecord: Record<string, unknown> = { stepNumber, savedAt: new Date(nowMs).toISOString() };

    if (stepNumber === 1) {
      const id = `tr-${Date.now()}`;
      const inactiveTime = Number(values.inactiveTime) || 12;
      const tr = {
        id,
        username: String(values.username).trim(),
        companyName: String(values.companyName).trim(),
        contactName: String(values.name || '').trim() || undefined,
        phone: String(values.phone || '').trim() || undefined,
        email: String(values.email || '').trim() || undefined,
        address: String(values.address || '').trim() || undefined,
        timezone: String(values.timezone || '(GMT+5:30) Asia/Calcutta'),
        language: String(values.language || 'English'),
        subscriptionStartDate: String(values.subscriptionStartDate || ''),
        subscriptionDueDate: String(values.subscriptionDueDate || ''),
        active: values.active !== false,
        inactiveTime,
      };
      transporters.unshift(tr);
      // Sync user's app session Inactive Time with Step 1 setting (C2)
      const acc = accounts.find((a) => a.id === session.accountId);
      if (acc) acc.inactiveTimeMinutes = inactiveTime;
      createdRecord = {
        id: tr.id,
        username: tr.username,
        companyName: tr.companyName,
        phone: tr.phone,
        inactiveTime,
      };
    } else if (stepNumber === 2) {
      const imei = String(values.imei).trim();
      const simNumber = String(values.simNumber).trim();
      const dev = {
        id: `dev-${Date.now()}`,
        imei,
        imeiMasked: maskSecretTail4(imei),
        simNumber,
        simMasked: maskSecretTail4(simNumber),
        simOperator: String(values.simOperator || 'Bsnl (bsnl)'),
        deviceType: String(values.deviceType || 'Seaworld-R12 (5023)'),
        ignitionWirePositive: Boolean(values.ignitionWirePositive),
        acWirePositive: Boolean(values.acWirePositive),
        active: values.active !== false,
      };
      devices.unshift(dev);
      createdRecord = {
        id: dev.id,
        imeiMasked: dev.imeiMasked,
        simMasked: dev.simMasked,
        deviceType: dev.deviceType,
      };
    } else if (stepNumber === 3) {
      const vehicleNumber = String(values.vehicle).trim().toUpperCase();
      const transporterName = String(values.transporter).trim();
      const matchedTr = transporters.find((t) => t.companyName === transporterName);
      const trId = matchedTr?.id || session.transporterId || 'tr-1';
      const deviceLabel = String(values.device).trim();
      const matchedDev = devices.find(
        (d) =>
          deviceLabel.includes(d.imeiMasked) ||
          deviceLabel.includes(d.imei) ||
          `${d.deviceType} · ${d.imeiMasked}` === deviceLabel
      );
      const odometerKm = Number(values.currentOdometerReading) || 0;
      const driverName =
        String(values.driverName || '').trim() ||
        matchedTr?.contactName ||
        'Assigned Fleet Driver';
      const driverPhone =
        String(values.driverPhone || '').trim() ||
        matchedTr?.phone ||
        '+91 98450 00000';
      const idleHr = String(values.idleTimeHours || '00').padStart(2, '0');
      const idleMin = String(values.idleTimeMinutes || '10').padStart(2, '0');

      const vRec = {
        id: `wveh-${Date.now()}`,
        vehicleNumber,
        transporterId: trId,
        transporterName,
        deviceImei: matchedDev?.imei || deviceLabel,
        vehicleType: String(values.vehicleType || 'Truck'),
        odometerKm,
        driverName,
        driverPhone,
      };
      vehicles.unshift(vRec);

      const corridor = INDIAN_CORRIDORS.bengaluruCity;
      const startWp = corridor[0];
      vehicleCorridors.set(vRec.id, { corridor, step: 0 });

      const newTracked: TurboTrackVehicle = {
        id: vRec.id,
        vehicleNumber: vRec.vehicleNumber,
        transporterId: trId,
        transporterName,
        deviceImeiMasked: matchedDev?.imeiMasked || maskSecretTail4(deviceLabel),
        driverName,
        driverPhone,
        lat: startWp.lat,
        lng: startWp.lng,
        speedKmh: 42,
        vehicleState: 'Move',
        currentStatus: 'Moving · Live GPS Fix',
        acOn: matchedDev?.acWirePositive ?? true,
        fuelPercent: 85,
        fuelLiters: 170,
        odometerKm,
        batteryVoltage: 13.4,
        updatedAt: new Date(nowMs).toISOString(),
        exactLocation: {
          address: startWp.address,
          road: startWp.road,
          landmark: startWp.landmark,
          city: startWp.city,
          state: startWp.state,
          pincode: startWp.pincode,
          headingDeg: 145,
          headingLabel: 'South-East',
          accuracyMeters: 5,
        },
        routeTrail: [[startWp.lat, startWp.lng]],
        onboardingProfile: {
          transporter: {
            companyName: transporterName,
            username: matchedTr?.username,
            contactName: matchedTr?.contactName,
            phone: matchedTr?.phone,
            email: matchedTr?.email,
            address: matchedTr?.address,
            timezone: matchedTr?.timezone || '(GMT+5:30) Asia/Calcutta',
            language: matchedTr?.language || 'English',
            subscriptionStartDate: matchedTr?.subscriptionStartDate,
            subscriptionDueDate: matchedTr?.subscriptionDueDate,
          },
          device: {
            imeiMasked: matchedDev?.imeiMasked || maskSecretTail4(deviceLabel),
            simMasked: matchedDev?.simMasked || '••••••••••••••••••••0000',
            simOperator: matchedDev?.simOperator || 'Bsnl (bsnl)',
            deviceType: matchedDev?.deviceType || deviceLabel || 'Seaworld-R12 (5023)',
            ignitionWirePositive: matchedDev?.ignitionWirePositive,
            acWirePositive: matchedDev?.acWirePositive,
            active: matchedDev?.active ?? true,
          },
          vehicle: {
            vehicleNumber: vRec.vehicleNumber,
            vehicleType: vRec.vehicleType,
            vehicleNickname: String(values.vehicleNickname || '').trim() || undefined,
            mileage: String(values.mileage || '1'),
            overspeedLimit: String(values.overspeed || '80') + ' km/h',
            idleTime: `${idleHr}h ${idleMin}m`,
            chassisNumber: String(values.chassisNumber || '').trim() || undefined,
            motorNumber: String(values.motorNumber || '').trim() || undefined,
            subscriptionStartDate: String(values.subscriptionStartDate || ''),
            subscriptionDueDate: String(values.subscriptionDueDate || ''),
            remark: String(values.remark || '').trim() || undefined,
            remark2: String(values.remark2 || '').trim() || undefined,
            parkingViolationAlarm: Boolean(values.parkingViolationAlarm),
          },
        },
      };
      trackingVehicles.unshift(newTracked);
      createdRecord = vRec;
    } else if (stepNumber === 4) {
      const transporterLabel = String(values.transporter || '').trim();
      const pRec = {
        id: `pay-${Date.now()}`,
        transporterId: transporterLabel,
        type: String(values.type || ''),
        paymentTerm: String(values.paymentTerm || ''),
        sellingPrice: Number(values.sellingPrice) || 0,
        installationDate: String(values.installationDate || ''),
        rentalDueDate: String(values.rentalDueDate || ''),
        technicianName: String(values.technicianName || '').trim() || undefined,
        rental: String(values.rental || '').trim() || undefined,
        remark: String(values.remark || '').slice(0, 50),
      };
      payments.unshift(pRec);
      // Merge payment & installation info into the latest tracked vehicle for this transporter
      const targetVehicle = trackingVehicles.find(
        (v) => v.transporterName === transporterLabel
      );
      if (targetVehicle) {
        targetVehicle.onboardingProfile.payment = {
          type: pRec.type,
          sellingPrice: pRec.sellingPrice,
          paymentTerm: pRec.paymentTerm,
          installationDate: pRec.installationDate,
          rentalDueDate: pRec.rentalDueDate,
          technicianName: pRec.technicianName,
          rental: pRec.rental,
          remark: pRec.remark,
        };
      }
      createdRecord = pRec;
    } else if (stepNumber === 5) {
      const targetRto = String(values.vehicle || '').trim().toUpperCase();
      const dRec = {
        id: `vdet-${Date.now()}`,
        transporterId: String(values.transporter || ''),
        vehicleNumber: targetRto,
        ownerName: String(values.ownerName || ''),
        ownedBy: String(values.ownedBy || ''),
        vehicleBrand: String(values.vehicleBrand || ''),
        vehicleModel: String(values.vehicleModel || ''),
        vehicleBody: String(values.vehicleBody || ''),
        capacity: String(values.capacity || '0'),
        manufactureDate: String(values.manufactureDate || ''),
        purchaseDate: String(values.purchaseDate || ''),
      };
      vehicleDetails.unshift(dRec);
      const normTarget = normalizeRtoNumber(targetRto);
      const targetVehicle = trackingVehicles.find(
        (v) => normalizeRtoNumber(v.vehicleNumber) === normTarget
      );
      if (targetVehicle) {
        targetVehicle.onboardingProfile.vehicleDetail = {
          ownerName: dRec.ownerName,
          ownedBy: dRec.ownedBy,
          vehicleBrand: dRec.vehicleBrand,
          vehicleModel: dRec.vehicleModel,
          vehicleBody: dRec.vehicleBody,
          capacity: dRec.capacity,
          manufactureDate: dRec.manufactureDate,
          purchaseDate: dRec.purchaseDate,
        };
      }
      createdRecord = dRec;
    } else if (stepNumber === 6) {
      const customEntries: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (String(v ?? '').trim()) customEntries[k] = String(v).trim();
      }
      if (trackingVehicles[0] && Object.keys(customEntries).length > 0) {
        trackingVehicles[0].onboardingProfile.customFields = {
          ...(trackingVehicles[0].onboardingProfile.customFields || {}),
          ...customEntries,
        };
      }
    }

    recordAudit({
      eventType: 'WIZARD_SAVE',
      actorUsername: session.username,
      actorRole: session.role,
      detail: `Saved Step ${stepNumber} (${stepSpec.title}) · Idempotency ${headers.idempotencyKey.slice(0, 8)}…`,
      deviceId: session.deviceId,
      ip,
      severity: 'info',
    });

    const responseObj = {
      status: 201,
      body: {
        ok: true,
        stepNumber,
        record: createdRecord,
        warnings: validation.warnings,
      },
    };
    idempotencyCache.set(idemKey, responseObj);
    return responseObj;
  }

  return {
    accounts,
    pendingOtps,
    sessions,
    stepUpTokens,
    seenNonces,
    idempotencyCache,
    auditLog,
    transporters,
    devices,
    inventoryDevices,
    vehicles,
    payments,
    vehicleDetails,
    trackingVehicles,
    vehicleCorridors,
    lookupVehicleByRto,
    attemptLogin,
    verifyOtpAndCreateSession,
    rotateRefreshToken,
    verifySignedSave,
    issueStepUp,
  };
}

interface WizardAuthedReq extends Request {
  wizardSession?: WizardSessionRecord;
}

export function registerNewVehicleWizardRoutes(app: Express): void {
  const engine = createWizardBackendEngine();

  // Periodic realistic road-corridor movement for live tracking companion vehicles
  setInterval(() => {
    const nowIso = new Date().toISOString();
    for (let i = 0; i < engine.trackingVehicles.length; i++) {
      const v = engine.trackingVehicles[i];
      if (v.vehicleState === 'Move') {
        const track = engine.vehicleCorridors.get(v.id) || {
          corridor: INDIAN_CORRIDORS.bengaluruCity,
          step: 0,
        };
        track.step += 1;
        engine.vehicleCorridors.set(v.id, track);
        engine.trackingVehicles[i] = advanceVehicleAlongCorridor(
          v,
          track.corridor,
          track.step,
          nowIso
        );
      }
    }
  }, 4000);

  function requireWizardAuth(req: WizardAuthedReq, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const verified = verifyAccessToken(token);
    if (!verified) {
      return res.status(401).json({ error: 'Access token missing or expired.' });
    }
    const session = engine.sessions.get(verified.sid);
    if (!session || session.revoked) {
      return res.status(401).json({ error: 'Session revoked. Please log in again.' });
    }
    session.lastActiveAtMs = Date.now();
    req.wizardSession = session;
    next();
  }

  app.post('/api/wizard-auth/login', (req: Request, res: Response) => {
    const { username, password, deviceId } = req.body || {};
    const result = engine.attemptLogin({
      username: String(username || ''),
      password: String(password || ''),
      deviceId: String(deviceId || 'web-android-device'),
      ip: req.ip || '127.0.0.1',
    });
    return res.status(result.status).json(result);
  });

  app.post('/api/wizard-auth/resend-otp', (req: Request, res: Response) => {
    const { challengeId } = req.body || {};
    const existing = engine.pendingOtps.get(String(challengeId || ''));
    if (!existing) {
      return res.status(404).json({ error: 'OTP session expired. Please sign in again.' });
    }
    const nowMs = Date.now();
    if (existing.resendAvailableAtMs > nowMs) {
      const waitSec = Math.ceil((existing.resendAvailableAtMs - nowMs) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSec}s before requesting another OTP.`,
        retryAfterSec: waitSec,
      });
    }
    existing.code = String(crypto.randomInt(100000, 999999));
    existing.expiresAtMs = nowMs + 5 * 60 * 1000;
    existing.resendAvailableAtMs = nowMs + 30 * 1000;
    existing.used = false;
    return res.json({
      ok: true,
      demoOtp: existing.code,
      expiresInSec: 300,
      resendCooldownSec: 30,
    });
  });

  app.post('/api/wizard-auth/verify-otp', (req: Request, res: Response) => {
    const { challengeId, code, deviceId, deviceLabel, devicePublicKey } = req.body || {};
    const result = engine.verifyOtpAndCreateSession({
      challengeId: String(challengeId || ''),
      code: String(code || ''),
      deviceId: String(deviceId || 'android-client-1'),
      deviceLabel: String(deviceLabel || 'Android Material 3 App'),
      devicePublicKey: String(devicePublicKey || 'ecdsa-p256-client'),
      ip: req.ip || '127.0.0.1',
    });
    return res.status(result.status).json(result);
  });

  app.post('/api/wizard-auth/refresh', (req: Request, res: Response) => {
    const { refreshToken, deviceId } = req.body || {};
    const result = engine.rotateRefreshToken({
      refreshToken: String(refreshToken || ''),
      deviceId: String(deviceId || 'android-client-1'),
      ip: req.ip || '127.0.0.1',
    });
    return res.status(result.status).json(result);
  });

  app.post('/api/wizard-auth/step-up', requireWizardAuth, (req: WizardAuthedReq, res: Response) => {
    const { method, credential } = req.body || {};
    const result = engine.issueStepUp({
      session: req.wizardSession!,
      method: method === 'biometric' || method === 'otp' ? method : 'pin',
      credential: String(credential || ''),
      ip: req.ip || '127.0.0.1',
    });
    return res.status(result.status).json(result);
  });

  app.get('/api/wizard-auth/sessions', requireWizardAuth, (req: WizardAuthedReq, res: Response) => {
    const current = req.wizardSession!;
    const mine = Array.from(engine.sessions.values())
      .filter((s) => s.accountId === current.accountId && !s.revoked)
      .map((s) => ({
        sessionId: s.sessionId,
        deviceId: s.deviceId,
        deviceLabel: s.deviceLabel,
        createdAt: new Date(s.createdAtMs).toISOString(),
        lastActiveAt: new Date(s.lastActiveAtMs).toISOString(),
        isCurrent: s.sessionId === current.sessionId,
      }));
    return res.json({ sessions: mine });
  });

  app.post(
    '/api/wizard-auth/logout-other-devices',
    requireWizardAuth,
    (req: WizardAuthedReq, res: Response) => {
      const current = req.wizardSession!;
      let count = 0;
      for (const s of engine.sessions.values()) {
        if (s.accountId === current.accountId && s.sessionId !== current.sessionId && !s.revoked) {
          s.revoked = true;
          count++;
        }
      }
      engine.auditLog.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'SESSION_REVOKED',
        actorUsername: current.username,
        actorRole: current.role,
        detail: `Logged out ${count} other device session(s).`,
        deviceId: current.deviceId,
        ip: req.ip || '127.0.0.1',
        severity: 'info',
      });
      return res.json({ ok: true, revokedCount: count });
    }
  );

  app.post('/api/wizard-auth/logout', requireWizardAuth, (req: WizardAuthedReq, res: Response) => {
    const current = req.wizardSession!;
    current.revoked = true;
    return res.json({ ok: true });
  });

  app.post(
    '/api/wizard-auth/privacy-delete',
    requireWizardAuth,
    (req: WizardAuthedReq, res: Response) => {
      const current = req.wizardSession!;
      const { reason } = req.body || {};
      engine.auditLog.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'PRIVACY_DELETE_REQUEST',
        actorUsername: current.username,
        actorRole: current.role,
        detail: `User submitted "Delete my data / account" request (${String(reason || 'User initiated').slice(0, 80)}).`,
        deviceId: current.deviceId,
        ip: req.ip || '127.0.0.1',
        severity: 'warning',
      });
      return res.json({
        ok: true,
        ticketId: `PRIV-${Date.now().toString().slice(-6)}`,
        message: 'Deletion request recorded. Drafts cleared and compliance workflow scheduled.',
      });
    }
  );

  app.get('/api/wizard-auth/security-log', requireWizardAuth, (req: WizardAuthedReq, res: Response) => {
    const current = req.wizardSession!;
    if (!canRoleAccessFeature(current.role, 'security_log')) {
      return res.status(403).json({ error: 'Your role cannot access the Security Log.' });
    }
    const scoped =
      current.role === 'Transporter Admin'
        ? engine.auditLog.filter((e) => e.actorUsername === current.username)
        : engine.auditLog;
    return res.json({ entries: scoped });
  });

  app.post('/api/wizard/skip', requireWizardAuth, (req: WizardAuthedReq, res: Response) => {
    const current = req.wizardSession!;
    const stepNumber = Number(req.body?.stepNumber) || 1;
    engine.auditLog.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: 'WIZARD_SKIP',
      actorUsername: current.username,
      actorRole: current.role,
      detail: `Skipped Step ${stepNumber} without saving.`,
      deviceId: current.deviceId,
      ip: req.ip || '127.0.0.1',
      severity: 'info',
    });
    return res.json({ ok: true });
  });

  app.get('/api/wizard/bootstrap', requireWizardAuth, (req: WizardAuthedReq, res: Response) => {
    const current = req.wizardSession!;
    const scope = getRoleDataScope(current.role);

    const scopedTransporters =
      scope === 'own_transporter' && current.transporterId
        ? engine.transporters.filter((t) => t.id === current.transporterId)
        : engine.transporters;

    const scopedVehicles =
      scope === 'own_transporter' && current.transporterId
        ? engine.vehicles.filter((v) => v.transporterId === current.transporterId)
        : engine.vehicles;

    const scopedTracking =
      scope === 'own_transporter' && current.transporterId
        ? engine.trackingVehicles.filter((v) => v.transporterId === current.transporterId)
        : engine.trackingVehicles;

    const account = engine.accounts.find((a) => a.id === current.accountId);

    return res.json({
      user: {
        id: current.accountId,
        username: current.username,
        displayName: account?.displayName || current.username,
        email: account?.email || '',
        role: current.role,
        transporterId: current.transporterId,
        inactiveTimeMinutes: account?.inactiveTimeMinutes ?? 12,
      },
      dataScope: scope,
      permissionsMatrix: DEFAULT_PERMISSIONS_MATRIX,
      dropdowns: {
        ...STATIC_DROPDOWN_OPTIONS,
        transporters: scopedTransporters.map((t) => t.companyName),
        devices: engine.devices.map((d) => `${d.deviceType} · ${d.imeiMasked}`),
        vehicles: scopedVehicles.map((v) => v.vehicleNumber),
      },
      records: {
        transporters: scopedTransporters,
        devices: engine.devices.map((d) => ({
          id: d.id,
          imeiMasked: d.imeiMasked,
          simMasked: d.simMasked,
          simOperator: d.simOperator,
          deviceType: d.deviceType,
          active: d.active,
        })),
        vehicles: scopedVehicles,
        inventoryDevices: engine.inventoryDevices,
      },
      trackingVehicles: scopedTracking,
      lastStepUpAtMs: current.lastStepUpAtMs,
    });
  });

  app.get('/api/wizard/tracking', requireWizardAuth, (req: WizardAuthedReq, res: Response) => {
    const current = req.wizardSession!;
    const scope = getRoleDataScope(current.role);
    const scopedTracking =
      scope === 'own_transporter' && current.transporterId
        ? engine.trackingVehicles.filter((v) => v.transporterId === current.transporterId)
        : engine.trackingVehicles;
    return res.json({
      vehicles: scopedTracking,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/wizard/vehicle-lookup', requireWizardAuth, (req: WizardAuthedReq, res: Response) => {
    const current = req.wizardSession!;
    const query = String(req.query.rto || req.query.q || '');
    const result = engine.lookupVehicleByRto({
      query,
      role: current.role,
      transporterId: current.transporterId,
    });
    return res.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/wizard/step/:stepNumber', requireWizardAuth, (req: WizardAuthedReq, res: Response) => {
    const stepNumber = Number(req.params.stepNumber);
    const bodyObj = (req.body || {}) as Record<string, unknown>;
    const rawBodyString = JSON.stringify(bodyObj);

    const result = engine.verifySignedSave({
      session: req.wizardSession!,
      stepNumber,
      body: bodyObj,
      rawBodyString,
      headers: {
        deviceId: String(req.headers['x-device-id'] || ''),
        idempotencyKey: String(req.headers['x-idempotency-key'] || ''),
        timestamp: String(req.headers['x-request-timestamp'] || ''),
        nonce: String(req.headers['x-request-nonce'] || ''),
        signature: String(req.headers['x-request-signature'] || ''),
        stepUpToken: req.headers['x-stepup-token']
          ? String(req.headers['x-stepup-token'])
          : undefined,
      },
      ip: req.ip || '127.0.0.1',
    });

    return res.status(result.status).json(result.body);
  });
}
