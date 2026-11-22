export type VehicleStatus = 'Moving' | 'Idle' | 'Alert';

export type SimulatorScenario =
  | 'cruise'
  | 'idle'
  | 'geofence'
  | 'harsh-braking'
  | 'overspeed'
  | 'immobilize';

export type FleetAlertCategory =
  | 'Geofence Breach'
  | 'Engine Idle Too Long'
  | 'Harsh Braking'
  | 'Overspeed'
  | 'Engine Cut-Off';

export type FleetAlertSeverity = 'critical' | 'warning';

export interface LiveVehicle {
  id: string;
  plate: string;
  driver: string;
  status: VehicleStatus;
  speed: number;
  x: number;
  y: number;
  lat: number;
  lng: number;
  routeZone: string;
  ignitionOn?: boolean;
  immobilized?: boolean;
}

export interface SimulatorAlert {
  id: string;
  category: FleetAlertCategory;
  title: string;
  message: string;
  severity: FleetAlertSeverity;
  timestamp: string;
  vehicleId: string;
  plate: string;
  location: string;
  acknowledged?: boolean;
}

export interface AlertFeedSummary {
  total: number;
  unacknowledged: number;
  criticalCount: number;
  warningCount: number;
}

export const INITIAL_LIVE_VEHICLES: LiveVehicle[] = [
  {
    id: 'v1',
    plate: 'KA-01-FL-4821',
    driver: 'R. Deshpande',
    status: 'Moving',
    speed: 64,
    x: 26,
    y: 58,
    lat: 12.8985,
    lng: 77.6382,
    routeZone: 'NH-48 Corridor',
    ignitionOn: true,
  },
  {
    id: 'v2',
    plate: 'MH-12-TR-9032',
    driver: 'S. Kulkarni',
    status: 'Moving',
    speed: 52,
    x: 62,
    y: 34,
    lat: 12.9562,
    lng: 77.7011,
    routeZone: 'Expressway Exit 4',
    ignitionOn: true,
  },
  {
    id: 'v3',
    plate: 'DL-04-CG-1190',
    driver: 'V. Tiwari',
    status: 'Idle',
    speed: 0,
    x: 42,
    y: 42,
    lat: 12.8169,
    lng: 77.6845,
    routeZone: 'Hub Dock 3',
    ignitionOn: true,
  },
  {
    id: 'v4',
    plate: 'TN-09-CR-7741',
    driver: 'M. Rajan',
    status: 'Alert',
    speed: 78,
    x: 78,
    y: 62,
    lat: 12.7852,
    lng: 77.7812,
    routeZone: 'Depot Zone B',
    ignitionOn: true,
  },
];

export const INITIAL_CRITICAL_ALERTS: SimulatorAlert[] = [
  {
    id: 'seed-geofence-1',
    category: 'Geofence Breach',
    title: 'Geofence Breach',
    message: 'TN-09-CR-7741 exited Depot Zone B perimeter without dispatch clearance',
    severity: 'critical',
    timestamp: 'Live Ping',
    vehicleId: 'v4',
    plate: 'TN-09-CR-7741',
    location: 'Depot Zone B',
    acknowledged: false,
  },
  {
    id: 'seed-idle-2',
    category: 'Engine Idle Too Long',
    title: 'Engine Idle Too Long',
    message: 'DL-04-CG-1190 idling with ignition ON for 14 mins (+1.8 L wasted)',
    severity: 'warning',
    timestamp: '2m ago',
    vehicleId: 'v3',
    plate: 'DL-04-CG-1190',
    location: 'Hub Dock 3',
    acknowledged: false,
  },
  {
    id: 'seed-brake-3',
    category: 'Harsh Braking',
    title: 'Harsh Braking',
    message: 'MH-12-TR-9032 logged -0.68g sudden deceleration approaching toll plaza',
    severity: 'critical',
    timestamp: '4m ago',
    vehicleId: 'v2',
    plate: 'MH-12-TR-9032',
    location: 'Expressway Exit 4',
    acknowledged: false,
  },
];

export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

export const OVERSPEED_THRESHOLD_KMH = 85;

export function applySpeedOverride(
  vehicle: LiveVehicle,
  rawSpeed: number
): { vehicle: LiveVehicle; alert: SimulatorAlert | null } {
  const speed = Math.max(0, Math.min(120, Math.round(rawSpeed)));
  const timestamp = 'Just now';

  if (speed === 0) {
    return {
      vehicle: {
        ...vehicle,
        speed: 0,
        status: 'Idle',
        immobilized: false,
      },
      alert: null,
    };
  }

  if (speed >= OVERSPEED_THRESHOLD_KMH) {
    return {
      vehicle: {
        ...vehicle,
        speed,
        status: 'Alert',
        ignitionOn: true,
        immobilized: false,
      },
      alert: {
        id: `alt-spd-${Date.now()}`,
        category: 'Overspeed',
        title: 'Overspeed Limit Breach',
        message: `${vehicle.plate} reached ${speed} km/h (limit ${OVERSPEED_THRESHOLD_KMH} km/h)`,
        severity: 'critical',
        timestamp,
        vehicleId: vehicle.id,
        plate: vehicle.plate,
        location: vehicle.routeZone,
        acknowledged: false,
      },
    };
  }

  return {
    vehicle: {
      ...vehicle,
      speed,
      status: 'Moving',
      ignitionOn: true,
      immobilized: false,
    },
    alert: null,
  };
}

export function applyScenarioToVehicle(
  vehicle: LiveVehicle,
  scenario: SimulatorScenario
): { vehicle: LiveVehicle; alert: SimulatorAlert | null } {
  const timestamp = 'Live Ping';

  switch (scenario) {
    case 'cruise':
      return {
        vehicle: {
          ...vehicle,
          status: 'Moving',
          speed: 62,
          x: 48,
          y: 44,
          routeZone: 'NH-48 Highway Corridor',
          ignitionOn: true,
          immobilized: false,
        },
        alert: null,
      };
    case 'idle':
      return {
        vehicle: {
          ...vehicle,
          status: 'Idle',
          speed: 0,
          routeZone: 'Tumkuru Logistics Bay',
          ignitionOn: true,
          immobilized: false,
        },
        alert: {
          id: `alt-idle-${Date.now()}`,
          category: 'Engine Idle Too Long',
          title: 'Engine Idle Too Long',
          message: `${vehicle.plate} stationary with ignition ON (> 10 mins)`,
          severity: 'warning',
          timestamp,
          vehicleId: vehicle.id,
          plate: vehicle.plate,
          location: 'Tumkuru Logistics Bay',
          acknowledged: false,
        },
      };
    case 'geofence':
      return {
        vehicle: {
          ...vehicle,
          status: 'Alert',
          speed: 74,
          x: 82,
          y: 66,
          routeZone: 'Exited Depot Zone B',
          ignitionOn: true,
          immobilized: false,
        },
        alert: {
          id: `alt-geo-${Date.now()}`,
          category: 'Geofence Breach',
          title: 'Geofence Breach',
          message: `${vehicle.plate} exited Zone B boundary`,
          severity: 'critical',
          timestamp,
          vehicleId: vehicle.id,
          plate: vehicle.plate,
          location: 'Exited Depot Zone B',
          acknowledged: false,
        },
      };
    case 'harsh-braking':
      return {
        vehicle: {
          ...vehicle,
          status: 'Alert',
          speed: 24,
          routeZone: vehicle.routeZone,
          ignitionOn: true,
          immobilized: false,
        },
        alert: {
          id: `alt-brake-${Date.now()}`,
          category: 'Harsh Braking',
          title: 'Harsh Braking',
          message: `${vehicle.plate} logged -0.72g rapid deceleration (68 -> 24 km/h)`,
          severity: 'critical',
          timestamp,
          vehicleId: vehicle.id,
          plate: vehicle.plate,
          location: vehicle.routeZone,
          acknowledged: false,
        },
      };
    case 'overspeed':
      return {
        vehicle: {
          ...vehicle,
          status: 'Alert',
          speed: 96,
          x: 68,
          y: 30,
          routeZone: 'Expressway Sector 4',
          ignitionOn: true,
          immobilized: false,
        },
        alert: {
          id: `alt-over-${Date.now()}`,
          category: 'Overspeed',
          title: 'Overspeed Limit Breach',
          message: `${vehicle.plate} clocked 96 km/h in 80 km/h zone`,
          severity: 'critical',
          timestamp,
          vehicleId: vehicle.id,
          plate: vehicle.plate,
          location: 'Expressway Sector 4',
          acknowledged: false,
        },
      };
    case 'immobilize':
      return {
        vehicle: {
          ...vehicle,
          status: 'Idle',
          speed: 0,
          routeZone: 'Safe Cut-Off Engaged',
          ignitionOn: false,
          immobilized: true,
        },
        alert: {
          id: `alt-imm-${Date.now()}`,
          category: 'Engine Cut-Off',
          title: 'Remote Engine Cut-Off Active',
          message: `${vehicle.plate} relay immobilized safely at 0 km/h`,
          severity: 'warning',
          timestamp,
          vehicleId: vehicle.id,
          plate: vehicle.plate,
          location: 'Safe Cut-Off Engaged',
          acknowledged: false,
        },
      };
  }
}

export function stepSimulatedFleet(
  vehicles: LiveVehicle[],
  tick: number
): LiveVehicle[] {
  return vehicles.map((v, idx) => {
    if (v.status === 'Idle' || v.immobilized) return v;
    const phase = tick * 0.45 + idx * 1.3;
    const dx = Math.sin(phase) * 2.4;
    const dy = Math.cos(phase * 0.85) * 1.9;
    const speedJitter = Math.round(Math.sin(phase * 1.7) * 3);
    const minSpeed = v.status === 'Alert' ? 72 : 42;
    const maxSpeed = v.status === 'Alert' ? 104 : 78;
    const nextSpeed = Math.max(
      minSpeed,
      Math.min(maxSpeed, v.speed + speedJitter)
    );

    return {
      ...v,
      speed: nextSpeed,
      x: Math.max(12, Math.min(88, Number((v.x + dx).toFixed(1)))),
      y: Math.max(16, Math.min(82, Number((v.y + dy).toFixed(1)))),
      lat: Number((v.lat + dy * -0.0006).toFixed(4)),
      lng: Number((v.lng + dx * 0.0008).toFixed(4)),
    };
  });
}

export function generateDynamicSimulationAlert(
  vehicles: LiveVehicle[],
  tick: number
): SimulatorAlert | null {
  if (vehicles.length === 0 || tick <= 0 || tick % 3 !== 0) {
    return null;
  }

  const slot = Math.floor(tick / 3) % 3;
  const movingVehicles = vehicles.filter((v) => v.status === 'Moving' || v.status === 'Alert');
  const idleVehicles = vehicles.filter((v) => v.status === 'Idle' && !v.immobilized);

  if (slot === 0) {
    const target = movingVehicles[tick % Math.max(1, movingVehicles.length)] ?? vehicles[0];
    return {
      id: `dyn-brake-${tick}`,
      category: 'Harsh Braking',
      title: 'Harsh Braking',
      message: `${target.plate} recorded -0.64g braking impulse at ${target.speed} km/h`,
      severity: 'critical',
      timestamp: 'Just now',
      vehicleId: target.id,
      plate: target.plate,
      location: target.routeZone,
      acknowledged: false,
    };
  }

  if (slot === 1) {
    const target = idleVehicles[0] ?? vehicles[0];
    const idleMins = 11 + (tick % 9);
    return {
      id: `dyn-idle-${tick}`,
      category: 'Engine Idle Too Long',
      title: 'Engine Idle Too Long',
      message: `${target.plate} stationary with ignition ON for ${idleMins} mins`,
      severity: 'warning',
      timestamp: 'Just now',
      vehicleId: target.id,
      plate: target.plate,
      location: target.routeZone,
      acknowledged: false,
    };
  }

  const target = vehicles[vehicles.length - 1];
  return {
    id: `dyn-geo-${tick}`,
    category: 'Geofence Breach',
    title: 'Geofence Breach',
    message: `${target.plate} crossed corridor boundary near ${target.routeZone}`,
    severity: 'critical',
    timestamp: 'Just now',
    vehicleId: target.id,
    plate: target.plate,
    location: target.routeZone,
    acknowledged: false,
  };
}

export function filterAlertFeed(
  alerts: SimulatorAlert[],
  severityFilter: 'all' | FleetAlertSeverity
): SimulatorAlert[] {
  if (severityFilter === 'all') return alerts;
  return alerts.filter((alert) => alert.severity === severityFilter);
}

export function summarizeAlertFeed(alerts: SimulatorAlert[]): AlertFeedSummary {
  const unacked = alerts.filter((a) => !a.acknowledged);
  return {
    total: alerts.length,
    unacknowledged: unacked.length,
    criticalCount: unacked.filter((a) => a.severity === 'critical').length,
    warningCount: unacked.filter((a) => a.severity === 'warning').length,
  };
}
