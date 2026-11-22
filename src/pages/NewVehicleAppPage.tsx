import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Monitor,
  Moon,
  Shield,
  Smartphone,
  Sun,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  QuickUnlockOverlay,
  StillThereModal,
  WizardAuthGate,
  type WizardAuthSession,
} from '../components/wizard/WizardAuthGate';
import {
  NewVehicleWizardView,
  type WizardBootstrapData,
} from '../components/wizard/NewVehicleWizardView';
import {
  TurboTrackersCompanion,
  type CompanionTab,
  type TurboTrackVehicle,
} from '../components/wizard/TurboTrackersCompanion';
import { StageInstallModal } from '../components/wizard/StageInstallModal';
import type { FormStyleMode } from '../components/wizard/WizardSharedWidgets';
import {
  CUSTOMER_STAGE_SPECS,
  detectDefaultCustomerStage,
  parseCustomerStage,
  type CustomerStage,
} from '../utils/rtoLookup';

const DRAFT_STORAGE_KEY = 'tt_wizard_encrypted_draft_v1';

function resolveInitialStage(): CustomerStage {
  if (typeof window === 'undefined') return 'web';
  const params = new URLSearchParams(window.location.search);
  const fromQuery = parseCustomerStage(params.get('stage'));
  if (fromQuery) return fromQuery;
  return detectDefaultCustomerStage(window.navigator.userAgent, window.innerWidth);
}

export function NewVehicleAppPage() {
  const { navigate, theme, toggleTheme } = useStore();

  // 3 Customer Delivery Stages: Android App | iPhone App | Laptop / PC Website
  const [stage, setStage] = useState<CustomerStage>(resolveInitialStage);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const handleStageChange = useCallback((nextStage: CustomerStage) => {
    setStage(nextStage);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'new-vehicle');
      url.searchParams.set('stage', nextStage);
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    } catch {
      // Ignore history errors in sandboxed iframes
    }
  }, []);

  // Stable per-client device ID bound during login (never stores tokens in localStorage!)
  const [deviceId] = useState<string>(() => {
    try {
      const existing = window.sessionStorage.getItem('tt_bound_device_id');
      if (existing) return existing;
      const fresh = `tt-device-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem('tt_bound_device_id', fresh);
      return fresh;
    } catch {
      return `tt-device-${Date.now()}`;
    }
  });

  // Strictly IN-MEMORY session state (C2/C5: tokens never written to localStorage/sessionStorage)
  const [session, setSession] = useState<WizardAuthSession | null>(null);
  const [previousRefreshToken, setPreviousRefreshToken] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<WizardBootstrapData | null>(null);
  const [trackingVehicles, setTrackingVehicles] = useState<TurboTrackVehicle[]>([]);

  // Active app screen: default to 'companion' (Dashboard with RTO Search Bar right after login)
  const [mode, setMode] = useState<'wizard' | 'companion'>('companion');
  const [companionTab, setCompanionTab] = useState<CompanionTab>('Dashboard');
  const [focusedVehicle, setFocusedVehicle] = useState<string | undefined>(undefined);
  const [formStyle, setFormStyle] = useState<FormStyleMode>('smart');

  // Lock screen & Inactivity countdown ("Still there?" 30s warning driven by Step 1 Inactive Time)
  const [appLocked, setAppLocked] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [stillThereSec, setStillThereSec] = useState<number | null>(null);
  const [privacyVeil, setPrivacyVeil] = useState(false);
  const [securityBanner, setSecurityBanner] = useState<string | null>(null);

  const lastActivityRef = useRef<number>(Date.now());

  const fetchBootstrap = useCallback(async (activeSession: WizardAuthSession) => {
    try {
      const res = await fetch('/api/wizard/bootstrap', {
        headers: { Authorization: `Bearer ${activeSession.accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setBootstrap({
        dataScope: data.dataScope,
        dropdowns: data.dropdowns,
        records: data.records,
        lastStepUpAtMs: data.lastStepUpAtMs,
      });
      setTrackingVehicles(data.trackingVehicles || []);
      if (data.user?.inactiveTimeMinutes) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                user: {
                  ...prev.user,
                  inactiveTimeMinutes: data.user.inactiveTimeMinutes,
                },
              }
            : null
        );
      }
    } catch {
      // Ignore transient network errors
    }
  }, []);

  const handleAuthenticated = useCallback(
    async (newSession: WizardAuthSession) => {
      setSession(newSession);
      setPreviousRefreshToken(null);
      setSecurityBanner(null);
      setAppLocked(false);
      setStillThereSec(null);
      lastActivityRef.current = Date.now();
      await fetchBootstrap(newSession);

      // Always land right on the Dashboard with RTO Search Bar & Live Tracking immediately after login
      setMode('companion');
      setCompanionTab('Dashboard');
    },
    [fetchBootstrap]
  );

  const handleSignOut = useCallback(
    async (reason?: string) => {
      if (session) {
        try {
          await fetch('/api/wizard-auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.accessToken}` },
          });
        } catch {
          // Best-effort server revoke
        }
      }
      // Wipe encrypted local drafts on logout (C5)
      try {
        window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
      setSession(null);
      setBootstrap(null);
      setTrackingVehicles([]);
      setAppLocked(false);
      setStillThereSec(null);
      if (reason) setSecurityBanner(reason);
    },
    [session]
  );

  // Scroll viewport to top whenever switching between auth, wizard, and companion tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [session, mode, companionTab]);

  // Live Tracking polling (every 4s) whenever authenticated so Dashboard RTO Search stays live
  useEffect(() => {
    if (!session) return;
    const poll = async () => {
      try {
        const res = await fetch('/api/wizard/tracking', {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTrackingVehicles(data.vehicles || []);
        }
      } catch {
        // Ignore transient network failure
      }
    };
    poll();
    const timer = window.setInterval(poll, 4000);
    return () => window.clearInterval(timer);
  }, [session, mode]);

  // Privacy veil on document hidden (FLAG_SECURE web equivalent)
  useEffect(() => {
    const onVis = () => {
      setPrivacyVeil(document.hidden);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Track user activity & enforce Inactive Time auto-logout with 30s "Still there?" countdown (C2)
  useEffect(() => {
    if (!session) return;

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('pointerdown', markActive, { passive: true });
    window.addEventListener('keydown', markActive, { passive: true });

    const interval = window.setInterval(() => {
      const inactiveMs = (session.user.inactiveTimeMinutes || 12) * 60 * 1000;
      const warnThresholdMs = Math.max(inactiveMs - 30_000, 30_000);
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= inactiveMs) {
        handleSignOut('Signed out automatically after reaching Inactive Time.');
      } else if (elapsed >= warnThresholdMs) {
        const secs = Math.max(1, Math.ceil((inactiveMs - elapsed) / 1000));
        setStillThereSec(secs);
      } else {
        setStillThereSec(null);
      }
    }, 1000);

    return () => {
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('keydown', markActive);
      window.clearInterval(interval);
    };
  }, [session, handleSignOut]);

  // Token rotation (C2)
  const handleRotateRefreshToken = async (): Promise<string> => {
    if (!session) return 'No active session.';
    const oldToken = session.refreshToken;
    const res = await fetch('/api/wizard-auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: oldToken, deviceId }),
    });
    const data = await res.json();
    if (!res.ok) {
      await handleSignOut(data.error || 'Session expired. Please sign in again.');
      return data.error || 'Refresh failed.';
    }
    setPreviousRefreshToken(oldToken);
    setSession((prev) =>
      prev
        ? {
            ...prev,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            signingKey: data.signingKey,
            expiresAtMs: Date.now() + (data.expiresInSec || 900) * 1000,
          }
        : null
    );
    return 'Refresh token rotated cleanly. Fresh 15-minute access token issued.';
  };

  // Demonstrate C2 reuse detection: presenting an already-rotated token revokes the whole family
  const handleSimulateTokenReuse = async () => {
    if (!session) return;
    let stolenToken = previousRefreshToken;
    if (!stolenToken) {
      stolenToken = session.refreshToken;
      await handleRotateRefreshToken();
    }
    const res = await fetch('/api/wizard-auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stolenToken, deviceId }),
    });
    const data = await res.json();
    if (!res.ok) {
      await handleSignOut(
        data.error || 'Refresh token reuse detected. Session family revoked.'
      );
    }
  };

  // Unlock app via PIN or Biometric
  const handleUnlockPin = async (pin: string) => {
    if (!session) return;
    setLockError(null);
    const res = await fetch('/api/wizard-auth/step-up', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ method: 'pin', credential: pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLockError(data.error || 'Incorrect PIN.');
      return;
    }
    setAppLocked(false);
    lastActivityRef.current = Date.now();
  };

  const handleUnlockBiometric = async () => {
    if (!session) return;
    setLockError(null);
    const res = await fetch('/api/wizard-auth/step-up', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        method: 'biometric',
        credential: `biometric-verified:${Date.now()}`,
      }),
    });
    if (res.ok) {
      setAppLocked(false);
      lastActivityRef.current = Date.now();
    }
  };

  const stageButtons: Array<{
    id: CustomerStage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'android', label: 'Android', icon: Smartphone },
    { id: 'iphone', label: 'iPhone', icon: Smartphone },
    { id: 'web', label: 'Laptop / PC', icon: Monitor },
  ];

  // Dynamic shell container based on customer stage
  const isMobileStage = stage === 'android' || stage === 'iphone';
  const frameClass =
    stage === 'web'
      ? 'w-full max-w-7xl mx-auto flex-1 flex flex-col sm:rounded-3xl overflow-hidden sm:shadow-2xl sm:border border-slate-200/80 dark:border-white/10 bg-[#F6F5FA] dark:bg-[#120F1B]'
      : stage === 'iphone'
      ? 'w-full sm:max-w-[430px] mx-auto flex-1 flex flex-col sm:rounded-[40px] overflow-hidden sm:shadow-2xl sm:border-[6px] sm:border-slate-900 dark:sm:border-slate-700 bg-[#F2F2F7] dark:bg-[#0D0D12]'
      : 'w-full sm:max-w-[430px] mx-auto flex-1 flex flex-col sm:rounded-[32px] overflow-hidden sm:shadow-2xl sm:border-[5px] sm:border-[#240D36] dark:sm:border-purple-900/70 bg-[#F6F5FA] dark:bg-[#120F1B]';

  return (
    <div
      data-testid="new-vehicle-app-page"
      data-customer-stage={stage}
      className="min-h-screen flex-1 bg-[#EDEAF3] dark:bg-[#0B0812] sm:py-4 sm:px-4 flex flex-col gap-3"
    >
      {/* Privacy Veil when document is backgrounded (FLAG_SECURE web equivalent) */}
      {privacyVeil && (
        <div className="fixed inset-0 z-[100] bg-[#12071C] text-white flex flex-col items-center justify-center gap-3">
          <Shield className="w-10 h-10 text-[#00A88F]" />
          <p className="text-sm font-semibold">Protected Screen · TurboTrackers</p>
        </div>
      )}

      {/* Top 3-Stage Customer Delivery & Download Bar */}
      <div
        data-testid="customer-stage-bar"
        className={`w-full ${
          stage === 'web' ? 'max-w-7xl' : session ? 'max-w-3xl' : 'max-w-md'
        } mx-auto px-3 sm:px-0 pt-2 sm:pt-0 flex flex-wrap items-center justify-between gap-2 text-xs`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate({ page: 'home' })}
            className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:text-[#4B2166] dark:hover:text-purple-300 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">VS Technology</span>
          </button>
          <span className="text-slate-300 dark:text-white/20 hidden sm:inline">|</span>
          <div
            role="tablist"
            aria-label="Select Customer App Stage"
            className="inline-flex items-center rounded-xl bg-white dark:bg-[#191524] border border-slate-200 dark:border-white/10 p-0.5 shadow-xs"
          >
            {stageButtons.map((btn) => {
              const Icon = btn.icon;
              const active = stage === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`stage-switch-${btn.id}`}
                  onClick={() => handleStageChange(btn.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    active
                      ? btn.id === 'iphone'
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#4B2166] text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="open-download-modal-btn"
            onClick={() => setInstallModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00A88F] hover:bg-[#00947D] text-white font-bold shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download App</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle light or dark theme"
            className="p-2 rounded-xl bg-white dark:bg-[#191524] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!session ? (
        <div className="w-full max-w-md mx-auto space-y-3 px-4 pb-6 sm:px-0">
          <div className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#191524] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              Active delivery stage:{' '}
              <strong className="text-slate-900 dark:text-white">
                {CUSTOMER_STAGE_SPECS[stage].label}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setInstallModalOpen(true)}
              className="text-[#00A88F] font-bold hover:underline cursor-pointer shrink-0"
            >
              Install guide
            </button>
          </div>
          {securityBanner && (
            <div
              role="alert"
              data-testid="wizard-security-alert-banner"
              className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 text-xs font-medium text-amber-950 dark:text-amber-100"
            >
              {securityBanner}
            </div>
          )}
          <WizardAuthGate
            deviceId={deviceId}
            onAuthenticated={handleAuthenticated}
          />
        </div>
      ) : (
        <div className={frameClass}>
          {/* Authentic iPhone Dynamic Notch Strip on desktop preview */}
          {stage === 'iphone' && (
            <div className="hidden sm:flex items-center justify-between px-6 pt-2 pb-1 bg-white/95 dark:bg-[#191524]/95 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shrink-0">
              <span>9:41</span>
              <div className="w-24 h-4 rounded-full bg-slate-900 dark:bg-black" />
              <span>5G · 100%</span>
            </div>
          )}

          {mode === 'wizard' && bootstrap ? (
            <NewVehicleWizardView
              session={session}
              bootstrap={bootstrap}
              formStyle={formStyle}
              onChangeFormStyle={setFormStyle}
              onRefreshBootstrap={() => fetchBootstrap(session)}
              onUpdateStepUpTimestamp={(ts) =>
                setSession((prev) => (prev ? { ...prev, lastStepUpAtMs: ts } : null))
              }
              onExitToDashboard={() => {
                setMode('companion');
                setCompanionTab('Dashboard');
              }}
              onViewOnMap={(vehicleNum) => {
                setFocusedVehicle(vehicleNum);
                setMode('companion');
                setCompanionTab('Dashboard');
              }}
            />
          ) : (
            <TurboTrackersCompanion
              session={session}
              vehicles={trackingVehicles}
              dataScope={bootstrap?.dataScope || 'own_transporter'}
              activeTab={companionTab}
              focusedVehicleNumber={focusedVehicle}
              formStyle={formStyle}
              stage={stage}
              onChangeTab={setCompanionTab}
              onChangeFormStyle={setFormStyle}
              onChangeStage={handleStageChange}
              onOpenInstallModal={() => setInstallModalOpen(true)}
              onLaunchWizard={() => setMode('wizard')}
              onLockApp={() => {
                setLockError(null);
                setAppLocked(true);
              }}
              onRotateRefreshToken={handleRotateRefreshToken}
              onSimulateTokenReuse={handleSimulateTokenReuse}
              onSignOut={() => handleSignOut('Signed out cleanly. Local drafts cleared.')}
            />
          )}
        </div>
      )}

      {/* Subtle footer hint on desktop when viewing mobile stage */}
      {session && isMobileStage && (
        <p className="hidden sm:block text-center text-[11px] text-slate-500 dark:text-slate-400">
          Viewing <strong className="text-slate-700 dark:text-slate-200">{CUSTOMER_STAGE_SPECS[stage].label}</strong> stage · Switch to Laptop / PC anytime or click Download App to install on customer devices.
        </p>
      )}

      {/* 3-Platform Download & Install Modal (Android · iPhone · Laptop / PC) */}
      <StageInstallModal
        open={installModalOpen}
        initialStage={stage}
        onClose={() => setInstallModalOpen(false)}
        onSelectStage={(next) => {
          handleStageChange(next);
          setInstallModalOpen(false);
        }}
      />

      {/* Optional Quick Unlock Overlay (PIN / Biometric) */}
      {session && appLocked && (
        <QuickUnlockOverlay
          username={session.user.username}
          role={session.user.role}
          onUnlockWithPin={handleUnlockPin}
          onUnlockBiometric={handleUnlockBiometric}
          onSignOut={() => handleSignOut('Signed out from lock screen.')}
          error={lockError}
        />
      )}

      {/* Auto-logout 30s "Still there?" countdown modal */}
      {session && stillThereSec !== null && (
        <StillThereModal
          secondsLeft={stillThereSec}
          inactiveMinutes={session.user.inactiveTimeMinutes}
          onStaySignedIn={() => {
            lastActivityRef.current = Date.now();
            setStillThereSec(null);
          }}
          onLogoutNow={() => handleSignOut('Signed out.')}
        />
      )}
    </div>
  );
}
