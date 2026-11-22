import { useState, type ReactNode } from 'react';
import {
  Grid3X3,
  Laptop,
  LogOut,
  Menu,
  Plus,
  Search,
  Shield,
  Smartphone,
  TabletSmartphone,
  X,
} from 'lucide-react';
import {
  ROLE_NAV_MATRIX,
  type PlatformDevice,
  type PlatformRole,
  type PlatformVehicle,
} from '../../utils/unifiedPlatformLogic';
import {
  ROLE_DASHBOARD_CONFIG,
  getGroupedNavigationForRole,
  type NavBadgeSpec,
} from '../../utils/roleDashboardConfig';
import type { RtoVehicleMetadata } from '../../utils/rtoRegistryDatabase';
import type { AuthGuardIdentity } from '../../utils/platformAuthGuard';
import { GlobalRtoSearchBar } from './GlobalRtoSearchBar';
import { RoleNavIcon, getScreenIconKey } from './RoleNavIcons';

interface AndroidShellProps {
  role: PlatformRole;
  activeScreen: string;
  onSelectScreen: (screenId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  liveVehicles: PlatformVehicle[];
  onSelectRtoVehicle: (record: RtoVehicleMetadata) => void;
  onSwitchPlatform: (p: PlatformDevice) => void;
  onSwitchRoleQuick: (r: PlatformRole) => void;
  onOpenMatrix: () => void;
  onOpenRoleManager?: () => void;
  onTestGuardDenied?: () => void;
  onLogout: () => void;
  identity: AuthGuardIdentity;
  userName: string;
  unreadAlertsCount: number;
  navBadges?: Record<string, NavBadgeSpec>;
  children: ReactNode;
}

const ROLES: PlatformRole[] = ['super_admin', 'admin', 'client', 'customer'];

export function AndroidShell({
  role,
  activeScreen,
  onSelectScreen,
  searchQuery,
  onSearchChange,
  liveVehicles,
  onSelectRtoVehicle,
  onSwitchPlatform,
  onSwitchRoleQuick,
  onOpenMatrix,
  onOpenRoleManager,
  onTestGuardDenied,
  onLogout,
  identity,
  userName,
  unreadAlertsCount,
  navBadges,
  children,
}: AndroidShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const roleSpec = ROLE_NAV_MATRIX[role];
  const roleConfig = ROLE_DASHBOARD_CONFIG[role];
  const navGroups = getGroupedNavigationForRole(role);
  const primaryTabs = roleSpec.screens
    .filter((s) => s.primaryTab)
    .slice(0, 5);

  const fabTarget =
    role === 'super_admin'
      ? 'devices'
      : role === 'admin'
      ? 'clients'
      : role === 'client'
      ? 'pods'
      : 'support';

  return (
    <div
      data-testid="platform-shell-android"
      className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-4"
    >
      {/* Platform Switcher Strip outside phone bezel */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
          <Smartphone className="w-4 h-4 text-emerald-600 dark:text-[#7CFF6B]" aria-hidden="true" />
          <span>Android Material 3 App · {roleSpec.roleLabel}</span>
          <span className="font-mono text-[11px] text-slate-500 dark:text-[#A9B4D0]">
            ({identity.authSource === 'firebase' ? 'Firebase RBAC' : 'Role Session'})
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-[#0A1128]">
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
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  id === 'android'
                    ? 'bg-[#00D4FF] text-[#0A1128]'
                    : 'text-slate-600 dark:text-[#A9B4D0]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <select
            aria-label="Switch Android role"
            value={role}
            onChange={(e) => onSwitchRoleQuick(e.target.value as PlatformRole)}
            className="rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-white"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_NAV_MATRIX[r].roleLabel}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onOpenMatrix}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <Grid3X3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>12 Versions</span>
          </button>
        </div>
      </div>

      {/* Material 3 Phone Frame */}
      <div className="mx-auto max-w-[430px] rounded-[32px] border-[6px] border-slate-800 dark:border-slate-700 bg-[#F4F7FB] dark:bg-[#0E1525] shadow-2xl overflow-hidden flex flex-col relative min-h-[720px] max-h-[820px]">
        {/* Material 3 Top App Bar */}
        <header className="px-4 py-3 bg-[#E8EFFA] dark:bg-[#17223B] border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              aria-label="Open Android navigation drawer"
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-full text-slate-800 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                {roleSpec.screens.find((s) => s.id === activeScreen)?.label ??
                  roleSpec.roleLabel}
              </div>
              <div className="text-[10px] font-medium text-slate-600 dark:text-[#A9B4D0] truncate">
                {roleSpec.roleLabel} · {userName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Toggle vehicle search"
              onClick={() => setSearchOpen((v) => !v)}
              className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Sign out of Android app"
              onClick={onLogout}
              className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {searchOpen && (
          <div className="px-3.5 py-2 bg-[#E8EFFA] dark:bg-[#17223B] border-b border-slate-200/80 dark:border-white/10">
            <GlobalRtoSearchBar
              liveVehicles={liveVehicles}
              onSelectVehicleForTracking={(record) => {
                setSearchOpen(false);
                onSelectRtoVehicle(record);
              }}
              variant="compact"
              initialQuery={searchQuery}
              onQueryChange={onSearchChange}
              testIdPrefix="android-rto-search"
            />
          </div>
        )}

        {/* Scrollable M3 Body */}
        <div className="flex-1 overflow-y-auto p-3.5 pb-20">{children}</div>

        {/* Material 3 Floating Action Button */}
        <button
          type="button"
          onClick={() => onSelectScreen(fabTarget)}
          aria-label={`Quick action: open ${fabTarget}`}
          className="absolute right-4 bottom-20 z-20 w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg flex items-center justify-center cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Material 3 Bottom Navigation Bar (max 5 primary tabs) */}
        <nav
          aria-label="Android primary navigation"
          className="shrink-0 bg-[#E8EFFA] dark:bg-[#17223B] border-t border-slate-200 dark:border-white/10 px-1.5 py-1.5 grid"
          style={{ gridTemplateColumns: `repeat(${primaryTabs.length}, minmax(0, 1fr))` }}
        >
          {primaryTabs.map((tab) => {
            const active = activeScreen === tab.id;
            const isAlertTab =
              tab.id === 'alerts' ||
              tab.id === 'alerts-settings' ||
              tab.id === 'notifications';
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`android-tab-${tab.id}`}
                onClick={() => onSelectScreen(tab.id)}
                className="flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer"
              >
                <span
                  className={`inline-flex items-center justify-center px-3 py-1 rounded-full transition-colors ${
                    active
                      ? roleConfig.accentBgActiveClass
                      : 'text-slate-600 dark:text-[#A9B4D0]'
                  }`}
                >
                  <RoleNavIcon iconKey={getScreenIconKey(tab.id)} className="w-3.5 h-3.5" />
                </span>
                <span
                  className={`text-[10px] font-semibold truncate max-w-full ${
                    active
                      ? roleConfig.accentTextClass
                      : 'text-slate-700 dark:text-[#A9B4D0]'
                  }`}
                >
                  {tab.shortLabel}
                  {isAlertTab && unreadAlertsCount > 0 ? ` (${unreadAlertsCount})` : ''}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Material 3 Navigation Drawer for Categorized Role Screens */}
        {drawerOpen && (
          <div className="absolute inset-0 z-30 flex bg-slate-950/50">
            <div className="w-72 max-w-[82%] bg-white dark:bg-[#131C31] h-full p-4 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                <div>
                  <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    {roleSpec.roleLabel} Menu
                  </div>
                  <div className={`text-[11px] font-medium ${roleConfig.accentTextClass}`}>
                    {roleConfig.dashboardHeading} · {roleSpec.screens.length} views
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close drawer"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2.5 space-y-3">
                {navGroups.map((group) => (
                  <div key={group.id} className="space-y-0.5">
                    <div className="px-3 pb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {group.label}
                    </div>
                    {group.items.map((s) => {
                      const active = activeScreen === s.id;
                      const badge = navBadges?.[s.id];
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            onSelectScreen(s.id);
                            setDrawerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-full text-xs font-semibold cursor-pointer ${
                            active
                              ? roleConfig.accentBgActiveClass
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <RoleNavIcon iconKey={getScreenIconKey(s.id)} className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{s.label}</span>
                          </span>
                          {badge !== undefined && (
                            <span
                              className={`font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                                active
                                  ? 'bg-black/15 text-current'
                                  : badge.tone === 'alert'
                                  ? 'bg-rose-500/15 text-rose-700 dark:text-[#FF4D4F]'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {badge.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                {role === 'super_admin' && onOpenRoleManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onOpenRoleManager();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-800 dark:text-[#00D4FF] cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Firestore RBAC Roles</span>
                  </button>
                )}
                {role !== 'super_admin' && onTestGuardDenied && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onTestGuardDenied();
                    }}
                    className="w-full py-2 rounded-full text-xs font-semibold border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-[#FF4D4F] cursor-pointer"
                  >
                    Test Restricted Admin Route
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label="Close drawer backdrop"
              className="flex-1"
              onClick={() => setDrawerOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
