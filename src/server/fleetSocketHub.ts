import type http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type { TrackedDevice } from '../types/index.ts';
import {
  INITIAL_WORLD_FLEET,
  stepWorldFleet,
  type FleetMapVehicle,
} from '../utils/fleetMapLogic.ts';
import {
  resolveVehiclePosition,
  stepRegisteredVehicles,
  type RouteTrailMap,
} from '../utils/registeredVehicleTracking.ts';
import {
  sanitizeRoomId,
  validateTelemetryPushPayload,
  type RawTelemetryPushInput,
  type VehicleLocationPushEvent,
  type WorldVehiclePatchEvent,
} from '../utils/realtimeFleetLogic.ts';

const WORLD_ROOM = 'world-fleet';
const FLEET_ROOM_PREFIX = 'fleet:';

interface FleetRoomState {
  devices: Map<string, TrackedDevice>;
  trails: RouteTrailMap;
  tick: number;
}

function toLocationPushEvent(device: TrackedDevice): VehicleLocationPushEvent {
  const pos = resolveVehiclePosition(device);
  return {
    deviceId: device.id,
    imei: device.imei,
    latitude: pos.latitude,
    longitude: pos.longitude,
    speedKmh: pos.speedKmh,
    headingDeg: pos.headingDeg,
    status: device.status,
    telemetrySource: pos.telemetrySource,
    ...(device.accuracyMeters !== undefined
      ? { accuracyMeters: device.accuracyMeters }
      : {}),
    lastUpdated: device.lastUpdated || 'Live Socket Push · just now',
    lastPingAt: device.lastPingAt || new Date().toISOString(),
  };
}

function toWorldPatch(v: FleetMapVehicle): WorldVehiclePatchEvent {
  return {
    id: v.id,
    lat: v.lat,
    lng: v.lng,
    headingDeg: v.headingDeg,
    status: v.status,
    speedKmh: v.speedKmh,
    fuelPercent: v.fuelPercent,
    fuelLiters: v.fuelLiters,
    lastPing: v.lastPing,
  };
}

export interface FleetSocketHub {
  io: SocketIOServer;
  pushExternalTelemetry: (
    input: RawTelemetryPushInput
  ) =>
    | { ok: true; roomId: string; event: VehicleLocationPushEvent; matchedRooms: string[] }
    | { ok: false; error: string };
  getLiveSnapshot: (roomId?: string) => {
    worldFleet: FleetMapVehicle[];
    roomId: string;
    registeredVehicles: VehicleLocationPushEvent[];
    connectedClients: number;
    timestamp: string;
  };
  close: () => void;
}

export function attachFleetSocketHub(server: http.Server): FleetSocketHub {
  // destroyUpgrade: false ensures Socket.io never destroys Vite HMR or /api/live upgrades
  const io = new SocketIOServer(server, {
    path: '/socket.io',
    destroyUpgrade: false,
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  let worldFleet: FleetMapVehicle[] = INITIAL_WORLD_FLEET.map((v) => ({ ...v }));
  let worldTick = 0;

  const fleetRooms = new Map<string, FleetRoomState>();

  function getOrCreateRoom(roomId: string): FleetRoomState {
    const clean = sanitizeRoomId(roomId, 'demo');
    let state = fleetRooms.get(clean);
    if (!state) {
      state = {
        devices: new Map<string, TrackedDevice>(),
        trails: {},
        tick: 0,
      };
      fleetRooms.set(clean, state);
    }
    return state;
  }

  function upsertRoomDevices(
    roomId: string,
    incomingDevices: unknown
  ): VehicleLocationPushEvent[] {
    const room = getOrCreateRoom(roomId);
    if (Array.isArray(incomingDevices)) {
      for (const raw of incomingDevices) {
        if (!raw || typeof raw !== 'object') continue;
        const dev = raw as Partial<TrackedDevice>;
        const id = typeof dev.id === 'string' ? dev.id.trim() : '';
        const imei = typeof dev.imei === 'string' ? dev.imei.trim() : '';
        if (!id || !imei) continue;

        const existing = room.devices.get(id);
        if (!existing) {
          const normalized: TrackedDevice = {
            id,
            imei,
            model: typeof dev.model === 'string' ? dev.model : 'VS Pro 4G Wired GPS Tracker',
            vehicleLabel: typeof dev.vehicleLabel === 'string' ? dev.vehicleLabel : id,
            vehicleType: dev.vehicleType,
            status:
              dev.status === 'Moving' || dev.status === 'Idle' || dev.status === 'Alert'
                ? dev.status
                : 'Moving',
            speedKmh: typeof dev.speedKmh === 'number' ? dev.speedKmh : 0,
            lastUpdated: typeof dev.lastUpdated === 'string' ? dev.lastUpdated : 'Just now',
            simExpiry: typeof dev.simExpiry === 'string' ? dev.simExpiry : '2027-12-31',
            cloudSynced: Boolean(dev.cloudSynced),
            latitude: typeof dev.latitude === 'number' ? dev.latitude : undefined,
            longitude: typeof dev.longitude === 'number' ? dev.longitude : undefined,
            headingDeg: typeof dev.headingDeg === 'number' ? dev.headingDeg : undefined,
            telemetrySource: dev.telemetrySource,
            accuracyMeters: dev.accuracyMeters,
            lastPingAt: dev.lastPingAt,
          };
          const resolved = resolveVehiclePosition(normalized);
          room.devices.set(id, {
            ...normalized,
            latitude: resolved.latitude,
            longitude: resolved.longitude,
            speedKmh: resolved.speedKmh,
            headingDeg: resolved.headingDeg,
            telemetrySource: resolved.telemetrySource,
          });
          room.trails[id] = [[resolved.latitude, resolved.longitude]];
        } else if (
          dev.telemetrySource === 'gps' &&
          typeof dev.latitude === 'number' &&
          typeof dev.longitude === 'number'
        ) {
          // Allow authoritative GPS / Firestore coordinates to refresh server state
          room.devices.set(id, {
            ...existing,
            latitude: dev.latitude,
            longitude: dev.longitude,
            speedKmh: typeof dev.speedKmh === 'number' ? dev.speedKmh : existing.speedKmh,
            headingDeg:
              typeof dev.headingDeg === 'number' ? dev.headingDeg : existing.headingDeg,
            status:
              dev.status === 'Moving' || dev.status === 'Idle' || dev.status === 'Alert'
                ? dev.status
                : existing.status,
            telemetrySource: 'gps',
            lastUpdated: dev.lastUpdated ?? existing.lastUpdated,
            lastPingAt: dev.lastPingAt ?? new Date().toISOString(),
          });
        }
      }
    }

    return Array.from(room.devices.values()).map(toLocationPushEvent);
  }

  function applyPushToRoom(
    roomId: string,
    event: VehicleLocationPushEvent
  ): VehicleLocationPushEvent | null {
    const clean = sanitizeRoomId(roomId, 'demo');
    const room = fleetRooms.get(clean);
    if (!room) return null;

    let target: TrackedDevice | undefined = room.devices.get(event.deviceId);
    if (!target && event.imei) {
      for (const candidate of room.devices.values()) {
        if (candidate.imei.trim() === event.imei.trim()) {
          target = candidate;
          break;
        }
      }
    }
    if (!target) return null;

    const updated: TrackedDevice = {
      ...target,
      latitude: event.latitude,
      longitude: event.longitude,
      speedKmh: event.speedKmh,
      headingDeg: event.headingDeg,
      status: event.status,
      telemetrySource: event.telemetrySource,
      accuracyMeters: event.accuracyMeters ?? target.accuracyMeters,
      lastUpdated: event.lastUpdated,
      lastPingAt: event.lastPingAt,
    };

    room.devices.set(target.id, updated);
    const pushEvent = toLocationPushEvent(updated);
    io.to(`${FLEET_ROOM_PREFIX}${clean}`).emit('fleet:device:update', pushEvent);
    return pushEvent;
  }

  io.on('connection', (socket) => {
    // --- World Fleet Subscriptions ---
    socket.on('fleet:world:subscribe', () => {
      void socket.join(WORLD_ROOM);
      socket.emit('fleet:world:init', {
        vehicles: worldFleet,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('fleet:world:unsubscribe', () => {
      void socket.leave(WORLD_ROOM);
    });

    socket.on('fleet:world:reset', () => {
      worldFleet = INITIAL_WORLD_FLEET.map((v) => ({ ...v }));
      worldTick = 0;
      io.to(WORLD_ROOM).emit('fleet:world:init', {
        vehicles: worldFleet,
        timestamp: new Date().toISOString(),
      });
    });

    // --- Registered Fleet Room Subscriptions ---
    socket.on(
      'fleet:devices:subscribe',
      (payload: { roomId?: string; devices?: TrackedDevice[] } | undefined) => {
        const cleanRoom = sanitizeRoomId(payload?.roomId, 'demo');
        void socket.join(`${FLEET_ROOM_PREFIX}${cleanRoom}`);
        const snapshot = upsertRoomDevices(cleanRoom, payload?.devices);
        socket.emit('fleet:devices:init', {
          roomId: cleanRoom,
          updates: snapshot,
          timestamp: new Date().toISOString(),
        });
      }
    );

    socket.on(
      'fleet:devices:sync',
      (payload: { roomId?: string; devices?: TrackedDevice[] } | undefined) => {
        const cleanRoom = sanitizeRoomId(payload?.roomId, 'demo');
        const snapshot = upsertRoomDevices(cleanRoom, payload?.devices);
        socket.emit('fleet:devices:init', {
          roomId: cleanRoom,
          updates: snapshot,
          timestamp: new Date().toISOString(),
        });
      }
    );

    socket.on(
      'fleet:devices:unsubscribe',
      (payload: { roomId?: string } | undefined) => {
        const cleanRoom = sanitizeRoomId(payload?.roomId, 'demo');
        void socket.leave(`${FLEET_ROOM_PREFIX}${cleanRoom}`);
      }
    );

    socket.on('fleet:device:ping', (rawPayload: RawTelemetryPushInput) => {
      const validated = validateTelemetryPushPayload(rawPayload || {});
      if (!validated.ok) {
        socket.emit('fleet:error', { error: validated.error });
        return;
      }
      const pushed = applyPushToRoom(validated.roomId, validated.event);
      if (!pushed) {
        // Still broadcast so listeners matching by deviceId/imei receive the push
        io.to(`${FLEET_ROOM_PREFIX}${validated.roomId}`).emit(
          'fleet:device:update',
          validated.event
        );
      }
    });
  });

  // Authoritative Server Push Loop (2s cadence) — only broadcasts to rooms with active listeners
  const broadcastTimer = setInterval(() => {
    const worldSubscribers = io.sockets.adapter.rooms.get(WORLD_ROOM)?.size ?? 0;
    if (worldSubscribers > 0) {
      worldTick += 1;
      worldFleet = stepWorldFleet(worldFleet, worldTick);
      io.to(WORLD_ROOM).emit('fleet:world:update', {
        patches: worldFleet.map(toWorldPatch),
        timestamp: new Date().toISOString(),
      });
    }

    for (const [roomId, roomState] of fleetRooms.entries()) {
      const channelName = `${FLEET_ROOM_PREFIX}${roomId}`;
      const subscriberCount = io.sockets.adapter.rooms.get(channelName)?.size ?? 0;
      if (subscriberCount === 0 || roomState.devices.size === 0) continue;

      roomState.tick += 1;
      const currentList = Array.from(roomState.devices.values());
      const stepped = stepRegisteredVehicles(
        currentList,
        roomState.trails,
        roomState.tick,
        null
      );

      roomState.trails = stepped.trails;
      const updates: VehicleLocationPushEvent[] = [];
      for (const dev of stepped.devices) {
        roomState.devices.set(dev.id, dev);
        if (dev.telemetrySource === 'simulated' && dev.status !== 'Idle') {
          updates.push({
            ...toLocationPushEvent(dev),
            lastUpdated: 'Live Socket Push · just now',
          });
        }
      }

      if (updates.length > 0) {
        io.to(channelName).emit('fleet:devices:batch', {
          roomId,
          updates,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, 2000);

  return {
    io,
    pushExternalTelemetry(input: RawTelemetryPushInput) {
      const validated = validateTelemetryPushPayload(input);
      if (!validated.ok) return validated;

      const matchedRooms: string[] = [];

      // Try explicit room first
      if (applyPushToRoom(validated.roomId, validated.event)) {
        matchedRooms.push(validated.roomId);
      }

      // Also match any active fleet room holding this IMEI or deviceId (e.g. hardware GPS gateway)
      for (const [roomId] of fleetRooms.entries()) {
        if (matchedRooms.includes(roomId)) continue;
        if (applyPushToRoom(roomId, validated.event)) {
          matchedRooms.push(roomId);
        }
      }

      // If no room had the device registered yet, still emit to the requested room
      if (matchedRooms.length === 0) {
        io.to(`${FLEET_ROOM_PREFIX}${validated.roomId}`).emit(
          'fleet:device:update',
          validated.event
        );
      }

      return {
        ok: true,
        roomId: validated.roomId,
        event: validated.event,
        matchedRooms,
      };
    },
    getLiveSnapshot(roomId = 'demo') {
      const clean = sanitizeRoomId(roomId, 'demo');
      const room = fleetRooms.get(clean);
      return {
        worldFleet,
        roomId: clean,
        registeredVehicles: room
          ? Array.from(room.devices.values()).map(toLocationPushEvent)
          : [],
        connectedClients: io.engine.clientsCount,
        timestamp: new Date().toISOString(),
      };
    },
    close() {
      clearInterval(broadcastTimer);
      io.close();
    },
  };
}
