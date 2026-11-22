import {
  ROLE_NAV_MATRIX,
  summarizeFleetMetrics,
  type PlatformAlert,
  type PlatformDeviceRecord,
  type PlatformRole,
  type PlatformUser,
  type PlatformVehicle,
  type PodRecord,
  type SupportTicket,
} from './unifiedPlatformLogic';

export type NavIconKey =
  | 'dashboard'
  | 'map'
  | 'admins'
  | 'accounts'
  | 'vehicles'
  | 'devices'
  | 'types'
  | 'alerts'
  | 'reports'
  | 'apis'
  | 'announcements'
  | 'support'
  | 'settings'
  | 'clients'
  | 'assign'
  | 'geofences'
  | 'profile'
  | 'details'
  | 'history'
  | 'routes'
  | 'fuel'
  | 'violations'
  | 'pods'
  | 'amenities'
  | 'customers'
  | 'home'
  | 'track'
  | 'info'
  | 'trips'
  | 'notifications';

export interface RoleNavGroup {
  id: string;
  label: string;
  screenIds: string[];
}

export interface RoleQuickAction {
  id: string;
  label: string;
  targetScreenId: string;
  iconKey: NavIconKey;
}

export interface RoleDashboardMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: 'neutral' | 'positive' | 'warning' | 'critical';
  iconKey: NavIconKey;
  targetScreenId: string;
}

export interface RoleVisualSpec {
  role: PlatformRole;
  title: string;
  dashboardHeading: string;
  dashboardSubtitle: string;
  workspaceTitle: string;
  accentTextClass: string;
  accentBgActiveClass: string;
  accentBorderClass: string;
  navGroups: RoleNavGroup[];
  quickActions: RoleQuickAction[];
}

export const SCREEN_ICON_MAP: Record<string, NavIconKey> = {
  dashboard: 'dashboard',
  'live-map': 'map',
  admins: 'admins',
  accounts: 'accounts',
  vehicles: 'vehicles',
  devices: 'devices',
  'vehicle-types': 'types',
  'alerts-settings': 'alerts',
  reports: 'reports',
  'api-integrations': 'apis',
  announcements: 'announcements',
  support: 'support',
  settings: 'settings',
  clients: 'clients',
  assignment: 'assign',
  alerts: 'alerts',
  geofences: 'geofences',
  profile: 'profile',
  'vehicle-details': 'details',
  history: 'history',
  'route-deviation': 'routes',
  fuel: 'fuel',
  violations: 'violations',
  pods: 'pods',
  amenities: 'amenities',
  customers: 'customers',
  home: 'home',
  'live-tracking': 'track',
  'vehicle-info': 'info',
  'trip-history': 'trips',
  notifications: 'notifications',
};

export const ROLE_DASHBOARD_CONFIG: Record<PlatformRole, RoleVisualSpec> = {
  super_admin: {
    role: 'super_admin',
    title: 'Super Admin',
    dashboardHeading: 'Global Platform Command',
    dashboardSubtitle:
      'Multi-tenant operations across all regional admins, clients, GPS hardware & API connectors.',
    workspaceTitle: 'Regional Admin Hierarchy & Tenant Health',
    accentTextClass: 'text-cyan-700 dark:text-[#00D4FF]',
    accentBgActiveClass:
      'bg-[#00D4FF] text-[#0A1128] font-semibold',
    accentBorderClass: 'border-cyan-500/40 dark:border-[#00D4FF]/35',
    navGroups: [
      {
        id: 'sa-command',
        label: 'Command Center',
        screenIds: ['dashboard', 'live-map'],
      },
      {
        id: 'sa-tenants',
        label: 'Tenants & Fleet',
        screenIds: ['admins', 'accounts', 'vehicles'],
      },
      {
        id: 'sa-infra',
        label: 'Hardware & Platform',
        screenIds: ['devices', 'vehicle-types', 'api-integrations'],
      },
      {
        id: 'sa-governance',
        label: 'Governance & Support',
        screenIds: ['alerts-settings', 'reports', 'announcements', 'support', 'settings'],
      },
    ],
    quickActions: [
      { id: 'qa-admins', label: 'Manage Admins', targetScreenId: 'admins', iconKey: 'admins' },
      { id: 'qa-devices', label: 'Device Registry', targetScreenId: 'devices', iconKey: 'devices' },
      { id: 'qa-apis', label: 'API Connectors', targetScreenId: 'api-integrations', iconKey: 'apis' },
      { id: 'qa-broadcast', label: 'Send Broadcast', targetScreenId: 'announcements', iconKey: 'announcements' },
    ],
  },
  admin: {
    role: 'admin',
    title: 'Admin',
    dashboardHeading: 'Regional Operations Desk',
    dashboardSubtitle:
      'Scoped strictly to your assigned fleet clients, GPS hardware allocations, and escalations.',
    workspaceTitle: 'Assigned Client Fleets & Operational Status',
    accentTextClass: 'text-violet-700 dark:text-violet-300',
    accentBgActiveClass:
      'bg-violet-600 text-white font-semibold',
    accentBorderClass: 'border-violet-500/40 dark:border-violet-400/35',
    navGroups: [
      {
        id: 'ad-ops',
        label: 'Regional Overview',
        screenIds: ['dashboard', 'live-map', 'alerts'],
      },
      {
        id: 'ad-clients',
        label: 'Client Onboarding',
        screenIds: ['clients', 'assignment', 'geofences'],
      },
      {
        id: 'ad-reports',
        label: 'Reports & Support',
        screenIds: ['reports', 'announcements', 'support', 'profile'],
      },
    ],
    quickActions: [
      { id: 'qa-clients', label: 'Manage Clients', targetScreenId: 'clients', iconKey: 'clients' },
      { id: 'qa-assign', label: 'Assign GPS Device', targetScreenId: 'assignment', iconKey: 'assign' },
      { id: 'qa-geofences', label: 'Geofence Templates', targetScreenId: 'geofences', iconKey: 'geofences' },
      { id: 'qa-support', label: 'Escalation Desk', targetScreenId: 'support', iconKey: 'support' },
    ],
  },
  client: {
    role: 'client',
    title: 'Client',
    dashboardHeading: 'Fleet Dispatch & Telemetry',
    dashboardSubtitle:
      'Real-time fuel analytics, driver compliance, route corridors, POD verification & customer sharing.',
    workspaceTitle: 'Live Fuel Levels & Daily Distance by Vehicle',
    accentTextClass: 'text-emerald-700 dark:text-emerald-300',
    accentBgActiveClass:
      'bg-emerald-600 text-white font-semibold',
    accentBorderClass: 'border-emerald-500/40 dark:border-emerald-400/35',
    navGroups: [
      {
        id: 'cl-live',
        label: 'Live Fleet',
        screenIds: ['dashboard', 'live-map', 'vehicle-details', 'history'],
      },
      {
        id: 'cl-safety',
        label: 'Fuel & Compliance',
        screenIds: ['fuel', 'violations', 'route-deviation', 'geofences', 'alerts'],
      },
      {
        id: 'cl-ops',
        label: 'Deliveries & Sharing',
        screenIds: ['pods', 'customers', 'amenities', 'reports'],
      },
      {
        id: 'cl-account',
        label: 'Account',
        screenIds: ['support', 'profile'],
      },
    ],
    quickActions: [
      { id: 'qa-fuel', label: 'Fuel Analytics', targetScreenId: 'fuel', iconKey: 'fuel' },
      { id: 'qa-pods', label: 'Record POD', targetScreenId: 'pods', iconKey: 'pods' },
      { id: 'qa-playback', label: '6-Mo Playback', targetScreenId: 'history', iconKey: 'history' },
      { id: 'qa-share', label: 'Share Vehicle', targetScreenId: 'customers', iconKey: 'customers' },
    ],
  },
  customer: {
    role: 'customer',
    title: 'Customer',
    dashboardHeading: 'My Shared Vehicle & Delivery Tracker',
    dashboardSubtitle:
      'Read-only live tracking, verified delivery proof, and telemetry scoped to fleet-owner permissions.',
    workspaceTitle: 'Shared Vehicle Telemetry & Access Permissions',
    accentTextClass: 'text-sky-700 dark:text-sky-300',
    accentBgActiveClass:
      'bg-sky-600 text-white font-semibold',
    accentBorderClass: 'border-sky-500/40 dark:border-sky-400/35',
    navGroups: [
      {
        id: 'cu-track',
        label: 'Live Shipment',
        screenIds: ['home', 'live-tracking', 'vehicle-info', 'trip-history'],
      },
      {
        id: 'cu-records',
        label: 'Proof & Assistance',
        screenIds: ['pods', 'notifications', 'amenities', 'support', 'profile'],
      },
    ],
    quickActions: [
      { id: 'qa-live', label: 'Pin-Point Track', targetScreenId: 'live-tracking', iconKey: 'track' },
      { id: 'qa-info', label: 'Vehicle Specs', targetScreenId: 'vehicle-info', iconKey: 'info' },
      { id: 'qa-pod', label: 'Delivery Proof', targetScreenId: 'pods', iconKey: 'pods' },
      { id: 'qa-nearby', label: 'Nearby Amenities', targetScreenId: 'amenities', iconKey: 'amenities' },
    ],
  },
};

export interface DashboardMetricsInput {
  user: PlatformUser;
  admins: PlatformUser[];
  clients: PlatformUser[];
  customers: PlatformUser[];
  vehicles: PlatformVehicle[];
  devices: PlatformDeviceRecord[];
  alerts: PlatformAlert[];
  pods: PodRecord[];
  tickets: SupportTicket[];
  geofencesCount: number;
  deviceCatalogCount: number;
  apiIntegrationsCount: number;
  uptimePercent: number;
}

/**
 * Pure deterministic calculator producing role-specific KPI cards from live platform data.
 */
export function computeRoleDashboardMetrics(
  role: PlatformRole,
  input: DashboardMetricsInput
): RoleDashboardMetric[] {
  const fleet = summarizeFleetMetrics(input.vehicles);
  const unreadAlerts = input.alerts.filter((a) => !a.acknowledged).length;
  const openTickets = input.tickets.filter((t) => t.status !== 'Resolved').length;

  if (role === 'super_admin') {
    const activeAdmins = input.admins.filter((a) => a.status === 'Active').length;
    const onlineDevices = input.devices.filter((d) => d.status === 'Active').length;
    return [
      {
        id: 'sa-admins',
        label: 'Regional Admins',
        value: `${activeAdmins} / ${input.admins.length}`,
        detail: `${input.admins.length - activeAdmins} blocked · Multi-tenant`,
        tone: 'neutral',
        iconKey: 'admins',
        targetScreenId: 'admins',
      },
      {
        id: 'sa-accounts',
        label: 'Clients & Customers',
        value: `${input.clients.length} · ${input.customers.length}`,
        detail: `${input.clients.length} fleet owners · ${input.customers.length} customers`,
        tone: 'neutral',
        iconKey: 'accounts',
        targetScreenId: 'accounts',
      },
      {
        id: 'sa-vehicles',
        label: 'Global Fleet Active',
        value: `${fleet.running} / ${fleet.total}`,
        detail: `${fleet.stationary + fleet.idle} stopped · ${fleet.offline} offline`,
        tone: fleet.running > 0 ? 'positive' : 'neutral',
        iconKey: 'vehicles',
        targetScreenId: 'vehicles',
      },
      {
        id: 'sa-devices',
        label: 'GPS Hardware Fleet',
        value: `${onlineDevices} live`,
        detail: `${input.deviceCatalogCount}+ supported models`,
        tone: 'positive',
        iconKey: 'devices',
        targetScreenId: 'devices',
      },
      {
        id: 'sa-alerts',
        label: 'Platform Alerts',
        value: String(unreadAlerts),
        detail: `${fleet.overspeedCount} overspeed · ${openTickets} open tickets`,
        tone: unreadAlerts > 0 ? 'critical' : 'positive',
        iconKey: 'alerts',
        targetScreenId: 'alerts-settings',
      },
      {
        id: 'sa-sla',
        label: 'System SLA & APIs',
        value: `${input.uptimePercent}%`,
        detail: `${input.apiIntegrationsCount}+ ERP/AIS-140 connectors`,
        tone: 'positive',
        iconKey: 'apis',
        targetScreenId: 'api-integrations',
      },
    ];
  }

  if (role === 'admin') {
    const activeClients = input.clients.filter((c) => c.status === 'Active').length;
    const unassignedDevices = input.devices.filter((d) => d.status === 'Inventory').length;
    return [
      {
        id: 'ad-clients',
        label: 'Assigned Clients',
        value: String(input.clients.length),
        detail: `${activeClients} active · ${input.customers.length} shared customers`,
        tone: 'neutral',
        iconKey: 'clients',
        targetScreenId: 'clients',
      },
      {
        id: 'ad-vehicles',
        label: 'Managed Vehicles',
        value: `${fleet.running} / ${fleet.total}`,
        detail: `${fleet.running} running · ${fleet.stationary + fleet.idle} idle/stopped`,
        tone: fleet.running > 0 ? 'positive' : 'neutral',
        iconKey: 'vehicles',
        targetScreenId: 'live-map',
      },
      {
        id: 'ad-inventory',
        label: 'Device Stock Ready',
        value: String(unassignedDevices),
        detail: `${input.devices.length} total units in region`,
        tone: unassignedDevices > 0 ? 'positive' : 'warning',
        iconKey: 'assign',
        targetScreenId: 'assignment',
      },
      {
        id: 'ad-alerts',
        label: 'Client Alerts & Tickets',
        value: `${unreadAlerts} · ${openTickets}`,
        detail: `${fleet.overspeedCount} overspeed · ${fleet.overstoppageCount} stops`,
        tone: unreadAlerts > 0 ? 'warning' : 'positive',
        iconKey: 'alerts',
        targetScreenId: 'alerts',
      },
    ];
  }

  if (role === 'client') {
    const lowFuelCount = input.vehicles.filter((v) => v.fuelPercent <= 25).length;
    return [
      {
        id: 'cl-running',
        label: 'Fleet Moving Now',
        value: `${fleet.running} / ${fleet.total}`,
        detail: `${fleet.stationary + fleet.idle} parked · ${fleet.offline} offline`,
        tone: fleet.running > 0 ? 'positive' : 'neutral',
        iconKey: 'map',
        targetScreenId: 'live-map',
      },
      {
        id: 'cl-distance-fuel',
        label: 'Distance Today',
        value: `${fleet.distanceTodayKm} km`,
        detail: `Avg fuel ${fleet.avgFuelPercent}% · ${lowFuelCount} low-fuel`,
        tone: lowFuelCount > 0 ? 'warning' : 'positive',
        iconKey: 'fuel',
        targetScreenId: 'fuel',
      },
      {
        id: 'cl-violations',
        label: 'Safety Violations',
        value: `${fleet.overspeedCount} / ${fleet.overstoppageCount}`,
        detail: `Overspeed / overstoppage · ${unreadAlerts} unread`,
        tone: fleet.overspeedCount > 0 ? 'critical' : 'positive',
        iconKey: 'violations',
        targetScreenId: 'violations',
      },
      {
        id: 'cl-pods',
        label: 'Verified PODs & Zones',
        value: `${input.pods.length} · ${input.geofencesCount}`,
        detail: `${input.customers.length} customers with shared access`,
        tone: 'neutral',
        iconKey: 'pods',
        targetScreenId: 'pods',
      },
    ];
  }

  // Customer (Read-Only Scoped Tracker)
  const primaryVehicle = input.vehicles[0];
  const perms = input.user.permissions;
  const permittedCount =
    (perms?.canViewOdometer ? 1 : 0) +
    (perms?.canViewBattery ? 1 : 0) +
    (perms?.canViewAc ? 1 : 0);

  return [
    {
      id: 'cu-shared',
      label: 'Shared Vehicles',
      value: String(input.vehicles.length),
      detail: primaryVehicle
        ? `${primaryVehicle.vehicleNumber} · ${primaryVehicle.vehicleType}`
        : 'No vehicles shared yet',
      tone: 'neutral',
      iconKey: 'home',
      targetScreenId: 'live-tracking',
    },
    {
      id: 'cu-status',
      label: 'Live Speed & State',
      value: primaryVehicle ? `${primaryVehicle.speedKmh} km/h` : '—',
      detail: primaryVehicle
        ? `${primaryVehicle.status} · Updated ${primaryVehicle.lastUpdated}`
        : 'Awaiting telemetry',
      tone: primaryVehicle?.status === 'Running' ? 'positive' : 'neutral',
      iconKey: 'track',
      targetScreenId: 'live-tracking',
    },
    {
      id: 'cu-pods',
      label: 'Delivery Proofs (POD)',
      value: String(input.pods.length),
      detail:
        input.pods[0]
          ? `Latest: ${input.pods[0].consignmentNo}`
          : 'No deliveries signed yet',
      tone: input.pods.length > 0 ? 'positive' : 'neutral',
      iconKey: 'pods',
      targetScreenId: 'pods',
    },
    {
      id: 'cu-scope',
      label: 'Read-Only Access Scope',
      value: `${perms?.historyDaysLimit ?? 7}d history`,
      detail: `${permittedCount}/3 sensors permitted · ${unreadAlerts} alerts`,
      tone: 'neutral',
      iconKey: 'info',
      targetScreenId: 'vehicle-info',
    },
  ];
}

export interface AdminTenantSummaryRow {
  adminId: string;
  adminName: string;
  company: string;
  status: 'Active' | 'Blocked';
  clientCount: number;
  vehicleCount: number;
  runningCount: number;
  unreadAlertsCount: number;
}

export function computeSuperAdminTenantRows(
  input: Pick<DashboardMetricsInput, 'admins' | 'clients' | 'vehicles' | 'alerts'>
): AdminTenantSummaryRow[] {
  return input.admins.map((admin) => {
    const adminClients = input.clients.filter((c) => c.adminId === admin.id);
    const adminVehicles = input.vehicles.filter((v) => v.adminId === admin.id);
    const adminUnread = input.alerts.filter(
      (a) => a.adminId === admin.id && !a.acknowledged
    ).length;

    return {
      adminId: admin.id,
      adminName: admin.name,
      company: admin.company,
      status: admin.status,
      clientCount: adminClients.length,
      vehicleCount: adminVehicles.length,
      runningCount: adminVehicles.filter((v) => v.status === 'Running').length,
      unreadAlertsCount: adminUnread,
    };
  });
}

export interface ClientHealthRow {
  clientId: string;
  clientName: string;
  company: string;
  status: 'Active' | 'Blocked';
  vehicleCount: number;
  runningCount: number;
  violationsCount: number;
  avgFuelPercent: number;
}

export function computeAdminClientHealthRows(
  input: Pick<DashboardMetricsInput, 'clients' | 'vehicles'>
): ClientHealthRow[] {
  return input.clients.map((client) => {
    const fleet = input.vehicles.filter((v) => v.clientId === client.id);
    const avgFuel =
      fleet.length > 0
        ? Math.round(fleet.reduce((acc, v) => acc + v.fuelPercent, 0) / fleet.length)
        : 0;
    const violations = fleet.reduce(
      (acc, v) => acc + v.overspeedCount + v.overstoppageCount,
      0
    );

    return {
      clientId: client.id,
      clientName: client.name,
      company: client.company,
      status: client.status,
      vehicleCount: fleet.length,
      runningCount: fleet.filter((v) => v.status === 'Running').length,
      violationsCount: violations,
      avgFuelPercent: avgFuel,
    };
  });
}

/**
 * Resolves categorized navigation groups with full PlatformScreenSpec entries for any role.
 */
export function getGroupedNavigationForRole(role: PlatformRole) {
  const roleSpec = ROLE_NAV_MATRIX[role];
  const screenById = new Map(roleSpec.screens.map((s) => [s.id, s]));
  const config = ROLE_DASHBOARD_CONFIG[role];

  return config.navGroups.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.screenIds
      .map((id) => screenById.get(id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s)),
  }));
}

export interface NavBadgeSpec {
  count: number;
  tone: 'neutral' | 'alert' | 'positive';
}

/**
 * Computes strictly role-scoped live navigation badge counts so each authenticated role's
 * menu reflects relevant counts without leaking unauthorized cross-role totals.
 */
export function computeRoleNavBadges(
  role: PlatformRole,
  input: DashboardMetricsInput
): Record<string, NavBadgeSpec> {
  const fleet = summarizeFleetMetrics(input.vehicles);
  const unreadAlerts = input.alerts.filter((a) => !a.acknowledged).length;
  const openTickets = input.tickets.filter((t) => t.status !== 'Resolved').length;
  const badges: Record<string, NavBadgeSpec> = {};

  if (role === 'super_admin') {
    badges.admins = { count: input.admins.length, tone: 'neutral' };
    badges.accounts = {
      count: input.clients.length + input.customers.length,
      tone: 'neutral',
    };
    badges.vehicles = { count: input.vehicles.length, tone: 'neutral' };
    badges.devices = { count: input.devices.length, tone: 'neutral' };
    if (unreadAlerts > 0) {
      badges['alerts-settings'] = { count: unreadAlerts, tone: 'alert' };
    }
    if (openTickets > 0) {
      badges.support = { count: openTickets, tone: 'alert' };
    }
    return badges;
  }

  if (role === 'admin') {
    const unassignedDevices = input.devices.filter((d) => d.status === 'Inventory').length;
    badges.clients = { count: input.clients.length, tone: 'neutral' };
    badges['live-map'] = { count: input.vehicles.length, tone: 'neutral' };
    if (unassignedDevices > 0) {
      badges.assignment = { count: unassignedDevices, tone: 'positive' };
    }
    if (unreadAlerts > 0) {
      badges.alerts = { count: unreadAlerts, tone: 'alert' };
    }
    if (openTickets > 0) {
      badges.support = { count: openTickets, tone: 'alert' };
    }
    return badges;
  }

  if (role === 'client') {
    const totalViolations = fleet.overspeedCount + fleet.overstoppageCount;
    if (fleet.running > 0) {
      badges['live-map'] = { count: fleet.running, tone: 'positive' };
    }
    badges['vehicle-details'] = { count: input.vehicles.length, tone: 'neutral' };
    if (totalViolations > 0) {
      badges.violations = { count: totalViolations, tone: 'alert' };
    }
    if (unreadAlerts > 0) {
      badges.alerts = { count: unreadAlerts, tone: 'alert' };
    }
    badges.pods = { count: input.pods.length, tone: 'neutral' };
    badges.customers = { count: input.customers.length, tone: 'neutral' };
    return badges;
  }

  // customer (strictly scoped to shared vehicles, verified PODs, and shipment notifications)
  badges['live-tracking'] = { count: input.vehicles.length, tone: 'positive' };
  badges.pods = { count: input.pods.length, tone: 'neutral' };
  if (unreadAlerts > 0) {
    badges.notifications = { count: unreadAlerts, tone: 'alert' };
  }
  return badges;
}

export interface RoleBreadcrumb {
  roleLabel: string;
  groupLabel: string;
  screenLabel: string;
  accessScopeLabel: string;
  isAuthorizedScreen: boolean;
}

export function getAccessScopeLabelForRole(role: PlatformRole): string {
  if (role === 'super_admin') return 'Global All-Tenant';
  if (role === 'admin') return 'Regional Clients';
  if (role === 'client') return 'Own Fleet Ops';
  return 'Shared Read-Only';
}

export function getActiveScreenBreadcrumb(
  role: PlatformRole,
  activeScreenId: string
): RoleBreadcrumb {
  const roleSpec = ROLE_NAV_MATRIX[role];
  const groups = getGroupedNavigationForRole(role);
  const accessScopeLabel = getAccessScopeLabelForRole(role);

  for (const group of groups) {
    const match = group.items.find((item) => item.id === activeScreenId);
    if (match) {
      return {
        roleLabel: roleSpec.roleLabel,
        groupLabel: group.label,
        screenLabel: match.label,
        accessScopeLabel,
        isAuthorizedScreen: true,
      };
    }
  }

  return {
    roleLabel: roleSpec.roleLabel,
    groupLabel: 'Access Control',
    screenLabel: 'Restricted Route',
    accessScopeLabel,
    isAuthorizedScreen: false,
  };
}

export type RosterStatusFilter = 'All' | PlatformVehicle['status'];

export const ROSTER_STATUS_FILTERS: readonly RosterStatusFilter[] = [
  'All',
  'Running',
  'Idle',
  'Stationary',
  'Offline',
];

export function computeRosterStatusCounts(
  vehicles: PlatformVehicle[]
): Record<RosterStatusFilter, number> {
  const counts: Record<RosterStatusFilter, number> = {
    All: vehicles.length,
    Running: 0,
    Idle: 0,
    Stationary: 0,
    Offline: 0,
  };
  for (const v of vehicles) {
    counts[v.status] += 1;
  }
  return counts;
}

export function filterFleetRosterByStatus(
  vehicles: PlatformVehicle[],
  filter: RosterStatusFilter
): PlatformVehicle[] {
  if (filter === 'All') return vehicles;
  return vehicles.filter((v) => v.status === filter);
}

export interface RoleChartPoint {
  name: string;
  primaryValue: number;
  secondaryValue: number;
  detailLabel: string;
}

export interface RoleChartSpec {
  title: string;
  subtitle: string;
  primarySeriesLabel: string;
  secondarySeriesLabel: string;
  primaryColor: string;
  secondaryColor: string;
  ctaLabel: string;
  ctaScreenId: string;
  points: RoleChartPoint[];
}

export function computeRoleChartSpec(
  role: PlatformRole,
  input: DashboardMetricsInput,
  scopedVehicles: PlatformVehicle[] = input.vehicles
): RoleChartSpec | null {
  if (role === 'super_admin') {
    const rows = computeSuperAdminTenantRows(input);
    return {
      title: 'Regional Tenant Fleet Utilization',
      subtitle: 'Total vehicles vs actively moving vehicles across regional admins',
      primarySeriesLabel: 'Total Vehicles',
      secondarySeriesLabel: 'Running Now',
      primaryColor: '#0284C7',
      secondaryColor: '#10B981',
      ctaLabel: 'Open Admin Console',
      ctaScreenId: 'admins',
      points: rows.slice(0, 6).map((r) => ({
        name: r.company.split(' ')[0] || r.adminName.split(' ')[0],
        primaryValue: r.vehicleCount,
        secondaryValue: r.runningCount,
        detailLabel: `${r.company} (${r.adminName})`,
      })),
    };
  }

  if (role === 'admin') {
    const rows = computeAdminClientHealthRows(input);
    return {
      title: 'Assigned Client Fleet Fuel & Activity',
      subtitle: 'Average fleet fuel (%) and active vehicles per assigned client',
      primarySeriesLabel: 'Avg Fuel (%)',
      secondarySeriesLabel: 'Running Vehicles',
      primaryColor: '#7C3AED',
      secondaryColor: '#10B981',
      ctaLabel: 'Manage Clients',
      ctaScreenId: 'clients',
      points: rows.slice(0, 6).map((r) => ({
        name: r.company.split(' ')[0] || r.clientName.split(' ')[0],
        primaryValue: r.avgFuelPercent,
        secondaryValue: r.runningCount,
        detailLabel: `${r.company} (${r.runningCount}/${r.vehicleCount} running)`,
      })),
    };
  }

  if (role === 'client') {
    return {
      title: ROLE_DASHBOARD_CONFIG.client.workspaceTitle,
      subtitle: 'Real-time fuel tank level (%) vs distance driven today (km) across your fleet',
      primarySeriesLabel: 'Fuel Level (%)',
      secondarySeriesLabel: 'Distance Today (km)',
      primaryColor: '#10B981',
      secondaryColor: '#00D4FF',
      ctaLabel: 'Open Fuel Console',
      ctaScreenId: 'fuel',
      points: scopedVehicles.slice(0, 8).map((v) => ({
        name: v.vehicleNumber.replace(/^([A-Z]{2}-\d{2})-/, ''),
        primaryValue: v.fuelPercent,
        secondaryValue: v.distanceTodayKm,
        detailLabel: v.vehicleNumber,
      })),
    };
  }

  return null;
}

