export type FleetMapStatus = 'Moving' | 'Idle' | 'Offline';

export interface FleetMapVehicle {
  id: string;
  plate: string;
  driver: string;
  hub: string;
  country: string;
  lat: number;
  lng: number;
  headingDeg: number;
  status: FleetMapStatus;
  speedKmh: number;
  fuelPercent: number;
  fuelLiters: number;
  tankCapacityLiters: number;
  lastPing: string;
}

export interface FleetMapSummary {
  total: number;
  moving: number;
  idle: number;
  offline: number;
  avgSpeedKmh: number;
  avgFuelPercent: number;
}

export const INITIAL_WORLD_FLEET: FleetMapVehicle[] = [
  {
    id: 'gm-1',
    plate: 'KA-01-FL-4821',
    driver: 'R. Deshpande',
    hub: 'Bengaluru · NH-48',
    country: 'India',
    lat: 13.0827,
    lng: 77.5877,
    headingDeg: 42,
    status: 'Moving',
    speedKmh: 68,
    fuelPercent: 78,
    fuelLiters: 234,
    tankCapacityLiters: 300,
    lastPing: '2s ago',
  },
  {
    id: 'gm-2',
    plate: 'DXB-84-TR-209',
    driver: 'A. Al-Mansoori',
    hub: 'Jebel Ali Corridor',
    country: 'UAE',
    lat: 25.0112,
    lng: 55.1271,
    headingDeg: 115,
    status: 'Moving',
    speedKmh: 74,
    fuelPercent: 84,
    fuelLiters: 268.8,
    tankCapacityLiters: 320,
    lastPing: '3s ago',
  },
  {
    id: 'gm-3',
    plate: 'SG-71-LG-5510',
    driver: 'W. Tan',
    hub: 'Tuas Megaport',
    country: 'Singapore',
    lat: 1.3186,
    lng: 103.6542,
    headingDeg: 290,
    status: 'Idle',
    speedKmh: 0,
    fuelPercent: 62,
    fuelLiters: 155,
    tankCapacityLiters: 250,
    lastPing: '8s ago',
  },
  {
    id: 'gm-4',
    plate: 'UK-24-LDN-883',
    driver: 'J. Carter',
    hub: 'London Gateway M25',
    country: 'United Kingdom',
    lat: 51.5074,
    lng: -0.1278,
    headingDeg: 15,
    status: 'Moving',
    speedKmh: 61,
    fuelPercent: 54,
    fuelLiters: 151.2,
    tankCapacityLiters: 280,
    lastPing: '4s ago',
  },
  {
    id: 'gm-5',
    plate: 'KE-09-NRB-412',
    driver: 'D. Ochieng',
    hub: 'Mombasa Road Depot',
    country: 'Kenya',
    lat: -1.2921,
    lng: 36.8219,
    headingDeg: 150,
    status: 'Idle',
    speedKmh: 0,
    fuelPercent: 41,
    fuelLiters: 102.5,
    tankCapacityLiters: 250,
    lastPing: '14s ago',
  },
  {
    id: 'gm-6',
    plate: 'SA-44-RYD-772',
    driver: 'K. Al-Harbi',
    hub: 'Riyadh Dry Port',
    country: 'Saudi Arabia',
    lat: 24.7136,
    lng: 46.6753,
    headingDeg: 220,
    status: 'Offline',
    speedKmh: 0,
    fuelPercent: 19,
    fuelLiters: 57,
    tankCapacityLiters: 300,
    lastPing: '42m ago',
  },
  {
    id: 'gm-7',
    plate: 'AU-92-SYD-308',
    driver: 'L. Bennett',
    hub: 'Port Botany Freight',
    country: 'Australia',
    lat: -33.8688,
    lng: 151.2093,
    headingDeg: 320,
    status: 'Moving',
    speedKmh: 79,
    fuelPercent: 91,
    fuelLiters: 291.2,
    tankCapacityLiters: 320,
    lastPing: '2s ago',
  },
  {
    id: 'gm-8',
    plate: 'MH-12-TR-9032',
    driver: 'S. Kulkarni',
    hub: 'Pune · Chakan Hub',
    country: 'India',
    lat: 18.7606,
    lng: 73.8636,
    headingDeg: 85,
    status: 'Offline',
    speedKmh: 0,
    fuelPercent: 33,
    fuelLiters: 92.4,
    tankCapacityLiters: 280,
    lastPing: '1h 12m ago',
  },
];

export function clampLatitude(lat: number): number {
  return Math.max(-55, Math.min(72, Number(lat.toFixed(4))));
}

export function clampLongitude(lng: number): number {
  if (lng > 175) return Number((lng - 350).toFixed(4));
  if (lng < -175) return Number((lng + 350).toFixed(4));
  return Number(lng.toFixed(4));
}

export function stepWorldFleet(
  vehicles: FleetMapVehicle[],
  tick: number
): FleetMapVehicle[] {
  return vehicles.map((v, idx) => {
    if (v.status === 'Offline') {
      return {
        ...v,
        speedKmh: 0,
      };
    }

    if (v.status === 'Idle') {
      const nextLiters = Math.max(
        10,
        Number((v.fuelLiters - 0.05).toFixed(1))
      );
      const nextPercent = Math.max(
        5,
        Math.round((nextLiters / v.tankCapacityLiters) * 100)
      );
      return {
        ...v,
        speedKmh: 0,
        fuelLiters: nextLiters,
        fuelPercent: nextPercent,
        lastPing: `${6 + ((tick + idx) % 12)}s ago`,
      };
    }

    // Moving vehicle simulation
    const angleRad = (v.headingDeg * Math.PI) / 180;
    const stepDeg = 0.35;
    const wave = Math.sin(tick * 0.4 + idx * 1.1);
    const nextLat = clampLatitude(v.lat + Math.cos(angleRad) * stepDeg);
    const nextLng = clampLongitude(v.lng + Math.sin(angleRad) * stepDeg);

    const nextSpeed = Math.max(
      42,
      Math.min(88, Math.round(v.speedKmh + wave * 3))
    );

    const burnLiters = Number((0.25 + (nextSpeed / 100) * 0.15).toFixed(1));
    const rawLiters = v.fuelLiters - burnLiters;
    // Refuel smoothly in simulation if tank drops under 18%
    const nextLiters =
      rawLiters < v.tankCapacityLiters * 0.18
        ? Number((v.tankCapacityLiters * 0.88).toFixed(1))
        : Number(rawLiters.toFixed(1));

    const nextPercent = Math.min(
      100,
      Math.max(1, Math.round((nextLiters / v.tankCapacityLiters) * 100))
    );

    const nextHeading = (v.headingDeg + Math.round(wave * 6) + 360) % 360;

    return {
      ...v,
      lat: nextLat,
      lng: nextLng,
      headingDeg: nextHeading,
      speedKmh: nextSpeed,
      fuelLiters: nextLiters,
      fuelPercent: nextPercent,
      lastPing: `${1 + ((tick + idx) % 4)}s ago`,
    };
  });
}

export function filterWorldFleet(
  vehicles: FleetMapVehicle[],
  statusFilter: 'All' | FleetMapStatus,
  query = ''
): FleetMapVehicle[] {
  const normalized = query.trim().toLowerCase();
  return vehicles.filter((v) => {
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    if (!matchesStatus) return false;
    if (!normalized) return true;
    return (
      v.plate.toLowerCase().includes(normalized) ||
      v.driver.toLowerCase().includes(normalized) ||
      v.hub.toLowerCase().includes(normalized) ||
      v.country.toLowerCase().includes(normalized)
    );
  });
}

export function summarizeWorldFleet(
  vehicles: FleetMapVehicle[]
): FleetMapSummary {
  const total = vehicles.length;
  const movingUnits = vehicles.filter((v) => v.status === 'Moving');
  const idleUnits = vehicles.filter((v) => v.status === 'Idle');
  const offlineUnits = vehicles.filter((v) => v.status === 'Offline');

  const avgSpeedKmh =
    movingUnits.length > 0
      ? Math.round(
          movingUnits.reduce((acc, v) => acc + v.speedKmh, 0) /
            movingUnits.length
        )
      : 0;

  const avgFuelPercent =
    total > 0
      ? Math.round(
          vehicles.reduce((acc, v) => acc + v.fuelPercent, 0) / total
        )
      : 0;

  return {
    total,
    moving: movingUnits.length,
    idle: idleUnits.length,
    offline: offlineUnits.length,
    avgSpeedKmh,
    avgFuelPercent,
  };
}

export function formatLatLng(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lng).toFixed(2)}° ${lngDir}`;
}
