import type { ReactNode } from 'react';
import {
  ChevronRight,
  Grid3X3,
  HelpCircle,
  Laptop,
  LogOut,
  Maximize2,
  Minimize2,
  Shield,
  ShieldCheck,
  Smartphone,
  TabletSmartphone,
} from 'lucide-react';
import {
  ROLE_NAV_MATRIX,
  type PlatformDevice,
  type PlatformRole,
  type PlatformVehicle,
} from '../../utils/unifiedPlatformLogic';
import {
  ROLE_DASHBOARD_CONFIG,
  getActiveScreenBreadcrumb,
  getGroupedNavigationForRole,
  type NavBadgeSpec,
} from '../../utils/roleDashboardConfig';
import type { RtoVehicleMetadata } from '../../utils/rtoRegistryDatabase';
import type { AuthGuardIdentity } from '../../utils/platformAuthGuard';
import { GlobalRtoSearchBar } from './GlobalRtoSearchBar';
import { RoleNavIcon, getScreenIconKey } from './RoleNavIcons';

interface LaptopShellProps {
  role: PlatformRole;
  activeScreen: string;
  onSelectScreen: (screenId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  liveVehicles: PlatformVehicle[];
  onSelectRtoVehicle: (record: RtoVehicleMetadata) => void;
  platform: PlatformDevice;
  onSwitchPlatform: (p: PlatformDevice) => void;
  onSwitchRoleQuick: (r: PlatformRole) => void;
  onOpenMatrix: () => void;
  onOpenRoleManager?: () => void;
  onTestGuardDenied?: () => void;
  onLogout: () => void;
  identity: AuthGuardIdentity;
  userName: string;
  companyName: string;
  unreadAlertsCount: number;
  navBadges?: Record<string, NavBadgeSpec>;
  isFullscreenMap: boolean;
  onToggleFullscreenMap: () => void;
  onStartTour?: () => void;
  children: ReactNode;
}

const ROLES: PlatformRole[] = ['super_admin', 'admin', 'client', 'customer'];

export function LaptopShell({
  role,
  activeScreen,
  onSelectScreen,
  searchQuery,
  onSearchChange,
  liveVehicles,
  onSelectRtoVehicle,
  platform,
  onSwitchPlatform,
  onSwitchRoleQuick,
  onOpenMatrix,
  onOpenRoleManager,
  onTestGuardDenied,
  onLogout,
  identity,
  userName,
  companyName,
  unreadAlertsCount,
  navBadges,
  isFullscreenMap,
  onToggleFullscreenMap,
  onStartTour,
  children,
}: LaptopShellProps) {
  const roleSpec = ROLE_NAV_MATRIX[role];
  const roleConfig = ROLE_DASHBOARD_CONFIG[role];
  const navGroups = getGroupedNavigationForRole(role);
  const breadcrumb = getActiveScreenBreadcrumb(role, activeScreen);

  return (
    <div
      data-testid="platform-shell-laptop"
      className="max-w-[1440px] mx-auto px-3 sm:px-5 py-4"
    >
      {/* Top Control Room Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] px-3.5 py-2.5 mb-4 flex flex-wrap xl:flex-nowrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                VS TrackPro · {roleSpec.roleLabel}
              </span>
              <span
                data-testid="active-auth-badge"
                className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 dark:text-[#7CFF6B] whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {identity.authSource === 'firebase'
                    ? 'Firebase RBAC'
                    : 'Role Active'}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#A9B4D0] truncate">
              {userName} · {companyName}
            </p>
          </div>
        </div>

        {/* Global RTO / Vehicle Number Search Bar */}
        <GlobalRtoSearchBar
          liveVehicles={liveVehicles}
          onSelectVehicleForTracking={onSelectRtoVehicle}
          variant="topbar"
          initialQuery={searchQuery}
          onQueryChange={onSearchChange}
          testIdPrefix="topbar-rto-search"
        />

        {/* Platform Switcher + Role Quick Switch + Actions */}
        <div className="flex flex-wrap xl:flex-nowrap items-center gap-1.5 shrink-0">
          <div
            role="group"
            aria-label="Platform shell switcher"
            className="inline-flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-[#0A1128]"
          >
            {(
              [
                ['laptop', 'Laptop', Laptop],
                ['android', 'Android', Smartphone],
                ['iphone', 'iPhone', TabletSmartphone],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                data-testid={`switch-platform-${id}`}
                onClick={() => onSwitchPlatform(id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  platform === id
                    ? 'bg-[#00D4FF] text-[#0A1128]'
                    : 'text-slate-600 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <label className="sr-only" htmlFor="laptop-role-switcher">
            Switch portal role
          </label>
          <select
            id="laptop-role-switcher"
            data-testid="platform-role-switcher"
            value={role}
            onChange={(e) => onSwitchRoleQuick(e.target.value as PlatformRole)}
            className="rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                Role: {ROLE_NAV_MATRIX[r].roleLabel}
              </option>
            ))}
          </select>

          {role === 'super_admin' && onOpenRoleManager && (
            <button
              type="button"
              data-testid="open-firebase-rbac-btn"
              onClick={onOpenRoleManager}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-cyan-500/40 bg-cyan-50/70 dark:bg-[#00D4FF]/10 text-cyan-800 dark:text-[#00D4FF] hover:bg-cyan-100 dark:hover:bg-[#00D4FF]/20 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Firestore Roles</span>
            </button>
          )}

          {role !== 'super_admin' && onTestGuardDenied && (
            <button
              type="button"
              data-testid="test-route-guard-btn"
              onClick={onTestGuardDenied}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-[#FF4D4F] hover:bg-rose-50 dark:hover:bg-rose-500/10 whitespace-nowrap shrink-0 cursor-pointer"
              title="Verify route guard blocks restricted Super Admin screen"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Admin Route</span>
            </button>
          )}

          <button
            type="button"
            data-testid="open-screen-matrix-btn"
            onClick={onOpenMatrix}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:border-cyan-500 dark:hover:border-[#00D4FF] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Grid3X3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>12 Versions</span>
          </button>

          {onStartTour && (
            <button
              type="button"
              data-testid="start-platform-tour-btn"
              onClick={onStartTour}
              aria-label="Start dashboard quick tour"
              title="Start dashboard quick tour"
              className="p-2 rounded-xl border border-slate-200 dark:border-white/15 text-slate-600 dark:text-[#A9B4D0] hover:border-cyan-500 dark:hover:border-[#00D4FF] hover:text-slate-900 dark:hover:text-white shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFullscreenMap}
            aria-label={isFullscreenMap ? 'Exit fullscreen map' : 'Fullscreen map'}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/15 text-slate-600 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white shrink-0 cursor-pointer"
          >
            {isFullscreenMap ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            data-testid="platform-logout-btn"
            onClick={onLogout}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:border-rose-400 hover:text-rose-600 dark:hover:text-[#FF4D4F] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Split: Wide Desktop Sidebar + Content Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {!isFullscreenMap && (
          <aside
            aria-label={`${roleSpec.roleLabel} navigation`}
            data-testid="laptop-role-nav-groups"
            data-nav-role={role}
            className="lg:col-span-3 xl:col-span-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-2.5 lg:sticky lg:top-20 flex flex-col gap-3"
          >
            {/* Role Identity Header */}
            <div className={`px-2.5 py-2 rounded-xl border ${roleConfig.accentBorderClass} bg-slate-50/70 dark:bg-[#0A1128]/70`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-bold ${roleConfig.accentTextClass}`}>
                  {roleSpec.roleLabel}
                </span>
                <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-500 dark:text-[#A9B4D0]">
                  {roleSpec.screens.length} views
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {roleConfig.dashboardHeading}
              </p>
            </div>

            {/* Categorized Navigation Groups */}
            <nav className="space-y-3" aria-label={`${roleSpec.roleLabel} sections`}>
              {navGroups.map((group) => (
                <div key={group.id} data-testid={`laptop-nav-group-${group.id}`} className="space-y-0.5">
                  <div className="px-2.5 pb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {group.label}
                  </div>
                  {group.items.map((s) => {
                    const active = activeScreen === s.id;
                    const isAlertTab =
                      s.id === 'alerts' ||
                      s.id === 'alerts-settings' ||
                      s.id === 'notifications';
                    const dynamicBadge = navBadges?.[s.id];
                    const badgeCount =
                      dynamicBadge !== undefined
                        ? dynamicBadge.count
                        : isAlertTab && unreadAlertsCount > 0
                        ? unreadAlertsCount
                        : null;
                    const badgeTone =
                      dynamicBadge?.tone ?? (isAlertTab ? 'alert' : 'neutral');

                    return (
                      <button
                        key={s.id}
                        type="button"
                        data-testid={`laptop-nav-${s.id}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => onSelectScreen(s.id)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-semibold transition-colors cursor-pointer ${
                          active
                            ? roleConfig.accentBgActiveClass
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <RoleNavIcon
                            iconKey={getScreenIconKey(s.id)}
                            className={`w-3.5 h-3.5 shrink-0 ${
                              active ? 'opacity-100' : 'opacity-70'
                            }`}
                          />
                          <span className="truncate">{s.label}</span>
                        </span>
                        {badgeCount !== null && (
                          <span
                            data-testid={`laptop-nav-badge-${s.id}`}
                            className={`font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                              active
                                ? 'bg-black/15 text-current'
                                : badgeTone === 'alert'
                                ? 'bg-rose-500/15 text-rose-700 dark:text-[#FF4D4F]'
                                : badgeTone === 'positive'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Role Scope Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 px-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
              <span>Scope</span>
              <span className={`font-semibold truncate ${roleConfig.accentTextClass}`}>
                {breadcrumb.accessScopeLabel}
              </span>
            </div>
          </aside>
        )}

        <div
          className={
            isFullscreenMap
              ? 'lg:col-span-12 min-w-0 space-y-3'
              : 'lg:col-span-9 xl:col-span-10 min-w-0 space-y-3'
          }
        >
          {/* Contextual Role Breadcrumb Bar */}
          <nav
            aria-label="Workspace breadcrumb"
            data-testid="role-workspace-breadcrumb"
            className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className={`font-semibold ${roleConfig.accentTextClass}`}>
                {breadcrumb.roleLabel}
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden="true" />
              <span>{breadcrumb.groupLabel}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden="true" />
              <span className="font-semibold text-slate-900 dark:text-white">
                {breadcrumb.screenLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>{breadcrumb.accessScopeLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{navGroups.length} nav groups</span>
              <span aria-hidden="true">·</span>
              <span>{roleSpec.screens.length} views</span>
            </div>
          </nav>

          {children}
        </div>
      </div>
    </div>
  );
}

