import type {
  AlertRuleConfig,
  AnnouncementRecord,
  ApiIntegrationRecord,
  DeviceCatalogModel,
  GeofenceRecord,
  NearbyAmenity,
  PlatformAlert,
  PlatformDevice,
  PlatformDeviceRecord,
  PlatformRole,
  PlatformUser,
  PlatformVehicle,
  PodRecord,
  SupportTicket,
  VehicleTypeEntry,
} from '../../utils/unifiedPlatformLogic';

export interface PlatformBootstrapData {
  user: PlatformUser;
  vehicles: PlatformVehicle[];
  admins: PlatformUser[];
  clients: PlatformUser[];
  customers: PlatformUser[];
  devices: PlatformDeviceRecord[];
  deviceCatalogCount: number;
  deviceCatalog: DeviceCatalogModel[];
  vehicleTypesCount: number;
  vehicleTypes: VehicleTypeEntry[];
  alerts: PlatformAlert[];
  alertRules: AlertRuleConfig;
  geofences: GeofenceRecord[];
  pods: PodRecord[];
  announcements: AnnouncementRecord[];
  tickets: SupportTicket[];
  apiIntegrations: ApiIntegrationRecord[];
  apiIntegrationsCount: number;
  nearbyAmenities: NearbyAmenity[];
  uptimeStats: {
    uptimePercent: number;
    region: string;
    activeSockets: number;
    telemetryIntervalSec: number;
    supportSla: string;
  };
  timestamp: string;
}

export interface PlatformActions {
  refresh: () => Promise<void>;
  apiPost: (path: string, body: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  apiPatch: (path: string, body: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  apiDelete: (path: string) => Promise<{ ok: boolean; error?: string }>;
  notify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
  logout: () => void;
  switchPlatform: (platform: PlatformDevice) => void;
  switchRoleQuick: (role: PlatformRole) => Promise<void>;
  openScreenMatrix: () => void;
}

export const DEMO_ACCOUNTS: Record<
  PlatformRole,
  { email: string; password: string; otp: string; label: string; subtitle: string }
> = {
  super_admin: {
    email: 'superadmin@vstrackpro.in',
    password: 'Password@123',
    otp: '482910',
    label: 'Super Admin',
    subtitle: 'System owner · All tenants, 250+ devices, 150+ types & 100+ APIs',
  },
  admin: {
    email: 'admin@vstrackpro.in',
    password: 'Password@123',
    otp: '482910',
    label: 'Admin',
    subtitle: 'Regional manager · Own clients, assignments & escalations',
  },
  client: {
    email: 'client@vstrackpro.in',
    password: 'Password@123',
    otp: '482910',
    label: 'Client',
    subtitle: 'Fleet owner · Live tracking, fuel, PODs, routes & customer sharing',
  },
  customer: {
    email: 'customer@vstrackpro.in',
    password: 'Password@123',
    otp: '482910',
    label: 'Customer',
    subtitle: 'Read-only · Track shared delivery vehicles & view PODs',
  },
};
