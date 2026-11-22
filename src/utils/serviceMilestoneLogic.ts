import type {
  ServiceAlertSeverity,
  ServiceMilestoneId,
  TrackedDevice,
  VehicleMaintenanceRecord,
} from '../types';

export const MAX_ODOMETER_KM = 2_000_000;

export interface ServiceMilestoneTemplate {
  id: ServiceMilestoneId;
  name: string;
  shortLabel: string;
  intervalKm: number;
  warningWindowKm: number;
  description: string;
}

export const SERVICE_MILESTONE_TEMPLATES: readonly ServiceMilestoneTemplate[] = [
  {
    id: 'oil_change',
    name: 'Engine Oil & Oil Filter',
    shortLabel: 'Oil Change',
    intervalKm: 10_000,
    warningWindowKm: 1_000,
    description: 'Synthetic engine oil drain, spin-on filter & sump plug inspection.',
  },
  {
    id: 'air_filter',
    name: 'Air & Cabin Filter Replacement',
    shortLabel: 'Air Filter',
    intervalKm: 15_000,
    warningWindowKm: 1_200,
    description: 'Primary intake dust cartridge & cabin HVAC micro-filter swap.',
  },
  {
    id: 'fuel_filter',
    name: 'Fuel Filter & Injector Check',
    shortLabel: 'Fuel Filter',
    intervalKm: 20_000,
    warningWindowKm: 1_500,
    description: 'Water separator drain, diesel/petrol filter & injector flow check.',
  },
  {
    id: 'brake_inspection',
    name: 'Brake Pad & Rotor Inspection',
    shortLabel: 'Brake Check',
    intervalKm: 25_000,
    warningWindowKm: 1_500,
    description: 'Friction lining thickness, rotor runout & ABS wheel sensor check.',
  },
  {
    id: 'transmission_oil',
    name: 'Transmission & Differential Oil',
    shortLabel: 'Transmission',
    intervalKm: 40_000,
    warningWindowKm: 2_000,
    description: 'Gearbox fluid & rear axle hypoid oil replacement.',
  },
] as const;

export interface EvaluatedMilestone {
  milestoneId: ServiceMilestoneId;
  name: string;
  shortLabel: string;
  description: string;
  intervalKm: number;
  warningWindowKm: number;
  lastServicedKm: number;
  nextDueKm: number;
  remainingKm: number;
  kmSinceService: number;
  progressPercent: number;
  severity: ServiceAlertSeverity;
  lastServicedDate?: string;
}

export interface FleetServiceAlert extends EvaluatedMilestone {
  deviceId: string;
  imei: string;
  vehicleLabel: string;
  vehicleType?: string;
  currentOdometerKm: number;
}

export type MaintenanceMap = Record<string, VehicleMaintenanceRecord>;

const SEEDED_VEHICLE_DEFAULTS: Record<
  string,
  {
    odometerKm: number;
    lastServiceOdometers: Record<ServiceMilestoneId, number>;
    lastServicedDates: Partial<Record<ServiceMilestoneId, string>>;
  }
> = {
  '864291053829104': {
    // KA-01-TR-4821 — 650 km away from 50,000 km major milestone (3 approaching alerts)
    odometerKm: 49_350,
    lastServiceOdometers: {
      oil_change: 40_000,
      air_filter: 35_000,
      fuel_filter: 40_000,
      brake_inspection: 25_000,
      transmission_oil: 20_000,
    },
    lastServicedDates: {
      oil_change: '2026-08-19',
      air_filter: '2026-07-04',
      fuel_filter: '2026-08-19',
      brake_inspection: '2026-04-12',
      transmission_oil: '2026-02-28',
    },
  },
  '864291053829889': {
    // MH-12-FL-9032 — Passed 80,000 km milestone (overdue oil, fuel, transmission)
    odometerKm: 81_420,
    lastServiceOdometers: {
      oil_change: 70_000,
      air_filter: 75_000,
      fuel_filter: 60_000,
      brake_inspection: 60_000,
      transmission_oil: 40_000,
    },
    lastServicedDates: {
      oil_change: '2026-07-22',
      air_filter: '2026-09-15',
      fuel_filter: '2026-05-10',
      brake_inspection: '2026-05-10',
      transmission_oil: '2025-12-18',
    },
  },
  '864291053824512': {
    // TRL-8812 — Brake check approaching in 1,200 km
    odometerKm: 23_800,
    lastServiceOdometers: {
      oil_change: 20_000,
      air_filter: 15_000,
      fuel_filter: 20_000,
      brake_inspection: 0,
      transmission_oil: 0,
    },
    lastServicedDates: {
      oil_change: '2026-09-29',
      air_filter: '2026-08-11',
      fuel_filter: '2026-09-29',
    },
  },
};

export function createSeededMaintenanceRecord(
  device: TrackedDevice
): VehicleMaintenanceRecord {
  const seed = SEEDED_VEHICLE_DEFAULTS[device.imei.trim()];
  if (seed) {
    return {
      deviceId: device.id,
      imei: device.imei.trim(),
      odometerKm: seed.odometerKm,
      lastServiceOdometers: { ...seed.lastServiceOdometers },
      lastServicedDates: { ...seed.lastServicedDates },
      updatedAt: 'Telemetry synced',
      cloudSynced: device.cloudSynced,
    };
  }

  return {
    deviceId: device.id,
    imei: device.imei.trim(),
    odometerKm: 1_250,
    lastServiceOdometers: {
      oil_change: 0,
      air_filter: 0,
      fuel_filter: 0,
      brake_inspection: 0,
      transmission_oil: 0,
    },
    lastServicedDates: {},
    updatedAt: 'Baseline initialized',
    cloudSynced: device.cloudSynced,
  };
}

export function resolveMaintenanceRecord(
  device: TrackedDevice,
  recordsByImei: MaintenanceMap
): VehicleMaintenanceRecord {
  const cleanImei = device.imei.trim();
  const existing = recordsByImei[cleanImei];
  if (existing) {
    return {
      ...existing,
      deviceId: device.id,
      imei: cleanImei,
      lastServiceOdometers: {
        ...createSeededMaintenanceRecord(device).lastServiceOdometers,
        ...existing.lastServiceOdometers,
      },
    };
  }
  return createSeededMaintenanceRecord(device);
}

export function validateOdometerInput(
  rawValue: string | number
): { ok: true; odometerKm: number } | { ok: false; error: string } {
  const trimmed = String(rawValue).replace(/,/g, '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter a valid odometer reading in km.' };
  }
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: false, error: 'Odometer reading must contain numbers only.' };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { ok: false, error: 'Enter a valid finite odometer reading.' };
  }
  if (parsed < 0) {
    return { ok: false, error: 'Odometer reading cannot be negative.' };
  }
  if (parsed > MAX_ODOMETER_KM) {
    return {
      ok: false,
      error: `Odometer reading cannot exceed ${MAX_ODOMETER_KM.toLocaleString('en-IN')} km.`,
    };
  }
  return { ok: true, odometerKm: Math.round(parsed) };
}

export function evaluateVehicleMilestones(
  record: VehicleMaintenanceRecord
): EvaluatedMilestone[] {
  return SERVICE_MILESTONE_TEMPLATES.map((tpl) => {
    const rawLast = record.lastServiceOdometers[tpl.id] ?? 0;
    const lastServicedKm = Math.max(0, Math.min(rawLast, MAX_ODOMETER_KM));
    const nextDueKm = lastServicedKm + tpl.intervalKm;
    const remainingKm = nextDueKm - record.odometerKm;
    const kmSinceService = Math.max(0, record.odometerKm - lastServicedKm);
    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round((kmSinceService / tpl.intervalKm) * 100))
    );

    let severity: ServiceAlertSeverity = 'Scheduled';
    if (remainingKm <= 0) {
      severity = 'Overdue';
    } else if (remainingKm <= tpl.warningWindowKm) {
      severity = 'Approaching';
    }

    return {
      milestoneId: tpl.id,
      name: tpl.name,
      shortLabel: tpl.shortLabel,
      description: tpl.description,
      intervalKm: tpl.intervalKm,
      warningWindowKm: tpl.warningWindowKm,
      lastServicedKm,
      nextDueKm,
      remainingKm,
      kmSinceService,
      progressPercent,
      severity,
      lastServicedDate: record.lastServicedDates?.[tpl.id],
    };
  }).sort((a, b) => a.remainingKm - b.remainingKm);
}

export type ServiceAlertFilter = 'action-needed' | 'overdue' | 'approaching' | 'all';

export function getFleetServiceAlerts(
  devices: TrackedDevice[],
  recordsByImei: MaintenanceMap,
  filter: ServiceAlertFilter = 'action-needed',
  deviceFilter: string = 'all'
): FleetServiceAlert[] {
  const allAlerts: FleetServiceAlert[] = [];

  for (const device of devices) {
    if (deviceFilter !== 'all' && device.id !== deviceFilter) continue;
    const record = resolveMaintenanceRecord(device, recordsByImei);
    const milestones = evaluateVehicleMilestones(record);

    for (const ms of milestones) {
      if (filter === 'action-needed' && ms.severity === 'Scheduled') continue;
      if (filter === 'overdue' && ms.severity !== 'Overdue') continue;
      if (filter === 'approaching' && ms.severity !== 'Approaching') continue;

      allAlerts.push({
        ...ms,
        deviceId: device.id,
        imei: device.imei,
        vehicleLabel: device.vehicleLabel,
        vehicleType: device.vehicleType,
        currentOdometerKm: record.odometerKm,
      });
    }
  }

  return allAlerts.sort((a, b) => a.remainingKm - b.remainingKm);
}

export interface FleetServiceSummary {
  totalVehicles: number;
  vehiclesWithAlerts: number;
  overdueCount: number;
  approachingCount: number;
  scheduledCount: number;
  actionNeededCount: number;
  mostUrgentAlert: FleetServiceAlert | null;
}

export function summarizeServiceHealth(
  devices: TrackedDevice[],
  recordsByImei: MaintenanceMap
): FleetServiceSummary {
  let overdueCount = 0;
  let approachingCount = 0;
  let scheduledCount = 0;
  const alertedVehicleIds = new Set<string>();
  let mostUrgentAlert: FleetServiceAlert | null = null;

  for (const device of devices) {
    const record = resolveMaintenanceRecord(device, recordsByImei);
    const milestones = evaluateVehicleMilestones(record);

    for (const ms of milestones) {
      if (ms.severity === 'Overdue') {
        overdueCount += 1;
        alertedVehicleIds.add(device.id);
      } else if (ms.severity === 'Approaching') {
        approachingCount += 1;
        alertedVehicleIds.add(device.id);
      } else {
        scheduledCount += 1;
      }

      if (
        ms.severity !== 'Scheduled' &&
        (!mostUrgentAlert || ms.remainingKm < mostUrgentAlert.remainingKm)
      ) {
        mostUrgentAlert = {
          ...ms,
          deviceId: device.id,
          imei: device.imei,
          vehicleLabel: device.vehicleLabel,
          vehicleType: device.vehicleType,
          currentOdometerKm: record.odometerKm,
        };
      }
    }
  }

  return {
    totalVehicles: devices.length,
    vehiclesWithAlerts: alertedVehicleIds.size,
    overdueCount,
    approachingCount,
    scheduledCount,
    actionNeededCount: overdueCount + approachingCount,
    mostUrgentAlert,
  };
}

export function applyOdometerUpdate(
  existingRecord: VehicleMaintenanceRecord,
  nextOdometerKm: number,
  updatedAt = new Date().toISOString().slice(0, 10)
): VehicleMaintenanceRecord {
  return {
    ...existingRecord,
    odometerKm: Math.max(0, Math.min(MAX_ODOMETER_KM, Math.round(nextOdometerKm))),
    updatedAt,
  };
}

export function applyServiceCompletion(
  existingRecord: VehicleMaintenanceRecord,
  milestoneId: ServiceMilestoneId,
  completedDate = new Date().toISOString().slice(0, 10)
): VehicleMaintenanceRecord {
  return {
    ...existingRecord,
    lastServiceOdometers: {
      ...existingRecord.lastServiceOdometers,
      [milestoneId]: existingRecord.odometerKm,
    },
    lastServicedDates: {
      ...existingRecord.lastServicedDates,
      [milestoneId]: completedDate,
    },
    updatedAt: completedDate,
  };
}
