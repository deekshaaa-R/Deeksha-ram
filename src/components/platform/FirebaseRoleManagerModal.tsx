import { useState, type FormEvent } from 'react';
import { RefreshCw, ShieldCheck, UserPlus, X } from 'lucide-react';
import { usePlatformAuth } from '../../context/PlatformAuthContext';
import {
  ROLE_NAV_MATRIX,
  type PlatformRole,
} from '../../utils/unifiedPlatformLogic';
import { ProtectedPlatformRoute } from './ProtectedPlatformRoute';

interface FirebaseRoleManagerModalProps {
  open: boolean;
  onClose: () => void;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

const ROLES: PlatformRole[] = ['super_admin', 'admin', 'client', 'customer'];

export function FirebaseRoleManagerModal({
  open,
  onClose,
  onNotify,
}: FirebaseRoleManagerModalProps) {
  const {
    identity,
    firebaseUser,
    verifiedRole,
    roleGrantsDirectory,
    roleDirectoryLoading,
    refreshRoleDirectory,
    assignFirestoreRole,
    signInWithFirebaseGoogle,
  } = usePlatformAuth();

  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState<PlatformRole>('client');
  const [status, setStatus] = useState<'Active' | 'Blocked'>('Active');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!open) return null;

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await assignFirestoreRole({
        uid,
        email,
        displayName: displayName || undefined,
        company: company || undefined,
        role,
        status,
      });
      if (!res.ok) {
        setFormError(res.error || 'Could not save role assignment.');
        return;
      }
      onNotify(`Saved Firestore RBAC role (${role}) for ${email}.`, 'success');
      setUid('');
      setEmail('');
      setDisplayName('');
      setCompany('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Firebase RBAC Role Manager"
      data-testid="firebase-role-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111B3A] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Firestore RBAC Role Directory (/platformRoles)
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                Assign Super Admin, Admin, Client, or Customer roles to Firebase Auth UIDs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Firebase RBAC Role Manager"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <ProtectedPlatformRoute
            identity={identity}
            allowedRoles={['super_admin']}
            onReturnToSafeRoute={onClose}
          >
            {!firebaseUser || verifiedRole !== 'super_admin' ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Firebase Owner Sign-In Required for Live Firestore Writes
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300/90">
                  You are currently viewing the Super Admin sandbox portal. To read or modify live{' '}
                  <code className="font-mono">/platformRoles/&#123;uid&#125;</code> documents in Firestore, authenticate with the verified Super Admin Google account.
                </p>
                <button
                  type="button"
                  onClick={() => void signInWithFirebaseGoogle()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-950 cursor-pointer"
                >
                  Sign in with Firebase Google Account
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <form
                  onSubmit={handleAssign}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                    <UserPlus className="w-4 h-4 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
                    <span>Assign / Update User Role in Firestore</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="rbac-uid" className="block text-[11px] font-semibold text-slate-600 dark:text-[#A9B4D0] mb-1">
                        Firebase Auth UID
                      </label>
                      <input
                        id="rbac-uid"
                        type="text"
                        required
                        value={uid}
                        onChange={(e) => setUid(e.target.value)}
                        placeholder="e.g. aBcD1234EfGh5678"
                        className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] px-3 py-2 font-mono text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="rbac-email" className="block text-[11px] font-semibold text-slate-600 dark:text-[#A9B4D0] mb-1">
                        User Email
                      </label>
                      <input
                        id="rbac-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="fleet.manager@company.in"
                        className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="rbac-name" className="block text-[11px] font-semibold text-slate-600 dark:text-[#A9B4D0] mb-1">
                        Display Name
                      </label>
                      <input
                        id="rbac-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Full name"
                        className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="rbac-company" className="block text-[11px] font-semibold text-slate-600 dark:text-[#A9B4D0] mb-1">
                        Organization / Tenant
                      </label>
                      <input
                        id="rbac-company"
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Company name"
                        className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="rbac-role" className="block text-[11px] font-semibold text-slate-600 dark:text-[#A9B4D0] mb-1">
                        Assigned RBAC Role
                      </label>
                      <select
                        id="rbac-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as PlatformRole)}
                        className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] px-3 py-2 text-xs text-slate-900 dark:text-white"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_NAV_MATRIX[r].roleLabel} ({r})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="rbac-status" className="block text-[11px] font-semibold text-slate-600 dark:text-[#A9B4D0] mb-1">
                        Account Status
                      </label>
                      <select
                        id="rbac-status"
                        value={status}
                        onChange={(e) =>
                          setStatus(e.target.value as 'Active' | 'Blocked')
                        }
                        className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] px-3 py-2 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </div>
                  </div>
                  {formError && (
                    <p role="alert" className="text-xs text-rose-600 dark:text-[#FF4D4F]">
                      {formError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'Writing to Firestore...' : 'Save Role Grant'}
                  </button>
                </form>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-[#A9B4D0]">
                      Active Firestore Grants ({roleGrantsDirectory.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => void refreshRoleDirectory()}
                      disabled={roleDirectoryLoading}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${roleDirectoryLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#0A1128] text-slate-500 dark:text-[#A9B4D0] border-b border-slate-200 dark:border-white/10">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">User</th>
                          <th className="py-2.5 px-3 font-semibold">UID</th>
                          <th className="py-2.5 px-3 font-semibold">Role</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                        {roleGrantsDirectory.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-5 px-3 text-center text-slate-500 dark:text-[#A9B4D0]">
                              No Firestore role grants loaded yet.
                            </td>
                          </tr>
                        ) : (
                          roleGrantsDirectory.map((g) => (
                            <tr key={g.uid}>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {g.displayName || g.email}
                                </div>
                                <div className="font-mono text-[11px] text-slate-500 dark:text-[#A9B4D0]">
                                  {g.email}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-[#A9B4D0]">
                                {g.uid.slice(0, 14)}…
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-cyan-700 dark:text-[#00D4FF]">
                                {ROLE_NAV_MATRIX[g.role].roleLabel}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={
                                    g.status === 'Blocked'
                                      ? 'font-semibold text-rose-600 dark:text-[#FF4D4F]'
                                      : 'font-semibold text-emerald-700 dark:text-[#7CFF6B]'
                                  }
                                >
                                  {g.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </ProtectedPlatformRoute>
        </div>
      </div>
    </div>
  );
}
