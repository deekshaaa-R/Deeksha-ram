import type { ReactNode } from 'react';
import { ArrowLeft, Lock, ShieldAlert } from 'lucide-react';
import {
  ROLE_NAV_MATRIX,
  type PlatformRole,
} from '../../utils/unifiedPlatformLogic';
import {
  evaluatePlatformRouteAccess,
  type AuthGuardIdentity,
} from '../../utils/platformAuthGuard';

export interface ProtectedPlatformRouteProps {
  identity: AuthGuardIdentity;
  allowedRoles?: readonly PlatformRole[];
  requiredScreen?: string;
  onReturnToSafeRoute?: (fallbackScreenId: string) => void;
  onSignOut?: () => void;
  unauthenticatedFallback?: ReactNode;
  children: ReactNode;
}

/**
 * Declarative RBAC route protector.
 * Strictly blocks rendering of children unless the authenticated identity
 * satisfies active status, verified Firebase email (for Firebase sessions),
 * allowed role membership, and screen authorization.
 */
export function ProtectedPlatformRoute({
  identity,
  allowedRoles,
  requiredScreen,
  onReturnToSafeRoute,
  onSignOut,
  unauthenticatedFallback,
  children,
}: ProtectedPlatformRouteProps) {
  const decision = evaluatePlatformRouteAccess({
    identity,
    allowedRoles,
    requiredScreen,
  });

  if (decision.allowed) {
    return <>{children}</>;
  }

  if (decision.reason === 'UNAUTHENTICATED' && unauthenticatedFallback) {
    return <>{unauthenticatedFallback}</>;
  }

  const activeRoleLabel = identity.role
    ? ROLE_NAV_MATRIX[identity.role].roleLabel
    : 'Guest';

  return (
    <section
      data-testid="protected-route-denied"
      role="alert"
      aria-label="Route access restricted"
      className="max-w-xl mx-auto my-8 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-[#111B3A] p-6 sm:p-8 shadow-sm space-y-5"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0">
          {decision.reason === 'ACCOUNT_BLOCKED' ||
          decision.reason === 'EMAIL_UNVERIFIED' ? (
            <Lock className="w-5 h-5 text-rose-600 dark:text-[#FF4D4F]" aria-hidden="true" />
          ) : (
            <ShieldAlert
              className="w-5 h-5 text-rose-600 dark:text-[#FF4D4F]"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-[#FF4D4F]">
            RBAC Route Guard · {decision.reason}
          </p>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Access Restricted for {activeRoleLabel}
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
            {decision.message}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] px-4 py-3 text-xs font-mono text-slate-600 dark:text-[#A9B4D0] space-y-1">
        <div>
          Identity: <span className="text-slate-900 dark:text-white">{identity.email || 'Unauthenticated'}</span>
        </div>
        <div>
          Auth Provider:{' '}
          <span className="text-slate-900 dark:text-white uppercase">
            {identity.authSource === 'firebase'
              ? 'Firebase Auth + Firestore RBAC'
              : identity.authSource === 'sandbox'
              ? 'Role Portal Session'
              : 'None'}
          </span>
        </div>
        {requiredScreen && (
          <div>
            Requested Route:{' '}
            <span className="text-rose-600 dark:text-[#FF4D4F]">/{requiredScreen}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {decision.fallbackScreenId && onReturnToSafeRoute && (
          <button
            type="button"
            data-testid="protected-route-return-btn"
            onClick={() => onReturnToSafeRoute(decision.fallbackScreenId!)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Return to {activeRoleLabel} Home</span>
          </button>
        )}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Switch Account / Sign Out
          </button>
        )}
      </div>
    </section>
  );
}
