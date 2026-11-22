import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useStore } from '../context/StoreContext';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import {
  ROLE_NAV_MATRIX,
  type PlatformDevice,
  type PlatformRole,
  type PlatformVehicle,
} from '../utils/unifiedPlatformLogic';
import {
  getDefaultScreenForRole,
  isValidPlatformRole,
} from '../utils/platformAuthGuard';
import { computeRoleNavBadges } from '../utils/roleDashboardConfig';
import { AndroidShell } from '../components/platform/AndroidShell';
import { FirebaseRoleManagerModal } from '../components/platform/FirebaseRoleManagerModal';
import { IphoneShell } from '../components/platform/IphoneShell';
import { LaptopShell } from '../components/platform/LaptopShell';
import { PlatformAuthScreen } from '../components/platform/PlatformAuthScreen';
import { PlatformRoleViews } from '../components/platform/PlatformRoleViews';
import { ProtectedPlatformRoute } from '../components/platform/ProtectedPlatformRoute';
import { ScreenMatrixModal } from '../components/platform/ScreenMatrixModal';
import {
  toPlatformVehicleFromRtoRecord,
  type RtoVehicleMetadata,
} from '../utils/rtoRegistryDatabase';
import {
  lookupVehicleRecordByRto,
  parseTrackRtoFromSearch,
} from '../utils/vehicleSearchLogic';
import {
  DEMO_ACCOUNTS,
  type PlatformActions,
  type PlatformBootstrapData,
} from '../components/platform/platformTypes';
import { OnboardingTooltipTour } from '../components/OnboardingTooltipTour';
import {
  PLATFORM_DASHBOARD_TOUR_ID,
  PLATFORM_DASHBOARD_TOUR_STEPS,
} from '../utils/onboardingTourLogic';

interface UnifiedPlatformPageProps {
  initialPlatform?: PlatformDevice;
  initialRole?: PlatformRole;
  initialTrackRto?: string;
}

const VALID_PLATFORMS: readonly PlatformDevice[] = ['laptop', 'android', 'iphone'];

function resolvePlatformFromSearch(fallback: PlatformDevice): PlatformDevice {
  if (typeof window === 'undefined') return fallback;
  const p = new URLSearchParams(window.location.search).get('platform');
  if (p && (VALID_PLATFORMS as readonly string[]).includes(p)) {
    return p as PlatformDevice;
  }
  return fallback;
}

function resolveRoleFromSearch(fallback: PlatformRole): PlatformRole {
  if (typeof window === 'undefined') return fallback;
  const r = new URLSearchParams(window.location.search).get('role');
  if (isValidPlatformRole(r)) return r;
  return fallback;
}

export function UnifiedPlatformPage({
  initialPlatform = 'laptop',
  initialRole = 'super_admin',
  initialTrackRto,
}: UnifiedPlatformPageProps) {
  const { showToast, liveTracking } = useStore();
  const {
    identity,
    firebaseUser,
    verifiedRole,
    roleGrant,
    signOutPlatform,
    setSandboxIdentity,
    getFreshFirebaseIdToken,
  } = usePlatformAuth();

  const [platform, setPlatform] = useState<PlatformDevice>(() =>
    resolvePlatformFromSearch(initialPlatform)
  );
  const [selectedRoleForAuth, setSelectedRoleForAuth] = useState<PlatformRole>(
    () => resolveRoleFromSearch(initialRole)
  );
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<PlatformBootstrapData | null>(null);
  const [activeScreen, setActiveScreen] = useState<string>('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [roleManagerOpen, setRoleManagerOpen] = useState(false);
  const [platformTourOpen, setPlatformTourOpen] = useState(false);
  const [activeRtoLookup, setActiveRtoLookup] = useState<RtoVehicleMetadata | null>(null);
  const [injectedRtoVehicle, setInjectedRtoVehicle] = useState<PlatformVehicle | null>(null);
  const [pendingTrackRto, setPendingTrackRto] = useState<string | null>(() => {
    if (initialTrackRto) return initialTrackRto.trim().toUpperCase();
    if (liveTracking.selectedVehicle) {
      return liveTracking.selectedVehicle.vehicleNumber.trim().toUpperCase();
    }
    if (typeof window !== 'undefined') {
      return parseTrackRtoFromSearch(window.location.search);
    }
    return null;
  });
  const socketRef = useRef<Socket | null>(null);
  const lastHandledTriggerRef = useRef<number | null>(null);

  // Sync incoming initialTrackRto prop updates (e.g., from global Header VehicleSearch)
  useEffect(() => {
    if (initialTrackRto && initialTrackRto.trim()) {
      setPendingTrackRto(initialTrackRto.trim().toUpperCase());
    }
  }, [initialTrackRto]);

  const notify = useCallback(
    (msg: string, tone: 'success' | 'info' | 'error' = 'info') => {
      showToast(msg, tone);
    },
    [showToast]
  );

  // If Firebase Auth already has a signed-in verified user and no platform session yet, auto-exchange token
  useEffect(() => {
    if (sessionToken || !firebaseUser || !verifiedRole) return;
    let cancelled = false;

    const autoExchange = async () => {
      const idToken = await getFreshFirebaseIdToken();
      if (!idToken || cancelled) return;
      try {
        const res = await fetch('/api/platform/auth/firebase-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            role: verifiedRole,
            company: roleGrant?.company,
            status: roleGrant?.status,
          }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        const { token, ...rest } = data;
        const typed = rest as PlatformBootstrapData;
        setSessionToken(token);
        setBootstrap(typed);
        setActiveScreen(getDefaultScreenForRole(typed.user.role));
        setSelectedVehicleId(typed.vehicles[0]?.id ?? null);
      } catch {
        // User can still sign in manually from PlatformAuthScreen
      }
    };

    void autoExchange();
    return () => {
      cancelled = true;
    };
  }, [
    sessionToken,
    firebaseUser,
    verifiedRole,
    roleGrant?.company,
    roleGrant?.status,
    getFreshFirebaseIdToken,
  ]);

  // Connect live Socket.io telemetry stream whenever a valid session token is active
  useEffect(() => {
    if (!sessionToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('platform:subscribe', { token: sessionToken });
    });

    socket.on(
      'platform:vehicles:update',
      (payload: { vehicles?: PlatformVehicle[]; timestamp?: string }) => {
        if (!Array.isArray(payload.vehicles)) return;
        setBootstrap((prev) =>
          prev
            ? {
                ...prev,
                vehicles: payload.vehicles!,
                timestamp: payload.timestamp || prev.timestamp,
              }
            : prev
        );
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionToken]);

  // Keep any registry-only RTO vehicle smoothly ticking with live GPS movement when tracked
  useEffect(() => {
    if (!injectedRtoVehicle || injectedRtoVehicle.status !== 'Running') return;
    const timer = window.setInterval(() => {
      setInjectedRtoVehicle((prev) => {
        if (!prev || prev.status !== 'Running') return prev;
        const rad = (prev.headingDeg * Math.PI) / 180;
        const nextLat = Number((prev.lat + Math.cos(rad) * 0.00055).toFixed(5));
        const nextLng = Number((prev.lng + Math.sin(rad) * 0.00055).toFixed(5));
        const nextSpeed = Math.max(
          28,
          Math.min(prev.speedLimitKmh + 4, prev.speedKmh + (Math.random() > 0.5 ? 1 : -1))
        );
        const nextOdo =
          prev.odometerKm !== null ? Number((prev.odometerKm + 0.1).toFixed(1)) : null;
        return {
          ...prev,
          lat: nextLat,
          lng: nextLng,
          speedKmh: nextSpeed,
          odometerKm: nextOdo,
          distanceTodayKm: Number((prev.distanceTodayKm + 0.1).toFixed(1)),
          lastUpdated: 'Just now (Live GPS)',
          trail: [...prev.trail.slice(-14), [nextLat, nextLng]],
        };
      });
    }, 3500);
    return () => window.clearInterval(timer);
  }, [injectedRtoVehicle?.id, injectedRtoVehicle?.status]);

  const refreshBootstrap = useCallback(async () => {
    if (!sessionToken) return;
    const res = await fetch('/api/platform/bootstrap', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!res.ok) return;
    const next = (await res.json()) as PlatformBootstrapData;
    setBootstrap(next);
    if (!selectedVehicleId && next.vehicles[0]) {
      setSelectedVehicleId(next.vehicles[0].id);
    }
  }, [sessionToken, selectedVehicleId]);

  const apiCall = useCallback(
    async (
      method: 'POST' | 'PATCH' | 'DELETE',
      path: string,
      body?: Record<string, unknown>
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!sessionToken) return { ok: false, error: 'Not authenticated.' };
      try {
        const res = await fetch(path, {
          method,
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = await res.json();
        if (!res.ok) {
          notify(data.error || 'Action failed.', 'error');
          return { ok: false, error: data.error };
        }
        if (data.snapshot) {
          setBootstrap(data.snapshot as PlatformBootstrapData);
        } else {
          await refreshBootstrap();
        }
        return { ok: true };
      } catch {
        notify('Network error communicating with backend.', 'error');
        return { ok: false, error: 'Network error.' };
      }
    },
    [sessionToken, notify, refreshBootstrap]
  );

  const handleLoginSuccess = useCallback(
    (payload: {
      token: string;
      bootstrap: unknown;
      authSource: 'firebase' | 'sandbox';
    }) => {
      const typed = payload.bootstrap as PlatformBootstrapData;
      setSessionToken(payload.token);
      setBootstrap(typed);
      setSelectedRoleForAuth(typed.user.role);
      setActiveScreen(
        ROLE_NAV_MATRIX[typed.user.role].defaultScreens[platform] ??
          getDefaultScreenForRole(typed.user.role)
      );
      setSelectedVehicleId(typed.vehicles[0]?.id ?? null);
      setActiveRtoLookup(null);
      setInjectedRtoVehicle(null);
      setIsFullscreenMap(false);
      notify(
        `Signed into ${ROLE_NAV_MATRIX[typed.user.role].roleLabel} Portal (${
          payload.authSource === 'firebase' ? 'Firebase Verified' : 'Role Session'
        }).`,
        'success'
      );
    },
    [notify, platform]
  );

  const switchRoleQuick = useCallback(
    async (nextRole: PlatformRole) => {
      const demo = DEMO_ACCOUNTS[nextRole];
      try {
        const res = await fetch('/api/platform/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: nextRole,
            email: demo.email,
            password: demo.password,
            authMode: 'password',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          notify(data.error || 'Could not switch role.', 'error');
          return;
        }
        const { token, ...rest } = data;
        const typed = rest as PlatformBootstrapData;
        setSandboxIdentity({
          uid: typed.user.id,
          email: typed.user.email,
          role: typed.user.role,
          status: typed.user.status === 'Blocked' ? 'Blocked' : 'Active',
        });
        setSessionToken(token);
        setBootstrap(typed);
        setSelectedRoleForAuth(nextRole);
        setActiveScreen(
          ROLE_NAV_MATRIX[nextRole].defaultScreens[platform] ??
            getDefaultScreenForRole(nextRole)
        );
        setSelectedVehicleId(typed.vehicles[0]?.id ?? null);
        setActiveRtoLookup(null);
        setInjectedRtoVehicle(null);
        setSearchQuery('');
        setIsFullscreenMap(false);
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }
        notify(
          `Switched to ${ROLE_NAV_MATRIX[nextRole].roleLabel} Portal.`,
          'info'
        );
      } catch {
        notify('Unable to switch role portal.', 'error');
      }
    },
    [notify, platform, setSandboxIdentity]
  );

  const handleLogout = useCallback(() => {
    setSessionToken(null);
    setBootstrap(null);
    setSelectedVehicleId(null);
    setActiveRtoLookup(null);
    setInjectedRtoVehicle(null);
    setSearchQuery('');
    setIsFullscreenMap(false);
    void signOutPlatform();
    notify('Signed out of VS TrackPro.', 'info');
  }, [signOutPlatform, notify]);

  const handleSelectRtoVehicle = useCallback(
    (record: RtoVehicleMetadata) => {
      setActiveRtoLookup(record);
      const existingLive = bootstrap?.vehicles.find(
        (v) =>
          v.id === record.matchedLiveVehicleId ||
          v.vehicleNumber.toUpperCase() === record.vehicleNumber.toUpperCase()
      );

      if (existingLive) {
        setInjectedRtoVehicle(null);
        setSelectedVehicleId(existingLive.id);
      } else {
        const synthesized = toPlatformVehicleFromRtoRecord(record);
        setInjectedRtoVehicle(synthesized);
        setSelectedVehicleId(synthesized.id);
      }

      // Reset filter query so all fleet pins remain accessible while focusing the selected RTO vehicle
      setSearchQuery('');
      const targetScreen = bootstrap?.user.role === 'customer' ? 'live-tracking' : 'live-map';
      setActiveScreen(targetScreen);
      notify(
        `Live Tracking started for ${record.vehicleNumber} (${record.rtoOffice}).`,
        'success'
      );
    },
    [bootstrap?.vehicles, bootstrap?.user.role, notify]
  );

  // Automatically launch Live Map Tracking once authenticated whenever a deep-linked RTO or global liveTracking trigger is active
  useEffect(() => {
    if (!sessionToken || !bootstrap) return;

    if (
      liveTracking.selectedVehicle &&
      liveTracking.lastTriggeredAt !== null &&
      liveTracking.lastTriggeredAt !== lastHandledTriggerRef.current
    ) {
      lastHandledTriggerRef.current = liveTracking.lastTriggeredAt;
      setPendingTrackRto(null);
      handleSelectRtoVehicle(liveTracking.selectedVehicle);
      return;
    }

    if (!pendingTrackRto) return;
    const record = lookupVehicleRecordByRto(pendingTrackRto, bootstrap.vehicles);
    setPendingTrackRto(null);
    if (record) {
      handleSelectRtoVehicle(record);
    } else {
      notify(`RTO vehicle ${pendingTrackRto} was not found in the registry.`, 'info');
    }
  }, [
    sessionToken,
    bootstrap,
    pendingTrackRto,
    liveTracking.selectedVehicle,
    liveTracking.lastTriggeredAt,
    handleSelectRtoVehicle,
    notify,
  ]);

  const actions: PlatformActions = useMemo(
    () => ({
      refresh: refreshBootstrap,
      apiPost: (path, body) => apiCall('POST', path, body),
      apiPatch: (path, body) => apiCall('PATCH', path, body),
      apiDelete: (path) => apiCall('DELETE', path),
      notify,
      logout: handleLogout,
      switchPlatform: (p) => setPlatform(p),
      switchRoleQuick,
      openScreenMatrix: () => setMatrixOpen(true),
    }),
    [refreshBootstrap, apiCall, notify, handleLogout, switchRoleQuick]
  );

  const handleJumpFromMatrix = useCallback(
    (targetRole: PlatformRole, targetPlatform: PlatformDevice, screenId?: string) => {
      setPlatform(targetPlatform);
      if (bootstrap?.user.role === targetRole) {
        if (screenId) setActiveScreen(screenId);
        return;
      }
      void switchRoleQuick(targetRole);
    },
    [bootstrap?.user.role, switchRoleQuick]
  );

  // Keep active identity synchronized with loaded bootstrap user
  const effectiveIdentity = useMemo(() => {
    if (identity.isAuthenticated && identity.role) return identity;
    if (bootstrap?.user) {
      return {
        isAuthenticated: true,
        uid: bootstrap.user.id,
        email: bootstrap.user.email,
        emailVerified: true,
        role: bootstrap.user.role,
        status: bootstrap.user.status === 'Blocked' ? ('Blocked' as const) : ('Active' as const),
        authSource: 'sandbox' as const,
      };
    }
    return identity;
  }, [identity, bootstrap]);

  const effectiveBootstrap: PlatformBootstrapData | null = useMemo(() => {
    if (!bootstrap) return null;
    if (!injectedRtoVehicle) return bootstrap;
    const alreadyPresent = bootstrap.vehicles.some(
      (v) =>
        v.id === injectedRtoVehicle.id ||
        v.vehicleNumber.toUpperCase() === injectedRtoVehicle.vehicleNumber.toUpperCase()
    );
    if (alreadyPresent) return bootstrap;
    return {
      ...bootstrap,
      vehicles: [injectedRtoVehicle, ...bootstrap.vehicles],
    };
  }, [bootstrap, injectedRtoVehicle]);

  if (!sessionToken || !effectiveBootstrap) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0A1128]">
        {/* Top platform switcher even before sign-in so all 3 login designs are reachable */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-[#A9B4D0]">
            Select target platform design before sign-in:
          </div>
          <div className="inline-flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111B3A]">
            {(['laptop', 'android', 'iphone'] as const).map((p) => (
              <button
                key={p}
                type="button"
                data-testid={`prelogin-platform-${p}`}
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                  platform === p
                    ? 'bg-[#00D4FF] text-[#0A1128]'
                    : 'text-slate-600 dark:text-[#A9B4D0]'
                }`}
              >
                {p === 'laptop'
                  ? 'Laptop Web'
                  : p === 'android'
                  ? 'Android M3'
                  : 'iPhone iOS'}
              </button>
            ))}
          </div>
        </div>

        {pendingTrackRto && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
            <div
              data-testid="pending-rto-auth-banner"
              className="rounded-xl border border-cyan-500/35 bg-white dark:bg-[#111B3A] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="text-slate-700 dark:text-slate-200">
                <span className="font-semibold text-cyan-700 dark:text-[#00D4FF]">
                  Live Map Tracking Pending:
                </span>{' '}
                Sign in below to launch real-time GPS tracking and RTO metadata for{' '}
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {pendingTrackRto}
                </span>
                .
              </div>
              <button
                type="button"
                onClick={() => setPendingTrackRto(null)}
                className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <PlatformAuthScreen
          platform={platform}
          selectedRole={selectedRoleForAuth}
          onSelectRole={setSelectedRoleForAuth}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  const activeRole = effectiveBootstrap.user.role;
  const unreadAlertsCount = effectiveBootstrap.alerts.filter((a) => !a.acknowledged).length;
  const roleNavBadges = computeRoleNavBadges(activeRole, {
    user: effectiveBootstrap.user,
    admins: effectiveBootstrap.admins,
    clients: effectiveBootstrap.clients,
    customers: effectiveBootstrap.customers,
    vehicles: effectiveBootstrap.vehicles,
    devices: effectiveBootstrap.devices,
    alerts: effectiveBootstrap.alerts,
    pods: effectiveBootstrap.pods,
    tickets: effectiveBootstrap.tickets,
    geofencesCount: effectiveBootstrap.geofences.length,
    deviceCatalogCount: effectiveBootstrap.deviceCatalogCount,
    apiIntegrationsCount: effectiveBootstrap.apiIntegrationsCount,
    uptimePercent: effectiveBootstrap.uptimeStats.uptimePercent,
  });

  const protectedContent = (
    <ProtectedPlatformRoute
      identity={effectiveIdentity}
      allowedRoles={[activeRole]}
      requiredScreen={activeScreen}
      onReturnToSafeRoute={(fallback) => setActiveScreen(fallback)}
      onSignOut={handleLogout}
    >
      <PlatformRoleViews
        screenId={activeScreen}
        platform={platform}
        data={effectiveBootstrap}
        actions={actions}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={setSelectedVehicleId}
        searchQuery={searchQuery}
        onNavigateScreen={setActiveScreen}
        onSelectRtoVehicle={handleSelectRtoVehicle}
        activeRtoLookup={activeRtoLookup}
        onDismissRtoLookup={() => setActiveRtoLookup(null)}
        compact={platform !== 'laptop'}
        isFullscreenMap={isFullscreenMap}
        onToggleFullscreenMap={() => setIsFullscreenMap((v) => !v)}
      />
    </ProtectedPlatformRoute>
  );

  // Trigger a restricted Super Admin-only screen ('admins') so non-Super-Admins can verify RBAC route protection
  const handleTestGuardDenied = () => {
    setActiveScreen('admins');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0A1128] pb-16 lg:pb-6">
      {platform === 'laptop' && (
        <LaptopShell
          role={activeRole}
          activeScreen={activeScreen}
          onSelectScreen={setActiveScreen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          liveVehicles={effectiveBootstrap.vehicles}
          onSelectRtoVehicle={handleSelectRtoVehicle}
          platform={platform}
          onSwitchPlatform={setPlatform}
          onSwitchRoleQuick={(r) => void switchRoleQuick(r)}
          onOpenMatrix={() => setMatrixOpen(true)}
          onOpenRoleManager={
            activeRole === 'super_admin' ? () => setRoleManagerOpen(true) : undefined
          }
          onTestGuardDenied={
            activeRole !== 'super_admin' ? handleTestGuardDenied : undefined
          }
          onLogout={handleLogout}
          identity={effectiveIdentity}
          userName={effectiveBootstrap.user.name}
          companyName={effectiveBootstrap.user.company}
          unreadAlertsCount={unreadAlertsCount}
          navBadges={roleNavBadges}
          isFullscreenMap={isFullscreenMap}
          onToggleFullscreenMap={() => setIsFullscreenMap((v) => !v)}
          onStartTour={() => setPlatformTourOpen(true)}
        >
          {protectedContent}
        </LaptopShell>
      )}

      {platform === 'android' && (
        <AndroidShell
          role={activeRole}
          activeScreen={activeScreen}
          onSelectScreen={setActiveScreen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          liveVehicles={effectiveBootstrap.vehicles}
          onSelectRtoVehicle={handleSelectRtoVehicle}
          onSwitchPlatform={setPlatform}
          onSwitchRoleQuick={(r) => void switchRoleQuick(r)}
          onOpenMatrix={() => setMatrixOpen(true)}
          onOpenRoleManager={
            activeRole === 'super_admin' ? () => setRoleManagerOpen(true) : undefined
          }
          onTestGuardDenied={
            activeRole !== 'super_admin' ? handleTestGuardDenied : undefined
          }
          onLogout={handleLogout}
          identity={effectiveIdentity}
          userName={effectiveBootstrap.user.name}
          unreadAlertsCount={unreadAlertsCount}
          navBadges={roleNavBadges}
        >
          {protectedContent}
        </AndroidShell>
      )}

      {platform === 'iphone' && (
        <IphoneShell
          role={activeRole}
          activeScreen={activeScreen}
          onSelectScreen={setActiveScreen}
          liveVehicles={effectiveBootstrap.vehicles}
          onSelectRtoVehicle={handleSelectRtoVehicle}
          onSwitchPlatform={setPlatform}
          onSwitchRoleQuick={(r) => void switchRoleQuick(r)}
          onOpenMatrix={() => setMatrixOpen(true)}
          onOpenRoleManager={
            activeRole === 'super_admin' ? () => setRoleManagerOpen(true) : undefined
          }
          onTestGuardDenied={
            activeRole !== 'super_admin' ? handleTestGuardDenied : undefined
          }
          onLogout={handleLogout}
          identity={effectiveIdentity}
          userName={effectiveBootstrap.user.name}
          unreadAlertsCount={unreadAlertsCount}
          navBadges={roleNavBadges}
        >
          {protectedContent}
        </IphoneShell>
      )}

      <ScreenMatrixModal
        open={matrixOpen}
        activeRole={activeRole}
        activePlatform={platform}
        onClose={() => setMatrixOpen(false)}
        onJump={handleJumpFromMatrix}
      />

      <FirebaseRoleManagerModal
        open={roleManagerOpen}
        onClose={() => setRoleManagerOpen(false)}
        onNotify={notify}
      />

      {platform === 'laptop' && (
        <OnboardingTooltipTour
          tourId={PLATFORM_DASHBOARD_TOUR_ID}
          steps={PLATFORM_DASHBOARD_TOUR_STEPS}
          isOpen={platformTourOpen}
          onOpenChange={setPlatformTourOpen}
          autoStartForNewUsers
          onComplete={(reason) => {
            if (reason === 'finished') {
              notify('TrackPro OS dashboard tour completed.', 'success');
            }
          }}
        />
      )}
    </div>
  );
}
