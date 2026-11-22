import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Cpu,
  FileSpreadsheet,
  Gauge,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  Package,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  ShoppingCart,
  Wrench,
  X,
} from 'lucide-react';
import { AdministrativeExportModal } from '../components/AdministrativeExportModal';
import { FuelEfficiencyChart } from '../components/FuelEfficiencyChart';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { OdometerServiceMonitor } from '../components/OdometerServiceMonitor';
import { OnboardingTooltipTour } from '../components/OnboardingTooltipTour';
import { RegisteredFleetLiveTracker } from '../components/RegisteredFleetLiveTracker';
import { RegisterVehicleModal } from '../components/RegisterVehicleModal';
import { useStore } from '../context/StoreContext';
import {
  ACCOUNT_DASHBOARD_TOUR_ID,
  ACCOUNT_DASHBOARD_TOUR_STEPS,
} from '../utils/onboardingTourLogic';
import {
  formatCoordinatesShort,
  formatTelemetrySourceLabel,
  resolveVehiclePosition,
} from '../utils/registeredVehicleTracking';
import { filterRegisteredVehicles } from '../utils/vehicleDeviceLogic';
import {
  evaluateVehicleMilestones,
  resolveMaintenanceRecord,
  summarizeServiceHealth,
} from '../utils/serviceMilestoneLogic';
import {
  formatINR,
  validateEmail,
  validatePhone,
  validateRequired,
  type FieldErrors,
} from '../utils/storeLogic';

export function LoginPage() {
  const { loginUser, signInWithGoogle, navigate } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: 'Arjun Mehta',
    email: 'arjun.mehta@example.com',
    phone: '9876543210',
    company: 'Mehta Logistics Pvt. Ltd.',
    password: '',
  });
  const [errors, setErrors] = useState<
    FieldErrors<'name' | 'email' | 'phone' | 'password'>
  >({});

  const handleGoogleLogin = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate({ page: 'account', tab: 'tracking' });
    } catch (err: unknown) {
      setGoogleError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In was cancelled or blocked by popup settings.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs: FieldErrors<'name' | 'email' | 'phone' | 'password'> = {};
    if (mode === 'register') {
      const nErr = validateRequired(form.name, 'Full name');
      if (nErr) errs.name = nErr;
      const pErr = validatePhone(form.phone);
      if (pErr) errs.phone = pErr;
    }
    const eErr = validateEmail(form.email);
    if (eErr) errs.email = eErr;
    if (form.password.trim().length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    loginUser({
      name: form.name.trim() || 'VS Fleet Customer',
      email: form.email.trim(),
      phone: form.phone.trim() || '9876543210',
      company: form.company.trim() || 'Personal Account',
    });
    navigate({ page: 'account', tab: 'tracking' });
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-14">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {mode === 'login' ? 'Sign In to VS Account' : 'Create VS Account'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
            Manage hardware orders, tracked IMEI devices, and warranty certificates synced to your Cloud account.
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold border border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-[#0A1128] text-slate-900 dark:text-white hover:border-[#00D4FF] flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className="font-bold text-cyan-600 dark:text-[#00D4FF]">G</span>
            <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>
          {googleError && (
            <p className="text-xs text-rose-600 dark:text-[#FF4D4F] text-center">
              {googleError}
            </p>
          )}
        </div>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
          <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400">
            or email / demo
          </span>
          <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0A1128]">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-[#111B3A] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-[#A9B4D0]'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-[#111B3A] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-[#A9B4D0]'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {mode === 'register' && (
            <>
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
                >
                  Full Name *
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="auth-phone"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
                >
                  Phone Number *
                </label>
                <input
                  id="auth-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.phone}
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
            >
              Email Address *
            </label>
            <input
              id="auth-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
            >
              Password *
            </label>
            <input
              id="auth-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-center">
          <button
            type="button"
            onClick={() => {
              loginUser({
                name: 'Arjun Mehta (Demo)',
                email: 'arjun.mehta@example.com',
                phone: '9876543210',
                company: 'Mehta Logistics Pvt. Ltd.',
              });
              navigate({ page: 'account', tab: 'tracking' });
            }}
            className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
          >
            Continue with Demo Fleet Account
          </button>
        </div>
      </div>
    </div>
  );
}

export function AccountPage({
  initialTab = 'tracking',
}: {
  initialTab?:
    | 'orders'
    | 'tracking'
    | 'devices'
    | 'service'
    | 'warranty'
    | 'bookings'
    | 'wishlist';
}) {
  const {
    theme,
    user,
    logoutUser,
    orders,
    devices,
    registerVehicleDevice,
    updateVehicleTelemetry,
    bulkUpdateDevicesTelemetry,
    firestoreLiveActive,
    maintenanceByImei,
    updateVehicleOdometer,
    completeServiceMilestone,
    warranties,
    bookings,
    wishlist,
    products,
    addToCart,
    toggleWishlist,
    navigate,
    showToast,
  } = useStore();
  const [tab, setTab] = useState(initialTab);
  const [selectedTrackingDeviceId, setSelectedTrackingDeviceId] = useState<string | null>(
    null
  );
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const trimmedVehicleSearch = vehicleSearch.trim();
  const hasVehicleSearch = trimmedVehicleSearch.length > 0;

  const filteredDevices = useMemo(
    () => filterRegisteredVehicles(devices, vehicleSearch),
    [devices, vehicleSearch]
  );

  const serviceSummary = useMemo(
    () => summarizeServiceHealth(devices, maintenanceByImei),
    [devices, maintenanceByImei]
  );

  const handleVehicleSearchChange = (nextQuery: string) => {
    setVehicleSearch(nextQuery);
    if (
      nextQuery.trim().length > 0 &&
      tab !== 'tracking' &&
      tab !== 'devices' &&
      tab !== 'service'
    ) {
      setTab('devices');
    }
  };

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));
  const isCloudVerified = user.authProvider === 'google' && Boolean(user.uid);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt={user.name}
              className="w-12 h-12 rounded-full border border-[#00D4FF]/50 object-cover"
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
              {user.authProvider === 'google'
                ? 'Verified Google Cloud Synced Account'
                : 'Customer & Fleet Portal'}
            </p>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {user.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-0.5">
              {user.email} · {user.company}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="start-dashboard-tour-btn"
            onClick={() => setIsTourOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:border-[#00D4FF] transition-colors cursor-pointer whitespace-nowrap"
          >
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Quick Tour</span>
          </button>
          <button
            type="button"
            data-testid="open-export-reports-btn"
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-[#00D4FF] transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export Reports</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Register Vehicle</span>
          </button>
          {user.isAuthenticated ? (
            <button
              type="button"
              onClick={logoutUser}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-white cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate({ page: 'login' })}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-white hover:border-[#00D4FF] transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Fuel Efficiency & Usage Trends Line Chart */}
      <FuelEfficiencyChart
        devices={devices}
        maintenanceByImei={maintenanceByImei}
        accountName={user.name}
        companyName={user.company}
        theme={theme}
        onExportToast={(msg) => showToast(msg)}
      />

      {/* Active Odometer & Service Milestone Alert Strip */}
      {serviceSummary.actionNeededCount > 0 && tab !== 'service' && (
        <div
          role="region"
          aria-label="Approaching vehicle service milestones"
          data-testid="service-alert-banner"
          className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            serviceSummary.overdueCount > 0
              ? 'border-rose-300 dark:border-[#FF4D4F]/35 bg-rose-50/80 dark:bg-[#111B3A]'
              : 'border-amber-300 dark:border-[#FFB020]/35 bg-amber-50/80 dark:bg-[#111B3A]'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            {serviceSummary.overdueCount > 0 ? (
              <AlertOctagon
                className="w-5 h-5 text-rose-600 dark:text-[#FF4D4F] shrink-0 mt-0.5"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                className="w-5 h-5 text-amber-600 dark:text-[#FFB020] shrink-0 mt-0.5"
                aria-hidden="true"
              />
            )}
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-slate-900 dark:text-white">
                <span>
                  {serviceSummary.overdueCount > 0
                    ? `${serviceSummary.overdueCount} Overdue`
                    : ''}
                  {serviceSummary.overdueCount > 0 && serviceSummary.approachingCount > 0
                    ? ' & '
                    : ''}
                  {serviceSummary.approachingCount > 0
                    ? `${serviceSummary.approachingCount} Approaching`
                    : ''}{' '}
                  Service Milestone{serviceSummary.actionNeededCount === 1 ? '' : 's'}
                </span>
                {serviceSummary.mostUrgentAlert && (
                  <span className="font-mono text-xs font-semibold text-slate-600 dark:text-[#A9B4D0]">
                    · Next: {serviceSummary.mostUrgentAlert.shortLabel} on{' '}
                    {serviceSummary.mostUrgentAlert.vehicleLabel.split(' ')[0]} (
                    {serviceSummary.mostUrgentAlert.remainingKm <= 0
                      ? `${Math.abs(serviceSummary.mostUrgentAlert.remainingKm).toLocaleString('en-IN')} km overdue`
                      : `${serviceSummary.mostUrgentAlert.remainingKm.toLocaleString('en-IN')} km left`}
                    )
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-[#A9B4D0]">
                Automated odometer tracking monitors oil, air/fuel filters, brakes, and transmission intervals across all {devices.length} fleet vehicles.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="open-service-monitor-btn"
            onClick={() => setTab('service')}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
          >
            <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Monitor Odometer & Alerts</span>
          </button>
        </div>
      )}

      {/* Tabs & Registered Vehicle Search Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="order-2 xl:order-1 flex flex-wrap gap-2">
          {(
            [
              ['tracking', `Live Tracking (${devices.length})`, Radio],
              [
                'devices',
                hasVehicleSearch
                  ? `Devices (${filteredDevices.length}/${devices.length})`
                  : `Devices (${devices.length})`,
                Cpu,
              ],
              [
                'service',
                serviceSummary.actionNeededCount > 0
                  ? `Service & Odo (${serviceSummary.actionNeededCount})`
                  : 'Service & Odo',
                Gauge,
              ],
              ['orders', `Orders (${orders.length})`, Package],
              ['warranty', `Warranty (${warranties.length})`, ShieldCheck],
              ['bookings', `Installations (${bookings.length})`, Wrench],
              ['wishlist', `Wishlist (${wishlistedProducts.length})`, Heart],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              data-testid={`account-tab-${key}`}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                tab === key
                  ? 'bg-[#00D4FF] text-[#0A1128]'
                  : 'bg-white dark:bg-[#111B3A] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A9B4D0]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="order-1 xl:order-2 relative w-full xl:w-80 shrink-0">
          <label htmlFor="account-vehicle-search" className="sr-only">
            Filter registered vehicles by nickname or IMEI
          </label>
          <Search
            className="w-4 h-4 text-slate-400 dark:text-[#A9B4D0] pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id="account-vehicle-search"
            type="search"
            data-testid="vehicle-search-input"
            value={vehicleSearch}
            onChange={(e) => handleVehicleSearchChange(e.target.value)}
            placeholder="Search vehicles by nickname or IMEI..."
            className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#A9B4D0]/70 focus:outline-none focus:border-[#00D4FF] [&::-webkit-search-cancel-button]:hidden"
          />
          {hasVehicleSearch && (
            <button
              type="button"
              data-testid="vehicle-search-clear"
              aria-label="Clear vehicle search"
              onClick={() => setVehicleSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Live Tracking Tab */}
      {tab === 'tracking' && (
        <RegisteredFleetLiveTracker
          devices={devices}
          filteredDevices={filteredDevices}
          selectedDeviceId={selectedTrackingDeviceId}
          onSelectDevice={(id) => setSelectedTrackingDeviceId(id)}
          onUpdateTelemetry={updateVehicleTelemetry}
          onBulkUpdateTelemetry={bulkUpdateDevicesTelemetry}
          onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          isCloudAuthenticated={isCloudVerified}
          isFirestoreLive={firestoreLiveActive}
          roomId={user.uid || 'demo'}
          onShowToast={(msg, tone) => showToast(msg, tone)}
        />
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                <div>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    Order #{order.id}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-[#A9B4D0] ml-3">
                    {order.date} · {order.paymentMethod}
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 dark:text-[#7CFF6B]">
                  {order.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                {order.items.map((item, idx) => (
                  <div key={`${order.id}-${idx}`} className="flex justify-between gap-2">
                    <span className="text-slate-700 dark:text-[#A9B4D0]">
                      {item.quantity} × {item.name} ({item.plan})
                    </span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatINR(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white">
                <span>Ship to: {order.city}</span>
                <span className="font-mono tabular-nums">
                  Total: {formatINR(order.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Devices Tab */}
      {tab === 'devices' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              data-testid="vehicle-search-summary"
              className="text-xs text-slate-500 dark:text-[#A9B4D0]"
            >
              {hasVehicleSearch ? (
                <>
                  Showing <strong className="font-mono text-slate-900 dark:text-white">{filteredDevices.length}</strong> of{' '}
                  <strong className="font-mono text-slate-900 dark:text-white">{devices.length}</strong> registered vehicle
                  {devices.length === 1 ? '' : 's'} matching &ldquo;{trimmedVehicleSearch}&rdquo;.
                </>
              ) : (
                <>
                  Showing {devices.length} active GPS tracker{devices.length === 1 ? '' : 's'} linked to your fleet.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Vehicle Device</span>
            </button>
          </div>
          {filteredDevices.length === 0 ? (
            <div
              data-testid="vehicle-search-empty"
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-8 text-center space-y-3"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No registered vehicles match &ldquo;{trimmedVehicleSearch}&rdquo;
              </p>
              <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                Try searching by vehicle nickname (e.g. Cargo Van, Express Coach) or a 15-digit IMEI number.
              </p>
              <button
                type="button"
                onClick={() => setVehicleSearch('')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div
              data-testid="registered-vehicles-grid"
              className="grid grid-cols-1 md:grid-cols-3 gap-5"
            >
              {filteredDevices.map((dev) => {
                const maint = resolveMaintenanceRecord(dev, maintenanceByImei);
                const pos = resolveVehiclePosition(dev);
                const urgent = evaluateVehicleMilestones(maint).find(
                  (m) => m.severity !== 'Scheduled'
                );
                return (
                  <div
                    key={dev.id}
                    data-testid={`registered-vehicle-card-${dev.id}`}
                    className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-mono text-slate-500 dark:text-[#A9B4D0]">
                        IMEI {dev.imei}
                      </span>
                      <span
                        className={`font-semibold ${
                          dev.status === 'Moving'
                            ? 'text-emerald-700 dark:text-[#7CFF6B]'
                            : dev.status === 'Idle'
                            ? 'text-amber-700 dark:text-[#FFB020]'
                            : 'text-rose-700 dark:text-[#FF4D4F]'
                        }`}
                      >
                        {dev.status}
                      </span>
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                        {dev.vehicleLabel}
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-[#A9B4D0] mt-0.5">
                        {dev.model}
                        {dev.vehicleType ? ` · ${dev.vehicleType}` : ''}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0A1128] border border-slate-200/80 dark:border-white/10 px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1.5 font-mono text-slate-700 dark:text-white truncate">
                        <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF] shrink-0" aria-hidden="true" />
                        <span data-testid={`device-card-coords-${dev.id}`}>
                          {formatCoordinatesShort(pos.latitude, pos.longitude)}
                        </span>
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-[#A9B4D0] shrink-0">
                        {formatTelemetrySourceLabel(pos.telemetrySource).split(' ')[0]}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap justify-between gap-2 text-xs">
                      <span className="text-slate-500 dark:text-[#A9B4D0]">
                        Odometer:{' '}
                        <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                          {maint.odometerKm.toLocaleString('en-IN')} km
                        </strong>
                      </span>
                      <span className="text-slate-500 dark:text-[#A9B4D0]">
                        Speed: <strong className="font-mono">{pos.speedKmh} km/h</strong>
                      </span>
                    </div>
                    {urgent && (
                      <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                        <span
                          className={`font-semibold truncate ${
                            urgent.severity === 'Overdue'
                              ? 'text-rose-700 dark:text-[#FF4D4F]'
                              : 'text-amber-700 dark:text-[#FFB020]'
                          }`}
                        >
                          {urgent.shortLabel}:{' '}
                          {urgent.remainingKm <= 0
                            ? `${Math.abs(urgent.remainingKm).toLocaleString('en-IN')} km overdue`
                            : `in ${urgent.remainingKm.toLocaleString('en-IN')} km`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTab('service')}
                          className="text-cyan-700 dark:text-[#00D4FF] font-semibold hover:underline shrink-0 cursor-pointer"
                        >
                          Service →
                        </button>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-[#A9B4D0] truncate">
                        {dev.lastUpdated}
                      </span>
                      <button
                        type="button"
                        data-testid={`track-live-btn-${dev.id}`}
                        onClick={() => {
                          setSelectedTrackingDeviceId(dev.id);
                          setTab('tracking');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors shrink-0 cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Track Live</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Odometer & Service Milestones Tab */}
      {tab === 'service' && (
        <OdometerServiceMonitor
          devices={filteredDevices}
          maintenanceByImei={maintenanceByImei}
          onUpdateOdometer={updateVehicleOdometer}
          onCompleteMilestone={completeServiceMilestone}
          onBookServiceSlot={() => navigate({ page: 'book-installation' })}
        />
      )}

      {/* Warranty Tab */}
      {tab === 'warranty' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate({ page: 'warranty' })}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
            >
              + Register New Device
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warranties.map((w) => (
              <div
                key={w.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-5 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-cyan-700 dark:text-[#00D4FF]">
                    IMEI: {w.imei}
                  </span>
                  <span className="font-semibold text-emerald-700 dark:text-[#7CFF6B]">
                    {w.status}
                  </span>
                </div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  {w.productName}
                </h2>
                <p className="text-xs text-slate-600 dark:text-[#A9B4D0]">
                  Invoice: <span className="font-mono">{w.invoiceNumber}</span> · Purchased{' '}
                  {w.purchaseDate} · Valid until{' '}
                  <strong className="font-mono">{w.expiresOn}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {tab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate({ page: 'book-installation' })}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
            >
              + Schedule Installation
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-5 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-500 dark:text-[#A9B4D0]">
                    Slot #{b.id}
                  </span>
                  <span className="font-semibold text-cyan-700 dark:text-[#00D4FF]">
                    {b.status}
                  </span>
                </div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  {b.vehicleType} — {b.city}
                </h2>
                <p className="text-xs text-slate-600 dark:text-[#A9B4D0]">
                  {b.date} · {b.timeSlot} · {b.customerName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wishlist Tab */}
      {tab === 'wishlist' && (
        <div>
          {wishlistedProducts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-10 text-center space-y-3">
              <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
                No hardware saved to your wishlist yet.
              </p>
              <button
                type="button"
                onClick={() => navigate({ page: 'shop' })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
              >
                Browse Hardware
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {wishlistedProducts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] overflow-hidden"
                >
                  <div className="aspect-[4/3] bg-slate-900">
                    <ImageWithFallback
                      src={p.images[0]}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      {p.name}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {formatINR(p.price)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => addToCart(p.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleWishlist(p.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-white/15 text-slate-600 dark:text-[#A9B4D0] cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <RegisterVehicleModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        existingImeis={devices.map((d) => d.imei)}
        isCloudAuthenticated={isCloudVerified}
        onSubmitDevice={registerVehicleDevice}
        onSuccess={(createdDevice) => {
          if (createdDevice) {
            setSelectedTrackingDeviceId(createdDevice.id);
          }
          setTab('tracking');
        }}
        onNavigateToLogin={() => navigate({ page: 'login' })}
      />

      <AdministrativeExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        devices={devices}
        maintenanceByImei={maintenanceByImei}
        user={user}
        onExportSuccess={(msg) => showToast(msg)}
      />

      <OnboardingTooltipTour
        tourId={ACCOUNT_DASHBOARD_TOUR_ID}
        steps={ACCOUNT_DASHBOARD_TOUR_STEPS}
        isOpen={isTourOpen}
        onOpenChange={setIsTourOpen}
        autoStartForNewUsers
        onStepActivate={(step) => {
          if (step.focusTab) {
            setTab(step.focusTab);
          }
        }}
        onComplete={(reason) => {
          if (reason === 'finished') {
            showToast('Dashboard quick tour completed. Replay anytime via Quick Tour.', 'success');
          }
        }}
      />
    </div>
  );
}
