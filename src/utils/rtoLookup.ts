export type CustomerStage = 'android' | 'iphone' | 'web';

export interface VehicleExactLocation {
  address: string;
  road: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  headingDeg: number;
  headingLabel: string;
  accuracyMeters: number;
}

export interface VehicleOnboardingProfile {
  transporter: {
    companyName: string;
    username?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
    language?: string;
    subscriptionStartDate?: string;
    subscriptionDueDate?: string;
  };
  device: {
    imeiMasked: string;
    simMasked: string;
    simOperator: string;
    deviceType: string;
    ignitionWirePositive?: boolean;
    acWirePositive?: boolean;
    active?: boolean;
  };
  vehicle: {
    vehicleNumber: string;
    vehicleType: string;
    vehicleNickname?: string;
    mileage?: string;
    overspeedLimit?: string;
    idleTime?: string;
    chassisNumber?: string;
    motorNumber?: string;
    subscriptionStartDate?: string;
    subscriptionDueDate?: string;
    remark?: string;
    remark2?: string;
    parkingViolationAlarm?: boolean;
  };
  payment?: {
    type?: string;
    sellingPrice?: number;
    paymentTerm?: string;
    installationDate?: string;
    rentalDueDate?: string;
    technicianName?: string;
    rental?: string;
    remark?: string;
  };
  vehicleDetail?: {
    ownerName?: string;
    ownedBy?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleBody?: string;
    capacity?: string;
    manufactureDate?: string;
    purchaseDate?: string;
  };
  customFields?: Record<string, string>;
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  road: string;
  landmark: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface LiveTrackVehicleRecord {
  id: string;
  vehicleNumber: string;
  transporterId: string;
  transporterName: string;
  deviceImeiMasked: string;
  driverName: string;
  driverPhone: string;
  lat: number;
  lng: number;
  speedKmh: number;
  vehicleState: 'Start' | 'Stop' | 'Move';
  currentStatus: string;
  acOn: boolean;
  fuelPercent: number;
  fuelLiters: number;
  odometerKm: number;
  batteryVoltage: number;
  updatedAt: string;
  exactLocation: VehicleExactLocation;
  routeTrail: Array<[number, number]>;
  onboardingProfile: VehicleOnboardingProfile;
}

/**
 * Normalizes an Indian RTO / vehicle registration number for flexible lookup.
 * e.g. "ka-06 tr 4821" -> "KA06TR4821"
 */
export function normalizeRtoNumber(input: string): string {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Formats a normalized RTO number into readable spaced/hyphenated form if standard,
 * otherwise preserves uppercase trimmed string.
 */
export function formatRtoDisplay(input: string): string {
  const clean = String(input || '').trim().toUpperCase();
  if (!clean) return '';
  if (clean.includes('-')) return clean;
  const compact = normalizeRtoNumber(clean);
  const std = /^([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{1,4})$/.exec(compact);
  if (std) {
    return `${std[1]}-${std[2]}-${std[3]}-${std[4]}`;
  }
  const bh = /^(\d{2})(BH)(\d{4})([A-HJ-NP-Z]{1,2})$/.exec(compact);
  if (bh) {
    return `${bh[1]}-${bh[2]}-${bh[3]}-${bh[4]}`;
  }
  return clean;
}

/**
 * Official Indian State & Union Territory 2-letter RTO codes (MoRTH / Vahan).
 * Includes legacy/transitional aliases (OR/OD, TS/TG, DN/DD) still active on roads.
 */
export const INDIAN_STATE_UT_CODES: Record<string, string> = {
  AN: 'Andaman & Nicobar Islands',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CG: 'Chhattisgarh',
  CH: 'Chandigarh',
  DD: 'Dadra & Nagar Haveli and Daman & Diu',
  DL: 'Delhi',
  DN: 'Dadra & Nagar Haveli',
  GA: 'Goa',
  GJ: 'Gujarat',
  HP: 'Himachal Pradesh',
  HR: 'Haryana',
  JH: 'Jharkhand',
  JK: 'Jammu & Kashmir',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MH: 'Maharashtra',
  ML: 'Meghalaya',
  MN: 'Manipur',
  MP: 'Madhya Pradesh',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  OR: 'Odisha',
  PB: 'Punjab',
  PY: 'Puducherry',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TG: 'Telangana',
  TN: 'Tamil Nadu',
  TR: 'Tripura',
  TS: 'Telangana',
  UK: 'Uttarakhand',
  UP: 'Uttar Pradesh',
  WB: 'West Bengal',
};

/**
 * Standard Indian RTO format: SS-DD-LLL-NNNN (separators optional: hyphen or space)
 * e.g., KA-01-AB-1234, KA 06 TR 4821, MH12SC9044, DL-01-C-1234, HR-55-LOG-8812
 */
export const STANDARD_INDIAN_RTO_REGEX =
  /^([A-Z]{2})[-\s]?(\d{2})[-\s]?([A-Z]{1,3})[-\s]?(\d{4})$/;

/**
 * Bharat Series (BH) Indian national registration format: YY-BH-NNNN-LL
 * e.g., 22-BH-1234-AA, 24BH4821KL
 */
export const BHARAT_SERIES_RTO_REGEX =
  /^(\d{2})[-\s]?(BH)[-\s]?(\d{4})[-\s]?([A-HJ-NP-Z]{1,2})$/;

export type RtoValidationStatus = 'empty' | 'incomplete' | 'invalid' | 'valid';
export type RtoSegmentStatus = 'idle' | 'valid' | 'invalid';

export interface RtoValidationSegments {
  state: RtoSegmentStatus;
  rto: RtoSegmentStatus;
  series: RtoSegmentStatus;
  number: RtoSegmentStatus;
}

export interface RtoValidationResult {
  status: RtoValidationStatus;
  isValid: boolean;
  formatKind: 'standard' | 'bharat' | null;
  formattedValue: string | null;
  stateCode: string | null;
  stateName: string | null;
  message: string;
  segments: RtoValidationSegments;
}

const IDLE_SEGMENTS: RtoValidationSegments = {
  state: 'idle',
  rto: 'idle',
  series: 'idle',
  number: 'idle',
};

/**
 * Validates an Indian RTO vehicle registration number in real time as the user types.
 * Enforces standard Indian RTO patterns (e.g., KA-01-AB-1234) and Bharat Series (e.g., 22-BH-1234-AA),
 * returning progressive segment status and pinpoint error messages before allowing a search.
 */
export function validateIndianRtoInput(rawInput: string): RtoValidationResult {
  const trimmed = String(rawInput || '').trim().toUpperCase();

  if (!trimmed) {
    return {
      status: 'empty',
      isValid: false,
      formatKind: null,
      formattedValue: null,
      stateCode: null,
      stateName: null,
      message: 'Format: KA-01-AB-1234 (State · District · Series · 4 Digits)',
      segments: { ...IDLE_SEGMENTS },
    };
  }

  // Reject disallowed characters immediately
  if (/[^A-Z0-9\s-]/.test(trimmed)) {
    return {
      status: 'invalid',
      isValid: false,
      formatKind: null,
      formattedValue: null,
      stateCode: null,
      stateName: null,
      message:
        'Only letters, numbers, spaces, and hyphens are allowed (e.g., KA-01-AB-1234).',
      segments: {
        state: 'invalid',
        rto: 'idle',
        series: 'idle',
        number: 'idle',
      },
    };
  }

  // Reject malformed leading hyphens or repeated separators (e.g. "KA--01" or "-KA01")
  if (/^-|-{2,}|\s{2,}|-\s|\s-/.test(trimmed)) {
    return {
      status: 'invalid',
      isValid: false,
      formatKind: null,
      formattedValue: null,
      stateCode: null,
      stateName: null,
      message: 'Use single hyphens or spaces between segments (e.g., KA-01-AB-1234).',
      segments: {
        state: 'invalid',
        rto: 'idle',
        series: 'idle',
        number: 'idle',
      },
    };
  }

  // 1. Check complete Bharat Series (BH) match
  const bhMatch = BHARAT_SERIES_RTO_REGEX.exec(trimmed);
  if (bhMatch) {
    const [, yy, bh, num, series] = bhMatch;
    if (num === '0000') {
      return {
        status: 'invalid',
        isValid: false,
        formatKind: 'bharat',
        formattedValue: null,
        stateCode: 'BH',
        stateName: 'Bharat Series (All India)',
        message: 'Registration number cannot be 0000. Enter 0001–9999.',
        segments: { state: 'valid', rto: 'valid', series: 'valid', number: 'invalid' },
      };
    }
    const formatted = `${yy}-${bh}-${num}-${series}`;
    return {
      status: 'valid',
      isValid: true,
      formatKind: 'bharat',
      formattedValue: formatted,
      stateCode: 'BH',
      stateName: 'Bharat Series (All India)',
      message: `Valid Bharat Series RTO format · All India (${formatted})`,
      segments: { state: 'valid', rto: 'valid', series: 'valid', number: 'valid' },
    };
  }

  // 2. Check complete Standard Indian RTO match
  const stdMatch = STANDARD_INDIAN_RTO_REGEX.exec(trimmed);
  if (stdMatch) {
    const [, state, district, series, num] = stdMatch;
    const stateName = INDIAN_STATE_UT_CODES[state] || null;
    if (!stateName) {
      return {
        status: 'invalid',
        isValid: false,
        formatKind: 'standard',
        formattedValue: null,
        stateCode: state,
        stateName: null,
        message: `Unknown Indian RTO state code "${state}". Use a valid code like KA, MH, DL, TN, or GJ.`,
        segments: { state: 'invalid', rto: 'valid', series: 'valid', number: 'valid' },
      };
    }
    if (district === '00') {
      return {
        status: 'invalid',
        isValid: false,
        formatKind: 'standard',
        formattedValue: null,
        stateCode: state,
        stateName,
        message: `RTO district code cannot be 00. Use 01–99 (e.g., ${state}-01-${series}-${num}).`,
        segments: { state: 'valid', rto: 'invalid', series: 'valid', number: 'valid' },
      };
    }
    if (num === '0000') {
      return {
        status: 'invalid',
        isValid: false,
        formatKind: 'standard',
        formattedValue: null,
        stateCode: state,
        stateName,
        message: 'Registration number cannot be 0000. Enter 0001–9999.',
        segments: { state: 'valid', rto: 'valid', series: 'valid', number: 'invalid' },
      };
    }

    const formatted = `${state}-${district}-${series}-${num}`;
    return {
      status: 'valid',
      isValid: true,
      formatKind: 'standard',
      formattedValue: formatted,
      stateCode: state,
      stateName,
      message: `Valid Indian RTO format · ${stateName} (${formatted})`,
      segments: { state: 'valid', rto: 'valid', series: 'valid', number: 'valid' },
    };
  }

  // 3. Progressive real-time analysis for partial or malformed inputs
  const compact = normalizeRtoNumber(trimmed);

  // Check if user is typing a Bharat Series prefix (starts with digit)
  if (/^\d/.test(compact)) {
    const bhPrefix = /^(\d{1,2})(?:(B|BH)(?:(\d{1,4})([A-HJ-NP-Z]{0,2})?)?)?$/.exec(compact);
    if (!bhPrefix || (bhPrefix[1].length < 2 && bhPrefix[2])) {
      return {
        status: 'invalid',
        isValid: false,
        formatKind: null,
        formattedValue: null,
        stateCode: null,
        stateName: null,
        message:
          'Start with a 2-letter state code (e.g., KA-01-AB-1234) or Bharat Series (e.g., 22-BH-1234-AA).',
        segments: { state: 'invalid', rto: 'idle', series: 'idle', number: 'idle' },
      };
    }
    const [, yy, bh = '', num = ''] = bhPrefix;
    if (yy.length < 2 || bh !== 'BH') {
      return {
        status: 'incomplete',
        isValid: false,
        formatKind: 'bharat',
        formattedValue: null,
        stateCode: bh === 'BH' ? 'BH' : null,
        stateName: bh === 'BH' ? 'Bharat Series (All India)' : null,
        message: 'Enter Bharat Series format YY-BH-1234-AA or a state code like KA-01-AB-1234.',
        segments: { state: 'idle', rto: 'idle', series: 'idle', number: 'idle' },
      };
    }
    if (num.length < 4) {
      return {
        status: 'incomplete',
        isValid: false,
        formatKind: 'bharat',
        formattedValue: null,
        stateCode: 'BH',
        stateName: 'Bharat Series (All India)',
        message: `Enter ${4 - num.length} more digit${4 - num.length === 1 ? '' : 's'} for Bharat Series (e.g., ${yy}-BH-1234-AA).`,
        segments: { state: 'valid', rto: 'valid', series: 'idle', number: 'idle' },
      };
    }
    if (num === '0000') {
      return {
        status: 'invalid',
        isValid: false,
        formatKind: 'bharat',
        formattedValue: null,
        stateCode: 'BH',
        stateName: 'Bharat Series (All India)',
        message: 'Registration number cannot be 0000. Enter 0001–9999.',
        segments: { state: 'valid', rto: 'valid', series: 'idle', number: 'invalid' },
      };
    }
    return {
      status: 'incomplete',
      isValid: false,
      formatKind: 'bharat',
      formattedValue: null,
      stateCode: 'BH',
      stateName: 'Bharat Series (All India)',
      message: `Enter 1–2 series letters (excluding I, O) to finish ${yy}-BH-${num}-AA.`,
      segments: { state: 'valid', rto: 'valid', series: 'idle', number: 'valid' },
    };
  }

  // Standard Indian RTO progressive checks
  // Stage A: State code (first 2 letters)
  if (compact.length === 1) {
    return {
      status: 'incomplete',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: null,
      stateName: null,
      message: 'Enter 2-letter Indian state/UT code (e.g., KA, MH, DL, TN).',
      segments: { ...IDLE_SEGMENTS },
    };
  }

  const firstTwo = compact.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(firstTwo)) {
    return {
      status: 'invalid',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: null,
      stateName: null,
      message: 'RTO number must start with a 2-letter state code (e.g., KA-01-AB-1234).',
      segments: { state: 'invalid', rto: 'idle', series: 'idle', number: 'idle' },
    };
  }

  const stateName = INDIAN_STATE_UT_CODES[firstTwo] || null;
  if (!stateName) {
    return {
      status: 'invalid',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName: null,
      message: `Unknown Indian RTO state code "${firstTwo}". Use a valid code like KA, MH, DL, TN, or GJ.`,
      segments: { state: 'invalid', rto: 'idle', series: 'idle', number: 'idle' },
    };
  }

  const restAfterState = compact.slice(2);
  if (restAfterState.length === 0) {
    return {
      status: 'incomplete',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName,
      message: `${stateName} (${firstTwo}) · Enter 2-digit RTO district code (e.g., ${firstTwo}-01-AB-1234).`,
      segments: { state: 'valid', rto: 'idle', series: 'idle', number: 'idle' },
    };
  }

  // Stage B: 2-digit RTO district code
  const districtMatch = /^(\d{1,2})(.*)$/.exec(restAfterState);
  if (!districtMatch) {
    return {
      status: 'invalid',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName,
      message: `Expected 2-digit RTO district code after ${firstTwo} (e.g., ${firstTwo}-01-AB-1234).`,
      segments: { state: 'valid', rto: 'invalid', series: 'idle', number: 'idle' },
    };
  }

  const [, districtPart, restAfterDistrict] = districtMatch;
  if (districtPart.length === 1) {
    if (restAfterDistrict.length > 0) {
      return {
        status: 'invalid',
        isValid: false,
        formatKind: 'standard',
        formattedValue: null,
        stateCode: firstTwo,
        stateName,
        message: `RTO district code must be 2 digits (e.g., ${firstTwo}-0${districtPart}-AB-1234).`,
        segments: { state: 'valid', rto: 'invalid', series: 'idle', number: 'idle' },
      };
    }
    return {
      status: 'incomplete',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName,
      message: `Enter 1 more digit for the RTO district code (e.g., ${firstTwo}-${districtPart}1-AB-1234).`,
      segments: { state: 'valid', rto: 'idle', series: 'idle', number: 'idle' },
    };
  }

  if (districtPart === '00') {
    return {
      status: 'invalid',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName,
      message: `RTO district code cannot be 00. Use 01–99 (e.g., ${firstTwo}-01-AB-1234).`,
      segments: { state: 'valid', rto: 'invalid', series: 'idle', number: 'idle' },
    };
  }

  if (restAfterDistrict.length === 0) {
    return {
      status: 'incomplete',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName,
      message: `Enter 1–3 series letters after ${firstTwo}-${districtPart} (e.g., ${firstTwo}-${districtPart}-AB-1234).`,
      segments: { state: 'valid', rto: 'valid', series: 'idle', number: 'idle' },
    };
  }

  // Stage C: 1-3 series letters
  const seriesMatch = /^([A-Z]+)(.*)$/.exec(restAfterDistrict);
  if (!seriesMatch) {
    return {
      status: 'invalid',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName,
      message: `Add 1–3 series letters after ${firstTwo}-${districtPart} before the 4-digit number (e.g., ${firstTwo}-${districtPart}-AB-1234).`,
      segments: { state: 'valid', rto: 'valid', series: 'invalid', number: 'idle' },
    };
  }

  const [, seriesPart, restAfterSeries] = seriesMatch;
  if (seriesPart.length > 3) {
    return {
      status: 'invalid',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName,
      message: `Series "${seriesPart}" is too long — use 1 to 3 letters (e.g., ${firstTwo}-${districtPart}-AB-1234).`,
      segments: { state: 'valid', rto: 'valid', series: 'invalid', number: 'idle' },
    };
  }

  if (restAfterSeries.length === 0) {
    return {
      status: 'incomplete',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName,
      message: `Enter the 4-digit registration number (e.g., ${firstTwo}-${districtPart}-${seriesPart}-1234).`,
      segments: { state: 'valid', rto: 'valid', series: 'valid', number: 'idle' },
    };
  }

  // Stage D: 4 registration digits
  if (!/^\d+$/.test(restAfterSeries)) {
    return {
      status: 'invalid',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName,
      message: `Ending registration number must be 4 digits only (e.g., ${firstTwo}-${districtPart}-${seriesPart}-1234).`,
      segments: { state: 'valid', rto: 'valid', series: 'valid', number: 'invalid' },
    };
  }

  if (restAfterSeries.length < 4) {
    const remaining = 4 - restAfterSeries.length;
    return {
      status: 'incomplete',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName,
      message: `Enter ${remaining} more digit${remaining === 1 ? '' : 's'} to complete ${firstTwo}-${districtPart}-${seriesPart}-1234.`,
      segments: { state: 'valid', rto: 'valid', series: 'valid', number: 'idle' },
    };
  }

  if (restAfterSeries.length > 4) {
    return {
      status: 'invalid',
      isValid: false,
      formatKind: 'standard',
      formattedValue: null,
      stateCode: firstTwo,
      stateName,
      message: `Registration number must be exactly 4 digits, not ${restAfterSeries.length} (e.g., ${firstTwo}-${districtPart}-${seriesPart}-1234).`,
      segments: { state: 'valid', rto: 'valid', series: 'valid', number: 'invalid' },
    };
  }

  // Fallback for unexpected hyphen positions (e.g. "KA-01-A-B1234" or trailing hyphen "KA-01-AB-1234-")
  return {
    status: 'invalid',
    isValid: false,
    formatKind: 'standard',
    formattedValue: null,
    stateCode: firstTwo,
    stateName,
    message: `Place hyphens between segments only: ${firstTwo}-${districtPart}-${seriesPart}-${restAfterSeries}.`,
    segments: { state: 'valid', rto: 'valid', series: 'valid', number: 'invalid' },
  };
}

/**
 * Searches vehicles by exact normalized RTO number first, then partial RTO / driver / nickname match.
 */
export function findVehicleByRtoNumber<
  T extends {
    vehicleNumber: string;
    driverName?: string;
    driverPhone?: string;
    transporterName?: string;
    onboardingProfile?: { vehicle?: { vehicleNickname?: string } };
  },
>(
  vehicles: T[],
  rawQuery: string
): {
  exactMatch: T | null;
  suggestions: T[];
  normalizedQuery: string;
} {
  const trimmed = String(rawQuery || '').trim();
  const normalizedQuery = normalizeRtoNumber(trimmed);
  if (!trimmed) {
    return { exactMatch: null, suggestions: vehicles.slice(0, 6), normalizedQuery: '' };
  }

  // 1. Exact normalized RTO match (ignores hyphens & spaces)
  const exact =
    vehicles.find((v) => normalizeRtoNumber(v.vehicleNumber) === normalizedQuery) || null;
  if (exact) {
    return { exactMatch: exact, suggestions: [exact], normalizedQuery };
  }

  // 2. Prefix or substring match on RTO number, driver name, phone, or nickname
  const lower = trimmed.toLowerCase();
  const matches = vehicles.filter((v) => {
    const normRto = normalizeRtoNumber(v.vehicleNumber);
    const normPhone = normalizeRtoNumber(v.driverPhone || '');
    return (
      (normalizedQuery.length > 0 && normRto.includes(normalizedQuery)) ||
      (normalizedQuery.length >= 4 && normPhone.includes(normalizedQuery)) ||
      (v.driverName || '').toLowerCase().includes(lower) ||
      (v.transporterName || '').toLowerCase().includes(lower) ||
      (v.onboardingProfile?.vehicle?.vehicleNickname || '').toLowerCase().includes(lower)
    );
  });

  // If a single unambiguous RTO prefix match exists (at least 4 alphanumeric chars), promote it as match
  if (matches.length === 1 && normalizedQuery.length >= 4) {
    return { exactMatch: matches[0], suggestions: matches, normalizedQuery };
  }

  return { exactMatch: null, suggestions: matches, normalizedQuery };
}

/**
 * Converts a compass bearing in degrees (0-360) to a human-readable cardinal label.
 */
export function computeHeadingLabel(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const dirs = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  const idx = Math.round(normalized / 45) % 8;
  return dirs[idx];
}

/**
 * Computes bearing in degrees between two lat/lng points.
 */
export function computeBearingDegrees(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round(((brng % 360) + 360) % 360);
}

/**
 * Advances a moving vehicle smoothly along a deterministic Indian road corridor,
 * keeping its exact street address, landmark, heading, and breadcrumb trail synchronized.
 */
export function advanceVehicleAlongCorridor(
  vehicle: LiveTrackVehicleRecord,
  corridor: RouteWaypoint[],
  stepIndex: number,
  nowIso: string = new Date().toISOString()
): LiveTrackVehicleRecord {
  if (vehicle.vehicleState !== 'Move' || corridor.length < 2) {
    return { ...vehicle, updatedAt: nowIso };
  }

  const totalSegments = corridor.length;
  const currentIdx = stepIndex % totalSegments;
  const nextIdx = (stepIndex + 1) % totalSegments;
  const wp = corridor[currentIdx];
  const nextWp = corridor[nextIdx];

  // Subtle deterministic interpolation between waypoints
  const frac = ((stepIndex % 3) + 1) * 0.22;
  const nextLat = Number((wp.lat + (nextWp.lat - wp.lat) * frac).toFixed(5));
  const nextLng = Number((wp.lng + (nextWp.lng - wp.lng) * frac).toFixed(5));
  const headingDeg = computeBearingDegrees(vehicle.lat, vehicle.lng, nextLat, nextLng);
  const headingLabel = computeHeadingLabel(headingDeg);
  const speedDelta = ((stepIndex % 5) - 2) * 2;
  const nextSpeed = Math.max(24, Math.min(78, vehicle.speedKmh + speedDelta));
  const nextOdo = Number((vehicle.odometerKm + nextSpeed / 900).toFixed(1));
  const nextTrail: Array<[number, number]> = [
    ...vehicle.routeTrail.slice(-14),
    [nextLat, nextLng],
  ];

  return {
    ...vehicle,
    lat: nextLat,
    lng: nextLng,
    speedKmh: nextSpeed,
    odometerKm: nextOdo,
    updatedAt: nowIso,
    routeTrail: nextTrail,
    exactLocation: {
      address: wp.address,
      road: wp.road,
      landmark: wp.landmark,
      city: wp.city,
      state: wp.state,
      pincode: wp.pincode,
      headingDeg,
      headingLabel,
      accuracyMeters: 5,
    },
  };
}

/**
 * Parses URL stage query param or detects sensible default customer stage.
 */
export function parseCustomerStage(value: string | null | undefined): CustomerStage | null {
  const clean = String(value || '').trim().toLowerCase();
  if (clean === 'android') return 'android';
  if (clean === 'iphone' || clean === 'ios') return 'iphone';
  if (clean === 'web' || clean === 'laptop' || clean === 'pc' || clean === 'desktop') return 'web';
  return null;
}

export function detectDefaultCustomerStage(
  userAgent: string,
  viewportWidth: number
): CustomerStage {
  const ua = String(userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'iphone';
  if (/android/.test(ua)) return 'android';
  if (viewportWidth < 640) return 'android';
  return 'web';
}

export interface StageDeliverySpec {
  id: CustomerStage;
  label: string;
  shortLabel: string;
  tagline: string;
  deviceSummary: string;
  installButtonLabel: string;
  installSteps: Array<{ title: string; detail: string }>;
}

export const CUSTOMER_STAGE_SPECS: Record<CustomerStage, StageDeliverySpec> = {
  android: {
    id: 'android',
    label: 'Android App',
    shortLabel: 'Android',
    tagline: 'Material 3 mobile layout for Android phones & tablets',
    deviceSummary: 'Install directly as a standalone Android home-screen app via Chrome',
    installButtonLabel: 'Download for Android',
    installSteps: [
      {
        title: '1. Open in Google Chrome on Android',
        detail: 'Open this link in Chrome on any Android phone or tablet.',
      },
      {
        title: '2. Tap "Install App" or Chrome Menu (⋮)',
        detail: 'Tap the Install button above, or open the three-dot menu and choose "Add to Home screen" → "Install".',
      },
      {
        title: '3. Launch like a native Android app',
        detail: 'The VS Tech / TurboTrackers icon appears in your Android app drawer with full-screen live tracking & offline cache.',
      },
    ],
  },
  iphone: {
    id: 'iphone',
    label: 'iPhone App (iOS)',
    shortLabel: 'iPhone',
    tagline: 'Cupertino iOS layout for iPhone & iPad',
    deviceSummary: 'Add to iPhone Home Screen in Safari for full-screen standalone tracking',
    installButtonLabel: 'Download for iPhone',
    installSteps: [
      {
        title: '1. Open in Safari on iPhone or iPad',
        detail: 'Use Apple Safari so iOS can install the standalone home-screen app.',
      },
      {
        title: '2. Tap the Share button (square with up arrow)',
        detail: 'Located at the bottom toolbar in Safari on iPhone (or top-right on iPad).',
      },
      {
        title: '3. Tap "Add to Home Screen" → "Add"',
        detail: 'Launches full-screen with iOS status bar support, RTO search, and live GPS tracking.',
      },
    ],
  },
  web: {
    id: 'web',
    label: 'Laptop / PC Website',
    shortLabel: 'Laptop / PC',
    tagline: 'Full-screen desktop web portal & installable Windows/Mac app',
    deviceSummary: 'Use in browser or install as a standalone Desktop App on Windows, macOS, or Linux',
    installButtonLabel: 'Download for Laptop / PC',
    installSteps: [
      {
        title: '1. Open in Chrome or Microsoft Edge on Laptop / PC',
        detail: 'Works on Windows 10/11, macOS, and Chromebook laptops and desktops.',
      },
      {
        title: '2. Click "Install App" or the Address Bar Install Icon (⊕)',
        detail: 'Click the install icon in the right side of the browser address bar or press the Install button here.',
      },
      {
        title: '3. Pin to Taskbar / Dock',
        detail: 'Runs in its own desktop window with full-width live map, sidebar navigation, and instant RTO search.',
      },
    ],
  },
};

export const INDIAN_CORRIDORS: Record<string, RouteWaypoint[]> = {
  tumakuruBengaluru: [
    {
      lat: 13.3379,
      lng: 77.1173,
      road: 'NH-48 Tumakuru–Bengaluru Expressway',
      landmark: 'Near Kyathasandra Toll Gate',
      address: 'NH-48 Service Road, Kyathasandra, Tumakuru, Karnataka 572104',
      city: 'Tumakuru',
      state: 'Karnataka',
      pincode: '572104',
    },
    {
      lat: 13.2465,
      lng: 77.2248,
      road: 'NH-48 Bengaluru–Pune Highway',
      landmark: 'Opposite Dabaspete Industrial Area',
      address: 'NH-48 Highway, Dabaspete, Bengaluru Rural, Karnataka 562111',
      city: 'Bengaluru Rural',
      state: 'Karnataka',
      pincode: '562111',
    },
    {
      lat: 13.1007,
      lng: 77.3889,
      road: 'NH-48 Nelamangala Corridor',
      landmark: 'Near Nelamangala Toll Plaza',
      address: 'NH-48 Expressway, Nelamangala Town, Bengaluru Rural, Karnataka 562123',
      city: 'Bengaluru Rural',
      state: 'Karnataka',
      pincode: '562123',
    },
    {
      lat: 13.0446,
      lng: 77.5082,
      road: 'Tumkur Road (NH-48)',
      landmark: 'Near Peenya Industrial Metro Station',
      address: 'Tumkur Main Road, Peenya 2nd Stage, Bengaluru, Karnataka 560058',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560058',
    },
  ],
  puneMumbai: [
    {
      lat: 18.5913,
      lng: 73.7389,
      road: 'Mumbai–Pune Expressway (NH-48)',
      landmark: 'Near Hinjawadi Phase 1 Flyover',
      address: 'Mumbai–Bengaluru Bypass, Wakad, Pimpri-Chinchwad, Pune, Maharashtra 411057',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411057',
    },
    {
      lat: 18.6517,
      lng: 73.7024,
      road: 'Yashwantrao Chavan Expressway',
      landmark: 'Near Kiwale Toll Entry',
      address: 'Kiwale Expressway Junction, Dehu Road, Pune, Maharashtra 412101',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '412101',
    },
    {
      lat: 18.7495,
      lng: 73.4072,
      road: 'Mumbai–Pune Expressway',
      landmark: 'Near Lonavala Food Mall',
      address: 'Expressway Km 68, Lonavala, Maharashtra 410401',
      city: 'Lonavala',
      state: 'Maharashtra',
      pincode: '410401',
    },
  ],
  bengaluruCity: [
    {
      lat: 12.9177,
      lng: 77.6238,
      road: 'Outer Ring Road (NH-44)',
      landmark: 'Near Central Silk Board Junction',
      address: 'Hosur Main Road, HSR Layout Sector 6, Bengaluru, Karnataka 560102',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560102',
    },
    {
      lat: 12.8452,
      lng: 77.6602,
      road: 'Hosur Elevated Expressway (NH-44)',
      landmark: 'Near Electronic City Phase 1 Toll',
      address: 'Hosur Road, Electronic City Phase 1, Bengaluru, Karnataka 560100',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560100',
    },
    {
      lat: 12.9592,
      lng: 77.6974,
      road: 'Outer Ring Road',
      landmark: 'Near Marathahalli Bridge',
      address: 'Outer Ring Road, Marathahalli, Bengaluru, Karnataka 560037',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560037',
    },
  ],
};
