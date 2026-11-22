import { Laptop, Smartphone, TabletSmartphone, X } from 'lucide-react';
import {
  ROLE_NAV_MATRIX,
  type PlatformDevice,
  type PlatformRole,
} from '../../utils/unifiedPlatformLogic';

interface ScreenMatrixModalProps {
  open: boolean;
  activeRole: PlatformRole;
  activePlatform: PlatformDevice;
  onClose: () => void;
  onJump: (role: PlatformRole, platform: PlatformDevice, screenId?: string) => void;
}

const ROLES: PlatformRole[] = ['super_admin', 'admin', 'client', 'customer'];
const PLATFORMS: Array<{ id: PlatformDevice; label: string; style: string }> = [
  { id: 'laptop', label: 'Laptop (Web)', style: 'Wide Sidebar + Control Room' },
  { id: 'android', label: 'Android (M3)', style: 'Material 3 · Bottom Bar + FAB + Drawer' },
  { id: 'iphone', label: 'iPhone (iOS)', style: 'Apple HIG · Frosted Nav + Tab Bar + Sheet' },
];

export function ScreenMatrixModal({
  open,
  activeRole,
  activePlatform,
  onClose,
  onJump,
}: ScreenMatrixModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="12-Version Platform Matrix"
      data-testid="screen-matrix-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111B3A] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A]">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              VS TrackPro · 12-Version Matrix (4 User Roles × 3 Platforms)
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
              Unified Ttrack + myFleetvigilPro backend powering Laptop Web, Android Material 3, and iPhone iOS HIG
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close 12-version matrix"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#A9B4D0]">
                  <th className="py-2.5 pr-4 font-semibold">User Role</th>
                  {PLATFORMS.map((p) => (
                    <th key={p.id} className="py-2.5 px-3 font-semibold">
                      <div className="inline-flex items-center gap-1.5 text-slate-900 dark:text-white">
                        {p.id === 'laptop' ? (
                          <Laptop className="w-3.5 h-3.5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
                        ) : p.id === 'android' ? (
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-[#7CFF6B]" aria-hidden="true" />
                        ) : (
                          <TabletSmartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
                        )}
                        <span>{p.label}</span>
                      </div>
                      <div className="font-normal text-[11px] text-slate-500 dark:text-[#A9B4D0]">
                        {p.style}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {ROLES.map((role) => {
                  const spec = ROLE_NAV_MATRIX[role];
                  return (
                    <tr key={role} className="align-top">
                      <td className="py-3.5 pr-4 min-w-[180px]">
                        <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                          {spec.roleLabel}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-[#A9B4D0] mt-0.5">
                          {spec.screens.length} isolated screens
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                          {spec.scopeSummary}
                        </div>
                      </td>
                      {PLATFORMS.map((p) => {
                        const isCurrent =
                          role === activeRole && p.id === activePlatform;
                        const primaryTabs =
                          p.id === 'laptop'
                            ? spec.screens.slice(0, 5).map((s) => s.shortLabel)
                            : spec.screens
                                .filter((s) => s.primaryTab)
                                .slice(0, p.id === 'iphone' ? 4 : 5)
                                .map((s) => s.shortLabel);
                        return (
                          <td key={p.id} className="py-3.5 px-3 min-w-[190px]">
                            <div
                              className={`rounded-xl border p-3 space-y-2 ${
                                isCurrent
                                  ? 'border-cyan-500 dark:border-[#00D4FF] bg-cyan-50/70 dark:bg-[#00D4FF]/10'
                                  : 'border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#0A1128]'
                              }`}
                            >
                              <div className="text-[11px] text-slate-600 dark:text-[#A9B4D0]">
                                {primaryTabs.join(' · ')}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  onJump(role, p.id);
                                  onClose();
                                }}
                                className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                  isCurrent
                                    ? 'bg-[#00D4FF] text-[#0A1128]'
                                    : 'border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF]'
                                }`}
                              >
                                {isCurrent
                                  ? 'Active Version'
                                  : `Open ${spec.roleLabel} · ${p.label.split(' ')[0]}`}
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
