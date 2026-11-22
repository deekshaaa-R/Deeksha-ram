import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  Shield,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from 'lucide-react';
import type { WizardRole } from '../../utils/wizardSecurity';
import { OtpField, PasswordStrengthMeter } from './WizardSharedWidgets';

export interface WizardAuthSession {
  accessToken: string;
  refreshToken: string;
  signingKey: string;
  expiresAtMs: number;
  deviceId: string;
  lastStepUpAtMs: number;
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    role: WizardRole;
    transporterId?: string;
    inactiveTimeMinutes: number;
  };
}

const DEMO_ACCOUNTS: Array<{
  username: string;
  role: WizardRole;
  scopeNote: string;
}> = [
  { username: 'superadmin', role: 'Super Admin', scopeNote: 'All steps + Security Log' },
  { username: 'admin_ops', role: 'Admin', scopeNote: 'All steps + Security Log' },
  { username: 'deccan_trans', role: 'Transporter Admin', scopeNote: 'Own fleet · Steps 3, 5, 6 + Live Tracking' },
  { username: 'tech_ravi', role: 'Technician', scopeNote: 'Step 2 (Add Device) + Live Tracking' },
  { username: 'viewer_ananya', role: 'Viewer', scopeNote: 'Live Tracking only' },
];

export function WizardAuthGate({
  deviceId,
  onAuthenticated,
}: {
  deviceId: string;
  onAuthenticated: (session: WizardAuthSession) => void;
}) {
  const [stage, setStage] = useState<'credentials' | 'otp'>('credentials');
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showStrength, setShowStrength] = useState(false);

  const [challengeId, setChallengeId] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpChannel, setOtpChannel] = useState<'totp' | 'sms_email'>('totp');
  const [expiresSec, setExpiresSec] = useState(300);
  const [resendCooldownSec, setResendCooldownSec] = useState(30);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);

  // C1: Clear password field on app background (visibilitychange)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && password) {
        setPassword('');
        setPrivacyNotice('Password field cleared automatically while app was in background.');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [password]);

  // Countdown timers for OTP expiry (5m) and resend cooldown (30s)
  useEffect(() => {
    if (stage !== 'otp') return;
    const timer = window.setInterval(() => {
      setExpiresSec((s) => (s > 0 ? s - 1 : 0));
      setResendCooldownSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPrivacyNotice(null);
    setLoading(true);
    try {
      const res = await fetch('/api/wizard-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, deviceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid username or password.');
        return;
      }
      // Clear password from component state immediately after credential handoff
      setPassword('');
      setChallengeId(data.challengeId);
      setDemoOtp(data.demoOtp || '');
      setExpiresSec(data.expiresInSec || 300);
      setResendCooldownSec(data.resendCooldownSec || 30);
      setOtpInput('');
      setStage('otp');
    } catch {
      setError('Unable to reach authentication service. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError(null);
    try {
      const res = await fetch('/api/wizard-auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not resend verification code.');
        return;
      }
      setDemoOtp(data.demoOtp || '');
      setExpiresSec(data.expiresInSec || 300);
      setResendCooldownSec(data.resendCooldownSec || 30);
    } catch {
      setError('Network error while resending code.');
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/wizard-auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          code: otpInput,
          deviceId,
          deviceLabel: 'Android Fleet Client (M3)',
          devicePublicKey: `ecdsa-p256-${deviceId}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        return;
      }
      onAuthenticated({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        signingKey: data.signingKey,
        expiresAtMs: Date.now() + (data.expiresInSec || 900) * 1000,
        deviceId,
        lastStepUpAtMs: Date.now(),
        user: data.user,
      });
    } catch {
      setError('Unable to verify second factor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-[#191524] rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden">
      {/* Deep Purple Material 3 Header */}
      <div
        className="px-6 pt-6 pb-5 text-white"
        style={{
          background: 'linear-gradient(110deg, #4B2166 0%, #240D36 60%, #12071C 100%)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#00D4B4]" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">
                TurboTrackers Admin &amp; Fleet
              </h1>
              <p className="text-[11px] text-purple-200">
                L1 Strong Sign-In · Mandatory 2FA · RBAC Enforced
              </p>
            </div>
          </div>
          <span
            title="Sensitive screen protection enabled"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-[10px] font-semibold text-purple-100"
          >
            <Lock className="w-3 h-3" />
            <span>Protected</span>
          </span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {stage === 'credentials' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Quick Role Selector for Testing All 5 RBAC Roles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Select a seeded role account to test RBAC:
                </span>
                <button
                  type="button"
                  data-testid="auth-fill-demo-password"
                  onClick={() => setPassword('Fleet#Secure2026!')}
                  className="text-[11px] font-semibold text-[#4B2166] dark:text-purple-300 underline cursor-pointer"
                >
                  Fill strong demo password
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => {
                  const selected = username === acc.username;
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      data-testid={`auth-role-preset-${acc.username}`}
                      onClick={() => {
                        setUsername(acc.username);
                        setPassword('Fleet#Secure2026!');
                        setError(null);
                      }}
                      className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        selected
                          ? 'border-[#4B2166] bg-[#4B2166]/8 dark:bg-purple-500/20'
                          : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <UserCheck
                          className={`w-4 h-4 shrink-0 ${
                            selected ? 'text-[#4B2166] dark:text-purple-300' : 'text-slate-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {acc.role}{' '}
                            <span className="font-mono font-normal text-slate-500 dark:text-slate-400">
                              ({acc.username})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {acc.scopeNote}
                          </div>
                        </div>
                      </div>
                      {selected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#4B2166] text-white shrink-0">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="wiz-auth-username"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100"
              >
                Username *
              </label>
              <input
                id="wiz-auth-username"
                data-testid="wizard-login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Username"
                required
                className="w-full min-h-[52px] px-3.5 rounded-[12px] border border-slate-300 dark:border-white/15 bg-white dark:bg-[#120F1B] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#4B2166]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="wiz-auth-password"
                  className="block text-sm font-medium text-slate-900 dark:text-slate-100"
                >
                  Password *
                </label>
                <button
                  type="button"
                  onClick={() => setShowStrength((v) => !v)}
                  className="text-[11px] font-medium text-slate-500 hover:text-[#4B2166] cursor-pointer"
                >
                  {showStrength ? 'Hide policy check' : 'Check password policy'}
                </button>
              </div>
              <div className="relative flex items-center rounded-[12px] border border-slate-300 dark:border-white/15 bg-white dark:bg-[#120F1B] min-h-[52px] px-3.5 focus-within:border-[#4B2166]">
                <input
                  id="wiz-auth-password"
                  data-testid="wizard-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  required
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none py-3"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="p-1.5 text-slate-500 cursor-pointer"
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              {(showStrength || password.length > 0) && (
                <PasswordStrengthMeter password={password} username={username} />
              )}
            </div>

            {privacyNotice && (
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#4B2166] shrink-0" />
                <span>{privacyNotice}</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                data-testid="wizard-login-error"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-200 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              data-testid="wizard-login-submit"
              className="w-full py-3.5 rounded-xl bg-[#4B2166] hover:bg-[#5E2A7F] text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <span>{loading ? 'Verifying credentials...' : 'Continue to 2FA Verification'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Device bound: {deviceId.slice(0, 12)}</span>
              </span>
              <span>5 fails → 15 min lock</span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#4B2166] dark:text-purple-300" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Mandatory Second Factor (2FA)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Single-use 6-digit code · Account: {username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStage('credentials');
                  setError(null);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Change user
              </button>
            </div>

            {demoOtp && (
              <div
                data-testid="wizard-demo-otp-banner"
                className="p-3 rounded-xl bg-[#00A88F]/10 border border-[#00A88F]/30 flex items-center justify-between gap-2 text-xs"
              >
                <div className="text-slate-800 dark:text-teal-100">
                  Demo TOTP code:{' '}
                  <strong
                    data-testid="wizard-demo-otp-code"
                    className="font-mono text-sm tracking-wider text-[#007B68] dark:text-teal-300"
                  >
                    {demoOtp}
                  </strong>
                </div>
                <button
                  type="button"
                  data-testid="wizard-autofill-otp-btn"
                  onClick={() => setOtpInput(demoOtp)}
                  className="px-2.5 py-1 rounded-lg bg-[#00A88F] text-white font-semibold text-[11px] cursor-pointer"
                >
                  Auto-fill
                </button>
              </div>
            )}

            <OtpField
              value={otpInput}
              expiresSec={expiresSec}
              resendCooldownSec={resendCooldownSec}
              channel={otpChannel}
              onChangeChannel={setOtpChannel}
              onChange={setOtpInput}
              onResend={handleResendOtp}
            />

            {error && (
              <div
                role="alert"
                data-testid="wizard-otp-error"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-200 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otpInput.length !== 6 || expiresSec === 0}
              data-testid="wizard-otp-submit"
              className="w-full py-3.5 rounded-xl bg-[#4B2166] hover:bg-[#5E2A7F] text-white text-sm font-bold disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Creating bound session...' : 'Verify 2FA & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QUICK UNLOCK OVERLAY (C1: Optional Biometric / 6-digit PIN Lock)
// ---------------------------------------------------------------------------
export function QuickUnlockOverlay({
  username,
  role,
  onUnlockWithPin,
  onUnlockBiometric,
  onSignOut,
  error,
}: {
  username: string;
  role: WizardRole;
  onUnlockWithPin: (pin: string) => void;
  onUnlockBiometric: () => void;
  onSignOut: () => void;
  error: string | null;
}) {
  const [pin, setPin] = useState('');
  return (
    <div className="fixed inset-0 z-50 bg-[#12071C]/95 backdrop-blur-md flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        data-testid="quick-unlock-overlay"
        className="w-full max-w-sm bg-white dark:bg-[#191524] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-5 text-center"
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#4B2166] text-white flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            App Locked
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {username} ({role}) · Unlock with Biometric or 6-digit PIN
          </p>
        </div>

        <button
          type="button"
          onClick={onUnlockBiometric}
          className="w-full py-3 rounded-xl bg-[#4B2166]/10 text-[#4B2166] dark:bg-purple-500/20 dark:text-purple-200 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Fingerprint className="w-5 h-5" />
          <span>Unlock with Fingerprint / Face ID</span>
        </button>

        <div className="space-y-2">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit PIN (246810)"
            className="w-full text-center tracking-[0.45em] font-mono text-lg font-bold py-3 px-4 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#120F1B] text-slate-900 dark:text-white"
          />
          <button
            type="button"
            disabled={pin.length !== 6}
            onClick={() => onUnlockWithPin(pin)}
            className="w-full py-3 rounded-xl bg-[#4B2166] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
          >
            Unlock with PIN
          </button>
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onSignOut}
          className="text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
        >
          Sign out &amp; switch account
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AUTO-LOGOUT "STILL THERE?" 30s COUNTDOWN MODAL (C2)
// ---------------------------------------------------------------------------
export function StillThereModal({
  secondsLeft,
  inactiveMinutes,
  onStaySignedIn,
  onLogoutNow,
}: {
  secondsLeft: number;
  inactiveMinutes: number;
  onStaySignedIn: () => void;
  onLogoutNow: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        data-testid="still-there-modal"
        className="w-full max-w-sm bg-white dark:bg-[#191524] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4 text-center"
      >
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-mono text-lg font-extrabold">
          {secondsLeft}
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Still there?
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            No activity detected (Inactive Time: {inactiveMinutes} min). You will be signed out automatically in {secondsLeft}s to protect fleet credentials.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onLogoutNow}
            className="py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            Log out now
          </button>
          <button
            type="button"
            onClick={onStaySignedIn}
            className="py-2.5 rounded-xl bg-[#4B2166] text-white text-xs font-bold cursor-pointer"
          >
            Keep working
          </button>
        </div>
      </div>
    </div>
  );
}
