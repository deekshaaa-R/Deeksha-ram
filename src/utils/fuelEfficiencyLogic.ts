import type { TrackedDevice } from '../types';

export type FuelTimeRange = '30d' | '90d' | '6m' | '12m';
export type FuelChartMetric = 'efficiency' | 'usage';

export const DIESEL_RATE_INR_PER_LITER = 96;

export interface FuelTrendPoint {
  period: string;
  actualKmPerL: number;
  baselineKmPerL: number;
  fuelUsedLiters: number;
  baselineFuelLiters: number;
  fuelSavedLiters: number;
  savingsInr: number;
  distanceKm: number;
  idleMinutes: number;
}

export interface FuelEfficiencySummary {
  avgKmPerL: number;
  baselineAvgKmPerL: number;
  improvementPct: number;
  totalFuelUsedLiters: number;
  totalFuelSavedLiters: number;
  estimatedSavingsInr: number;
  totalDistanceKm: number;
  latestKmPerL: number;
  peakKmPerL: number;
}

interface VehicleFuelBaseline {
  baselineKmPerL: number;
  gainSpanKmPerL: number;
  monthlyDistanceKm: number;
  baseIdleMinsPerDay: number;
}

const VEHICLE_BASELINES: Record<string, VehicleFuelBaseline> = {
  'dev-1': {
    baselineKmPerL: 5.4,
    gainSpanKmPerL: 1.15,
    monthlyDistanceKm: 4820,
    baseIdleMinsPerDay: 44,
  },
  'dev-2': {
    baselineKmPerL: 3.9,
    gainSpanKmPerL: 0.85,
    monthlyDistanceKm: 6450,
    baseIdleMinsPerDay: 56,
  },
  'dev-3': {
    baselineKmPerL: 3.5,
    gainSpanKmPerL: 0.72,
    monthlyDistanceKm: 5180,
    baseIdleMinsPerDay: 38,
  },
};

const RANGE_PERIODS: Record<FuelTimeRange, string[]> = {
  '30d': ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
  '90d': ['Wk 1–2', 'Wk 3–4', 'Wk 5–6', 'Wk 7–8', 'Wk 9–10', 'Wk 11–12'],
  '6m': ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
  '12m': [
    'Dec',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
  ],
};

function getBaselineForDevice(device: TrackedDevice, index: number): VehicleFuelBaseline {
  if (VEHICLE_BASELINES[device.id]) {
    return VEHICLE_BASELINES[device.id];
  }
  const offset = (index % 4) * 0.35;
  return {
    baselineKmPerL: Number((4.4 + offset).toFixed(2)),
    gainSpanKmPerL: Number((0.9 + (index % 3) * 0.12).toFixed(2)),
    monthlyDistanceKm: 4600 + (index % 3) * 550,
    baseIdleMinsPerDay: 42 + (index % 3) * 6,
  };
}

function getPeriodDistanceScale(range: FuelTimeRange): number {
  switch (range) {
    case '30d':
      return 0.25; // 4 weekly points = 1 month
    case '90d':
      return 0.5; // 6 bi-weekly points = 3 months
    case '6m':
      return 1; // 6 monthly points = 6 months
    case '12m':
      return 1; // 12 monthly points = 12 months
  }
}

function roundTo(val: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}

export function buildFuelEfficiencySeries(
  devices: TrackedDevice[],
  selectedDeviceId: string,
  range: FuelTimeRange
): FuelTrendPoint[] {
  if (devices.length === 0) return [];

  const targetDevices =
    selectedDeviceId === 'all'
      ? devices
      : devices.filter((d) => d.id === selectedDeviceId);

  const activeDevices = targetDevices.length > 0 ? targetDevices : devices;
  const periods = RANGE_PERIODS[range];
  const distanceScale = getPeriodDistanceScale(range);
  const daysPerPoint = range === '30d' ? 7 : range === '90d' ? 15 : 30;

  return periods.map((period, idx) => {
    const progress = periods.length > 1 ? idx / (periods.length - 1) : 1;
    // Slight deterministic route variance so curves reflect real road conditions
    const wave = Math.sin((idx + 1) * 1.35) * 0.09 + Math.cos(idx * 0.9) * 0.04;

    let totalDistanceKm = 0;
    let totalActualFuelLiters = 0;
    let totalBaselineFuelLiters = 0;
    let totalIdleMinutes = 0;

    activeDevices.forEach((device, devIdx) => {
      const profile = getBaselineForDevice(device, devIdx);
      const devWave = wave + (devIdx % 2 === 0 ? 0.03 : -0.02) * Math.sin(idx + devIdx);

      const baselineKmPerL = Math.max(2.2, profile.baselineKmPerL + devWave * 0.35);
      // Efficiency rises smoothly as driver coaching + idle alerts kick in
      const efficiencyGain = profile.gainSpanKmPerL * (0.22 + 0.78 * Math.pow(progress, 0.85));
      const actualKmPerL = Math.max(
        baselineKmPerL + 0.12,
        baselineKmPerL + efficiencyGain + devWave
      );

      const distanceKm = profile.monthlyDistanceKm * distanceScale * (0.94 + 0.12 * ((idx + devIdx) % 3) / 2);
      const actualFuel = distanceKm / actualKmPerL;
      const baselineFuel = distanceKm / baselineKmPerL;
      const idleFactor = 1 - 0.38 * progress;
      const idleMins = Math.max(8, profile.baseIdleMinsPerDay * daysPerPoint * idleFactor);

      totalDistanceKm += distanceKm;
      totalActualFuelLiters += actualFuel;
      totalBaselineFuelLiters += baselineFuel;
      totalIdleMinutes += idleMins;
    });

    const actualKmPerL =
      totalActualFuelLiters > 0 ? totalDistanceKm / totalActualFuelLiters : 0;
    const baselineKmPerL =
      totalBaselineFuelLiters > 0 ? totalDistanceKm / totalBaselineFuelLiters : 0;
    const fuelSavedLiters = Math.max(0, totalBaselineFuelLiters - totalActualFuelLiters);

    return {
      period,
      actualKmPerL: roundTo(actualKmPerL, 2),
      baselineKmPerL: roundTo(baselineKmPerL, 2),
      fuelUsedLiters: roundTo(totalActualFuelLiters, 1),
      baselineFuelLiters: roundTo(totalBaselineFuelLiters, 1),
      fuelSavedLiters: roundTo(fuelSavedLiters, 1),
      savingsInr: Math.round(fuelSavedLiters * DIESEL_RATE_INR_PER_LITER),
      distanceKm: Math.round(totalDistanceKm),
      idleMinutes: Math.round(totalIdleMinutes),
    };
  });
}

export function summarizeFuelEfficiency(
  points: FuelTrendPoint[]
): FuelEfficiencySummary {
  if (points.length === 0) {
    return {
      avgKmPerL: 0,
      baselineAvgKmPerL: 0,
      improvementPct: 0,
      totalFuelUsedLiters: 0,
      totalFuelSavedLiters: 0,
      estimatedSavingsInr: 0,
      totalDistanceKm: 0,
      latestKmPerL: 0,
      peakKmPerL: 0,
    };
  }

  const totalDistanceKm = points.reduce((sum, p) => sum + p.distanceKm, 0);
  const totalFuelUsedLiters = points.reduce((sum, p) => sum + p.fuelUsedLiters, 0);
  const totalBaselineLiters = points.reduce((sum, p) => sum + p.baselineFuelLiters, 0);
  const totalFuelSavedLiters = points.reduce((sum, p) => sum + p.fuelSavedLiters, 0);
  const estimatedSavingsInr = points.reduce((sum, p) => sum + p.savingsInr, 0);

  const avgKmPerL =
    totalFuelUsedLiters > 0 ? roundTo(totalDistanceKm / totalFuelUsedLiters, 2) : 0;
  const baselineAvgKmPerL =
    totalBaselineLiters > 0 ? roundTo(totalDistanceKm / totalBaselineLiters, 2) : 0;

  const improvementPct =
    baselineAvgKmPerL > 0
      ? roundTo(((avgKmPerL - baselineAvgKmPerL) / baselineAvgKmPerL) * 100, 1)
      : 0;

  const latestKmPerL = points[points.length - 1].actualKmPerL;
  const peakKmPerL = Math.max(...points.map((p) => p.actualKmPerL));

  return {
    avgKmPerL,
    baselineAvgKmPerL,
    improvementPct,
    totalFuelUsedLiters: roundTo(totalFuelUsedLiters, 1),
    totalFuelSavedLiters: roundTo(totalFuelSavedLiters, 1),
    estimatedSavingsInr,
    totalDistanceKm,
    latestKmPerL,
    peakKmPerL,
  };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateFuelEfficiencyCsv(
  points: FuelTrendPoint[],
  vehicleScopeLabel: string,
  range: FuelTimeRange
): string {
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

  const rows = points.map((p) =>
    [
      vehicleScopeLabel,
      range.toUpperCase(),
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
