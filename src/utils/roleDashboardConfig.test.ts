import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_NAV_MATRIX,
  type PlatformRole,
  type PlatformUser,
  type PlatformVehicle,
} from './unifiedPlatformLogic';
import {
  ROLE_DASHBOARD_CONFIG,
  computeAdminClientHealthRows,
  computeRoleChartSpec,
  computeRoleDashboardMetrics,
  computeRoleNavBadges,
  computeRosterStatusCounts,
  computeSuperAdminTenantRows,
  filterFleetRosterByStatus,
  getActiveScreenBreadcrumb,
  getGroupedNavigationForRole,
  type DashboardMetricsInput,
} from './roleDashboardConfig';

const ALL_ROLES: PlatformRole[] = ['super_admin', 'admin', 'client', 'customer'];

function buildFixtureInput(role: PlatformRole): DashboardMetricsInput {
  const admins: PlatformUser[] = [
    {
      id: 'admin-1',
      name: 'Rajesh Sharma',
      email: 'admin@vstrackpro.in',
      phone: '+91 98450 11111',
      role: 'admin',
      company: 'South India Ops',
      status: 'Active',
      createdAt: '2026-01-01',
    },
    {
      id: 'admin-2',
      name: 'Meera Nair',
      email: 'west@vstrackpro.in',
      phone: '+91 98450 22222',
      role: 'admin',
      company: 'West Zone Ops',
      status: 'Blocked',
      createdAt: '2026-01-05',
    },
  ];

  const clients: PlatformUser[] = [
    {
      id: 'client-1',
      name: 'Suresh Fleet',
      email: 'client@vstrackpro.in',
      phone: '+91 98450 33333',
      role: 'client',
      company: 'Deccan Logistics',
      status: 'Active',
      adminId: 'admin-1',
      createdAt: '2026-02-01',
    },
  ];

  const customers: PlatformUser[] = [
    {
      id: 'customer-1',
      name: 'Priya Retail',
      email: 'customer@vstrackpro.in',
      phone: '+91 98450 44444',
      role: 'customer',
      company: 'FreshMart Distribution',
      status: 'Active',
      adminId: 'admin-1',
      clientId: 'client-1',
      sharedVehicleIds: ['veh-1'],
      permissions: {
        canViewOdometer: true,
        canViewBattery: false,
        canViewAc: true,
        historyDaysLimit: 14,
      },
      createdAt: '2026-03-01',
    },
  ];

  const vehicles: PlatformVehicle[] = [
    {
      id: 'veh-1',
      vehicleNumber: 'KA-06-TR-4821',
      nickname: 'NH48 Express',
      vehicleType: '12-Wheeler Truck',
      vehicleCategory: 'Heavy Commercial',
      deviceModel: 'VS VST-PRO-4G-Pro',
      deviceProtocol: 'GT06',
      imei: '864209051284928',
      adminId: 'admin-1',
      clientId: 'client-1',
      sharedWithCustomerIds: ['customer-1'],
      driverName: 'Manjunath Gowda',
      driverPhone: '+91 98452 71340',
      status: 'Running',
      lat: 13.19,
      lng: 77.31,
      headingDeg: 120,
      speedKmh: 62,
      speedLimitKmh: 75,
      odometerKm: 84210,
      distanceTodayKm: 245,
      batteryVoltage: 24.4,
      acOn: true,
      ignitionOn: true,
      fuelPercent: 72,
      fuelLiters: 216,
      tankCapacityLiters: 300,
      address: 'NH-48 Nelamangala Toll, Bengaluru Rural',
      lastUpdated: '12:30 PM',
      overspeedCount: 2,
      overstoppageCount: 1,
      routeDeviated: false,
      plannedRoute: [],
      trail: [],
      overspeedEvents: [],
      overstoppageEvents: [],
      fuelEvents: [],
      trips: [],
    },
    {
      id: 'veh-2',
      vehicleNumber: 'MH-12-SC-9044',
      nickname: 'Pune Shuttle',
      vehicleType: 'Refrigerated Reefer Truck',
      vehicleCategory: 'Cold Chain & Specialized',
      deviceModel: 'VS VST-PRO-4G-Pro',
      deviceProtocol: 'Teltonika',
      imei: '864209051284999',
      adminId: 'admin-1',
      clientId: 'client-1',
      sharedWithCustomerIds: [],
      driverName: 'Vikram Deshmukh',
      driverPhone: '+91 97641 22089',
      status: 'Stationary',
      lat: 18.59,
      lng: 73.73,
      headingDeg: 0,
      speedKmh: 0,
      speedLimitKmh: 70,
      odometerKm: 52100,
      distanceTodayKm: 95,
      batteryVoltage: 12.6,
      acOn: false,
      ignitionOn: false,
      fuelPercent: 20,
      fuelLiters: 36,
      tankCapacityLiters: 180,
      address: 'Hinjawadi Phase 1, Pune',
      lastUpdated: '12:28 PM',
      overspeedCount: 0,
      overstoppageCount: 2,
      routeDeviated: false,
      plannedRoute: [],
      trail: [],
      overspeedEvents: [],
      overstoppageEvents: [],
      fuelEvents: [],
      trips: [],
    },
  ];

  const user =
    role === 'super_admin'
      ? {
          id: 'sa-1',
          name: 'Vikram Shetty',
          email: 'owner@vstrackpro.in',
          phone: '+91 90000 00001',
          role: 'super_admin' as const,
          company: 'VS TrackPro HQ',
          status: 'Active' as const,
          createdAt: '2025-01-01',
        }
      : role === 'admin'
      ? admins[0]
      : role === 'client'
      ? clients[0]
      : customers[0];

  return {
    user,
    admins,
    clients,
    customers,
    vehicles: role === 'customer' ? [vehicles[0]] : vehicles,
    devices: [
      {
        id: 'dev-1',
        imei: '864209051284928',
        model: 'VS VST-PRO-4G-Pro',
        category: 'Wired',
        simNumber: '899100000000000000000001',
        status: 'Active',
        assignedAdminId: 'admin-1',
        assignedClientId: 'client-1',
        assignedVehicleNumber: 'KA-06-TR-4821',
        lastHeartbeat: 'Just now',
      },
      {
        id: 'dev-2',
        imei: '864209051284930',
        model: 'VS OBD-II Plug',
        category: 'OBD',
        simNumber: '899100000000000000000002',
        status: 'Inventory',
        assignedAdminId: 'admin-1',
        lastHeartbeat: 'Stock',
      },
    ],
    alerts: [
      {
        id: 'al-1',
        type: 'Overspeed',
        severity: 'Critical',
        vehicleId: 'veh-1',
        vehicleNumber: 'KA-06-TR-4821',
        adminId: 'admin-1',
        clientId: 'client-1',
        message: 'Exceeded 75 km/h limit',
        location: 'NH-48 Nelamangala',
        lat: 13.19,
        lng: 77.31,
        timestamp: '12:25 PM',
        acknowledged: false,
      },
    ],
    pods: [
      {
        id: 'pod-1',
        vehicleId: 'veh-1',
        vehicleNumber: 'KA-06-TR-4821',
        clientId: 'client-1',
        customerId: 'customer-1',
        consignmentNo: 'LR-9921',
        recipientName: 'Ananya Stores',
        location: 'Peenya Hub',
        lat: 13.04,
        lng: 77.5,
        timestamp: '11:40 AM',
        signatureText: 'Signed by Store Lead',
        photoLabel: 'pod.jpg',
        notes: 'Delivered intact',
      },
    ],
    tickets: [
      {
        id: 'tkt-1',
        subject: 'GPS antenna check',
        message: 'Need calibration',
        createdById: 'client-1',
        createdByName: 'Suresh Fleet',
        createdByRole: 'client',
        adminId: 'admin-1',
        clientId: 'client-1',
        status: 'Open',
        priority: 'Normal',
        createdAt: 'Today',
      },
    ],
    geofencesCount: 4,
    deviceCatalogCount: 255,
    apiIntegrationsCount: 108,
    uptimePercent: 99.9,
  };
}

test('Grouped navigation covers 100% of ROLE_NAV_MATRIX screens with zero duplicates or cross-role leakage', () => {
  for (const role of ALL_ROLES) {
    const expectedIds = ROLE_NAV_MATRIX[role].screens.map((s) => s.id);
    const groups = getGroupedNavigationForRole(role);
    assert.ok(groups.length >= 2, `${role} should have at least 2 nav groups`);

    const groupedIds = groups.flatMap((g) => g.items.map((i) => i.id));
    assert.equal(
      groupedIds.length,
      expectedIds.length,
      `${role} grouped nav count mismatch`
    );
    assert.equal(
      new Set(groupedIds).size,
      expectedIds.length,
      `${role} grouped nav contains duplicate screens`
    );
    for (const id of expectedIds) {
      assert.ok(groupedIds.includes(id), `${role} missing screen ${id} in nav groups`);
    }

    // Quick actions must strictly stay within the role's allowed screens
    const allowedSet = new Set(expectedIds);
    for (const action of ROLE_DASHBOARD_CONFIG[role].quickActions) {
      assert.ok(
        allowedSet.has(action.targetScreenId),
        `${role} quick action ${action.id} points to unauthorized screen ${action.targetScreenId}`
      );
    }
  }
});

test('computeRoleDashboardMetrics renders distinct role-specific KPIs and drill-down targets for all 4 roles', () => {
  const saMetrics = computeRoleDashboardMetrics('super_admin', buildFixtureInput('super_admin'));
  const adMetrics = computeRoleDashboardMetrics('admin', buildFixtureInput('admin'));
  const clMetrics = computeRoleDashboardMetrics('client', buildFixtureInput('client'));
  const cuMetrics = computeRoleDashboardMetrics('customer', buildFixtureInput('customer'));

  // Super Admin has 6 global metrics including Regional Admins & System SLA
  assert.equal(saMetrics.length, 6);
  assert.equal(saMetrics[0].label, 'Regional Admins');
  assert.equal(saMetrics[0].value, '1 / 2');
  assert.equal(saMetrics[5].label, 'System SLA & APIs');
  assert.equal(saMetrics[5].value, '99.9%');

  // Admin has 4 regional metrics including Assigned Clients & Device Stock Ready
  assert.equal(adMetrics.length, 4);
  assert.equal(adMetrics[0].label, 'Assigned Clients');
  assert.equal(adMetrics[2].label, 'Device Stock Ready');
  assert.equal(adMetrics[2].value, '1');

  // Client has 4 fleet metrics including Distance Today & Safety Violations
  assert.equal(clMetrics.length, 4);
  assert.equal(clMetrics[1].label, 'Distance Today');
  assert.equal(clMetrics[1].value, '340 km');
  assert.ok(clMetrics[1].detail.includes('1 low-fuel'));
  assert.equal(clMetrics[2].label, 'Safety Violations');
  assert.equal(clMetrics[2].value, '2 / 3');

  // Customer has 4 read-only metrics reflecting exact fleet-owner permission scope
  assert.equal(cuMetrics.length, 4);
  assert.equal(cuMetrics[0].label, 'Shared Vehicles');
  assert.equal(cuMetrics[0].value, '1');
  assert.equal(cuMetrics[2].label, 'Delivery Proofs (POD)');
  assert.equal(cuMetrics[2].value, '1');
  assert.equal(cuMetrics[3].value, '14d history');
  assert.ok(cuMetrics[3].detail.includes('2/3 sensors permitted'));

  // Verify every metric's drill-down targetScreenId is authorized for that role
  for (const [role, list] of [
    ['super_admin', saMetrics],
    ['admin', adMetrics],
    ['client', clMetrics],
    ['customer', cuMetrics],
  ] as const) {
    const allowed = new Set(ROLE_NAV_MATRIX[role].screens.map((s) => s.id));
    for (const m of list) {
      assert.ok(
        allowed.has(m.targetScreenId),
        `Metric ${m.id} for ${role} points to forbidden screen ${m.targetScreenId}`
      );
    }
  }
});

test('Super Admin tenant rows and Admin client health rows aggregate scoped fleet counts accurately', () => {
  const fixture = buildFixtureInput('super_admin');
  const saRows = computeSuperAdminTenantRows(fixture);
  assert.equal(saRows.length, 2);
  assert.equal(saRows[0].adminName, 'Rajesh Sharma');
  assert.equal(saRows[0].clientCount, 1);
  assert.equal(saRows[0].vehicleCount, 2);
  assert.equal(saRows[0].runningCount, 1);
  assert.equal(saRows[0].unreadAlertsCount, 1);
  assert.equal(saRows[1].status, 'Blocked');
  assert.equal(saRows[1].vehicleCount, 0);

  const adRows = computeAdminClientHealthRows(fixture);
  assert.equal(adRows.length, 1);
  assert.equal(adRows[0].company, 'Deccan Logistics');
  assert.equal(adRows[0].vehicleCount, 2);
  assert.equal(adRows[0].runningCount, 1);
  assert.equal(adRows[0].violationsCount, 5);
  assert.equal(adRows[0].avgFuelPercent, 46);
});

test('computeRoleNavBadges returns strictly role-authorized screen badges with accurate live counts', () => {
  for (const role of ALL_ROLES) {
    const fixture = buildFixtureInput(role);
    const badges = computeRoleNavBadges(role, fixture);
    const allowedIds = new Set(ROLE_NAV_MATRIX[role].screens.map((s) => s.id));

    for (const screenId of Object.keys(badges)) {
      assert.ok(
        allowedIds.has(screenId),
        `Badge screen "${screenId}" is not authorized for role "${role}"`
      );
      assert.ok(badges[screenId].count >= 0);
    }
  }

  const saBadges = computeRoleNavBadges('super_admin', buildFixtureInput('super_admin'));
  assert.equal(saBadges.admins?.count, 2);
  assert.equal(saBadges.accounts?.count, 2);
  assert.equal(saBadges.vehicles?.count, 2);
  assert.equal(saBadges['alerts-settings']?.count, 1);
  assert.equal(saBadges['alerts-settings']?.tone, 'alert');
  assert.equal(saBadges.support?.count, 1);

  const adBadges = computeRoleNavBadges('admin', buildFixtureInput('admin'));
  assert.equal(adBadges.clients?.count, 1);
  assert.equal(adBadges.assignment?.count, 1);
  assert.equal(adBadges.assignment?.tone, 'positive');
  assert.equal(adBadges.alerts?.count, 1);
  assert.equal(adBadges.admins, undefined);

  const clBadges = computeRoleNavBadges('client', buildFixtureInput('client'));
  assert.equal(clBadges['live-map']?.count, 1);
  assert.equal(clBadges.violations?.count, 5);
  assert.equal(clBadges.pods?.count, 1);
  assert.equal(clBadges.customers?.count, 1);

  const cuBadges = computeRoleNavBadges('customer', buildFixtureInput('customer'));
  assert.equal(cuBadges['live-tracking']?.count, 1);
  assert.equal(cuBadges.pods?.count, 1);
  assert.equal(cuBadges.notifications?.count, 1);
  assert.equal(cuBadges.admins, undefined);
  assert.equal(cuBadges.clients, undefined);
});

test('getActiveScreenBreadcrumb resolves role-scoped group & screen labels and flags restricted routes', () => {
  const saCrumb = getActiveScreenBreadcrumb('super_admin', 'admins');
  assert.equal(saCrumb.isAuthorizedScreen, true);
  assert.equal(saCrumb.roleLabel, 'Super Admin');
  assert.equal(saCrumb.groupLabel, 'Tenants & Fleet');
  assert.equal(saCrumb.accessScopeLabel, 'Global All-Tenant');

  const clCrumb = getActiveScreenBreadcrumb('client', 'fuel');
  assert.equal(clCrumb.isAuthorizedScreen, true);
  assert.equal(clCrumb.groupLabel, 'Fuel & Compliance');
  assert.equal(clCrumb.accessScopeLabel, 'Own Fleet Ops');

  const cuBlocked = getActiveScreenBreadcrumb('customer', 'admins');
  assert.equal(cuBlocked.isAuthorizedScreen, false);
  assert.equal(cuBlocked.screenLabel, 'Restricted Route');
  assert.equal(cuBlocked.accessScopeLabel, 'Shared Read-Only');
});

test('computeRosterStatusCounts and filterFleetRosterByStatus filter accurately across statuses', () => {
  const vehicles = buildFixtureInput('client').vehicles;
  const counts = computeRosterStatusCounts(vehicles);
  assert.equal(counts.All, 2);
  assert.equal(counts.Running, 1);
  assert.equal(counts.Stationary, 1);
  assert.equal(counts.Idle, 0);
  assert.equal(counts.Offline, 0);

  assert.equal(filterFleetRosterByStatus(vehicles, 'All').length, 2);
  assert.equal(filterFleetRosterByStatus(vehicles, 'Running').length, 1);
  assert.equal(filterFleetRosterByStatus(vehicles, 'Stationary').length, 1);
  assert.equal(filterFleetRosterByStatus(vehicles, 'Offline').length, 0);
});

test('computeRoleChartSpec builds distinct chart series for Super Admin, Admin, Client and omits chart for Customer', () => {
  const saChart = computeRoleChartSpec('super_admin', buildFixtureInput('super_admin'));
  assert.ok(saChart);
  assert.equal(saChart.ctaScreenId, 'admins');
  assert.equal(saChart.points.length, 2);

  const adChart = computeRoleChartSpec('admin', buildFixtureInput('admin'));
  assert.ok(adChart);
  assert.equal(adChart.ctaScreenId, 'clients');
  assert.equal(adChart.points.length, 1);
  assert.equal(adChart.points[0].primaryValue, 46);

  const clChart = computeRoleChartSpec('client', buildFixtureInput('client'));
  assert.ok(clChart);
  assert.equal(clChart.ctaScreenId, 'fuel');
  assert.equal(clChart.points.length, 2);

  const cuChart = computeRoleChartSpec('customer', buildFixtureInput('customer'));
  assert.equal(cuChart, null);
});

