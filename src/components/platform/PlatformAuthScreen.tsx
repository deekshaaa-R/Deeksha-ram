import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Lock,
  ScanFace,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  ROLE_NAV_MATRIX,
  type PlatformDevice,
  type PlatformRole,
} from '../../utils/unifiedPlatformLogic';
import { usePlatformAuth } from '../../context/PlatformAuthContext';
import { DEMO_ACCOUNTS } from './platformTypes';

interface PlatformAuthScreenProps {
  platform: PlatformDevice;
  selectedRole: PlatformRole;
  onSelectRole: (role: PlatformRole) => void;
  onLoginSuccess: (payload: {
    token: string;
    bootstrap: unknown;
    authSource: 'firebase' | 'sandbox';
  }) => void;
}

const ROLE_ORDER: PlatformRole[] = ['super_admin', 'admin', 'client', 'customer'];

export function PlatformAuthScreen({
  platform,
  selectedRole,
  onSelectRole,
  onLoginSuccess,
}: PlatformAuthScreenProps) {
  const {
    firebaseUser,
    verifiedRole,
    roleGrant,
    authLoading,
    authError,
    signInWithFirebaseGoogle,
    getFreshFirebaseIdToken,
    setSandboxIdentity,
  } = usePlatformAuth();

  const demo = DEMO_ACCOUNTS[selectedRole];
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState(demo.email);
  const [password, setPassword] = useState(demo.password);
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRoleSwitch = (nextRole: PlatformRole) => {
    onSelectRole(nextRole);
    const nextDemo = DEMO_ACCOUNTS[nextRole];
    setEmail(nextDemo.email);
    setPassword(nextDemo.password);
    setOtp('');
    setOtpHint(null);
    setError(null);
  };

  const exchangeFirebaseToken = async (
    idToken: string,
    roleToUse: PlatformRole,
    company?: string,
    status?: 'Active' | 'Blocked'
  ) => {
    const res = await fetch('/api/platform/auth/firebase-exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        role: roleToUse,
        company,
        status,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not establish verified Firebase session.');
      return;
    }
    const { token, ...bootstrap } = data;
    setSandboxIdentity(null);
    onLoginSuccess({ token, bootstrap, authSource: 'firebase' });
  };

  const handleFirebaseGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithFirebaseGoogle();
      if (!result.ok || !result.idToken) {
        setError(result.error || 'Firebase Google sign-in did not complete.');
        return;
      }
      await exchangeFirebaseToken(
        result.idToken,
        result.role ?? 'customer',
        roleGrant?.company,
        roleGrant?.status
      );
    } catch {
      setError('Unable to reach Firebase authentication exchange server.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueVerifiedFirebase = async () => {
    if (!firebaseUser || !verifiedRole) return;
    setError(null);
    setLoading(true);
    try {
      const idToken = await getFreshFirebaseIdToken();
      if (!idToken) {
        setError('Could not retrieve Firebase ID token. Please sign in again.');
        return;
      }
      await exchangeFirebaseToken(
        idToken,
        verifiedRole,
        roleGrant?.company,
        roleGrant?.status
      );
    } catch {
      setError('Unable to verify Firebase session with server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setError(null);
    setOtpHint(null);
    const res = await fetch('/api/platform/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: selectedRole, identifier: email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not dispatch OTP.');
      return;
    }
    setOtpHint(data.message);
    setOtp(data.demoOtp || '482910');
  };

  const submitSandboxLogin = async (
    modeOverride?: 'password' | 'otp' | 'biometric'
  ) => {
    setError(null);
    setLoading(true);
    try {
      const mode = modeOverride ?? authMode;
      const res = await fetch('/api/platform/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          email,
          password,
          otp,
          authMode: mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
        return;
      }
      const { token, ...bootstrap } = data;
      setSandboxIdentity({
        uid: bootstrap.user.id,
        email: bootstrap.user.email,
        role: bootstrap.user.role,
        status: bootstrap.user.status === 'Blocked' ? 'Blocked' : 'Active',
      });
      onLoginSuccess({ token, bootstrap, authSource: 'sandbox' });
    } catch {
      setError('Unable to reach VS TrackPro authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitSandboxLogin();
  };

  const isAndroid = platform === 'android';
  const isIphone = platform === 'iphone';
  const roleSpec = ROLE_NAV_MATRIX[selectedRole];
  const displayedError = error || authError;

  return (
    <div
      data-testid="platform-auth-screen"
      className="max-w-5xl mx-auto px-4 sm:px-6 py-4 lg:py-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Firebase Auth Identity + 4 Role Portal Selector */}
        <div className="lg:col-span-5 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-[#00D4FF]">
              VS TrackPro · Firebase Auth + 4-Tier RBAC
            </p>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isIphone
                ? 'Sign In — iOS App'
                : isAndroid
                ? 'Sign In — Android M3'
                : 'Role-Based Fleet Login'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A9B4D0]">
              Sign in with Firebase Auth to resolve your verified role from Firestore{' '}
              <code className="font-mono text-xs">/platformRoles/&#123;uid&#125;</code>, or test any of the 4 isolated role portals below.
            </p>
          </div>

          {/* Primary Firebase Auth Google Card */}
          <div className="rounded-2xl border border-cyan-500/35 bg-white dark:bg-[#111B3A] p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-700 dark:text-[#00D4FF]">
                  Firebase Auth · Authoritative RBAC
                </div>
                <p className="text-xs text-slate-600 dark:text-[#A9B4D0] mt-0.5">
                  Verifies your Google ID token on the backend and enforces Super Admin, Admin, Client, or Customer route guards.
                </p>
              </div>
              <ShieldCheck
                className="w-5 h-5 text-emerald-600 dark:text-[#7CFF6B] shrink-0"
                aria-hidden="true"
              />
            </div>

            {firebaseUser && verifiedRole ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-[#7CFF6B]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>
                    Signed in as {firebaseUser.email} ·{' '}
                    {ROLE_NAV_MATRIX[verifiedRole].roleLabel}
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="firebase-continue-btn"
                  disabled={loading || authLoading}
                  onClick={() => void handleContinueVerifiedFirebase()}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer disabled:opacity-60"
                >
                  {loading
                    ? 'Verifying Firebase ID Token...'
                    : `Enter Verified ${ROLE_NAV_MATRIX[verifiedRole].roleLabel} Portal`}
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="firebase-google-signin-btn"
                disabled={loading || authLoading}
                onClick={() => void handleFirebaseGoogleSignIn()}
                className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                </svg>
                <span>
                  {loading || authLoading
                    ? 'Connecting to Firebase Auth...'
                    : 'Sign in with Google (Firebase Auth)'}
                </span>
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Select user role login portal"
            className="space-y-1.5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0] px-1">
              4-Role Isolated Portal Switcher (Demo / Password / OTP)
            </div>
            {ROLE_ORDER.map((r) => {
              const info = DEMO_ACCOUNTS[r];
              const active = selectedRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`auth-role-tab-${r}`}
                  onClick={() => handleRoleSwitch(r)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                    active
                      ? 'border-cyan-500 dark:border-[#00D4FF] bg-cyan-50/70 dark:bg-[#00D4FF]/10'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      {info.label} Portal
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-[#A9B4D0]">
                      {ROLE_NAV_MATRIX[r].screens.length} screens
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-[#A9B4D0] mt-0.5 line-clamp-1">
                    {info.subtitle}
                  </p>
                  <p className="font-mono text-[11px] text-cyan-700 dark:text-[#00D4FF] mt-0.5">
                    {info.email}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Platform-Tailored Role Portal Login Card */}
        <div className="lg:col-span-7">
          <div
            className={`border p-6 sm:p-8 shadow-sm ${
              isIphone
                ? 'rounded-[28px] bg-white/95 dark:bg-[#141A29]/95 border-slate-200/90 dark:border-white/15 backdrop-blur-md'
                : isAndroid
                ? 'rounded-3xl bg-[#F7F9FC] dark:bg-[#131C31] border-slate-200 dark:border-indigo-400/20'
                : 'rounded-2xl bg-white dark:bg-[#111B3A] border-slate-200 dark:border-white/10'
            }`}
          >
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <div className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
                  {isIphone
                    ? 'iPhone iOS · Apple HIG + Face ID'
                    : isAndroid
                    ? 'Android · Material 3 + Fingerprint'
                    : 'Laptop Web Portal · Control Room'}
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {roleSpec.roleLabel} Login
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-0.5">
                  {roleSpec.scopeSummary}
                </p>
              </div>
              <Lock className="w-5 h-5 text-cyan-700 dark:text-[#00D4FF] shrink-0" aria-hidden="true" />
            </div>

            {/* Password vs OTP toggle */}
            <div className="flex items-center gap-2 mt-5 p-1 rounded-xl bg-slate-100 dark:bg-[#0A1128] border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('password');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  authMode === 'password'
                    ? 'bg-[#00D4FF] text-[#0A1128]'
                    : 'text-slate-600 dark:text-[#A9B4D0]'
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('otp');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  authMode === 'otp'
                    ? 'bg-[#00D4FF] text-[#0A1128]'
                    : 'text-slate-600 dark:text-[#A9B4D0]'
                }`}
              >
                SMS / Email OTP Login
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="platform-login-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  {roleSpec.roleLabel} Email or Mobile Number
                </label>
                <input
                  id="platform-login-email"
                  data-testid="platform-login-email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={demo.email}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-[#00D4FF]"
                />
              </div>

              {authMode === 'password' ? (
                <div>
                  <label
                    htmlFor="platform-login-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Encrypted Password
                  </label>
                  <input
                    id="platform-login-password"
                    data-testid="platform-login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-[#00D4FF]"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="platform-login-otp"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      6-Digit Verification OTP
                    </label>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
                    >
                      Send OTP
                    </button>
                  </div>
                  <input
                    id="platform-login-otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="482910"
                    className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0A1128] px-3.5 py-2.5 font-mono text-sm tracking-widest text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-[#00D4FF]"
                  />
                  {otpHint && (
                    <p className="text-xs text-emerald-700 dark:text-[#7CFF6B]">
                      {otpHint}
                    </p>
                  )}
                </div>
              )}

              {displayedError && (
                <p
                  role="alert"
                  className="text-xs font-medium text-rose-600 dark:text-[#FF4D4F]"
                >
                  {displayedError}
                </p>
              )}

              <button
                type="submit"
                data-testid="platform-login-submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer disabled:opacity-60"
              >
                <Lock className="w-4 h-4" aria-hidden="true" />
                <span>
                  {loading
                    ? 'Authenticating...'
                    : `Sign In as ${roleSpec.roleLabel}`}
                </span>
              </button>

              {(isAndroid || isIphone) && (
                <button
                  type="button"
                  data-testid="platform-biometric-login"
                  disabled={loading}
                  onClick={() => void submitSandboxLogin('biometric')}
                  className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                    isIphone
                      ? 'border-slate-300 dark:border-white/20 bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'border-indigo-500/40 bg-indigo-600/10 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-600/20'
                  }`}
                >
                  {isIphone ? (
                    <>
                      <ScanFace className="w-4 h-4" aria-hidden="true" />
                      <span>Continue with Face ID / Touch ID</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" aria-hidden="true" />
                      <span>Unlock with Android Fingerprint</span>
                    </>
                  )}
                </button>
              )}
            </form>

            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-[#A9B4D0]">
              <span className="inline-flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Demo Password: Password@123 · OTP: 482910</span>
              </span>
              <span className="inline-flex items-center gap-1">
                {selectedRole === 'customer' ? (
                  <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                ) : selectedRole === 'client' ? (
                  <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>RBAC Route Guard · Role-Scoped Session</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
