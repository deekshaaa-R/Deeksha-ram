export type PlatformRole = 'super_admin' | 'admin' | 'client' | 'customer';
export type PlatformDevice = 'laptop' | 'android' | 'iphone';
export type PlatformVehicleStatus = 'Running' | 'Stationary' | 'Idle' | 'Offline';

export interface PlatformScreenSpec {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  primaryTab?: boolean; // Included in max-5 mobile bottom nav
}

export interface PlatformRoleNavSpec {
  role: PlatformRole;
  roleLabel: string;
  scopeSummary: string;
  defaultScreens: Record<PlatformDevice, string>;
  androidLayoutMode: 'map-first' | 'dashboard-first';
  iphoneLayoutMode: 'map-sheet-first' | 'dashboard-first';
  laptopSummary: string;
  screens: PlatformScreenSpec[];
}

export interface CustomerPermissions {
  canViewOdometer: boolean;
  canViewBattery: boolean;
  canViewAc: boolean;
  historyDaysLimit: number;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: PlatformRole;
  company: string;
  status: 'Active' | 'Blocked';
  adminId?: string; // Set for clients & customers
  clientId?: string; // Set for customers
  sharedVehicleIds?: string[]; // Set for customers
  permissions?: CustomerPermissions;
  createdAt: string;
}

export interface OverspeedEvent {
  id: string;
  speedKmh: number;
  limitKmh: number;
  lat: number;
  lng: number;
  location: string;
  timestamp: string;
}

export interface OverstoppageEvent {
  id: string;
  durationMins: number;
  lat: number;
  lng: number;
  location: string;
  timestamp: string;
}

export interface FuelEvent {
  id: string;
  type: 'Refuel' | 'Drop';
  liters: number;
  location: string;
  timestamp: string;
}

export interface TripHistoryEntry {
  id: string;
  date: string;
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  durationMins: number;
  fuelConsumedLiters: number;
  points: Array<[number, number]>;
}

export interface PlatformVehicle {
  id: string;
  vehicleNumber: string;
  nickname: string;
  vehicleType: string;
  vehicleCategory: string;
  deviceModel: string;
  deviceProtocol: string;
  imei: string;
  adminId: string;
  clientId: string;
  sharedWithCustomerIds: string[];
  driverName: string;
  driverPhone: string;
  status: PlatformVehicleStatus;
  lat: number;
  lng: number;
  headingDeg: number;
  speedKmh: number;
  speedLimitKmh: number;
  odometerKm: number | null;
  distanceTodayKm: number;
  batteryVoltage: number | null;
  acOn: boolean | null;
  ignitionOn: boolean;
  fuelPercent: number;
  fuelLiters: number;
  tankCapacityLiters: number;
  address: string;
  lastUpdated: string;
  overspeedCount: number;
  overstoppageCount: number;
  routeDeviated: boolean;
  plannedRoute: Array<[number, number]>;
  trail: Array<[number, number]>;
  overspeedEvents: OverspeedEvent[];
  overstoppageEvents: OverstoppageEvent[];
  fuelEvents: FuelEvent[];
  trips: TripHistoryEntry[];
}

export interface PlatformDeviceRecord {
  id: string;
  imei: string;
  model: string;
  category: 'OBD' | 'Wired' | 'Non-Wired' | 'Fuel Sensor' | 'AI Dashcam';
  simNumber: string;
  status: 'Active' | 'Inventory' | 'Suspended';
  assignedAdminId?: string;
  assignedClientId?: string;
  assignedVehicleNumber?: string;
  lastHeartbeat: string;
}

export interface GeofenceRecord {
  id: string;
  name: string;
  kind: 'Geofence' | 'POI';
  lat: number;
  lng: number;
  radiusMeters: number;
  ownerRole: 'admin' | 'client';
  adminId: string;
  clientId?: string;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  assignedVehicleIds: string[];
}

export interface PodRecord {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  clientId: string;
  customerId?: string;
  consignmentNo: string;
  recipientName: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  signatureText: string;
  photoLabel: string;
  photoDataUrl?: string;
  notes: string;
}

export interface PlatformAlert {
  id: string;
  type: 'Overspeed' | 'Overstoppage' | 'Route Deviation' | 'Fuel Drop' | 'Geofence' | 'Battery Low' | 'Custom';
  severity: 'Critical' | 'Warning' | 'Info';
  vehicleId: string;
  vehicleNumber: string;
  adminId: string;
  clientId: string;
  message: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  acknowledged: boolean;
}

export interface AlertRuleConfig {
  overspeedLimitKmh: number;
  overstoppageMinutes: number;
  routeDeviationMeters: number;
  fuelDropThresholdLiters: number;
  lowBatteryVolts: number;
  geofenceAlertsEnabled: boolean;
  customRuleNote: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  senderRole: 'super_admin' | 'admin';
  senderName: string;
  adminId?: string;
  audience: 'All Users' | 'My Clients & Customers';
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  createdById: string;
  createdByName: string;
  createdByRole: PlatformRole;
  adminId?: string;
  clientId?: string;
  status: 'Open' | 'Escalated to Super Admin' | 'Resolved';
  priority: 'High' | 'Normal';
  createdAt: string;
  reply?: string;
}

export interface ApiIntegrationRecord {
  id: string;
  name: string;
  category: 'ERP' | 'Logistics & TMS' | 'Fuel & FASTag' | 'Government AIS-140' | 'CRM & Alerts' | 'Analytics';
  endpoint: string;
  status: 'Connected' | 'Available';
  apiKeyMask: string;
  requestsToday: number;
}

export interface NearbyAmenity {
  id: string;
  name: string;
  category: 'Fuel Pump' | 'Hospital' | 'Garage';
  distanceKm: number;
  lat: number;
  lng: number;
  open24x7: boolean;
  phone: string;
}

export interface VehicleTypeEntry {
  id: string;
  name: string;
  category:
    | 'Heavy Commercial'
    | 'Passenger & Taxi'
    | 'Two & Three Wheeler'
    | 'Construction & Earthmover'
    | 'Agriculture & Equipment'
    | 'Cold Chain & Specialized';
  defaultSpeedLimitKmh: number;
  defaultTankLiters: number;
  iconKey: string;
}

export interface DeviceCatalogModel {
  id: string;
  brand: string;
  model: string;
  category: 'OBD' | 'Wired' | 'Non-Wired' | 'Fuel Sensor' | 'AI Dashcam';
  protocol: string;
  voltageRange: string;
  ais140Certified: boolean;
}

// ============================================================================
// 12-VERSION NAVIGATION & SCREEN MATRIX (4 ROLES x 3 PLATFORMS)
// ============================================================================

export const ROLE_NAV_MATRIX: Record<PlatformRole, PlatformRoleNavSpec> = {
  super_admin: {
    role: 'super_admin',
    roleLabel: 'Super Admin',
    scopeSummary: 'System Owner · Full visibility across all admins, clients, customers, vehicles, 250+ devices & 100+ APIs',
    defaultScreens: {
      laptop: 'dashboard',
      android: 'dashboard',
      iphone: 'dashboard',
    },
    androidLayoutMode: 'dashboard-first',
    iphoneLayoutMode: 'dashboard-first',
    laptopSummary: 'Full management console with bulk actions, 250+ device registry, 150+ vehicle types & 100+ API integrations',
    screens: [
      { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', description: 'Total admins, clients, customers, vehicles, devices, live status counts & active alerts', primaryTab: true },
      { id: 'live-map', label: 'Live Map (All)', shortLabel: 'Live Map', description: '24x7 live tracking of every vehicle across all tenants', primaryTab: true },
      { id: 'admins', label: 'Admin Management', shortLabel: 'Admins', description: 'Add, edit, block, and delete regional admins', primaryTab: true },
      { id: 'accounts', label: 'All Clients & Customers', shortLabel: 'Accounts', description: 'Inspect and manage every client & customer account under all admins' },
      { id: 'vehicles', label: 'All Vehicles', shortLabel: 'Vehicles', description: 'Every vehicle in the platform with live telemetry & status' },
      { id: 'devices', label: 'Device Management', shortLabel: 'Devices', description: '250+ GPS devices (OBD, wired, non-wired, fuel sensors, AI dashcams)' },
      { id: 'vehicle-types', label: 'Vehicle Types (150+)', shortLabel: 'Types', description: 'Manage 150+ vehicle & heavy equipment categories and icons' },
      { id: 'alerts-settings', label: 'Global Alert Settings', shortLabel: 'Alerts', description: 'Global thresholds for overspeed, overstoppage, route deviation, fuel & geofence', primaryTab: true },
      { id: 'reports', label: 'Reports (All)', shortLabel: 'Reports', description: 'Daily reports, 6-month history & custom multi-tenant report builder' },
      { id: 'api-integrations', label: 'API Integrations (100+)', shortLabel: 'APIs', description: 'Manage 100+ ERP, TMS, FASTag & AIS-140 API connectors and keys' },
      { id: 'announcements', label: 'Announcements', shortLabel: 'Broadcast', description: 'Send platform-wide announcements to admins, clients & customers' },
      { id: 'support', label: '24x7 Support Desk', shortLabel: 'Support', description: 'Handle global tickets & escalations from admins, clients & customers', primaryTab: true },
      { id: 'settings', label: 'System Settings & Uptime', shortLabel: 'Settings', description: '99.9% uptime SLA, PAN India server clusters, encryption & security' },
    ],
  },
  admin: {
    role: 'admin',
    roleLabel: 'Admin',
    scopeSummary: 'Regional Manager · Scoped strictly to own assigned clients, customers & fleet vehicles',
    defaultScreens: {
      laptop: 'dashboard',
      android: 'dashboard',
      iphone: 'dashboard',
    },
    androidLayoutMode: 'dashboard-first',
    iphoneLayoutMode: 'dashboard-first',
    laptopSummary: 'Full client & vehicle console with device assignment, geofence templates & client reporting',
    screens: [
      { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', description: 'My clients, vehicles, running/stationary/offline counts & alerts', primaryTab: true },
      { id: 'clients', label: 'Client Management', shortLabel: 'Clients', description: 'Add, edit, or block clients under my account', primaryTab: true },
      { id: 'assignment', label: 'Vehicle & Device Assignment', shortLabel: 'Assign', description: 'Assign GPS hardware & vehicles to my clients' },
      { id: 'live-map', label: 'Live Map (My Clients)', shortLabel: 'Live Map', description: '24x7 live tracking of all vehicles belonging to my clients', primaryTab: true },
      { id: 'alerts', label: 'Client Alerts', shortLabel: 'Alerts', description: 'Overspeed, overstoppage, route deviation & fuel alerts of my clients', primaryTab: true },
      { id: 'reports', label: 'Client Reports', shortLabel: 'Reports', description: 'Daily report, 6-month history & custom reports filtered by client' },
      { id: 'geofences', label: 'Geofence & POI Templates', shortLabel: 'Geofences', description: 'Create reusable depot geofences and POI templates for clients' },
      { id: 'announcements', label: 'Announcements', shortLabel: 'Broadcast', description: 'Send announcements to my clients and their customers' },
      { id: 'support', label: 'Support & Escalation', shortLabel: 'Support', description: 'Resolve client tickets or escalate directly to Super Admin', primaryTab: true },
      { id: 'profile', label: 'Profile & Settings', shortLabel: 'Profile', description: 'Admin account security, OTP & notification preferences' },
    ],
  },
  client: {
    role: 'client',
    roleLabel: 'Client',
    scopeSummary: 'Fleet Owner · Full telemetry, fuel, PODs, route deviation, 6-month playback & customer vehicle sharing',
    defaultScreens: {
      laptop: 'dashboard',
      android: 'live-map',
      iphone: 'live-map',
    },
    androidLayoutMode: 'map-first',
    iphoneLayoutMode: 'map-sheet-first',
    laptopSummary: 'Full fleet dashboard + split-view map, fuel analytics, POD ledger, 6-month playback & exports',
    screens: [
      { id: 'live-map', label: 'Live Map', shortLabel: 'Map', description: '24x7 live fleet map with instant vehicle-number search', primaryTab: true },
      { id: 'dashboard', label: 'Fleet Dashboard', shortLabel: 'Dashboard', description: 'Running/stationary/offline KPIs, distance today, overspeed & overstoppage counts', primaryTab: true },
      { id: 'vehicle-details', label: 'Vehicle Details', shortLabel: 'Details', description: 'Lat/lng, speed, status, odometer, battery voltage, A/C on/off, fuel & address' },
      { id: 'history', label: 'History & 6-Mo Playback', shortLabel: 'Playback', description: '6 months of route history with interactive map playback scrubber' },
      { id: 'geofences', label: 'Geofences & POI', shortLabel: 'Geofences', description: 'Draw and assign depot geofences and customer POIs' },
      { id: 'route-deviation', label: 'Route Deviation', shortLabel: 'Routes', description: 'Define planned highway corridors and monitor live deviation alerts' },
      { id: 'fuel', label: 'Fuel Monitoring', shortLabel: 'Fuel', description: 'Live tank level, refuel logs and sudden diesel drop alerts', primaryTab: true },
      { id: 'violations', label: 'Overspeed & Overstoppage', shortLabel: 'Violations', description: 'Count and exact map locations for overspeed & overstoppage events' },
      { id: 'alerts', label: 'Alerts & Custom Rules', shortLabel: 'Alerts', description: 'All live alerts plus custom alert rules', primaryTab: true },
      { id: 'pods', label: 'Multiple PODs', shortLabel: 'PODs', description: 'Capture & inspect Proof of Delivery (photo, signature, timestamp, GPS)' },
      { id: 'amenities', label: 'Nearby Amenities & Nav', shortLabel: 'Nearby', description: 'Locate and navigate to nearby fuel pumps, hospitals & garages' },
      { id: 'reports', label: 'Reports & Export', shortLabel: 'Reports', description: 'Daily reports, 6-month history & custom CSV/PDF downloads', primaryTab: true },
      { id: 'customers', label: 'Customers & Sharing', shortLabel: 'Customers', description: 'Add customers, share specific vehicles & set telemetry visibility permissions' },
      { id: 'support', label: 'Announcements & Support', shortLabel: 'Support', description: 'Read broadcast announcements and raise 24x7 support tickets' },
      { id: 'profile', label: 'Profile & Settings', shortLabel: 'Profile', description: 'Fleet profile, OTP/biometric preferences & notification channels' },
    ],
  },
  customer: {
    role: 'customer',
    roleLabel: 'Customer',
    scopeSummary: 'Read-Only Tracker · Views only vehicles explicitly shared by the fleet owner',
    defaultScreens: {
      laptop: 'home',
      android: 'home',
      iphone: 'home',
    },
    androidLayoutMode: 'map-first',
    iphoneLayoutMode: 'map-sheet-first',
    laptopSummary: 'Clean read-only vehicle tracking page with live map, permitted telemetry & delivery proof',
    screens: [
      { id: 'home', label: 'Home (Live Map)', shortLabel: 'Home', description: 'My shared vehicle live on the map', primaryTab: true },
      { id: 'live-tracking', label: 'Live Tracking', shortLabel: 'Track', description: 'Pin-point location, speed, running/stationary status & lat/lng', primaryTab: true },
      { id: 'vehicle-info', label: 'Vehicle Info', shortLabel: 'Vehicle', description: 'Odometer, battery voltage & A/C status (shown only if permitted by client)', primaryTab: true },
      { id: 'trip-history', label: 'Trip History', shortLabel: 'Trips', description: 'Recent trips within the client-configured history window' },
      { id: 'pods', label: 'Delivery Proof (POD)', shortLabel: 'POD', description: 'View signed Proof of Delivery photos, time & drop-off location', primaryTab: true },
      { id: 'notifications', label: 'Notifications', shortLabel: 'Alerts', description: 'Shared vehicle alerts & announcements', primaryTab: true },
      { id: 'amenities', label: 'Nearby Amenities', shortLabel: 'Nearby', description: 'Find nearby fuel pumps, hospitals & garages around the vehicle' },
      { id: 'support', label: 'Support', shortLabel: 'Support', description: '24x7 live support desk & ticket status' },
      { id: 'profile', label: 'Profile', shortLabel: 'Profile', description: 'Account profile & notification settings' },
    ],
  },
};

export function getPrimaryMobileTabs(role: PlatformRole): PlatformScreenSpec[] {
  const spec = ROLE_NAV_MATRIX[role];
  const primary = spec.screens.filter((s) => s.primaryTab);
  return primary.slice(0, 5);
}

// ============================================================================
// 150+ VEHICLE & EQUIPMENT TYPES CATALOG (Ttrack parity)
// ============================================================================

const VEHICLE_TYPE_SEEDS: Array<{
  category: VehicleTypeEntry['category'];
  speed: number;
  tank: number;
  icon: string;
  names: string[];
}> = [
  {
    category: 'Heavy Commercial',
    speed: 75,
    tank: 320,
    icon: 'truck',
    names: [
      '10-Wheeler Truck', '12-Wheeler Truck', '14-Wheeler Truck', '16-Wheeler Trailer', '18-Wheeler Flatbed',
      '22-Wheeler Multi-Axle', 'Tipper Truck', 'Dumper Truck', 'Container Carrier 20ft', 'Container Carrier 40ft',
      'Fuel Tanker', 'Milk Tanker', 'Chemical Tanker', 'LPG Bullet Tanker', 'Water Tanker',
      'Transit Concrete Mixer', 'Car Carrier Trailer', 'Parcel Express Truck', 'Open Body Cargo Truck', 'Closed Container LCV',
      'Mini Truck (Ace/Dost)', 'Pickup 4x4', 'Pickup Cargo', 'Box Van', 'Logistics Fleet Van',
      'Bulk Cement Bulker', 'Coal Hauler', 'Mining Tipper', 'Garbage Compactor', 'Refuse Collector',
    ],
  },
  {
    category: 'Passenger & Taxi',
    speed: 90,
    tank: 60,
    icon: 'car',
    names: [
      'Hatchback Car', 'Sedan Taxi', 'Compact SUV', 'Full-Size SUV', 'MPV Fleet Cab',
      'Electric Sedan', 'Electric SUV', 'Luxury Chauffeur Sedan', 'Airport Shuttle Van', 'Tempo Traveller 12-Seater',
      'Tempo Traveller 17-Seater', 'Tempo Traveller 26-Seater', 'School Bus (Mini)', 'School Bus (Standard)', 'City Transit Bus',
      'Intercity AC Sleeper Coach', 'Intercity Volvo Coach', 'Employee Transport Cab', 'Staff Commute Bus', 'Hospital Ambulance (BLS)',
      'ICU Cardiac Ambulance', 'Police Patrol Vehicle', 'Fire Tender Vehicle', 'VIP Escort SUV', 'Tourist Mini Coach',
      'Corporate Pool Car',
    ],
  },
  {
    category: 'Two & Three Wheeler',
    speed: 65,
    tank: 14,
    icon: 'bike',
    names: [
      'E-Rickshaw Passenger', 'E-Rickshaw Cargo Loader', 'Auto Rickshaw CNG', 'Auto Rickshaw LPG', 'Auto Rickshaw Electric',
      '3-Wheeler Cargo Ape', 'Commuter Motorbike 110cc', 'Commuter Motorbike 150cc', 'Touring Motorbike 350cc', 'Sports Motorbike',
      'Delivery Scooter Petrol', 'Electric Delivery Scooter', 'Electric Commuter Scooter', 'Fleet Mopeds', 'Last-Mile E-Cargo Trike',
      'Food Delivery Bike', 'Courier Express Scooter', 'Electric Cargo Cart', 'Campus Golf Cart', 'Utility Quad ATV',
      'Patrol Motorbike', 'Medical First-Responder Bike', 'Campus Electric Shuttle', 'Battery-Swap E-Bike', 'Heavy Duty Delivery Trike',
    ],
  },
  {
    category: 'Construction & Earthmover',
    speed: 35,
    tank: 240,
    icon: 'construction',
    names: [
      'Hydraulic Excavator 20T', 'Mini Excavator 5T', 'Crawler Excavator 35T', 'Backhoe Loader (JCB)', 'Wheel Loader',
      'Skid Steer Loader', 'Bulldozer D6', 'Bulldozer D8', 'Motor Grader', 'Vibratory Road Roller',
      'Tandem Asphalt Roller', 'Mobile Crane 25T', 'Hydra Pick-and-Carry Crane', 'Tower Crane Unit', 'Crawler Crane 80T',
      'Boom Concrete Pump', 'Asphalt Paver Finisher', 'Cold Milling Machine', 'Rotary Piling Rig', 'Borewell Drilling Rig',
      'Telehandler Boom Lift', 'Scissor Aerial Lift', 'Forklift Diesel 3T', 'Forklift Electric 2T', 'Reach Stacker Port Crane',
      'Stone Crusher Mobile Plant', 'Articulated Dump Truck', 'Batching Plant Generator',
    ],
  },
  {
    category: 'Agriculture & Equipment',
    speed: 35,
    tank: 85,
    icon: 'tractor',
    names: [
      'Utility Tractor 35HP', 'Heavy Tractor 55HP', '4WD Farm Tractor 75HP', 'Combine Harvester', 'Paddy Harvester',
      'Sugarcane Harvester', 'Cotton Picker Machine', 'Boom Sprayer Tractor', 'Rotavator Rig', 'Seed Drill Tractor',
      'Tractor Trolley Tipper', 'Forage Harvester', 'Baler Equipment', 'Orchard Mini Tractor', 'Tea Estate Carrier',
      'Mobile Grain Dryer', 'Irrigation Pump Diesel Unit', 'Agro Cold Delivery Van', 'Dairy Chiller Milk Van', 'Poultry Feed Carrier',
      'Laser Land Leveller Rig', 'Power Tiller Unit',
    ],
  },
  {
    category: 'Cold Chain & Specialized',
    speed: 75,
    tank: 180,
    icon: 'snowflake',
    names: [
      'Refrigerated Reefer Truck', 'Pharma Cold-Chain Van', 'Ice Cream Freezer Van', 'Frozen Seafood Container', 'Cash-in-Transit Armored Van',
      'ATM Replenishment Van', 'Telecom DG Tower Generator', 'Mobile Diesel Bowser', 'Road Sweeper Truck', 'Jetting Sewer Suction Truck',
      'Hydraulic Sky-Lift Van', 'Breakdown Tow Truck', 'Flatbed Recovery Truck', 'Airport Baggage Tractor', 'Airport Fuel Hydrant Truck',
      'Port Terminal Tractor', 'Rail-Road Shunter Vehicle', 'Mobile Medical Clinic Van', 'Blood Bank Refrigerated Van', 'Broadcast OB Satellite Van',
      'Hazardous Material Carrier', 'Explosives Magazine Van', 'Solar Cleaning Bot Carrier', 'Portable Air Compressor Unit', 'Industrial Genset Trailer',
    ],
  },
];

export const VEHICLE_TYPES_CATALOG: VehicleTypeEntry[] = (() => {
  const list: VehicleTypeEntry[] = [];
  let idx = 1;
  for (const group of VEHICLE_TYPE_SEEDS) {
    for (const name of group.names) {
      list.push({
        id: `vt-${String(idx).padStart(3, '0')}`,
        name,
        category: group.category,
        defaultSpeedLimitKmh: group.speed,
        defaultTankLiters: group.tank,
        iconKey: group.icon,
      });
      idx += 1;
    }
  }
  return list;
})();

// ============================================================================
// 250+ GPS DEVICE CATALOG (Ttrack parity: OBD, Wired, Non-Wired, Fuel, Dashcam)
// ============================================================================

const DEVICE_BRANDS: Array<{
  brand: string;
  protocol: string;
  models: Array<{ prefix: string; category: DeviceCatalogModel['category']; voltage: string; ais140?: boolean }>;
}> = [
  { brand: 'VS Technology', protocol: 'GT06/VST4G', models: [
    { prefix: 'VST-PRO-4G', category: 'Wired', voltage: '9-90V', ais140: true },
    { prefix: 'VST-OBD2', category: 'OBD', voltage: '12V OBD', ais140: false },
    { prefix: 'VST-MAG', category: 'Non-Wired', voltage: '10000mAh', ais140: false },
    { prefix: 'VST-FUEL', category: 'Fuel Sensor', voltage: '9-36V', ais140: false },
    { prefix: 'VST-ADAS', category: 'AI Dashcam', voltage: '12-24V', ais140: true },
  ]},
  { brand: 'Teltonika', protocol: 'Codec8E', models: [
    { prefix: 'FMB', category: 'Wired', voltage: '10-30V', ais140: false },
    { prefix: 'FMC', category: 'Wired', voltage: '10-30V', ais140: true },
    { prefix: 'FMM', category: 'Wired', voltage: '10-30V', ais140: false },
    { prefix: 'FMT', category: 'Non-Wired', voltage: '10-30V', ais140: false },
    { prefix: 'FMB0', category: 'OBD', voltage: '12V OBD', ais140: false },
  ]},
  { brand: 'Concox / Jimi', protocol: 'GT06N', models: [
    { prefix: 'VL', category: 'Wired', voltage: '9-90V', ais140: true },
    { prefix: 'GT', category: 'Wired', voltage: '9-90V', ais140: false },
    { prefix: 'AT', category: 'Non-Wired', voltage: '10000mAh', ais140: false },
    { prefix: 'OB', category: 'OBD', voltage: '12V OBD', ais140: false },
    { prefix: 'JC', category: 'AI Dashcam', voltage: '9-30V', ais140: false },
  ]},
  { brand: 'Queclink', protocol: 'GV300', models: [
    { prefix: 'GV', category: 'Wired', voltage: '8-32V', ais140: false },
    { prefix: 'GL', category: 'Non-Wired', voltage: '5800mAh', ais140: false },
    { prefix: 'GB', category: 'Non-Wired', voltage: '8-32V', ais140: false },
    { prefix: 'CV', category: 'AI Dashcam', voltage: '9-36V', ais140: false },
    { prefix: 'OBD', category: 'OBD', voltage: '12V OBD', ais140: false },
  ]},
  { brand: 'Ruptela', protocol: 'Ruptela-TCP', models: [
    { prefix: 'Eco', category: 'Wired', voltage: '10-32V', ais140: false },
    { prefix: 'Pro', category: 'Wired', voltage: '10-32V', ais140: true },
    { prefix: 'Trace', category: 'Wired', voltage: '10-32V', ais140: false },
    { prefix: 'Plug', category: 'OBD', voltage: '12V OBD', ais140: false },
    { prefix: 'Fuel', category: 'Fuel Sensor', voltage: '9-36V', ais140: false },
  ]},
  { brand: 'Wanway / Coban', protocol: 'GPS103', models: [
    { prefix: 'S20', category: 'Non-Wired', voltage: '6000mAh', ais140: false },
    { prefix: 'EV02', category: 'Wired', voltage: '9-90V', ais140: false },
    { prefix: 'GS10G', category: 'Wired', voltage: '9-90V', ais140: false },
    { prefix: 'TK', category: 'Wired', voltage: '12-24V', ais140: false },
    { prefix: 'OBD', category: 'OBD', voltage: '12V OBD', ais140: false },
  ]},
  { brand: 'Technoton / Escort', protocol: 'LLS-RS485', models: [
    { prefix: 'DUT-E', category: 'Fuel Sensor', voltage: '10-45V', ais140: false },
    { prefix: 'TD-150', category: 'Fuel Sensor', voltage: '10-45V', ais140: false },
    { prefix: 'TD-BLE', category: 'Fuel Sensor', voltage: '3.6V BLE', ais140: false },
    { prefix: 'DFM', category: 'Fuel Sensor', voltage: '10-45V', ais140: false },
    { prefix: 'UL-PRO', category: 'Fuel Sensor', voltage: '9-36V', ais140: false },
  ]},
  { brand: 'Meitrack / Suntech', protocol: 'Meitrack-ASCII', models: [
    { prefix: 'MVT', category: 'Wired', voltage: '11-36V', ais140: false },
    { prefix: 'T399', category: 'Wired', voltage: '11-36V', ais140: true },
    { prefix: 'ST43', category: 'Wired', voltage: '8-33V', ais140: false },
    { prefix: 'MD5', category: 'AI Dashcam', voltage: '9-36V', ais140: false },
    { prefix: 'P88', category: 'Non-Wired', voltage: '3000mAh', ais140: false },
  ]},
  { brand: 'Atlanta / iTriangle', protocol: 'AIS140-IN', models: [
    { prefix: 'BHARAT-101', category: 'Wired', voltage: '9-36V', ais140: true },
    { prefix: 'AQUILA', category: 'Wired', voltage: '9-36V', ais140: true },
    { prefix: 'TS101', category: 'Wired', voltage: '9-36V', ais140: true },
    { prefix: 'OBD-IN', category: 'OBD', voltage: '12V OBD', ais140: false },
    { prefix: 'CAM-IN', category: 'AI Dashcam', voltage: '12-24V', ais140: true },
  ]},
  { brand: 'Howen / Streamax', protocol: 'JT808/JT1078', models: [
    { prefix: 'Hero-ME', category: 'AI Dashcam', voltage: '9-36V', ais140: true },
    { prefix: 'C6D-AI', category: 'AI Dashcam', voltage: '9-36V', ais140: false },
    { prefix: 'ADPlus', category: 'AI Dashcam', voltage: '9-36V', ais140: true },
    { prefix: 'M1N', category: 'AI Dashcam', voltage: '9-36V', ais140: false },
    { prefix: 'DMS-Pro', category: 'AI Dashcam', voltage: '9-36V', ais140: false },
  ]},
];

export const GPS_DEVICE_CATALOG: DeviceCatalogModel[] = (() => {
  const variants = ['100', '120', '200', '400', '920', 'Pro'];
  const list: DeviceCatalogModel[] = [];
  let seq = 1;
  for (const b of DEVICE_BRANDS) {
    for (const m of b.models) {
      for (const v of variants) {
        list.push({
          id: `devm-${String(seq).padStart(3, '0')}`,
          brand: b.brand,
          model: `${b.brand.split(' ')[0]} ${m.prefix}-${v}`,
          category: m.category,
          protocol: b.protocol,
          voltageRange: m.voltage,
          ais140Certified: Boolean(m.ais140),
        });
        seq += 1;
      }
    }
  }
  return list; // 10 brands x 5 models x 6 variants = 300 supported GPS devices (> 250+)
})();

// ============================================================================
// 100+ API INTEGRATIONS CATALOG (Ttrack parity)
// ============================================================================

export function buildApiIntegrationsCatalog(): ApiIntegrationRecord[] {
  const templates: Array<{ category: ApiIntegrationRecord['category']; names: string[] }> = [
    {
      category: 'ERP',
      names: [
        'SAP S/4HANA Logistics', 'Oracle NetSuite Fleet', 'TallyPrime Transport', 'Microsoft Dynamics 365', 'Odoo Fleet ERP',
        'Zoho Books Freight', 'Workday Fleet Ops', 'Infor CloudSuite', 'Ramco Logistics ERP', 'Epicor Distribution',
        'Busy Accounting Fleet', 'Marg ERP Transport', 'Sage X3 Logistics', 'IFS Fleet Maintenance', 'Acumatica ERP',
        'SAP Business One', 'Oracle Fusion SCM', 'Focus9 ERP',
      ],
    },
    {
      category: 'Logistics & TMS',
      names: [
        'ULIP National Logistics', 'e-Way Bill NIC Sync', 'Shiprocket Enterprise', 'Delhivery Freight API', 'BlueDart Surface Feed',
        'Freight Tiger Visibility', 'FourKites Real-Time', 'Project44 Visibility', 'FarEye Dispatch', 'Locus Route Engine',
        'Shipsgo Container Track', 'Rivigo Relay Sync', 'BlackBuck Fleet API', 'Porter Enterprise', 'Shadowfax Fleet',
        'Safexpress EDI', 'TCI Freight Sync', 'Gati-KWE Dispatch', 'DHL Supply Chain', 'Maersk Inland TMS',
      ],
    },
    {
      category: 'Fuel & FASTag',
      names: [
        'NHAI FASTag Toll Sync', 'ICICI FASTag Fleet', 'HDFC FASTag Ledger', 'IDFC First FASTag', 'Paytm Fleet Toll API',
        'IOCL XTRAPOWER Fuel', 'BPCL SmartFleet Card', 'HPCL DriveTrack Plus', 'Nayara Fleet Fuel', 'Shell Fleet Solutions',
        'Reliance Jio-bp Fleet', 'Happay Fleet Expense', 'Kodo Expense Sync', 'Zaggle Fleet Cards', 'RazorpayX Fuel Payout',
        'FuelBuddy Doorstep Diesel', 'Repos Mobile Petrol',
      ],
    },
    {
      category: 'Government AIS-140',
      names: [
        'VAHAN Parivahan Sync', 'Karnataka RTO AIS-140', 'Maharashtra VLTDS', 'Delhi DIMTS Feed', 'Tamil Nadu RTO VLT',
        'Gujarat GSRTC VLT', 'Rajasthan Mining e-Ravanna', 'Odisha i3MS Mining', 'Jharkhand JIMMS GPS', 'Chhattisgarh Khanij VLT',
        'Madhya Pradesh e-Khanij', 'Uttar Pradesh Mining VLT', 'Kerala Suraksha Mitr', 'Telangana T-Track VLT', 'Andhra AP-RTA VLT',
        'Haryana Transport VLT', 'Bihar Mining GPS',
      ],
    },
    {
      category: 'CRM & Alerts',
      names: [
        'WhatsApp Business Cloud', 'Twilio Voice & SMS', 'MSG91 India DLT SMS', 'Firebase Cloud Messaging (FCM)', 'Apple Push Notification (APNs)',
        'Salesforce Service Cloud', 'HubSpot Fleet CRM', 'Freshdesk Support Sync', 'Zendesk Ticket Webhook', 'Zoho CRM Leads',
        'Slack Dispatch Alerts', 'Microsoft Teams Bot', 'PagerDuty Critical Ops', 'Telegram Fleet Bot', 'SendGrid Daily Digest',
        'Amazon SES Reports',
      ],
    },
    {
      category: 'Analytics',
      names: [
        'Google BigQuery Stream', 'Power BI Live Dataset', 'Tableau Telemetry Sync', 'Snowflake Fleet Warehouse', 'Looker Studio Feed',
        'AWS S3 6-Month Archive', 'Google Cloud Pub/Sub', 'Apache Kafka Telemetry', 'Datadog Uptime Monitor', 'Prometheus Metrics',
        'Grafana Control Room', 'ElasticSearch Trip Logs', 'Metabase Fleet BI', 'ClickHouse Ping Store', 'Mixpanel App Analytics',
        'Segment Event Router', 'Zapier Custom Webhooks', 'Make.com Fleet Scenarios',
      ],
    },
  ];

  const list: ApiIntegrationRecord[] = [];
  let idx = 1;
  for (const group of templates) {
    for (const name of group.names) {
      const connected = idx <= 18;
      list.push({
        id: `api-${String(idx).padStart(3, '0')}`,
        name,
        category: group.category,
        endpoint: `https://api.vstrackpro.in/v2/integrations/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        status: connected ? 'Connected' : 'Available',
        apiKeyMask: connected ? `vst_live_${String(idx * 7919).slice(0, 4)}••••••••` : 'Not configured',
        requestsToday: connected ? 1200 + ((idx * 347) % 14500) : 0,
      });
      idx += 1;
    }
  }
  return list; // 106 API integrations (> 100+)
}

// ============================================================================
// RBAC SCOPING, CUSTOMER PERMISSION MASKING & TELEMETRY PURE FUNCTIONS
// ============================================================================

export function maskVehicleForCustomer(
  vehicle: PlatformVehicle,
  permissions?: CustomerPermissions
): PlatformVehicle {
  const perms: CustomerPermissions = permissions ?? {
    canViewOdometer: true,
    canViewBattery: true,
    canViewAc: true,
    historyDaysLimit: 7,
  };
  return {
    ...vehicle,
    odometerKm: perms.canViewOdometer ? vehicle.odometerKm : null,
    batteryVoltage: perms.canViewBattery ? vehicle.batteryVoltage : null,
    acOn: perms.canViewAc ? vehicle.acOn : null,
    trips: vehicle.trips.slice(0, Math.max(1, Math.min(vehicle.trips.length, Math.ceil(perms.historyDaysLimit / 2)))),
  };
}

export function scopeVehiclesForUser(
  vehicles: PlatformVehicle[],
  user: PlatformUser
): PlatformVehicle[] {
  switch (user.role) {
    case 'super_admin':
      return vehicles;
    case 'admin':
      return vehicles.filter((v) => v.adminId === user.id);
    case 'client':
      return vehicles.filter((v) => v.clientId === user.id);
    case 'customer': {
      const sharedSet = new Set(user.sharedVehicleIds ?? []);
      return vehicles
        .filter(
          (v) =>
            v.sharedWithCustomerIds.includes(user.id) || sharedSet.has(v.id)
        )
        .map((v) => maskVehicleForCustomer(v, user.permissions));
    }
  }
}

export function filterVehiclesBySearch(
  vehicles: PlatformVehicle[],
  query: string,
  statusFilter: 'All' | PlatformVehicleStatus = 'All'
): PlatformVehicle[] {
  const clean = query.trim().toLowerCase();
  return vehicles.filter((v) => {
    if (statusFilter !== 'All' && v.status !== statusFilter) return false;
    if (!clean) return true;
    return (
      v.vehicleNumber.toLowerCase().includes(clean) ||
      v.nickname.toLowerCase().includes(clean) ||
      v.imei.toLowerCase().includes(clean) ||
      v.driverName.toLowerCase().includes(clean) ||
      v.vehicleType.toLowerCase().includes(clean) ||
      v.address.toLowerCase().includes(clean)
    );
  });
}

export function summarizeFleetMetrics(vehicles: PlatformVehicle[]): {
  total: number;
  running: number;
  stationary: number;
  idle: number;
  offline: number;
  distanceTodayKm: number;
  overspeedCount: number;
  overstoppageCount: number;
  avgFuelPercent: number;
} {
  let running = 0;
  let stationary = 0;
  let idle = 0;
  let offline = 0;
  let distanceTodayKm = 0;
  let overspeedCount = 0;
  let overstoppageCount = 0;
  let fuelSum = 0;

  for (const v of vehicles) {
    if (v.status === 'Running') running += 1;
    else if (v.status === 'Stationary') stationary += 1;
    else if (v.status === 'Idle') idle += 1;
    else offline += 1;

    distanceTodayKm += v.distanceTodayKm;
    overspeedCount += v.overspeedCount;
    overstoppageCount += v.overstoppageCount;
    fuelSum += v.fuelPercent;
  }

  return {
    total: vehicles.length,
    running,
    stationary,
    idle,
    offline,
    distanceTodayKm: Math.round(distanceTodayKm * 10) / 10,
    overspeedCount,
    overstoppageCount,
    avgFuelPercent: vehicles.length > 0 ? Math.round(fuelSum / vehicles.length) : 0,
  };
}

export function stepPlatformTelemetry(
  vehicles: PlatformVehicle[],
  tick: number
): PlatformVehicle[] {
  return vehicles.map((v, index) => {
    if (v.status === 'Offline' || v.status === 'Stationary') {
      return {
        ...v,
        speedKmh: 0,
        lastUpdated: v.status === 'Offline' ? v.lastUpdated : 'Stationary · live',
      };
    }

    if (v.status === 'Idle') {
      const nextVolt =
        typeof v.batteryVoltage === 'number'
          ? Number(Math.max(12.1, Math.min(13.8, v.batteryVoltage + (tick % 2 === 0 ? -0.02 : 0.02))).toFixed(2))
          : v.batteryVoltage;
      return {
        ...v,
        speedKmh: 0,
        batteryVoltage: nextVolt,
        lastUpdated: 'Idle · live',
      };
    }

    // Running vehicle advances along heading
    const headingRad = ((v.headingDeg + Math.sin((tick + index) * 0.45) * 7) * Math.PI) / 180;
    const stepDeg = 0.0011 + (index % 3) * 0.0003;
    const nextLat = Number((v.lat + Math.cos(headingRad) * stepDeg).toFixed(5));
    const nextLng = Number((v.lng + Math.sin(headingRad) * stepDeg).toFixed(5));
    const wave = Math.round(Math.sin((tick + index * 2) * 0.7) * 6);
    const nextSpeed = Math.max(24, Math.min(v.speedLimitKmh + 12, v.speedKmh + wave));
    const deltaKm = Number((nextSpeed / 900).toFixed(2)); // ~4s tick increment
    const nextOdo =
      typeof v.odometerKm === 'number' ? Number((v.odometerKm + deltaKm).toFixed(1)) : v.odometerKm;
    const nextDistanceToday = Number((v.distanceTodayKm + deltaKm).toFixed(1));
    const nextFuelPercent = Math.max(11, Number((v.fuelPercent - 0.04).toFixed(1)));
    const nextFuelLiters = Math.round((nextFuelPercent / 100) * v.tankCapacityLiters);
    const nextHeading = Math.round(((v.headingDeg + (tick % 3 === 0 ? 3 : -2)) + 360) % 360);
    const nextOverspeedCount =
      nextSpeed > v.speedLimitKmh && tick % 6 === 0
        ? v.overspeedCount + 1
        : v.overspeedCount;
    const nextTrail = [...v.trail.slice(-24), [nextLat, nextLng] as [number, number]];

    return {
      ...v,
      lat: nextLat,
      lng: nextLng,
      headingDeg: nextHeading,
      speedKmh: nextSpeed,
      odometerKm: nextOdo,
      distanceTodayKm: nextDistanceToday,
      fuelPercent: Math.round(nextFuelPercent),
      fuelLiters: nextFuelLiters,
      overspeedCount: nextOverspeedCount,
      trail: nextTrail,
      lastUpdated: 'Live · just now',
    };
  });
}

export function generateVehiclesCsvReport(vehicles: PlatformVehicle[]): string {
  const headers = [
    'Vehicle Number',
    'Type',
    'Status',
    'Speed (km/h)',
    'Latitude',
    'Longitude',
    'Odometer (km)',
    'Distance Today (km)',
    'Battery (V)',
    'A/C Status',
    'Fuel (%)',
    'Overspeed Count',
    'Overstoppage Count',
    'Location',
  ];
  const escape = (val: unknown) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = vehicles.map((v) =>
    [
      v.vehicleNumber,
      v.vehicleType,
      v.status,
      v.speedKmh,
      v.lat.toFixed(5),
      v.lng.toFixed(5),
      v.odometerKm ?? 'Restricted',
      v.distanceTodayKm,
      v.batteryVoltage ?? 'Restricted',
      v.acOn === null ? 'Restricted' : v.acOn ? 'ON' : 'OFF',
      v.fuelPercent,
      v.overspeedCount,
      v.overstoppageCount,
      v.address,
    ]
      .map(escape)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function buildNearbyAmenities(lat: number, lng: number): NearbyAmenity[] {
  return [
    {
      id: 'am-1',
      name: 'IndianOil Highway Fuel Plaza',
      category: 'Fuel Pump',
      distanceKm: 1.4,
      lat: Number((lat + 0.008).toFixed(5)),
      lng: Number((lng + 0.006).toFixed(5)),
      open24x7: true,
      phone: '+91 80 2334 1102',
    },
    {
      id: 'am-2',
      name: 'HPCL Fleet Diesel Hub',
      category: 'Fuel Pump',
      distanceKm: 3.1,
      lat: Number((lat - 0.011).toFixed(5)),
      lng: Number((lng + 0.014).toFixed(5)),
      open24x7: true,
      phone: '+91 80 2334 8819',
    },
    {
      id: 'am-3',
      name: 'Apollo Highway Trauma & Emergency Hospital',
      category: 'Hospital',
      distanceKm: 2.3,
      lat: Number((lat + 0.012).toFixed(5)),
      lng: Number((lng - 0.009).toFixed(5)),
      open24x7: true,
      phone: '+91 80 4112 9108',
    },
    {
      id: 'am-4',
      name: 'National Multi-Brand Truck & Fleet Garage',
      category: 'Garage',
      distanceKm: 1.9,
      lat: Number((lat - 0.007).toFixed(5)),
      lng: Number((lng - 0.011).toFixed(5)),
      open24x7: false,
      phone: '+91 97406 40650',
    },
    {
      id: 'am-5',
      name: 'Bosch Commercial Diagnostics & Tyre Bay',
      category: 'Garage',
      distanceKm: 4.2,
      lat: Number((lat + 0.018).toFixed(5)),
      lng: Number((lng + 0.015).toFixed(5)),
      open24x7: true,
      phone: '+91 80 2882 4421',
    },
  ];
}
