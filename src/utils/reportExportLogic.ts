import type { TrackedDevice } from '../types';
import {
  buildFuelEfficiencySeries,
  summarizeFuelEfficiency,
  type FuelEfficiencySummary,
  type FuelTimeRange,
  type FuelTrendPoint,
} from './fuelEfficiencyLogic.ts';
import {
  resolveMaintenanceRecord,
  type MaintenanceMap,
} from './serviceMilestoneLogic.ts';

export type ExportReportScope = 'combined' | 'tracking' | 'fuel';
export type ExportFormat = 'csv' | 'pdf';

export interface VehicleTrackingLogEntry {
  logId: string;
  timestamp: string;
  deviceId: string;
  vehicleLabel: string;
  imei: string;
  vehicleType: string;
  corridor: string;
  eventType:
    | 'Live GPS Ping'
    | 'Speed Telemetry'
    | 'Geofence Checkpoint'
    | 'Idle Engine Watch'
    | 'Relay & Ignition Check'
    | 'Odometer Sync';
  status: TrackedDevice['status'];
  speedKmh: number;
  odometerKm: number;
  coordinates: string;
  fuelPercent: number;
}

export interface AdministrativeReportBundle {
  generatedAt: string;
  accountName: string;
  companyName: string;
  scope: ExportReportScope;
  timeRange: FuelTimeRange;
  vehicleScopeLabel: string;
  trackingLogs: VehicleTrackingLogEntry[];
  fuelSeries: FuelTrendPoint[];
  fuelSummary: FuelEfficiencySummary;
}

const CORRIDOR_SEEDS = [
  { corridor: 'NH-48 Hosur Highway · Bengaluru', lat: 12.8421, lng: 77.6612 },
  { corridor: 'Pune-Mumbai Expressway · Lonavala', lat: 18.7557, lng: 73.4091 },
  { corridor: 'Electronic City Cold Chain Hub', lat: 12.8399, lng: 77.677 },
  { corridor: 'NH-44 Logistics Bypass · Hyderabad', lat: 17.2403, lng: 78.4294 },
  { corridor: 'Chakan Industrial Corridor · Pune', lat: 18.7606, lng: 73.8636 },
  { corridor: 'Sriperumbudur Freight Yard · Chennai', lat: 12.9675, lng: 79.9419 },
];

const EVENT_SEQUENCE: VehicleTrackingLogEntry['eventType'][] = [
  'Live GPS Ping',
  'Odometer Sync',
  'Geofence Checkpoint',
  'Speed Telemetry',
  'Relay & Ignition Check',
  'Idle Engine Watch',
];

function formatCoord(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildVehicleTrackingLogs(
  devices: TrackedDevice[],
  maintenanceByImei: MaintenanceMap,
  selectedDeviceId: string = 'all',
  timeRange: FuelTimeRange = '6m'
): VehicleTrackingLogEntry[] {
  if (devices.length === 0) return [];

  const targetDevices =
    selectedDeviceId === 'all'
      ? devices
      : devices.filter((d) => d.id === selectedDeviceId);
  const activeDevices = targetDevices.length > 0 ? targetDevices : devices;

  const entriesPerDevice =
    timeRange === '30d' ? 4 : timeRange === '90d' ? 5 : 6;
  const baseEpochMs = Date.UTC(2026, 10, 17, 16, 45, 0); // 22:15 IST on 2026-11-17

  const rows: Array<VehicleTrackingLogEntry & { _epochMs: number }> = [];

  activeDevices.forEach((device, devIdx) => {
    const maint = resolveMaintenanceRecord(device, maintenanceByImei);
    const seedBase = CORRIDOR_SEEDS[devIdx % CORRIDOR_SEEDS.length];
    const baseSpeed = device.status === 'Idle' ? 0 : Math.max(28, device.speedKmh || 54);
    const baseFuel = 78 - ((devIdx * 13) % 34);

    for (let step = 0; step < entriesPerDevice; step += 1) {
      const minutesAgo = step * 95 + devIdx * 14;
      const entryEpoch = baseEpochMs - minutesAgo * 60_000;
      const istDate = new Date(entryEpoch + 5.5 * 3600_000);
      const timestamp = `${istDate.toISOString().slice(0, 10)} ${istDate
        .toISOString()
        .slice(11, 16)} IST`;

      const eventType =
        step === 0 && device.status === 'Idle'
          ? 'Idle Engine Watch'
          : EVENT_SEQUENCE[(step + devIdx) % EVENT_SEQUENCE.length];

      const rowStatus: TrackedDevice['status'] =
        step === 0
          ? device.status
          : eventType === 'Idle Engine Watch'
          ? 'Idle'
          : 'Moving';

      const speedKmh =
        rowStatus === 'Idle'
          ? 0
          : Math.max(22, Math.round(baseSpeed + Math.sin(step + devIdx) * 9));

      const odoDelta = step * 48;
      const odometerKm = Math.max(0, maint.odometerKm - odoDelta);
      const lat = seedBase.lat + step * 0.032 * (devIdx % 2 === 0 ? 1 : -1);
      const lng = seedBase.lng + step * 0.028 * (devIdx % 2 === 0 ? 1 : -1);
      const fuelPercent = Math.min(98, Math.max(18, baseFuel + step * 2));

      rows.push({
        logId: `${device.id}-log-${step + 1}`,
        timestamp,
        deviceId: device.id,
        vehicleLabel: device.vehicleLabel,
        imei: device.imei,
        vehicleType: device.vehicleType ?? 'Fleet Telemetry Unit',
        corridor: seedBase.corridor,
        eventType,
        status: rowStatus,
        speedKmh,
        odometerKm,
        coordinates: formatCoord(lat, lng),
        fuelPercent,
        _epochMs: entryEpoch,
      });
    }
  });

  rows.sort((a, b) => b._epochMs - a._epochMs);
  return rows.map(({ _epochMs: _unused, ...entry }) => entry);
}

export function buildAdministrativeReportBundle(params: {
  devices: TrackedDevice[];
  maintenanceByImei: MaintenanceMap;
  selectedDeviceId: string;
  timeRange: FuelTimeRange;
  scope: ExportReportScope;
  accountName: string;
  companyName: string;
  generatedAt?: string;
}): AdministrativeReportBundle {
  const {
    devices,
    maintenanceByImei,
    selectedDeviceId,
    timeRange,
    scope,
    accountName,
    companyName,
    generatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
  } = params;

  const matchedDevice =
    selectedDeviceId === 'all'
      ? null
      : devices.find((d) => d.id === selectedDeviceId) ?? null;

  const vehicleScopeLabel = matchedDevice
    ? matchedDevice.vehicleLabel
    : `All Fleet Units (${devices.length})`;

  const trackingLogs = buildVehicleTrackingLogs(
    devices,
    maintenanceByImei,
    selectedDeviceId,
    timeRange
  );
  const fuelSeries = buildFuelEfficiencySeries(devices, selectedDeviceId, timeRange);
  const fuelSummary = summarizeFuelEfficiency(fuelSeries);

  return {
    generatedAt,
    accountName: accountName.trim() || 'VS Fleet Customer',
    companyName: companyName.trim() || 'Connected Fleet Account',
    scope,
    timeRange,
    vehicleScopeLabel,
    trackingLogs,
    fuelSeries,
    fuelSummary,
  };
}

export function generateTrackingLogsCsv(
  logs: VehicleTrackingLogEntry[],
  vehicleScopeLabel: string,
  timeRange: FuelTimeRange
): string {
  const header = [
    'Timestamp',
    'Vehicle',
    'IMEI',
    'Vehicle Type',
    'Event Type',
    'Status',
    'Speed (km/h)',
    'Odometer (km)',
    'Fuel Level (%)',
    'Corridor / Zone',
    'Coordinates',
    'Scope',
    'Timeframe',
  ];

  const rows = logs.map((row) =>
    [
      row.timestamp,
      row.vehicleLabel,
      row.imei,
      row.vehicleType,
      row.eventType,
      row.status,
      row.speedKmh,
      row.odometerKm,
      row.fuelPercent,
      row.corridor,
      row.coordinates,
      vehicleScopeLabel,
      timeRange.toUpperCase(),
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [header.map(escapeCsvCell).join(','), ...rows].join('\n');
}

export function generateAdministrativeCsv(
  bundle: AdministrativeReportBundle
): string {
  if (bundle.scope === 'tracking') {
    return generateTrackingLogsCsv(
      bundle.trackingLogs,
      bundle.vehicleScopeLabel,
      bundle.timeRange
    );
  }

  if (bundle.scope === 'fuel') {
    const header = [
      'Vehicle Scope',
      'Timeframe',
      'Period',
      'Actual Efficiency (km/L)',
      'Baseline Efficiency (km/L)',
      'Distance (km)',
      'Fuel Used (L)',
      'Fuel Saved (L)',
      'Estimated Savings (INR)',
      'Idle Time (min)',
    ];
    const rows = bundle.fuelSeries.map((p) =>
      [
        bundle.vehicleScopeLabel,
        bundle.timeRange.toUpperCase(),
        p.period,
        p.actualKmPerL.toFixed(2),
        p.baselineKmPerL.toFixed(2),
        p.distanceKm,
        p.fuelUsedLiters.toFixed(1),
        p.fuelSavedLiters.toFixed(1),
        p.savingsInr,
        p.idleMinutes,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
    return [header.map(escapeCsvCell).join(','), ...rows].join('\n');
  }

  // Combined Administrative Audit CSV
  const metaRows = [
    ['VS TECHNOLOGY — ADMINISTRATIVE FLEET AUDIT REPORT', '', '', '', '', '', '', '', '', ''],
    ['Account Holder', bundle.accountName, 'Company', bundle.companyName, 'Generated', bundle.generatedAt],
    ['Vehicle Scope', bundle.vehicleScopeLabel, 'Timeframe', bundle.timeRange.toUpperCase(), 'Total Logs', String(bundle.trackingLogs.length)],
    [
      'Avg Efficiency (km/L)',
      bundle.fuelSummary.avgKmPerL.toFixed(2),
      'Diesel Saved (L)',
      bundle.fuelSummary.totalFuelSavedLiters.toFixed(1),
      'Est. Savings (INR)',
      String(bundle.fuelSummary.estimatedSavingsInr),
    ],
    [],
    ['SECTION 1: FUEL EFFICIENCY & SAVINGS SUMMARY'],
  ].map((r) => r.map(escapeCsvCell).join(','));

  const fuelCsv = generateAdministrativeCsv({ ...bundle, scope: 'fuel' });
  const trackingHeader = '\nSECTION 2: VEHICLE TRACKING & ODOMETER LOGS\n';
  const trackingCsv = generateTrackingLogsCsv(
    bundle.trackingLogs,
    bundle.vehicleScopeLabel,
    bundle.timeRange
  );

  return `${metaRows.join('\n')}\n${fuelCsv}${trackingHeader}${trackingCsv}`;
}

export function buildReportFilename(
  scope: ExportReportScope,
  format: ExportFormat,
  timeRange: FuelTimeRange,
  selectedDeviceId: string,
  devices: TrackedDevice[]
): string {
  const scopeSlug =
    scope === 'combined'
      ? 'fleet-audit'
      : scope === 'tracking'
      ? 'tracking-logs'
      : 'fuel-efficiency';
  const matched =
    selectedDeviceId === 'all'
      ? null
      : devices.find((d) => d.id === selectedDeviceId);
  const unitSlug = matched
    ? matched.vehicleLabel
        .split(' ')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
    : 'all-units';

  return `vs-${scopeSlug}-${unitSlug}-${timeRange}.${format}`;
}
