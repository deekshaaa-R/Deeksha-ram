import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { TrackedDevice } from '../types';
import type { FleetMapVehicle } from '../utils/fleetMapLogic';
import type { TelemetryUpdatePayload } from '../utils/registeredVehicleTracking';
import {
  applyWorldVehiclePatches,
  mergeWorldFleetSnapshot,
  sanitizeRoomId,
  type VehicleLocationPushEvent,
  type WorldVehiclePatchEvent,
} from '../utils/realtimeFleetLogic';

let sharedSocket: Socket | null = null;

function getFleetSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });
  }
  return sharedSocket;
}

export function useWorldFleetRealtime(options: {
  initialVehicles: FleetMapVehicle[];
  paused: boolean;
}) {
  const { initialVehicles, paused } = options;
  const [vehicles, setVehicles] = useState<FleetMapVehicle[]>(initialVehicles);
  const [isConnected, setIsConnected] = useState<boolean>(() =>
    Boolean(sharedSocket?.connected)
  );
  const [lastPushAt, setLastPushAt] = useState<string | null>(null);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const socket = getFleetSocket();

    const subscribe = () => {
      if (!pausedRef.current) {
        socket.emit('fleet:world:subscribe');
      }
    };

    const onConnect = () => {
      setIsConnected(true);
      subscribe();
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onInit = (payload: { vehicles?: FleetMapVehicle[]; timestamp?: string }) => {
      if (!Array.isArray(payload?.vehicles)) return;
      setVehicles((prev) => mergeWorldFleetSnapshot(prev, payload.vehicles!));
      if (payload.timestamp) setLastPushAt(payload.timestamp);
    };

    const onUpdate = (payload: {
      patches?: WorldVehiclePatchEvent[];
      timestamp?: string;
    }) => {
      if (pausedRef.current || !Array.isArray(payload?.patches)) return;
      setVehicles((prev) => applyWorldVehiclePatches(prev, payload.patches!));
      if (payload.timestamp) setLastPushAt(payload.timestamp);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('fleet:world:init', onInit);
    socket.on('fleet:world:update', onUpdate);

    if (socket.connected) {
      setIsConnected(true);
      if (!paused) {
        socket.emit('fleet:world:subscribe');
      } else {
        socket.emit('fleet:world:unsubscribe');
      }
    }

    return () => {
      socket.emit('fleet:world:unsubscribe');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('fleet:world:init', onInit);
      socket.off('fleet:world:update', onUpdate);
    };
  }, [paused]);

  const resetWorldFleet = useCallback(() => {
    const socket = getFleetSocket();
    setVehicles(initialVehicles);
    if (socket.connected) {
      socket.emit('fleet:world:reset');
    }
  }, [initialVehicles]);

  return {
    vehicles,
    isConnected,
    lastPushAt,
    resetWorldFleet,
  };
}

export function useRegisteredFleetRealtime(options: {
  roomId: string;
  devices: TrackedDevice[];
  paused: boolean;
  onReceiveUpdates: (updates: VehicleLocationPushEvent[]) => void;
}) {
  const { roomId, devices, paused, onReceiveUpdates } = options;
  const cleanRoom = sanitizeRoomId(roomId, 'demo');

  const [isConnected, setIsConnected] = useState<boolean>(() =>
    Boolean(sharedSocket?.connected)
  );
  const [lastPushAt, setLastPushAt] = useState<string | null>(null);

  const devicesRef = useRef(devices);
  devicesRef.current = devices;

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const onReceiveRef = useRef(onReceiveUpdates);
  onReceiveRef.current = onReceiveUpdates;

  // Track device IDs signature so newly registered vehicles sync immediately to server hub
  const deviceIdsKey = devices.map((d) => `${d.id}:${d.imei}`).join('|');

  useEffect(() => {
    const socket = getFleetSocket();

    const joinRoom = () => {
      if (pausedRef.current) return;
      socket.emit('fleet:devices:subscribe', {
        roomId: cleanRoom,
        devices: devicesRef.current,
      });
    };

    const onConnect = () => {
      setIsConnected(true);
      joinRoom();
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onInit = (payload: {
      roomId?: string;
      updates?: VehicleLocationPushEvent[];
      timestamp?: string;
    }) => {
      if (payload?.roomId && payload.roomId !== cleanRoom) return;
      if (!Array.isArray(payload?.updates) || payload.updates.length === 0) return;
      onReceiveRef.current(payload.updates);
      if (payload.timestamp) setLastPushAt(payload.timestamp);
    };

    const onBatch = (payload: {
      roomId?: string;
      updates?: VehicleLocationPushEvent[];
      timestamp?: string;
    }) => {
      if (pausedRef.current) return;
      if (payload?.roomId && payload.roomId !== cleanRoom) return;
      if (!Array.isArray(payload?.updates) || payload.updates.length === 0) return;
      onReceiveRef.current(payload.updates);
      if (payload.timestamp) setLastPushAt(payload.timestamp);
    };

    const onSingleUpdate = (update: VehicleLocationPushEvent) => {
      if (!update || (!update.deviceId && !update.imei)) return;
      onReceiveRef.current([update]);
      setLastPushAt(update.lastPingAt || new Date().toISOString());
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('fleet:devices:init', onInit);
    socket.on('fleet:devices:batch', onBatch);
    socket.on('fleet:device:update', onSingleUpdate);

    if (socket.connected) {
      setIsConnected(true);
      if (!paused) {
        joinRoom();
      } else {
        socket.emit('fleet:devices:unsubscribe', { roomId: cleanRoom });
      }
    }

    return () => {
      socket.emit('fleet:devices:unsubscribe', { roomId: cleanRoom });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('fleet:devices:init', onInit);
      socket.off('fleet:devices:batch', onBatch);
      socket.off('fleet:device:update', onSingleUpdate);
    };
  }, [cleanRoom, paused]);

  // Sync newly registered devices into active room without re-subscribing
  useEffect(() => {
    if (paused) return;
    const socket = getFleetSocket();
    if (!socket.connected) return;
    socket.emit('fleet:devices:sync', {
      roomId: cleanRoom,
      devices: devicesRef.current,
    });
  }, [cleanRoom, deviceIdsKey, paused]);

  const emitDevicePing = useCallback(
    (deviceId: string, imei: string, update: TelemetryUpdatePayload) => {
      const socket = getFleetSocket();
      if (!socket.connected) return;
      socket.emit('fleet:device:ping', {
        roomId: cleanRoom,
        deviceId,
        imei,
        latitude: update.latitude,
        longitude: update.longitude,
        speedKmh: update.speedKmh,
        headingDeg: update.headingDeg,
        status: update.status,
        telemetrySource: update.telemetrySource,
        accuracyMeters: update.accuracyMeters,
        lastUpdated: update.lastUpdated,
      });
    },
    [cleanRoom]
  );

  return {
    isConnected,
    lastPushAt,
    emitDevicePing,
  };
}
