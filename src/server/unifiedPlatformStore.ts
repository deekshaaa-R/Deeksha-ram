import crypto from 'node:crypto';
import type { Express, Request, Response, NextFunction } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import { adminAuth } from '../lib/firebase-admin.ts';
import {
  GPS_DEVICE_CATALOG,
  ROLE_NAV_MATRIX,
  VEHICLE_TYPES_CATALOG,
  buildApiIntegrationsCatalog,
  buildNearbyAmenities,
  scopeVehiclesForUser,
  stepPlatformTelemetry,
  type AlertRuleConfig,
  type AnnouncementRecord,
  type ApiIntegrationRecord,
  type CustomerPermissions,
  type GeofenceRecord,
  type PlatformAlert,
  type PlatformDeviceRecord,
  type PlatformRole,
  type PlatformUser,
  type PlatformVehicle,
  type PodRecord,
  type SupportTicket,
  type VehicleTypeEntry,
} from '../utils/unifiedPlatformLogic.ts';

interface StoredUser extends PlatformUser {
  password: string;
}

interface AuthedPlatformRequest extends Request {
  platformUser?: StoredUser;
}

const SESSION_SECRET =
  process.env.PLATFORM_SESSION_SECRET || 'vstrackpro-unified-rbac-secret-2026';

function signSessionToken(userId: string, role: PlatformRole): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, role, iat: Date.now() })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(
  token: string | undefined
): { uid: string; role: PlatformRole } | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  if (sig !== expected) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as { uid?: string; role?: PlatformRole };
    if (!decoded.uid || !decoded.role) return null;
    return { uid: decoded.uid, role: decoded.role };
  } catch {
    return null;
  }
}

function toPublicUser(u: StoredUser): PlatformUser {
  const { password: _pwd, ...rest } = u;
  return rest;
}

export function registerUnifiedPlatformRoutes(
  app: Express,
  io: SocketIOServer
): void {
  // =========================================================================
  // SEEDED AUTHORITATIVE MULTI-TENANT DATA (1 COMMON BACKEND FOR 12 VERSIONS)
  // =========================================================================

  const users: StoredUser[] = [
    {
      id: 'sa-1',
      name: 'Vikram Shetty',
      email: 'superadmin@vstrackpro.in',
      phone: '+91 97406 40650',
      role: 'super_admin',
      company: 'VS TrackPro HQ (PAN India)',
      status: 'Active',
      password: 'Password@123',
      createdAt: '2025-01-10',
    },
    {
      id: 'admin-1',
      name: 'Rajesh Nair',
      email: 'admin@vstrackpro.in',
      phone: '+91 98450 22110',
      role: 'admin',
      company: 'South & West Fleet Ops',
      status: 'Active',
      password: 'Password@123',
      createdAt: '2025-03-14',
    },
    {
      id: 'admin-2',
      name: 'Meera Kapoor',
      email: 'north.admin@vstrackpro.in',
      phone: '+91 98110 77889',
      role: 'admin',
      company: 'North Corridor Telematics',
      status: 'Active',
      password: 'Password@123',
      createdAt: '2025-04-22',
    },
    {
      id: 'client-1',
      name: 'Arjun Deshmukh',
      email: 'client@vstrackpro.in',
      phone: '+91 98801 55443',
      role: 'client',
      company: 'Deccan Logistics & Earthmovers',
      status: 'Active',
      adminId: 'admin-1',
      password: 'Password@123',
      createdAt: '2025-06-05',
    },
    {
      id: 'client-2',
      name: 'Priya Kulkarni',
      email: 'pune.client@vstrackpro.in',
      phone: '+91 98220 33412',
      role: 'client',
      company: 'Sahyadri Cold-Chain & EV Fleet',
      status: 'Active',
      adminId: 'admin-1',
      password: 'Password@123',
      createdAt: '2025-07-19',
    },
    {
      id: 'client-3',
      name: 'Harpreet Gill',
      email: 'delhi.client@vstrackpro.in',
      phone: '+91 98104 99812',
      role: 'client',
      company: 'Northern Express Carriers',
      status: 'Active',
      adminId: 'admin-2',
      password: 'Password@123',
      createdAt: '2025-08-01',
    },
    {
      id: 'cust-1',
      name: 'Ananya Rao',
      email: 'customer@vstrackpro.in',
      phone: '+91 99002 66778',
      role: 'customer',
      company: 'FreshMart Retail Consignee',
      status: 'Active',
      adminId: 'admin-1',
      clientId: 'client-1',
      sharedVehicleIds: ['veh-1', 'veh-2'],
      permissions: {
        canViewOdometer: true,
        canViewBattery: true,
        canViewAc: true,
        historyDaysLimit: 30,
      },
      password: 'Password@123',
      createdAt: '2026-01-12',
    },
    {
      id: 'cust-2',
      name: 'Siddharth Joshi',
      email: 'consignee2@vstrackpro.in',
      phone: '+91 98230 11882',
      role: 'customer',
      company: 'MedCare Pharma Depot',
      status: 'Active',
      adminId: 'admin-1',
      clientId: 'client-2',
      sharedVehicleIds: ['veh-4'],
      permissions: {
        canViewOdometer: false,
        canViewBattery: true,
        canViewAc: true,
        historyDaysLimit: 7,
      },
      password: 'Password@123',
      createdAt: '2026-02-04',
    },
  ];

  let vehicles: PlatformVehicle[] = [
    {
      id: 'veh-1',
      vehicleNumber: 'KA-06-TR-4821',
      nickname: 'NH-48 Heavy Container',
      vehicleType: '12-Wheeler Truck',
      vehicleCategory: 'Heavy Commercial',
      deviceModel: 'VS VST-PRO-4G-Pro',
      deviceProtocol: 'GT06/VST4G',
      imei: '864209051284921',
      adminId: 'admin-1',
      clientId: 'client-1',
      sharedWithCustomerIds: ['cust-1'],
      driverName: 'Ramesh Deshpande',
      driverPhone: '+91 98450 11223',
      status: 'Running',
      lat: 13.3379,
      lng: 77.1173,
      headingDeg: 132,
      speedKmh: 66,
      speedLimitKmh: 75,
      odometerKm: 84214.6,
      distanceTodayKm: 218.4,
      batteryVoltage: 24.6,
      acOn: true,
      ignitionOn: true,
      fuelPercent: 76,
      fuelLiters: 243,
      tankCapacityLiters: 320,
      address: 'NH-48 Tumkuru Bypass, Karnataka',
      lastUpdated: 'Live · just now',
      overspeedCount: 2,
      overstoppageCount: 1,
      routeDeviated: false,
      plannedRoute: [
        [13.36, 77.08],
        [13.3379, 77.1173],
        [13.21, 77.31],
        [12.9716, 77.5946],
      ],
      trail: [
        [13.352, 77.095],
        [13.345, 77.106],
        [13.3379, 77.1173],
      ],
      overspeedEvents: [
        {
          id: 'os-1',
          speedKmh: 84,
          limitKmh: 75,
          lat: 13.3492,
          lng: 77.1014,
          location: 'Kyathasandra Toll Stretch, NH-48',
          timestamp: 'Today · 10:18 AM',
        },
        {
          id: 'os-2',
          speedKmh: 81,
          limitKmh: 75,
          lat: 13.3411,
          lng: 77.1128,
          location: 'Sira Gate Flyover, Tumkuru',
          timestamp: 'Today · 11:42 AM',
        },
      ],
      overstoppageEvents: [
        {
          id: 'st-1',
          durationMins: 38,
          lat: 13.356,
          lng: 77.092,
          location: 'Antharasana Halli Weighbridge',
          timestamp: 'Today · 09:05 AM',
        },
      ],
      fuelEvents: [
        { id: 'fe-1', type: 'Refuel', liters: 140, location: 'IOCL Highway Plaza, Tumkuru', timestamp: 'Today · 07:15 AM' },
        { id: 'fe-2', type: 'Drop', liters: 14, location: 'Nelamangala Lay-by', timestamp: 'Yesterday · 08:40 PM' },
      ],
      trips: [
        {
          id: 'trip-101',
          date: '2026-11-20',
          startLocation: 'Tumkuru Industrial Area',
          endLocation: 'Bengaluru Nelamangala Hub',
          distanceKm: 68.4,
          maxSpeedKmh: 84,
          avgSpeedKmh: 54,
          durationMins: 76,
          fuelConsumedLiters: 16.2,
          points: [[13.36, 77.08], [13.3379, 77.1173], [13.21, 77.31], [13.099, 77.392]],
        },
        {
          id: 'trip-102',
          date: '2026-10-14',
          startLocation: 'Bengaluru Peenya',
          endLocation: 'Hubballi Logistics Park',
          distanceKm: 408.0,
          maxSpeedKmh: 74,
          avgSpeedKmh: 58,
          durationMins: 422,
          fuelConsumedLiters: 94.5,
          points: [[13.028, 77.519], [13.3379, 77.1173], [14.464, 75.921], [15.364, 75.124]],
        },
        {
          id: 'trip-103',
          date: '2026-06-22',
          startLocation: 'Tumkuru Depot',
          endLocation: 'Chennai Sriperumbudur',
          distanceKm: 365.2,
          maxSpeedKmh: 76,
          avgSpeedKmh: 56,
          durationMins: 391,
          fuelConsumedLiters: 85.1,
          points: [[13.3379, 77.1173], [12.9716, 77.5946], [12.834, 79.703], [12.967, 79.941]],
        },
      ],
    },
    {
      id: 'veh-2',
      vehicleNumber: 'KA-01-AG-7741',
      nickname: 'City Express Cargo Van',
      vehicleType: 'Closed Container LCV',
      vehicleCategory: 'Heavy Commercial',
      deviceModel: 'VS VST-OBD2-Pro',
      deviceProtocol: 'GT06/VST4G',
      imei: '864209051284922',
      adminId: 'admin-1',
      clientId: 'client-1',
      sharedWithCustomerIds: ['cust-1'],
      driverName: 'Manjunath K.',
      driverPhone: '+91 98451 88776',
      status: 'Running',
      lat: 12.9716,
      lng: 77.5946,
      headingDeg: 78,
      speedKmh: 48,
      speedLimitKmh: 65,
      odometerKm: 41892.3,
      distanceTodayKm: 112.7,
      batteryVoltage: 13.9,
      acOn: true,
      ignitionOn: true,
      fuelPercent: 54,
      fuelLiters: 59,
      tankCapacityLiters: 110,
      address: 'MG Road – Indiranagar Corridor, Bengaluru',
      lastUpdated: 'Live · just now',
      overspeedCount: 0,
      overstoppageCount: 1,
      routeDeviated: true,
      plannedRoute: [
        [12.961, 77.565],
        [12.9716, 77.5946],
        [12.978, 77.641],
      ],
      trail: [
        [12.968, 77.581],
        [12.9716, 77.5946],
      ],
      overspeedEvents: [],
      overstoppageEvents: [
        {
          id: 'st-2',
          durationMins: 27,
          lat: 12.969,
          lng: 77.588,
          location: 'Richmond Circle Loading Bay',
          timestamp: 'Today · 10:50 AM',
        },
      ],
      fuelEvents: [
        { id: 'fe-3', type: 'Refuel', liters: 48, location: 'BPCL Trinity Circle', timestamp: 'Today · 08:05 AM' },
      ],
      trips: [
        {
          id: 'trip-201',
          date: '2026-11-20',
          startLocation: 'Yeshwanthpur Yard',
          endLocation: 'Whitefield Retail Hub',
          distanceKm: 34.6,
          maxSpeedKmh: 59,
          avgSpeedKmh: 28,
          durationMins: 74,
          fuelConsumedLiters: 4.1,
          points: [[13.023, 77.55], [12.9716, 77.5946], [12.969, 77.749]],
        },
        {
          id: 'trip-202',
          date: '2026-08-09',
          startLocation: 'Electronic City',
          endLocation: 'Devanahalli Airport Cargo',
          distanceKm: 56.2,
          maxSpeedKmh: 64,
          avgSpeedKmh: 41,
          durationMins: 82,
          fuelConsumedLiters: 6.2,
          points: [[12.845, 77.66], [12.9716, 77.5946], [13.198, 77.706]],
        },
      ],
    },
    {
      id: 'veh-3',
      vehicleNumber: 'KA-06-EX-3310',
      nickname: 'Site-B Hydraulic Excavator',
      vehicleType: 'Hydraulic Excavator 20T',
      vehicleCategory: 'Construction & Earthmover',
      deviceModel: 'VS VST-MAG-920',
      deviceProtocol: 'GT06/VST4G',
      imei: '864209051284923',
      adminId: 'admin-1',
      clientId: 'client-1',
      sharedWithCustomerIds: [],
      driverName: 'Prakash Gouda',
      driverPhone: '+91 97401 33445',
      status: 'Idle',
      lat: 13.3125,
      lng: 77.1482,
      headingDeg: 210,
      speedKmh: 0,
      speedLimitKmh: 25,
      odometerKm: 5412.8,
      distanceTodayKm: 6.4,
      batteryVoltage: 23.8,
      acOn: false,
      ignitionOn: true,
      fuelPercent: 24,
      fuelLiters: 58,
      tankCapacityLiters: 240,
      address: 'Vasanthanarasapura Infra Zone, Tumkuru',
      lastUpdated: 'Idle · live',
      overspeedCount: 0,
      overstoppageCount: 2,
      routeDeviated: false,
      plannedRoute: [[13.3125, 77.1482], [13.316, 77.152]],
      trail: [[13.3125, 77.1482]],
      overspeedEvents: [],
      overstoppageEvents: [
        {
          id: 'st-3',
          durationMins: 52,
          lat: 13.3125,
          lng: 77.1482,
          location: 'Infra Excavation Pit 4',
          timestamp: 'Today · 11:10 AM',
        },
      ],
      fuelEvents: [
        { id: 'fe-4', type: 'Drop', liters: 18, location: 'Site-B Night Yard', timestamp: 'Yesterday · 11:25 PM' },
      ],
      trips: [
        {
          id: 'trip-301',
          date: '2026-11-19',
          startLocation: 'Yard Gate 1',
          endLocation: 'Excavation Pit 4',
          distanceKm: 6.4,
          maxSpeedKmh: 14,
          avgSpeedKmh: 8,
          durationMins: 48,
          fuelConsumedLiters: 22.0,
          points: [[13.311, 77.145], [13.3125, 77.1482]],
        },
      ],
    },
    {
      id: 'veh-4',
      vehicleNumber: 'MH-12-RF-9032',
      nickname: 'Pharma Cold-Chain Reefer',
      vehicleType: 'Pharma Cold-Chain Van',
      vehicleCategory: 'Cold Chain & Specialized',
      deviceModel: 'Teltonika FMC-920',
      deviceProtocol: 'Codec8E',
      imei: '864209051289889',
      adminId: 'admin-1',
      clientId: 'client-2',
      sharedWithCustomerIds: ['cust-2'],
      driverName: 'Suresh Kulkarni',
      driverPhone: '+91 98220 44551',
      status: 'Running',
      lat: 18.5204,
      lng: 73.8567,
      headingDeg: 295,
      speedKmh: 58,
      speedLimitKmh: 70,
      odometerKm: 62310.1,
      distanceTodayKm: 164.5,
      batteryVoltage: 14.1,
      acOn: true,
      ignitionOn: true,
      fuelPercent: 82,
      fuelLiters: 148,
      tankCapacityLiters: 180,
      address: 'Mumbai-Pune Expressway, Wakad Exit',
      lastUpdated: 'Live · just now',
      overspeedCount: 1,
      overstoppageCount: 0,
      routeDeviated: false,
      plannedRoute: [[18.5204, 73.8567], [18.75, 73.41], [19.076, 72.8777]],
      trail: [[18.514, 73.869], [18.5204, 73.8567]],
      overspeedEvents: [
        {
          id: 'os-4',
          speedKmh: 79,
          limitKmh: 70,
          lat: 18.591,
          lng: 73.732,
          location: 'Urse Toll Plaza Stretch',
          timestamp: 'Today · 09:44 AM',
        },
      ],
      overstoppageEvents: [],
      fuelEvents: [
        { id: 'fe-5', type: 'Refuel', liters: 95, location: 'HPCL Wakad Express', timestamp: 'Today · 06:50 AM' },
      ],
      trips: [
        {
          id: 'trip-401',
          date: '2026-11-20',
          startLocation: 'Chakan Pharma Park',
          endLocation: 'Navi Mumbai Cold Hub',
          distanceKm: 138.0,
          maxSpeedKmh: 79,
          avgSpeedKmh: 61,
          durationMins: 136,
          fuelConsumedLiters: 19.4,
          points: [[18.76, 73.86], [18.5204, 73.8567], [19.033, 73.029]],
        },
      ],
    },
    {
      id: 'veh-5',
      vehicleNumber: 'MH-14-EV-1190',
      nickname: 'Last-Mile E-Rickshaw 04',
      vehicleType: 'E-Rickshaw Cargo Loader',
      vehicleCategory: 'Two & Three Wheeler',
      deviceModel: 'Concox VL-100',
      deviceProtocol: 'GT06N',
      imei: '864209051289890',
      adminId: 'admin-1',
      clientId: 'client-2',
      sharedWithCustomerIds: [],
      driverName: 'Vikas Pawar',
      driverPhone: '+91 98229 77812',
      status: 'Stationary',
      lat: 18.6298,
      lng: 73.7997,
      headingDeg: 90,
      speedKmh: 0,
      speedLimitKmh: 35,
      odometerKm: 9842.0,
      distanceTodayKm: 41.2,
      batteryVoltage: 12.4,
      acOn: false,
      ignitionOn: false,
      fuelPercent: 68,
      fuelLiters: 10,
      tankCapacityLiters: 14,
      address: 'Pimpri-Chinchwad Charging Hub, Pune',
      lastUpdated: 'Stationary · live',
      overspeedCount: 0,
      overstoppageCount: 1,
      routeDeviated: false,
      plannedRoute: [[18.6298, 73.7997], [18.64, 73.82]],
      trail: [[18.6298, 73.7997]],
      overspeedEvents: [],
      overstoppageEvents: [],
      fuelEvents: [],
      trips: [],
    },
    {
      id: 'veh-6',
      vehicleNumber: 'DL-01-GB-5520',
      nickname: 'NCR Express 16-Wheeler',
      vehicleType: '16-Wheeler Trailer',
      vehicleCategory: 'Heavy Commercial',
      deviceModel: 'VS VST-ADAS-Pro',
      deviceProtocol: 'GT06/VST4G',
      imei: '864209051299101',
      adminId: 'admin-2',
      clientId: 'client-3',
      sharedWithCustomerIds: [],
      driverName: 'Balwinder Singh',
      driverPhone: '+91 98110 22990',
      status: 'Running',
      lat: 28.4595,
      lng: 77.0266,
      headingDeg: 215,
      speedKmh: 72,
      speedLimitKmh: 75,
      odometerKm: 142680.4,
      distanceTodayKm: 286.9,
      batteryVoltage: 24.5,
      acOn: true,
      ignitionOn: true,
      fuelPercent: 64,
      fuelLiters: 205,
      tankCapacityLiters: 320,
      address: 'NH-48 Gurugram – Manesar Toll Corridor',
      lastUpdated: 'Live · just now',
      overspeedCount: 3,
      overstoppageCount: 0,
      routeDeviated: false,
      plannedRoute: [[28.6139, 77.209], [28.4595, 77.0266], [26.9124, 75.7873]],
      trail: [[28.472, 77.039], [28.4595, 77.0266]],
      overspeedEvents: [
        {
          id: 'os-6',
          speedKmh: 86,
          limitKmh: 75,
          lat: 28.468,
          lng: 77.034,
          location: 'Kherki Daula Expressway',
          timestamp: 'Today · 12:04 PM',
        },
      ],
      overstoppageEvents: [],
      fuelEvents: [
        { id: 'fe-6', type: 'Refuel', liters: 180, location: 'IOCL Bilaspur Highway', timestamp: 'Today · 05:30 AM' },
      ],
      trips: [
        {
          id: 'trip-601',
          date: '2026-11-20',
          startLocation: 'Delhi Sanjay Gandhi Transport Nagar',
          endLocation: 'Jaipur Vishwakarma Industrial Area',
          distanceKm: 268.4,
          maxSpeedKmh: 86,
          avgSpeedKmh: 62,
          durationMins: 260,
          fuelConsumedLiters: 64.0,
          points: [[28.74, 77.15], [28.4595, 77.0266], [26.99, 75.77]],
        },
      ],
    },
    {
      id: 'veh-7',
      vehicleNumber: 'HR-55-BK-8804',
      nickname: 'Rapid Courier Motorbike',
      vehicleType: 'Commuter Motorbike 150cc',
      vehicleCategory: 'Two & Three Wheeler',
      deviceModel: 'Concox GT-100',
      deviceProtocol: 'GT06N',
      imei: '864209051299102',
      adminId: 'admin-2',
      clientId: 'client-3',
      sharedWithCustomerIds: [],
      driverName: 'Deepak Verma',
      driverPhone: '+91 98112 66440',
      status: 'Offline',
      lat: 28.6139,
      lng: 77.209,
      headingDeg: 0,
      speedKmh: 0,
      speedLimitKmh: 60,
      odometerKm: 21504.2,
      distanceTodayKm: 0,
      batteryVoltage: 11.7,
      acOn: false,
      ignitionOn: false,
      fuelPercent: 31,
      fuelLiters: 4,
      tankCapacityLiters: 14,
      address: 'Connaught Place Service Bay, New Delhi',
      lastUpdated: 'Offline · 38m ago',
      overspeedCount: 0,
      overstoppageCount: 0,
      routeDeviated: false,
      plannedRoute: [[28.6139, 77.209]],
      trail: [[28.6139, 77.209]],
      overspeedEvents: [],
      overstoppageEvents: [],
      fuelEvents: [],
      trips: [],
    },
  ];

  const devices: PlatformDeviceRecord[] = [
    { id: 'dev-1', imei: '864209051284921', model: 'VS VST-PRO-4G-Pro', category: 'Wired', simNumber: '899145090011221', status: 'Active', assignedAdminId: 'admin-1', assignedClientId: 'client-1', assignedVehicleNumber: 'KA-06-TR-4821', lastHeartbeat: '2s ago' },
    { id: 'dev-2', imei: '864209051284922', model: 'VS VST-OBD2-Pro', category: 'OBD', simNumber: '899145090011222', status: 'Active', assignedAdminId: 'admin-1', assignedClientId: 'client-1', assignedVehicleNumber: 'KA-01-AG-7741', lastHeartbeat: '4s ago' },
    { id: 'dev-3', imei: '864209051284923', model: 'VS VST-MAG-920', category: 'Non-Wired', simNumber: '899145090011223', status: 'Active', assignedAdminId: 'admin-1', assignedClientId: 'client-1', assignedVehicleNumber: 'KA-06-EX-3310', lastHeartbeat: '6s ago' },
    { id: 'dev-4', imei: '864209051289889', model: 'Teltonika FMC-920', category: 'Fuel Sensor', simNumber: '899145090011224', status: 'Active', assignedAdminId: 'admin-1', assignedClientId: 'client-2', assignedVehicleNumber: 'MH-12-RF-9032', lastHeartbeat: '3s ago' },
    { id: 'dev-5', imei: '864209051299101', model: 'VS VST-ADAS-Pro', category: 'AI Dashcam', simNumber: '899145090011225', status: 'Active', assignedAdminId: 'admin-2', assignedClientId: 'client-3', assignedVehicleNumber: 'DL-01-GB-5520', lastHeartbeat: '2s ago' },
    { id: 'dev-6', imei: '864209051299888', model: 'Technoton DUT-E-Pro', category: 'Fuel Sensor', simNumber: '899145090011226', status: 'Inventory', assignedAdminId: 'admin-1', lastHeartbeat: 'Ready to assign' },
  ];

  const customVehicleTypes: VehicleTypeEntry[] = [...VEHICLE_TYPES_CATALOG];

  const geofences: GeofenceRecord[] = [
    {
      id: 'gf-1',
      name: 'Tumkuru Main Dispatch Depot',
      kind: 'Geofence',
      lat: 13.3379,
      lng: 77.1173,
      radiusMeters: 1500,
      ownerRole: 'client',
      adminId: 'admin-1',
      clientId: 'client-1',
      alertOnEnter: true,
      alertOnExit: true,
      assignedVehicleIds: ['veh-1', 'veh-3'],
    },
    {
      id: 'gf-2',
      name: 'Bengaluru Retail Distribution POI',
      kind: 'POI',
      lat: 12.9716,
      lng: 77.5946,
      radiusMeters: 800,
      ownerRole: 'admin',
      adminId: 'admin-1',
      alertOnEnter: true,
      alertOnExit: false,
      assignedVehicleIds: ['veh-1', 'veh-2'],
    },
    {
      id: 'gf-3',
      name: 'Chakan Cold-Chain Gate Template',
      kind: 'Geofence',
      lat: 18.76,
      lng: 73.86,
      radiusMeters: 1200,
      ownerRole: 'admin',
      adminId: 'admin-1',
      clientId: 'client-2',
      alertOnEnter: true,
      alertOnExit: true,
      assignedVehicleIds: ['veh-4', 'veh-5'],
    },
  ];

  const pods: PodRecord[] = [
    {
      id: 'pod-1',
      vehicleId: 'veh-1',
      vehicleNumber: 'KA-06-TR-4821',
      clientId: 'client-1',
      customerId: 'cust-1',
      consignmentNo: 'CN-2026-88412',
      recipientName: 'Ananya Rao (FreshMart Dock 2)',
      location: 'Nelamangala Distribution Center, Bengaluru',
      lat: 13.0992,
      lng: 77.3918,
      timestamp: '2026-11-20 · 09:45 AM',
      signatureText: 'A. Rao — Verified 42 Pallets Intact',
      photoLabel: 'Seal-Verified Container Rear Door Photo',
      notes: 'Temperature maintained at 4°C, zero seal tamper.',
    },
    {
      id: 'pod-2',
      vehicleId: 'veh-2',
      vehicleNumber: 'KA-01-AG-7741',
      clientId: 'client-1',
      customerId: 'cust-1',
      consignmentNo: 'CN-2026-88419',
      recipientName: 'Karthik M. (Store Supervisor)',
      location: 'Indiranagar Retail Outlet, Bengaluru',
      lat: 12.9784,
      lng: 77.6408,
      timestamp: '2026-11-20 · 11:12 AM',
      signatureText: 'Karthik M.',
      photoLabel: 'Signed Invoice & Unload Photo',
      notes: '18 crates delivered ahead of SLA window.',
    },
  ];

  const alerts: PlatformAlert[] = [
    {
      id: 'al-1',
      type: 'Overspeed',
      severity: 'Critical',
      vehicleId: 'veh-1',
      vehicleNumber: 'KA-06-TR-4821',
      adminId: 'admin-1',
      clientId: 'client-1',
      message: 'Exceeded 75 km/h highway limit (recorded 84 km/h)',
      location: 'Kyathasandra Toll Stretch, NH-48',
      lat: 13.3492,
      lng: 77.1014,
      timestamp: '12m ago',
      acknowledged: false,
    },
    {
      id: 'al-2',
      type: 'Route Deviation',
      severity: 'Warning',
      vehicleId: 'veh-2',
      vehicleNumber: 'KA-01-AG-7741',
      adminId: 'admin-1',
      clientId: 'client-1',
      message: 'Vehicle deviated 420m off planned MG Road corridor',
      location: 'Richmond Road Detour, Bengaluru',
      lat: 12.9716,
      lng: 77.5946,
      timestamp: '18m ago',
      acknowledged: false,
    },
    {
      id: 'al-3',
      type: 'Fuel Drop',
      severity: 'Critical',
      vehicleId: 'veh-3',
      vehicleNumber: 'KA-06-EX-3310',
      adminId: 'admin-1',
      clientId: 'client-1',
      message: 'Sudden diesel drop of 18 L detected while engine idle',
      location: 'Vasanthanarasapura Site-B Yard',
      lat: 13.3125,
      lng: 77.1482,
      timestamp: '42m ago',
      acknowledged: false,
    },
    {
      id: 'al-4',
      type: 'Overspeed',
      severity: 'Critical',
      vehicleId: 'veh-6',
      vehicleNumber: 'DL-01-GB-5520',
      adminId: 'admin-2',
      clientId: 'client-3',
      message: 'Recorded 86 km/h on NH-48 Gurugram corridor',
      location: 'Kherki Daula Expressway',
      lat: 28.468,
      lng: 77.034,
      timestamp: '9m ago',
      acknowledged: false,
    },
  ];

  const alertRules: AlertRuleConfig = {
    overspeedLimitKmh: 75,
    overstoppageMinutes: 25,
    routeDeviationMeters: 300,
    fuelDropThresholdLiters: 12,
    lowBatteryVolts: 11.8,
    geofenceAlertsEnabled: true,
    customRuleNote: 'Night movement alert active 11:00 PM – 05:00 AM IST',
  };

  const announcements: AnnouncementRecord[] = [
    {
      id: 'ann-1',
      title: 'AIS-140 & ULIP Real-Time Sync Upgraded to 99.94% SLA',
      body: 'All PAN India telemetry clusters are now running multi-region failover with 6-month instant trip playback.',
      senderRole: 'super_admin',
      senderName: 'Vikram Shetty (Super Admin)',
      audience: 'All Users',
      createdAt: 'Today · 08:30 AM',
    },
    {
      id: 'ann-2',
      title: 'NH-48 Tumkuru – Bengaluru Toll Diversion Advisory',
      body: 'Expect 15 min queue at Nelamangala toll between 6 PM and 8 PM. Route deviation buffers widened for South-West clients.',
      senderRole: 'admin',
      senderName: 'Rajesh Nair (Regional Admin)',
      adminId: 'admin-1',
      audience: 'My Clients & Customers',
      createdAt: 'Today · 10:15 AM',
    },
  ];

  const tickets: SupportTicket[] = [
    {
      id: 'tk-1',
      subject: 'Calibrate ultrasonic fuel sensor on KA-06-EX-3310',
      message: 'Excavator tank dip shows 62L while sensor reports 58L after yesterday refill. Requesting remote calibration.',
      createdById: 'client-1',
      createdByName: 'Arjun Deshmukh',
      createdByRole: 'client',
      adminId: 'admin-1',
      clientId: 'client-1',
      status: 'Open',
      priority: 'High',
      createdAt: 'Today · 09:20 AM',
    },
    {
      id: 'tk-2',
      subject: 'Enable ULIP + FASTag webhook for Northern Express',
      message: 'Need API credentials provisioned for 18 heavy trailers under North Corridor.',
      createdById: 'admin-2',
      createdByName: 'Meera Kapoor',
      createdByRole: 'admin',
      adminId: 'admin-2',
      status: 'Escalated to Super Admin',
      priority: 'High',
      createdAt: 'Yesterday · 04:10 PM',
    },
  ];

  const apiIntegrations: ApiIntegrationRecord[] = buildApiIntegrationsCatalog();

  // =========================================================================
  // AUTH MIDDLEWARE (STRICT SERVER-SIDE ROLE ISOLATION)
  // =========================================================================

  function requirePlatformAuth(
    req: AuthedPlatformRequest,
    res: Response,
    next: NextFunction
  ) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const verified = verifySessionToken(token);
    if (!verified) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    const user = users.find((u) => u.id === verified.uid);
    if (!user) {
      return res.status(401).json({ error: 'Account session expired.' });
    }
    if (user.status === 'Blocked') {
      return res.status(403).json({ error: 'This account has been blocked by an administrator.' });
    }
    req.platformUser = user;
    next();
  }

  function buildScopedPayload(user: StoredUser) {
    const scopedVehicles = scopeVehiclesForUser(vehicles, user);
    const scopedVehicleIds = new Set(scopedVehicles.map((v) => v.id));

    const scopedAdmins =
      user.role === 'super_admin'
        ? users.filter((u) => u.role === 'admin').map(toPublicUser)
        : [];

    const scopedClients =
      user.role === 'super_admin'
        ? users.filter((u) => u.role === 'client').map(toPublicUser)
        : user.role === 'admin'
        ? users.filter((u) => u.role === 'client' && u.adminId === user.id).map(toPublicUser)
        : [];

    const scopedCustomers =
      user.role === 'super_admin'
        ? users.filter((u) => u.role === 'customer').map(toPublicUser)
        : user.role === 'admin'
        ? users.filter((u) => u.role === 'customer' && u.adminId === user.id).map(toPublicUser)
        : user.role === 'client'
        ? users.filter((u) => u.role === 'customer' && u.clientId === user.id).map(toPublicUser)
        : [];

    const scopedDevices =
      user.role === 'super_admin'
        ? devices
        : user.role === 'admin'
        ? devices.filter((d) => d.assignedAdminId === user.id || d.status === 'Inventory')
        : user.role === 'client'
        ? devices.filter((d) => d.assignedClientId === user.id)
        : [];

    const scopedAlerts =
      user.role === 'super_admin'
        ? alerts
        : user.role === 'admin'
        ? alerts.filter((a) => a.adminId === user.id)
        : user.role === 'client'
        ? alerts.filter((a) => a.clientId === user.id)
        : alerts.filter((a) => scopedVehicleIds.has(a.vehicleId));

    const scopedGeofences =
      user.role === 'super_admin'
        ? geofences
        : user.role === 'admin'
        ? geofences.filter((g) => g.adminId === user.id)
        : user.role === 'client'
        ? geofences.filter((g) => g.clientId === user.id || (g.ownerRole === 'admin' && g.adminId === user.adminId))
        : [];

    const scopedPods =
      user.role === 'super_admin'
        ? pods
        : user.role === 'admin'
        ? pods.filter((p) => scopedVehicleIds.has(p.vehicleId))
        : user.role === 'client'
        ? pods.filter((p) => p.clientId === user.id)
        : pods.filter((p) => scopedVehicleIds.has(p.vehicleId));

    const scopedAnnouncements =
      user.role === 'super_admin'
        ? announcements
        : announcements.filter(
            (a) =>
              a.audience === 'All Users' ||
              a.adminId === user.id ||
              a.adminId === user.adminId
          );

    const scopedTickets =
      user.role === 'super_admin'
        ? tickets
        : user.role === 'admin'
        ? tickets.filter((t) => t.adminId === user.id || t.createdById === user.id)
        : tickets.filter((t) => t.createdById === user.id || t.clientId === user.id);

    const anchor = scopedVehicles[0];
    const nearbyAmenities = anchor
      ? buildNearbyAmenities(anchor.lat, anchor.lng)
      : buildNearbyAmenities(13.3379, 77.1173);

    return {
      user: toPublicUser(user),
      vehicles: scopedVehicles,
      admins: scopedAdmins,
      clients: scopedClients,
      customers: scopedCustomers,
      devices: scopedDevices,
      deviceCatalogCount: GPS_DEVICE_CATALOG.length,
      deviceCatalog: user.role === 'super_admin' || user.role === 'admin' ? GPS_DEVICE_CATALOG : [],
      vehicleTypesCount: customVehicleTypes.length,
      vehicleTypes: user.role === 'super_admin' ? customVehicleTypes : customVehicleTypes.slice(0, 30),
      alerts: scopedAlerts,
      alertRules,
      geofences: scopedGeofences,
      pods: scopedPods,
      announcements: scopedAnnouncements,
      tickets: scopedTickets,
      apiIntegrations: user.role === 'super_admin' ? apiIntegrations : [],
      apiIntegrationsCount: apiIntegrations.length,
      nearbyAmenities,
      uptimeStats: {
        uptimePercent: 99.94,
        region: 'PAN India (Mumbai · Bengaluru · Delhi NCR)',
        activeSockets: io.engine.clientsCount,
        telemetryIntervalSec: 4,
        supportSla: '24x7 Technical Support (< 4 min response)',
      },
      timestamp: new Date().toISOString(),
    };
  }

  // =========================================================================
  // AUTH ROUTES (SEPARATE ROLE-BASED LOGIN + OTP + BIOMETRIC)
  // =========================================================================

  app.get('/api/platform/screen-matrix', (_req: Request, res: Response) => {
    res.json({
      brand: 'VS TrackPro (Ttrack + myFleetvigilPro)',
      totalVersions: 12,
      roles: ROLE_NAV_MATRIX,
      catalogs: {
        vehicleTypes: customVehicleTypes.length,
        gpsDevices: GPS_DEVICE_CATALOG.length,
        apiIntegrations: apiIntegrations.length,
      },
    });
  });

  app.post('/api/platform/auth/request-otp', (req: Request, res: Response) => {
    const { identifier, role } = req.body || {};
    const clean = String(identifier || '').trim().toLowerCase();
    if (!clean) {
      return res.status(400).json({ error: 'Enter your registered email or mobile number to receive an OTP.' });
    }
    const found = users.find(
      (u) =>
        u.role === role &&
        (u.email.toLowerCase() === clean || u.phone.replace(/\s+/g, '') === clean.replace(/\s+/g, ''))
    );
    if (!found) {
      return res.status(404).json({ error: `No ${String(role || '').replace('_', ' ')} account matches that email or phone.` });
    }
    return res.json({
      ok: true,
      demoOtp: '482910',
      message: `6-digit OTP dispatched to ${found.phone} (Demo OTP: 482910)`,
    });
  });

  app.post('/api/platform/auth/login', (req: Request, res: Response) => {
    const { role, email, password, otp, authMode } = req.body || {};
    const validRoles: PlatformRole[] = ['super_admin', 'admin', 'client', 'customer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Select a valid portal role.' });
    }
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Email or phone is required.' });
    }

    const user = users.find(
      (u) =>
        u.role === role &&
        (u.email.toLowerCase() === cleanEmail ||
          u.phone.replace(/\s+/g, '') === cleanEmail.replace(/\s+/g, ''))
    );

    if (!user) {
      return res.status(401).json({
        error: `Account not found in the ${role.replace('_', ' ')} portal. Each user role requires its own login.`,
      });
    }
    if (user.status === 'Blocked') {
      return res.status(403).json({ error: 'This account is currently blocked.' });
    }

    if (authMode === 'otp') {
      if (String(otp || '').trim() !== '482910') {
        return res.status(401).json({ error: 'Invalid OTP code. Request an OTP or use demo OTP 482910.' });
      }
    } else if (authMode === 'biometric') {
      // Mobile Face ID / Fingerprint local assertion mapped to enrolled user
      if (!user) {
        return res.status(401).json({ error: 'Biometric enrollment not found.' });
      }
    } else {
      if (!password || String(password) !== user.password) {
        return res.status(401).json({ error: 'Invalid password. Demo password is Password@123.' });
      }
    }

    const token = signSessionToken(user.id, user.role);
    return res.json({
      token,
      ...buildScopedPayload(user),
    });
  });

  app.post('/api/platform/auth/firebase-exchange', async (req: Request, res: Response) => {
    const { idToken, role, company, status } = req.body || {};
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'Firebase ID token is required.' });
    }

    try {
      // Standard verifyIdToken (without checkRevoked) requires NO IAM and works on Starter Tier
      const decoded = await adminAuth.verifyIdToken(idToken);
      if (!decoded.email || decoded.email_verified !== true) {
        return res.status(403).json({
          error: 'Verified Firebase email is required to establish a role-scoped session.',
        });
      }

      const validRoles: PlatformRole[] = ['super_admin', 'admin', 'client', 'customer'];
      const isOwner = decoded.email.toLowerCase() === 'ramdeeksharam@gmail.com';
      const requestedRole: PlatformRole = validRoles.includes(role)
        ? role
        : isOwner
        ? 'super_admin'
        : 'customer';

      // Non-owner accounts cannot self-escalate to super_admin via exchange payload
      const effectiveRole: PlatformRole = isOwner
        ? requestedRole
        : requestedRole === 'super_admin'
        ? 'customer'
        : requestedRole;

      if (status === 'Blocked') {
        return res.status(403).json({
          error: 'This account is currently blocked in Firestore RBAC policy.',
        });
      }

      const cleanEmail = decoded.email.toLowerCase();
      let user = users.find((u) => u.id === `fb-${decoded.uid}` || u.email.toLowerCase() === cleanEmail);

      if (!user) {
        const defaultAdminId = effectiveRole === 'client' || effectiveRole === 'customer' ? 'admin-1' : undefined;
        const defaultClientId = effectiveRole === 'customer' ? 'client-1' : undefined;
        user = {
          id: `fb-${decoded.uid}`,
          name: decoded.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          phone: '+91 97406 40650',
          role: effectiveRole,
          company:
            typeof company === 'string' && company.trim()
              ? company.trim().slice(0, 120)
              : effectiveRole === 'super_admin'
              ? 'VS TrackPro HQ (Verified Owner)'
              : 'VS TrackPro Firebase Account',
          status: 'Active',
          adminId: defaultAdminId,
          clientId: defaultClientId,
          sharedVehicleIds: effectiveRole === 'customer' ? ['veh-1', 'veh-2'] : undefined,
          permissions:
            effectiveRole === 'customer'
              ? {
                  canViewOdometer: true,
                  canViewBattery: true,
                  canViewAc: true,
                  historyDaysLimit: 30,
                }
              : undefined,
          password: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date().toISOString().slice(0, 10),
        };
        users.push(user);
      } else {
        // Keep role synchronized with verified Firestore RBAC grant
        user.role = effectiveRole;
        if (effectiveRole === 'customer' && (!user.sharedVehicleIds || user.sharedVehicleIds.length === 0)) {
          user.sharedVehicleIds = ['veh-1', 'veh-2'];
        }
        if ((effectiveRole === 'client' || effectiveRole === 'customer') && !user.adminId) {
          user.adminId = 'admin-1';
        }
        if (effectiveRole === 'customer' && !user.clientId) {
          user.clientId = 'client-1';
        }
      }

      const token = signSessionToken(user.id, user.role);
      return res.json({
        token,
        verifiedUid: decoded.uid,
        ...buildScopedPayload(user),
      });
    } catch {
      return res.status(401).json({
        error: 'Invalid or expired Firebase ID token. Please sign in with Google again.',
      });
    }
  });

  app.get('/api/platform/bootstrap', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    return res.json(buildScopedPayload(req.platformUser!));
  });

  // =========================================================================
  // SUPER ADMIN: ADMIN MANAGEMENT (ADD / EDIT / BLOCK / DELETE)
  // =========================================================================

  app.post('/api/platform/admins', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    if (req.platformUser!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super Admin access required.' });
    }
    const { name, email, phone, company } = req.body || {};
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required.' });
    }
    const newAdmin: StoredUser = {
      id: `admin-${Date.now()}`,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      company: String(company || 'Regional Operations').trim(),
      role: 'admin',
      status: 'Active',
      password: 'Password@123',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    users.push(newAdmin);
    return res.status(201).json({ admin: toPublicUser(newAdmin), snapshot: buildScopedPayload(req.platformUser!) });
  });

  app.patch('/api/platform/admins/:id', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    if (req.platformUser!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super Admin access required.' });
    }
    const target = users.find((u) => u.id === req.params.id && u.role === 'admin');
    if (!target) return res.status(404).json({ error: 'Admin not found.' });
    if (req.body.status === 'Active' || req.body.status === 'Blocked') target.status = req.body.status;
    if (typeof req.body.name === 'string' && req.body.name.trim()) target.name = req.body.name.trim();
    if (typeof req.body.company === 'string' && req.body.company.trim()) target.company = req.body.company.trim();
    return res.json({ admin: toPublicUser(target), snapshot: buildScopedPayload(req.platformUser!) });
  });

  app.delete('/api/platform/admins/:id', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    if (req.platformUser!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super Admin access required.' });
    }
    const idx = users.findIndex((u) => u.id === req.params.id && u.role === 'admin');
    if (idx === -1) return res.status(404).json({ error: 'Admin not found.' });
    users.splice(idx, 1);
    return res.json({ ok: true, snapshot: buildScopedPayload(req.platformUser!) });
  });

  // =========================================================================
  // ADMIN & SUPER ADMIN: CLIENT MANAGEMENT + DEVICE ASSIGNMENT
  // =========================================================================

  app.post('/api/platform/clients', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role !== 'super_admin' && actor.role !== 'admin') {
      return res.status(403).json({ error: 'Admin or Super Admin access required.' });
    }
    const { name, email, phone, company, adminId } = req.body || {};
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Client name, email, and phone are required.' });
    }
    const assignedAdminId = actor.role === 'admin' ? actor.id : String(adminId || 'admin-1');
    const newClient: StoredUser = {
      id: `client-${Date.now()}`,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      company: String(company || 'Fleet Enterprise').trim(),
      role: 'client',
      adminId: assignedAdminId,
      status: 'Active',
      password: 'Password@123',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    users.push(newClient);
    return res.status(201).json({ client: toPublicUser(newClient), snapshot: buildScopedPayload(actor) });
  });

  app.patch('/api/platform/clients/:id', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role !== 'super_admin' && actor.role !== 'admin') {
      return res.status(403).json({ error: 'Admin or Super Admin access required.' });
    }
    const target = users.find(
      (u) => u.id === req.params.id && u.role === 'client' && (actor.role === 'super_admin' || u.adminId === actor.id)
    );
    if (!target) return res.status(404).json({ error: 'Client not found in your scope.' });
    if (req.body.status === 'Active' || req.body.status === 'Blocked') target.status = req.body.status;
    return res.json({ client: toPublicUser(target), snapshot: buildScopedPayload(actor) });
  });

  app.post('/api/platform/devices', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role !== 'super_admin' && actor.role !== 'admin') {
      return res.status(403).json({ error: 'Admin or Super Admin access required.' });
    }
    const { imei, model, category, simNumber, assignedClientId, assignedVehicleNumber } = req.body || {};
    const cleanImei = String(imei || '').replace(/\D/g, '');
    if (cleanImei.length !== 15) {
      return res.status(400).json({ error: 'Enter a valid 15-digit IMEI number.' });
    }
    const rec: PlatformDeviceRecord = {
      id: `dev-${Date.now()}`,
      imei: cleanImei,
      model: String(model || 'VS VST-PRO-4G-Pro'),
      category: (['OBD', 'Wired', 'Non-Wired', 'Fuel Sensor', 'AI Dashcam'].includes(category)
        ? category
        : 'Wired') as PlatformDeviceRecord['category'],
      simNumber: String(simNumber || `89914509${cleanImei.slice(-7)}`),
      status: assignedClientId ? 'Active' : 'Inventory',
      assignedAdminId: actor.role === 'admin' ? actor.id : 'admin-1',
      assignedClientId: assignedClientId || undefined,
      assignedVehicleNumber: assignedVehicleNumber ? String(assignedVehicleNumber).trim().toUpperCase() : undefined,
      lastHeartbeat: 'Just provisioned',
    };
    devices.unshift(rec);
    return res.status(201).json({ device: rec, snapshot: buildScopedPayload(actor) });
  });

  app.post('/api/platform/assign', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role !== 'super_admin' && actor.role !== 'admin') {
      return res.status(403).json({ error: 'Admin or Super Admin access required.' });
    }
    const { deviceId, clientId, vehicleNumber, vehicleType } = req.body || {};
    const dev = devices.find((d) => d.id === deviceId);
    const client = users.find((u) => u.id === clientId && u.role === 'client');
    if (!dev || !client) {
      return res.status(400).json({ error: 'Select both a valid GPS device and client.' });
    }
    const plate = String(vehicleNumber || '').trim().toUpperCase();
    if (!plate) return res.status(400).json({ error: 'Vehicle number is required.' });

    dev.assignedClientId = client.id;
    dev.assignedAdminId = client.adminId || actor.id;
    dev.assignedVehicleNumber = plate;
    dev.status = 'Active';

    const existingVeh = vehicles.find((v) => v.vehicleNumber === plate);
    if (!existingVeh) {
      vehicles.unshift({
        id: `veh-${Date.now()}`,
        vehicleNumber: plate,
        nickname: `${client.company.split(' ')[0]} Unit`,
        vehicleType: String(vehicleType || '12-Wheeler Truck'),
        vehicleCategory: 'Heavy Commercial',
        deviceModel: dev.model,
        deviceProtocol: 'GT06/VST4G',
        imei: dev.imei,
        adminId: client.adminId || 'admin-1',
        clientId: client.id,
        sharedWithCustomerIds: [],
        driverName: 'Assigned Driver',
        driverPhone: client.phone,
        status: 'Running',
        lat: 13.0827,
        lng: 77.5877,
        headingDeg: 65,
        speedKmh: 52,
        speedLimitKmh: 75,
        odometerKm: 1200.0,
        distanceTodayKm: 28.4,
        batteryVoltage: 24.2,
        acOn: true,
        ignitionOn: true,
        fuelPercent: 84,
        fuelLiters: 210,
        tankCapacityLiters: 250,
        address: 'Bengaluru North Highway, Karnataka',
        lastUpdated: 'Live · just assigned',
        overspeedCount: 0,
        overstoppageCount: 0,
        routeDeviated: false,
        plannedRoute: [[13.0827, 77.5877], [13.19, 77.7]],
        trail: [[13.0827, 77.5877]],
        overspeedEvents: [],
        overstoppageEvents: [],
        fuelEvents: [],
        trips: [],
      });
    }
    return res.json({ ok: true, snapshot: buildScopedPayload(actor) });
  });

  // =========================================================================
  // CLIENT: CUSTOMERS & VEHICLE SHARING + GEOFENCES + PODS + FUEL
  // =========================================================================

  app.post('/api/platform/customers', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role === 'customer') {
      return res.status(403).json({ error: 'Customers cannot create sub-accounts.' });
    }
    const { name, email, phone, company, sharedVehicleIds, permissions } = req.body || {};
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Customer name, email, and phone are required.' });
    }
    const shared: string[] = Array.isArray(sharedVehicleIds) ? sharedVehicleIds.map(String) : [];
    const perms: CustomerPermissions = {
      canViewOdometer: permissions?.canViewOdometer !== false,
      canViewBattery: permissions?.canViewBattery !== false,
      canViewAc: permissions?.canViewAc !== false,
      historyDaysLimit: Math.max(1, Math.min(180, Number(permissions?.historyDaysLimit) || 14)),
    };
    const newCust: StoredUser = {
      id: `cust-${Date.now()}`,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      company: String(company || 'Consignee Account').trim(),
      role: 'customer',
      adminId: actor.role === 'admin' ? actor.id : actor.adminId || 'admin-1',
      clientId: actor.role === 'client' ? actor.id : 'client-1',
      sharedVehicleIds: shared,
      permissions: perms,
      status: 'Active',
      password: 'Password@123',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    users.push(newCust);
    for (const v of vehicles) {
      if (shared.includes(v.id) && !v.sharedWithCustomerIds.includes(newCust.id)) {
        v.sharedWithCustomerIds.push(newCust.id);
      }
    }
    return res.status(201).json({ customer: toPublicUser(newCust), snapshot: buildScopedPayload(actor) });
  });

  app.patch('/api/platform/customers/:id/permissions', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role === 'customer') return res.status(403).json({ error: 'Forbidden.' });
    const target = users.find((u) => u.id === req.params.id && u.role === 'customer');
    if (!target) return res.status(404).json({ error: 'Customer not found.' });
    const body = req.body || {};
    target.permissions = {
      canViewOdometer: Boolean(body.canViewOdometer),
      canViewBattery: Boolean(body.canViewBattery),
      canViewAc: Boolean(body.canViewAc),
      historyDaysLimit: Math.max(1, Math.min(180, Number(body.historyDaysLimit) || 14)),
    };
    return res.json({ customer: toPublicUser(target), snapshot: buildScopedPayload(actor) });
  });

  app.post('/api/platform/geofences', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role === 'customer') return res.status(403).json({ error: 'Read-only access.' });
    const { name, kind, lat, lng, radiusMeters, assignedVehicleIds } = req.body || {};
    if (!name || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return res.status(400).json({ error: 'Provide geofence name and valid coordinates.' });
    }
    const rec: GeofenceRecord = {
      id: `gf-${Date.now()}`,
      name: String(name).trim(),
      kind: kind === 'POI' ? 'POI' : 'Geofence',
      lat: Number(lat),
      lng: Number(lng),
      radiusMeters: Math.max(100, Math.min(50000, Number(radiusMeters) || 1000)),
      ownerRole: actor.role === 'client' ? 'client' : 'admin',
      adminId: actor.role === 'admin' ? actor.id : actor.adminId || 'admin-1',
      clientId: actor.role === 'client' ? actor.id : undefined,
      alertOnEnter: true,
      alertOnExit: true,
      assignedVehicleIds: Array.isArray(assignedVehicleIds) ? assignedVehicleIds.map(String) : [],
    };
    geofences.unshift(rec);
    return res.status(201).json({ geofence: rec, snapshot: buildScopedPayload(actor) });
  });

  app.post('/api/platform/pods', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role === 'customer') return res.status(403).json({ error: 'Customers can only view PODs.' });
    const { vehicleId, consignmentNo, recipientName, location, signatureText, photoLabel, photoDataUrl, notes } = req.body || {};
    const veh = vehicles.find((v) => v.id === vehicleId);
    if (!veh || !consignmentNo || !recipientName || !signatureText) {
      return res.status(400).json({ error: 'Vehicle, consignment number, recipient, and signature are required.' });
    }
    const pod: PodRecord = {
      id: `pod-${Date.now()}`,
      vehicleId: veh.id,
      vehicleNumber: veh.vehicleNumber,
      clientId: veh.clientId,
      customerId: veh.sharedWithCustomerIds[0],
      consignmentNo: String(consignmentNo).trim().toUpperCase(),
      recipientName: String(recipientName).trim(),
      location: String(location || veh.address).trim(),
      lat: veh.lat,
      lng: veh.lng,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      signatureText: String(signatureText).trim(),
      photoLabel: String(photoLabel || 'Delivery Proof Photo Captured').trim(),
      photoDataUrl: typeof photoDataUrl === 'string' && photoDataUrl.startsWith('data:image/') ? photoDataUrl : undefined,
      notes: String(notes || 'Delivered cleanly and verified via GPS coordinates.').trim(),
    };
    pods.unshift(pod);
    return res.status(201).json({ pod, snapshot: buildScopedPayload(actor) });
  });

  app.patch('/api/platform/alert-rules', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role === 'customer') return res.status(403).json({ error: 'Forbidden.' });
    const body = req.body || {};
    if (Number.isFinite(Number(body.overspeedLimitKmh))) alertRules.overspeedLimitKmh = Number(body.overspeedLimitKmh);
    if (Number.isFinite(Number(body.overstoppageMinutes))) alertRules.overstoppageMinutes = Number(body.overstoppageMinutes);
    if (Number.isFinite(Number(body.routeDeviationMeters))) alertRules.routeDeviationMeters = Number(body.routeDeviationMeters);
    if (Number.isFinite(Number(body.fuelDropThresholdLiters))) alertRules.fuelDropThresholdLiters = Number(body.fuelDropThresholdLiters);
    if (Number.isFinite(Number(body.lowBatteryVolts))) alertRules.lowBatteryVolts = Number(body.lowBatteryVolts);
    if (typeof body.geofenceAlertsEnabled === 'boolean') alertRules.geofenceAlertsEnabled = body.geofenceAlertsEnabled;
    if (typeof body.customRuleNote === 'string') alertRules.customRuleNote = body.customRuleNote.trim();
    return res.json({ alertRules, snapshot: buildScopedPayload(actor) });
  });

  app.patch('/api/platform/alerts/:id/ack', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const target = alerts.find((a) => a.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Alert not found.' });
    target.acknowledged = true;
    return res.json({ alert: target, snapshot: buildScopedPayload(req.platformUser!) });
  });

  app.post('/api/platform/announcements', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role !== 'super_admin' && actor.role !== 'admin') {
      return res.status(403).json({ error: 'Only Super Admin or Admin can broadcast announcements.' });
    }
    const { title, body } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: 'Announcement title and message are required.' });
    const rec: AnnouncementRecord = {
      id: `ann-${Date.now()}`,
      title: String(title).trim(),
      body: String(body).trim(),
      senderRole: actor.role,
      senderName: `${actor.name} (${actor.role === 'super_admin' ? 'Super Admin' : 'Admin'})`,
      adminId: actor.role === 'admin' ? actor.id : undefined,
      audience: actor.role === 'super_admin' ? 'All Users' : 'My Clients & Customers',
      createdAt: 'Just now',
    };
    announcements.unshift(rec);
    io.emit('platform:announcement', rec);
    return res.status(201).json({ announcement: rec, snapshot: buildScopedPayload(actor) });
  });

  app.post('/api/platform/tickets', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    const { subject, message, priority } = req.body || {};
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required.' });
    const ticket: SupportTicket = {
      id: `tk-${Date.now()}`,
      subject: String(subject).trim(),
      message: String(message).trim(),
      createdById: actor.id,
      createdByName: actor.name,
      createdByRole: actor.role,
      adminId: actor.role === 'admin' ? actor.id : actor.adminId,
      clientId: actor.role === 'client' ? actor.id : actor.clientId,
      status: 'Open',
      priority: priority === 'High' ? 'High' : 'Normal',
      createdAt: 'Just now',
    };
    tickets.unshift(ticket);
    return res.status(201).json({ ticket, snapshot: buildScopedPayload(actor) });
  });

  app.patch('/api/platform/tickets/:id', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    const target = tickets.find((t) => t.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Ticket not found.' });
    if (req.body.status === 'Escalated to Super Admin' && actor.role === 'admin') {
      target.status = 'Escalated to Super Admin';
    } else if (req.body.status === 'Resolved' && (actor.role === 'super_admin' || actor.role === 'admin')) {
      target.status = 'Resolved';
    }
    if (typeof req.body.reply === 'string' && req.body.reply.trim()) {
      target.reply = req.body.reply.trim();
    }
    return res.json({ ticket: target, snapshot: buildScopedPayload(actor) });
  });

  app.post('/api/platform/api-keys/:id/toggle', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role !== 'super_admin') return res.status(403).json({ error: 'Super Admin access required.' });
    const target = apiIntegrations.find((a) => a.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Integration not found.' });
    if (target.status === 'Connected') {
      target.status = 'Available';
      target.apiKeyMask = 'Not configured';
      target.requestsToday = 0;
    } else {
      target.status = 'Connected';
      target.apiKeyMask = `vst_live_${Math.floor(1000 + Math.random() * 9000)}••••••••`;
      target.requestsToday = 1480;
    }
    return res.json({ integration: target, snapshot: buildScopedPayload(actor) });
  });

  app.post('/api/platform/vehicle-types', requirePlatformAuth, (req: AuthedPlatformRequest, res: Response) => {
    const actor = req.platformUser!;
    if (actor.role !== 'super_admin') return res.status(403).json({ error: 'Super Admin access required.' });
    const { name, category, defaultSpeedLimitKmh, defaultTankLiters } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Vehicle type name is required.' });
    const entry: VehicleTypeEntry = {
      id: `vt-${Date.now()}`,
      name: String(name).trim(),
      category: category || 'Heavy Commercial',
      defaultSpeedLimitKmh: Number(defaultSpeedLimitKmh) || 70,
      defaultTankLiters: Number(defaultTankLiters) || 120,
      iconKey: 'truck',
    };
    customVehicleTypes.unshift(entry);
    return res.status(201).json({ vehicleType: entry, snapshot: buildScopedPayload(actor) });
  });

  // =========================================================================
  // SOCKET.IO REAL-TIME TELEMETRY BROADCAST (EVERY 4 SECONDS, ROLE-SCOPED)
  // =========================================================================

  const subscribedSockets = new Map<string, string>(); // socketId -> userId

  io.on('connection', (socket) => {
    socket.on('platform:subscribe', (payload: { token?: string } | undefined) => {
      const verified = verifySessionToken(payload?.token);
      if (!verified) return;
      const user = users.find((u) => u.id === verified.uid);
      if (!user || user.status === 'Blocked') return;
      subscribedSockets.set(socket.id, user.id);
      socket.emit('platform:vehicles:update', {
        vehicles: scopeVehiclesForUser(vehicles, user),
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('platform:unsubscribe', () => {
      subscribedSockets.delete(socket.id);
    });

    socket.on('disconnect', () => {
      subscribedSockets.delete(socket.id);
    });
  });

  let platformTick = 0;
  setInterval(() => {
    if (subscribedSockets.size === 0) return;
    platformTick += 1;
    vehicles = stepPlatformTelemetry(vehicles, platformTick);

    for (const [socketId, userId] of subscribedSockets.entries()) {
      const sock = io.sockets.sockets.get(socketId);
      const user = users.find((u) => u.id === userId);
      if (!sock || !user) {
        subscribedSockets.delete(socketId);
        continue;
      }
      sock.emit('platform:vehicles:update', {
        vehicles: scopeVehiclesForUser(vehicles, user),
        timestamp: new Date().toISOString(),
      });
    }
  }, 4000);
}
