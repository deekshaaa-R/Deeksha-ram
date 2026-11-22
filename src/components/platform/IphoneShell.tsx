import { useState, type ReactNode } from 'react';
import {
  ChevronRight,
  Grid3X3,
  Laptop,
  LogOut,
  MoreHorizontal,
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

interface IphoneShellProps {
  role: PlatformRole;
  activeScreen: string;
  onSelectScreen: (screenId: string) => void;
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

export function IphoneShell({
  role,
  activeScreen,
  onSelectScreen,
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
}: IphoneShellProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const roleSpec = ROLE_NAV_MATRIX[role];
  const roleConfig = ROLE_DASHBOARD_CONFIG[role];
  const navGroups = getGroupedNavigationForRole(role);
  const primaryTabs = roleSpec.screens
    .filter((s) => s.primaryTab)
    .slice(0, 4);

  return (
    <div
      data-testid="platform-shell-iphone"
      className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-4"
    >
      {/* Platform Switcher Strip outside phone bezel */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
          <TabletSmartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
          <span>iPhone iOS HIG App · {roleSpec.roleLabel}</span>
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
                  id === 'iphone'
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
            aria-label="Switch iPhone role"
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

      {/* iPhone iOS HIG Device Frame */}
      <div className="mx-auto max-w-[420px] rounded-[44px] border-[7px] border-slate-900 dark:border-slate-700 bg-[#F2F2F7] dark:bg-[#0B0F1A] shadow-2xl overflow-hidden flex flex-col relative min-h-[730px] max-h-[830px]">
        {/* Dynamic Island + iOS Status Bar */}
        <div className="px-6 pt-2.5 pb-1.5 flex items-center justify-between bg-white/80 dark:bg-[#141A29]/85 backdrop-blur-md shrink-0">
          <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
            9:41
          </span>
          <div className="w-24 h-5 rounded-full bg-slate-950" aria-hidden="true" />
          <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-[#7CFF6B]">
            5G · 98%
          </span>
        </div>

        {/* Frosted iOS Navigation Bar */}
        <header className="px-4 py-2.5 bg-white/85 dark:bg-[#141A29]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-[#00D4FF]">
              {roleSpec.roleLabel} · iOS
            </div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
              {roleSpec.screens.find((s) => s.id === activeScreen)?.label ??
                roleSpec.roleLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out of iOS app"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-sky-600 dark:text-[#00D4FF] hover:bg-sky-50 dark:hover:bg-white/10 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </header>

        {/* Compact iOS RTO / Vehicle Number Search Strip */}
        <div className="px-3.5 py-2 bg-white/75 dark:bg-[#141A29]/80 border-b border-slate-200/70 dark:border-white/10 shrink-0">
          <GlobalRtoSearchBar
            liveVehicles={liveVehicles}
            onSelectVehicleForTracking={onSelectRtoVehicle}
            variant="compact"
            testIdPrefix="iphone-rto-search"
          />
        </div>

        {/* Scrollable iOS Canvas */}
        <div className="flex-1 overflow-y-auto p-3.5 pb-6">{children}</div>

        {/* Frosted iOS Bottom Tab Bar (4 Primary Tabs + More Sheet) */}
        <nav
          aria-label="iPhone tab bar"
          className="shrink-0 bg-white/90 dark:bg-[#141A29]/90 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 px-2 pt-2 pb-4 grid grid-cols-5 gap-1"
        >
          {primaryTabs.map((tab) => {
            const active = activeScreen === tab.id && !moreOpen;
            const isAlertTab =
              tab.id === 'alerts' ||
              tab.id === 'alerts-settings' ||
              tab.id === 'notifications';
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`iphone-tab-${tab.id}`}
                onClick={() => {
                  setMoreOpen(false);
                  onSelectScreen(tab.id);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? roleConfig.accentTextClass
                    : 'text-slate-500 dark:text-[#A9B4D0]'
                }`}
              >
                <RoleNavIcon iconKey={getScreenIconKey(tab.id)} className="w-4 h-4" />
                <span className="truncate max-w-full">
                  {tab.shortLabel}
                  {isAlertTab && unreadAlertsCount > 0 ? ` (${unreadAlertsCount})` : ''}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            data-testid="iphone-tab-more"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-[10px] font-semibold cursor-pointer ${
              moreOpen
                ? roleConfig.accentTextClass
                : 'text-slate-500 dark:text-[#A9B4D0]'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
            <span>More</span>
          </button>
        </nav>

        {/* Home Indicator */}
        <div className="bg-white/90 dark:bg-[#141A29]/90 pb-1.5 flex justify-center">
          <div className="w-28 h-1 rounded-full bg-slate-900/30 dark:bg-white/30" aria-hidden="true" />
        </div>

        {/* iOS Grouped Pull-Up Sheet ("More") */}
        {moreOpen && (
          <div className="absolute inset-x-0 bottom-0 top-14 z-30 bg-[#F2F2F7] dark:bg-[#0B0F1A] rounded-t-3xl border-t border-slate-200 dark:border-white/15 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10">
              <div>
                <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  {roleSpec.roleLabel} Directory
                </div>
                <div className={`text-[11px] font-medium ${roleConfig.accentTextClass}`}>
                  {roleConfig.dashboardHeading} · {userName}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close More sheet"
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {navGroups.map((group) => (
                <div key={group.id} className="space-y-1.5">
                  <div className="px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {group.label}
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-[#141A29] border border-slate-200/80 dark:border-white/10 divide-y divide-slate-200/80 dark:divide-white/10 overflow-hidden">
                    {group.items.map((s) => {
                      const active = activeScreen === s.id;
                      const badge = navBadges?.[s.id];
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            onSelectScreen(s.id);
                            setMoreOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? roleConfig.accentBgActiveClass
                              : 'text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <RoleNavIcon iconKey={getScreenIconKey(s.id)} className="w-4 h-4 shrink-0" />
                            <span className="truncate">{s.label}</span>
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            {badge !== undefined && (
                              <span
                                className={`font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded-md ${
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
                            <ChevronRight className={`w-4 h-4 shrink-0 ${active ? 'opacity-90' : 'text-slate-400'}`} aria-hidden="true" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {role === 'super_admin' && onOpenRoleManager && (
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenRoleManager();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-[#00D4FF] cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Firestore RBAC Roles</span>
                </button>
              )}

              {role !== 'super_admin' && onTestGuardDenied && (
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onTestGuardDenied();
                  }}
                  className="w-full py-2.5 rounded-2xl text-xs font-semibold border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-[#FF4D4F] cursor-pointer"
                >
                  Test Restricted Admin Route
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
