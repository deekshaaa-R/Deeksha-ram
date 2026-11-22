import { normalizeRtoNumber, formatRtoDisplay } from './rtoLookup';
import type { PlatformVehicle } from './unifiedPlatformLogic';

export interface RtoVehicleMetadata {
  id: string;
  vehicleNumber: string;
  rtoCode: string;
  rtoOffice: string;
  state: string;
  registrationDate: string;
  vehicleClass: string;
  makeModel: string;
  fuelType: 'Diesel' | 'Electric' | 'CNG' | 'Petrol';
  chassisNumber: string;
  engineNumber: string;
  ownerName: string;
  transporterCompany: string;
  driverName: string;
  driverPhone: string;
  imei: string;
  deviceModel: string;
  insuranceValidUntil: string;
  fitnessValidUntil: string;
  permitType: string;
  status: PlatformVehicle['status'];
  speedKmh: number;
  speedLimitKmh: number;
  lat: number;
  lng: number;
  headingDeg: number;
  address: string;
  fuelPercent: number;
  fuelLiters: number;
  tankCapacityLiters: number;
  odometerKm: number | null;
  batteryVoltage: number | null;
  acOn: boolean | null;
  ignitionOn: boolean;
  source: 'live-fleet' | 'rto-registry';
  matchedLiveVehicleId?: string;
}

export interface RtoQueryResult {
  query: string;
  normalizedQuery: string;
  totalCatalogCount: number;
  results: RtoVehicleMetadata[];
  exactMatch: RtoVehicleMetadata | null;
}

/**
 * Mock PAN-India RTO & Fleet Vehicle Registry database.
 * Includes detailed RTO metadata for active fleet vehicles plus additional
 * registered commercial & fleet vehicles across Indian RTOs.
 */
export const MOCK_RTO_REGISTRY: RtoVehicleMetadata[] = [
  {
    id: 'rto-ka06tr4821',
    vehicleNumber: 'KA-06-TR-4821',
    rtoCode: 'KA-06',
    rtoOffice: 'Tumakuru RTO, Karnataka',
    state: 'Karnataka',
    registrationDate: '14/03/2023',
    vehicleClass: '12-Wheeler Truck (HGV)',
    makeModel: 'Tata Prima 5530.S BS6',
    fuelType: 'Diesel',
    chassisNumber: 'MAT448216N2C04821',
    engineNumber: 'B6.7B6A250D02104821',
    ownerName: 'Arjun Deshmukh',
    transporterCompany: 'Deccan Logistics & Earthmovers',
    driverName: 'Ramesh Deshmukh',
    driverPhone: '+91 98450 11223',
    imei: '862941054821001',
    deviceModel: 'VS VST-PRO-4G-Pro',
    insuranceValidUntil: '13/03/2027',
    fitnessValidUntil: '13/03/2027',
    permitType: 'National Permit (All India)',
    status: 'Running',
    speedKmh: 72,
    speedLimitKmh: 75,
    lat: 13.3379,
    lng: 77.1173,
    headingDeg: 142,
    address: 'NH-48 Tumakuru Bypass, near Kyathasandra Toll, Karnataka 572104',
    fuelPercent: 74,
    fuelLiters: 222,
    tankCapacityLiters: 300,
    odometerKm: 84210,
    batteryVoltage: 24.6,
    acOn: true,
    ignitionOn: true,
    source: 'rto-registry',
  },
  {
    id: 'rto-ka01ag7741',
    vehicleNumber: 'KA-01-AG-7741',
    rtoCode: 'KA-01',
    rtoOffice: 'Bengaluru Central (Koramangala) RTO',
    state: 'Karnataka',
    registrationDate: '22/07/2024',
    vehicleClass: 'Light Commercial Delivery Van (LGV)',
    makeModel: 'Ashok Leyland Bada Dost i4',
    fuelType: 'Diesel',
    chassisNumber: 'MB1A3CHD5NR774102',
    engineNumber: 'P15BS6D09217741',
    ownerName: 'Arjun Deshmukh',
    transporterCompany: 'Deccan Logistics & Earthmovers',
    driverName: 'Suresh Gowda',
    driverPhone: '+91 98451 22334',
    imei: '862941057741002',
    deviceModel: 'VS VST-OBD-2-4G',
    insuranceValidUntil: '21/07/2027',
    fitnessValidUntil: '21/07/2027',
    permitType: 'State Goods Carrier Permit',
    status: 'Running',
    speedKmh: 48,
    speedLimitKmh: 65,
    lat: 12.9716,
    lng: 77.5946,
    headingDeg: 85,
    address: 'MG Road Corridor, Bengaluru Central, Karnataka 560001',
    fuelPercent: 56,
    fuelLiters: 45,
    tankCapacityLiters: 80,
    odometerKm: 31840,
    batteryVoltage: 13.8,
    acOn: true,
    ignitionOn: true,
    source: 'rto-registry',
  },
  {
    id: 'rto-ka06ex3310',
    vehicleNumber: 'KA-06-EX-3310',
    rtoCode: 'KA-06',
    rtoOffice: 'Tumakuru RTO, Karnataka',
    state: 'Karnataka',
    registrationDate: '09/11/2022',
    vehicleClass: 'Hydraulic Excavator (CEV)',
    makeModel: 'JCB 220LC Xtra Tracked Excavator',
    fuelType: 'Diesel',
    chassisNumber: 'HAR220LCX03310984',
    engineNumber: 'JCB448TA403310',
    ownerName: 'Arjun Deshmukh',
    transporterCompany: 'Deccan Logistics & Earthmovers',
    driverName: 'Mahesh Naik',
    driverPhone: '+91 98452 33445',
    imei: '862941053310003',
    deviceModel: 'VS VST-FUEL-ULTRASONIC',
    insuranceValidUntil: '08/11/2026',
    fitnessValidUntil: '08/11/2026',
    permitType: 'Construction Equipment Permit',
    status: 'Idle',
    speedKmh: 0,
    speedLimitKmh: 30,
    lat: 13.4012,
    lng: 77.0815,
    headingDeg: 18,
    address: 'Vasanthanarasapura Industrial Area Site-B, Tumakuru 572128',
    fuelPercent: 24,
    fuelLiters: 84,
    tankCapacityLiters: 350,
    odometerKm: 12490,
    batteryVoltage: 24.1,
    acOn: false,
    ignitionOn: true,
    source: 'rto-registry',
  },
  {
    id: 'rto-mh12ev9045',
    vehicleNumber: 'MH-12-EV-9045',
    rtoCode: 'MH-12',
    rtoOffice: 'Pune RTO, Maharashtra',
    state: 'Maharashtra',
    registrationDate: '05/01/2025',
    vehicleClass: 'Cold-Chain Electric Cargo Van',
    makeModel: 'Tata Ace EV 1000 Reefer',
    fuelType: 'Electric',
    chassisNumber: 'MAT569045S1E09045',
    engineNumber: 'EVPM27KW009045',
    ownerName: 'Priya Kulkarni',
    transporterCompany: 'Sahyadri Cold-Chain & EV Fleet',
    driverName: 'Nitin Patil',
    driverPhone: '+91 97650 44556',
    imei: '862941059045004',
    deviceModel: 'VS VST-AI-DASH-4G',
    insuranceValidUntil: '04/01/2028',
    fitnessValidUntil: '04/01/2028',
    permitType: 'Green EV Inter-City Permit',
    status: 'Running',
    speedKmh: 58,
    speedLimitKmh: 70,
    lat: 18.5204,
    lng: 73.8567,
    headingDeg: 305,
    address: 'Wakad–Hinjawadi NH-48 Bypass, Pune, Maharashtra 411057',
    fuelPercent: 82,
    fuelLiters: 82,
    tankCapacityLiters: 100,
    odometerKm: 19240,
    batteryVoltage: 48.2,
    acOn: true,
    ignitionOn: true,
    source: 'rto-registry',
  },
  {
    id: 'rto-mh14cr2188',
    vehicleNumber: 'MH-14-CR-2188',
    rtoCode: 'MH-14',
    rtoOffice: 'Pimpri-Chinchwad RTO, Maharashtra',
    state: 'Maharashtra',
    registrationDate: '18/06/2023',
    vehicleClass: 'Refrigerated Reefer Truck',
    makeModel: 'Eicher Pro 3019 Reefer',
    fuelType: 'Diesel',
    chassisNumber: 'MC2F7GRC0PK02188',
    engineNumber: 'E494CDPK218804',
    ownerName: 'Priya Kulkarni',
    transporterCompany: 'Sahyadri Cold-Chain & EV Fleet',
    driverName: 'Ganesh Jadhav',
    driverPhone: '+91 97651 55667',
    imei: '862941052188005',
    deviceModel: 'VS VST-TEMP-4G',
    insuranceValidUntil: '17/06/2027',
    fitnessValidUntil: '17/06/2027',
    permitType: 'National Cold-Chain Permit',
    status: 'Stationary',
    speedKmh: 0,
    speedLimitKmh: 75,
    lat: 18.6298,
    lng: 73.7997,
    headingDeg: 210,
    address: 'Chakan MIDC Phase 2 Logistics Park, Pune, Maharashtra 410501',
    fuelPercent: 68,
    fuelLiters: 150,
    tankCapacityLiters: 220,
    odometerKm: 56400,
    batteryVoltage: 24.4,
    acOn: true,
    ignitionOn: false,
    source: 'rto-registry',
  },
  {
    id: 'rto-dl01gb5520',
    vehicleNumber: 'DL-01-GB-5520',
    rtoCode: 'DL-01',
    rtoOffice: 'Delhi North (Mall Road) RTO',
    state: 'Delhi',
    registrationDate: '11/09/2023',
    vehicleClass: '16-Wheeler Container Trailer',
    makeModel: 'BharatBenz 4228R BS6',
    fuelType: 'Diesel',
    chassisNumber: 'MEC255208NP05520',
    engineNumber: 'OM926BS6005520',
    ownerName: 'Rohan Malhotra',
    transporterCompany: 'North Corridor Express Lines',
    driverName: 'Vikram Singh',
    driverPhone: '+91 98101 66778',
    imei: '862941055520006',
    deviceModel: 'VS VST-PRO-4G-Pro',
    insuranceValidUntil: '10/09/2027',
    fitnessValidUntil: '10/09/2027',
    permitType: 'National Permit (All India)',
    status: 'Running',
    speedKmh: 79,
    speedLimitKmh: 75,
    lat: 28.4595,
    lng: 77.0266,
    headingDeg: 220,
    address: 'Kherki Daula Toll Stretch, NH-48 Expressway, Gurugram 122004',
    fuelPercent: 61,
    fuelLiters: 232,
    tankCapacityLiters: 380,
    odometerKm: 112800,
    batteryVoltage: 24.8,
    acOn: true,
    ignitionOn: true,
    source: 'rto-registry',
  },
  {
    id: 'rto-hr55log8812',
    vehicleNumber: 'HR-55-LOG-8812',
    rtoCode: 'HR-55',
    rtoOffice: 'Gurugram Commercial RTO, Haryana',
    state: 'Haryana',
    registrationDate: '27/02/2022',
    vehicleClass: 'Multi-Axle Express Carrier',
    makeModel: 'Volvo FM 420 6x4',
    fuelType: 'Diesel',
    chassisNumber: 'YV2XZX0C8NA08812',
    engineNumber: 'D13K420EU68812',
    ownerName: 'Rohan Malhotra',
    transporterCompany: 'North Corridor Express Lines',
    driverName: 'Harpreet Gill',
    driverPhone: '+91 98102 77889',
    imei: '862941058812007',
    deviceModel: 'VS VST-WIRED-PRO',
    insuranceValidUntil: '26/02/2027',
    fitnessValidUntil: '26/02/2027',
    permitType: 'National Permit (All India)',
    status: 'Offline',
    speedKmh: 0,
    speedLimitKmh: 80,
    lat: 28.367,
    lng: 76.9355,
    headingDeg: 0,
    address: 'IMT Manesar Sector 8 Transport Hub, Gurugram, Haryana 122051',
    fuelPercent: 45,
    fuelLiters: 180,
    tankCapacityLiters: 400,
    odometerKm: 148920,
    batteryVoltage: 23.2,
    acOn: false,
    ignitionOn: false,
    source: 'rto-registry',
  },
  {
    id: 'rto-tn01bl4410',
    vehicleNumber: 'TN-01-BL-4410',
    rtoCode: 'TN-01',
    rtoOffice: 'Chennai Central (Ayanavaram) RTO',
    state: 'Tamil Nadu',
    registrationDate: '04/05/2024',
    vehicleClass: 'Port Container Hauler (HGV)',
    makeModel: 'Ashok Leyland AVTR 4825',
    fuelType: 'Diesel',
    chassisNumber: 'MB1KADHC1RP04410',
    engineNumber: 'H6CRSBS6004410',
    ownerName: 'Karthikeyan Subramanian',
    transporterCompany: 'Coromandel Port Freightways',
    driverName: 'Murugan Selvam',
    driverPhone: '+91 94440 88112',
    imei: '862941054410008',
    deviceModel: 'VS VST-AIS140-4G',
    insuranceValidUntil: '03/05/2027',
    fitnessValidUntil: '03/05/2027',
    permitType: 'South Zone Port Permit',
    status: 'Running',
    speedKmh: 62,
    speedLimitKmh: 75,
    lat: 13.0827,
    lng: 80.2707,
    headingDeg: 278,
    address: 'NH-48 Sriperumbudur Logistics Corridor, Chennai, Tamil Nadu 602105',
    fuelPercent: 79,
    fuelLiters: 268,
    tankCapacityLiters: 340,
    odometerKm: 41290,
    batteryVoltage: 24.5,
    acOn: true,
    ignitionOn: true,
    source: 'rto-registry',
  },
  {
    id: 'rto-gj01ht6192',
    vehicleNumber: 'GJ-01-HT-6192',
    rtoCode: 'GJ-01',
    rtoOffice: 'Ahmedabad (Subhash Bridge) RTO',
    state: 'Gujarat',
    registrationDate: '19/08/2023',
    vehicleClass: 'Chemical Tanker (HazMat HGV)',
    makeModel: 'Tata Signa 4018.S Tanker',
    fuelType: 'Diesel',
    chassisNumber: 'MAT466192P3G06192',
    engineNumber: 'CUMM56BS606192',
    ownerName: 'Devang Patel',
    transporterCompany: 'Western PetroBulk Carriers',
    driverName: 'Bhavesh Solanki',
    driverPhone: '+91 98250 31904',
    imei: '862941056192009',
    deviceModel: 'VS VST-EXPROOF-4G',
    insuranceValidUntil: '18/08/2027',
    fitnessValidUntil: '18/08/2027',
    permitType: 'Hazardous Goods National Permit',
    status: 'Running',
    speedKmh: 54,
    speedLimitKmh: 60,
    lat: 23.0225,
    lng: 72.5714,
    headingDeg: 175,
    address: 'NE-1 Ahmedabad–Vadodara Expressway, Bharuch Bound, Gujarat 380009',
    fuelPercent: 86,
    fuelLiters: 301,
    tankCapacityLiters: 350,
    odometerKm: 67850,
    batteryVoltage: 24.7,
    acOn: true,
    ignitionOn: true,
    source: 'rto-registry',
  },
  {
    id: 'rto-ts07uc7234',
    vehicleNumber: 'TS-07-UC-7234',
    rtoCode: 'TS-07',
    rtoOffice: 'Rangareddy (Kondapur) RTO, Telangana',
    state: 'Telangana',
    registrationDate: '12/12/2024',
    vehicleClass: 'Pharma Cold-Chain Express Van',
    makeModel: 'Mahindra Furio 7 Cargo Reefer',
    fuelType: 'Diesel',
    chassisNumber: 'MA1LF2TN8R607234',
    engineNumber: 'MDI32BS6007234',
    ownerName: 'Srinivas Reddy',
    transporterCompany: 'Deccan BioLogistics Pvt Ltd',
    driverName: 'Venkatesh Rao',
    driverPhone: '+91 98480 72341',
    imei: '862941057234010',
    deviceModel: 'VS VST-TEMP-DUAL-4G',
    insuranceValidUntil: '11/12/2027',
    fitnessValidUntil: '11/12/2027',
    permitType: 'Pharma Express National Permit',
    status: 'Running',
    speedKmh: 66,
    speedLimitKmh: 75,
    lat: 17.385,
    lng: 78.4867,
    headingDeg: 192,
    address: 'Outer Ring Road Exit 14, Shamshabad Airport Corridor, Hyderabad 501218',
    fuelPercent: 71,
    fuelLiters: 85,
    tankCapacityLiters: 120,
    odometerKm: 18420,
    batteryVoltage: 14.1,
    acOn: true,
    ignitionOn: true,
    source: 'rto-registry',
  },
  {
    id: 'rto-ka05mp2094',
    vehicleNumber: 'KA-05-MP-2094',
    rtoCode: 'KA-05',
    rtoOffice: 'Bengaluru South (Jayanagar) RTO',
    state: 'Karnataka',
    registrationDate: '29/01/2024',
    vehicleClass: 'Electric Intercity Bus (PSV)',
    makeModel: 'Olectra C9 Electric Coach',
    fuelType: 'Electric',
    chassisNumber: 'OLE9EV2024K002094',
    engineNumber: 'BYDEVM300K2094',
    ownerName: 'Siddharth Rao',
    transporterCompany: 'Namma Green Mobility',
    driverName: 'Prakash Hegde',
    driverPhone: '+91 99001 40294',
    imei: '862941052094011',
    deviceModel: 'VS VST-AIS140-SOS',
    insuranceValidUntil: '28/01/2027',
    fitnessValidUntil: '28/01/2027',
    permitType: 'AIS-140 Passenger Stage Permit',
    status: 'Running',
    speedKmh: 64,
    speedLimitKmh: 80,
    lat: 12.8452,
    lng: 77.6602,
    headingDeg: 156,
    address: 'Electronic City Elevated Expressway (NH-44), Bengaluru 560100',
    fuelPercent: 88,
    fuelLiters: 88,
    tankCapacityLiters: 100,
    odometerKm: 52310,
    batteryVoltage: 54.4,
    acOn: true,
    ignitionOn: true,
    source: 'rto-registry',
  },
  {
    id: 'rto-rj14gc3095',
    vehicleNumber: 'RJ-14-GC-3095',
    rtoCode: 'RJ-14',
    rtoOffice: 'Jaipur South RTO, Rajasthan',
    state: 'Rajasthan',
    registrationDate: '03/04/2023',
    vehicleClass: '14-Wheeler Marble & Bulk Carrier',
    makeModel: 'Ashok Leyland 4220 HG',
    fuelType: 'Diesel',
    chassisNumber: 'MB1NGDHC9PR03095',
    engineNumber: 'H6BS6200HP3095',
    ownerName: 'Mahendra Singh Rathore',
    transporterCompany: 'Rajputana Highway Cargo',
    driverName: 'Kailash Sharma',
    driverPhone: '+91 98290 63095',
    imei: '862941053095012',
    deviceModel: 'VS VST-PRO-4G-Pro',
    insuranceValidUntil: '02/04/2027',
    fitnessValidUntil: '02/04/2027',
    permitType: 'National Permit (All India)',
    status: 'Idle',
    speedKmh: 0,
    speedLimitKmh: 75,
    lat: 26.9124,
    lng: 75.7873,
    headingDeg: 215,
    address: 'NH-48 Ajmer Road Logistics Bay, Jaipur, Rajasthan 302026',
    fuelPercent: 52,
    fuelLiters: 171,
    tankCapacityLiters: 330,
    odometerKm: 93115,
    batteryVoltage: 24.2,
    acOn: false,
    ignitionOn: true,
    source: 'rto-registry',
  },
];

/**
 * Merges live role-scoped fleet vehicles with the mock PAN-India RTO Registry.
 * Live fleet telemetry always overrides static mock coordinates/speed/status,
 * while retaining full RTO metadata (chassis, RTO office, insurance, fitness, make/model).
 */
export function mergeLiveFleetWithRtoRegistry(
  liveVehicles: PlatformVehicle[],
  includeGlobalMockRegistry: boolean = true
): RtoVehicleMetadata[] {
  const registryByNorm = new Map<string, RtoVehicleMetadata>();
  for (const rec of MOCK_RTO_REGISTRY) {
    registryByNorm.set(normalizeRtoNumber(rec.vehicleNumber), rec);
  }

  const seen = new Set<string>();
  const merged: RtoVehicleMetadata[] = [];

  // 1. Live fleet vehicles first (with live telemetry + enriched RTO metadata)
  for (const v of liveVehicles) {
    const norm = normalizeRtoNumber(v.vehicleNumber);
    seen.add(norm);
    const base = registryByNorm.get(norm);
    const derivedRtoCode =
      base?.rtoCode ||
      formatRtoDisplay(v.vehicleNumber).split('-').slice(0, 2).join('-') ||
      'IN-RTO';

    merged.push({
      id: base?.id || `live-${v.id}`,
      vehicleNumber: v.vehicleNumber,
      rtoCode: derivedRtoCode,
      rtoOffice: base?.rtoOffice || `${derivedRtoCode} Regional Transport Office`,
      state: base?.state || 'India',
      registrationDate: base?.registrationDate || '15/06/2024',
      vehicleClass: base?.vehicleClass || v.vehicleType,
      makeModel: base?.makeModel || `${v.vehicleType} (${v.nickname || 'Fleet Unit'})`,
      fuelType: base?.fuelType || (/ev|electric/i.test(v.vehicleType) ? 'Electric' : 'Diesel'),
      chassisNumber: base?.chassisNumber || `VIN${norm.slice(0, 6)}2025${v.imei.slice(-5)}`,
      engineNumber: base?.engineNumber || `ENG${v.imei.slice(-8)}`,
      ownerName: base?.ownerName || v.driverName,
      transporterCompany: base?.transporterCompany || 'VS TrackPro Active Fleet',
      driverName: v.driverName,
      driverPhone: v.driverPhone,
      imei: v.imei,
      deviceModel: v.deviceModel,
      insuranceValidUntil: base?.insuranceValidUntil || '31/03/2027',
      fitnessValidUntil: base?.fitnessValidUntil || '31/03/2027',
      permitType: base?.permitType || 'National Permit (All India)',
      status: v.status,
      speedKmh: v.speedKmh,
      speedLimitKmh: v.speedLimitKmh,
      lat: v.lat,
      lng: v.lng,
      headingDeg: v.headingDeg,
      address: v.address,
      fuelPercent: v.fuelPercent,
      fuelLiters: v.fuelLiters,
      tankCapacityLiters: v.tankCapacityLiters,
      odometerKm: v.odometerKm,
      batteryVoltage: v.batteryVoltage,
      acOn: v.acOn,
      ignitionOn: v.ignitionOn,
      source: 'live-fleet',
      matchedLiveVehicleId: v.id,
    });
  }

  // 2. Append remaining mock PAN-India RTO registry vehicles
  if (includeGlobalMockRegistry) {
    for (const rec of MOCK_RTO_REGISTRY) {
      const norm = normalizeRtoNumber(rec.vehicleNumber);
      if (!seen.has(norm)) {
        seen.add(norm);
        merged.push(rec);
      }
    }
  }

  return merged;
}

/**
 * Queries the merged RTO/Vehicle database with ranked relevance:
 *   1. Exact normalized RTO number match
 *   2. RTO number prefix match
 *   3. RTO number substring / trailing digits match
 *   4. Metadata match (RTO office, driver name/phone, make/model, owner, chassis, IMEI)
 */
export function queryRtoVehicleDatabase(
  records: RtoVehicleMetadata[],
  rawQuery: string,
  limit: number = 8
): RtoQueryResult {
  const trimmed = String(rawQuery || '').trim();
  const normalizedQuery = normalizeRtoNumber(trimmed);

  if (!trimmed) {
    return {
      query: '',
      normalizedQuery: '',
      totalCatalogCount: records.length,
      results: records.slice(0, limit),
      exactMatch: null,
    };
  }

  const lower = trimmed.toLowerCase();
  const scored: Array<{ record: RtoVehicleMetadata; score: number }> = [];

  for (const record of records) {
    const normRto = normalizeRtoNumber(record.vehicleNumber);
    const normPhone = normalizeRtoNumber(record.driverPhone);
    const normImei = normalizeRtoNumber(record.imei);
    const normChassis = normalizeRtoNumber(record.chassisNumber);

    let score = 0;

    if (normalizedQuery && normRto === normalizedQuery) {
      score = 100;
    } else if (normalizedQuery && normRto.startsWith(normalizedQuery)) {
      score = 85;
    } else if (normalizedQuery && normRto.includes(normalizedQuery)) {
      score = 70;
    } else if (normalizedQuery.length >= 4 && normImei.includes(normalizedQuery)) {
      score = 62;
    } else if (normalizedQuery.length >= 4 && normChassis.includes(normalizedQuery)) {
      score = 60;
    } else if (normalizedQuery.length >= 4 && normPhone.includes(normalizedQuery)) {
      score = 55;
    } else if (
      record.driverName.toLowerCase().includes(lower) ||
      record.ownerName.toLowerCase().includes(lower) ||
      record.transporterCompany.toLowerCase().includes(lower) ||
      record.rtoOffice.toLowerCase().includes(lower) ||
      record.makeModel.toLowerCase().includes(lower) ||
      record.vehicleClass.toLowerCase().includes(lower) ||
      record.state.toLowerCase().includes(lower)
    ) {
      score = 45;
    }

    if (score > 0) {
      // Slightly boost active live-fleet vehicles when tied
      if (record.source === 'live-fleet') score += 2;
      scored.push({ record, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.record.vehicleNumber.localeCompare(b.record.vehicleNumber));
  const results = scored.slice(0, limit).map((s) => s.record);
  const exactMatch =
    scored.find((s) => s.score >= 100)?.record ||
    (results.length === 1 && normalizedQuery.length >= 4 ? results[0] : null);

  return {
    query: trimmed,
    normalizedQuery,
    totalCatalogCount: records.length,
    results,
    exactMatch,
  };
}

/**
 * Converts a registry-only RTO record into a live-trackable PlatformVehicle so it
 * can be rendered immediately on the interactive Live Tracking map and VehicleStatus panel.
 */
export function toPlatformVehicleFromRtoRecord(
  record: RtoVehicleMetadata
): PlatformVehicle {
  const lat = record.lat;
  const lng = record.lng;
  const stepLat = 0.0022;
  const stepLng = 0.0028;

  return {
    id: record.matchedLiveVehicleId || record.id,
    vehicleNumber: record.vehicleNumber,
    nickname: record.makeModel,
    vehicleType: record.vehicleClass,
    vehicleCategory: record.fuelType === 'Electric' ? 'Electric Commercial' : 'Heavy Commercial',
    deviceModel: record.deviceModel,
    deviceProtocol: 'AIS-140 / 4G-LTE',
    imei: record.imei,
    clientId: 'rto-registry-lookup',
    adminId: 'rto-registry-lookup',
    sharedWithCustomerIds: [],
    driverName: record.driverName,
    driverPhone: record.driverPhone,
    status: record.status,
    lat,
    lng,
    speedKmh: record.speedKmh,
    speedLimitKmh: record.speedLimitKmh,
    headingDeg: record.headingDeg,
    ignitionOn: record.ignitionOn,
    acOn: record.acOn,
    odometerKm: record.odometerKm,
    batteryVoltage: record.batteryVoltage,
    fuelPercent: record.fuelPercent,
    fuelLiters: record.fuelLiters,
    tankCapacityLiters: record.tankCapacityLiters,
    distanceTodayKm: record.status === 'Running' ? 142.6 : 18.4,
    overspeedCount: record.speedKmh > record.speedLimitKmh ? 1 : 0,
    overstoppageCount: record.status === 'Idle' ? 1 : 0,
    routeDeviated: false,
    address: record.address,
    lastUpdated: 'Just now (RTO Live Sync)',
    trail: [
      [Number((lat - stepLat * 3).toFixed(5)), Number((lng - stepLng * 3).toFixed(5))],
      [Number((lat - stepLat * 2).toFixed(5)), Number((lng - stepLng * 2).toFixed(5))],
      [Number((lat - stepLat).toFixed(5)), Number((lng - stepLng).toFixed(5))],
      [lat, lng],
    ],
    plannedRoute: [
      [Number((lat - stepLat * 3).toFixed(5)), Number((lng - stepLng * 3).toFixed(5))],
      [lat, lng],
      [Number((lat + stepLat * 3).toFixed(5)), Number((lng + stepLng * 3).toFixed(5))],
    ],
    overspeedEvents: [],
    overstoppageEvents: [],
    fuelEvents: [],
    trips: [],
  };
}
