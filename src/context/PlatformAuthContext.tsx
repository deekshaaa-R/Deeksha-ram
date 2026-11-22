import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type { PlatformRole } from '../utils/unifiedPlatformLogic';
import {
  isBootstrapSuperAdmin,
  resolveRoleFromGrant,
  sanitizeFirestoreRolePayload,
  type AuthGuardIdentity,
  type PlatformRoleGrantRecord,
} from '../utils/platformAuthGuard';

export interface PlatformAuthContextValue {
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  authError: string | null;
  roleGrant: PlatformRoleGrantRecord | null;
  /** Verified RBAC role resolved from Firebase Auth + Firestore /platformRoles/{uid} */
  verifiedRole: PlatformRole | null;
  /** Effective role in the active session (either verified Firebase role or sandbox role when signed into demo portal) */
  activeRole: PlatformRole | null;
  activeStatus: 'Active' | 'Blocked';
  authSource: 'firebase' | 'sandbox' | 'none';
  identity: AuthGuardIdentity;
  /** Firebase Google Sign-In flow (authoritative RBAC auth) */
  signInWithFirebaseGoogle: () => Promise<{
    ok: boolean;
    role?: PlatformRole;
    idToken?: string;
    error?: string;
  }>;
  signOutPlatform: () => Promise<void>;
  /** Sets or clears a sandbox session role (when testing the 4 portals without overriding verified Firebase identity) */
  setSandboxIdentity: (
    sandbox: {
      uid: string;
      email: string;
      role: PlatformRole;
      status: 'Active' | 'Blocked';
    } | null
  ) => void;
  /** Super Admin Firestore /platformRoles directory & role assignment */
  roleGrantsDirectory: PlatformRoleGrantRecord[];
  roleDirectoryLoading: boolean;
  refreshRoleDirectory: () => Promise<void>;
  assignFirestoreRole: (input: {
    uid: string;
    email: string;
    displayName?: string;
    role: PlatformRole;
    status: 'Active' | 'Blocked';
    company?: string;
    adminId?: string;
    clientId?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  getFreshFirebaseIdToken: () => Promise<string | null>;
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [roleGrant, setRoleGrant] = useState<PlatformRoleGrantRecord | null>(null);
  const [sandboxUser, setSandboxUser] = useState<{
    uid: string;
    email: string;
    role: PlatformRole;
    status: 'Active' | 'Blocked';
  } | null>(null);
  const [roleGrantsDirectory, setRoleGrantsDirectory] = useState<
    PlatformRoleGrantRecord[]
  >([]);
  const [roleDirectoryLoading, setRoleDirectoryLoading] = useState(false);

  const loadOrProvisionRoleGrant = useCallback(
    async (user: FirebaseUser): Promise<PlatformRoleGrantRecord | null> => {
      const rolePath = `platformRoles/${user.uid}`;
      const ref = doc(db, 'platformRoles', user.uid);

      const buildFallbackRecord = (): PlatformRoleGrantRecord => {
        const fallback = resolveRoleFromGrant({
          email: user.email,
          emailVerified: user.emailVerified,
          grant: null,
        });
        const record: PlatformRoleGrantRecord = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || undefined,
          role: fallback.role,
          status: fallback.status,
        };
        setRoleGrant(record);
        return record;
      };

      // Firestore rules require verified email; avoid triggering guaranteed permission denials
      if (!user.emailVerified) {
        return buildFallbackRecord();
      }

      let snap;
      try {
        snap = await getDoc(ref);
      } catch (getErr) {
        try {
          handleFirestoreError(getErr, OperationType.GET, rolePath);
        } catch (wrapped) {
          const msg =
            wrapped instanceof Error
              ? wrapped.message
              : 'Failed to load RBAC role profile from Firestore.';
          setAuthError(msg);
        }
        return buildFallbackRecord();
      }

      if (snap.exists()) {
        const raw = snap.data() as Partial<PlatformRoleGrantRecord>;
        const resolved = resolveRoleFromGrant({
          email: user.email,
          emailVerified: user.emailVerified,
          grant: raw,
        });
        const record: PlatformRoleGrantRecord = {
          uid: user.uid,
          email: raw.email || user.email || '',
          displayName: raw.displayName || user.displayName || undefined,
          role: resolved.role,
          status: resolved.status,
          adminId: raw.adminId,
          clientId: raw.clientId,
          company: raw.company,
          assignedBy: raw.assignedBy,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        };
        setRoleGrant(record);
        return record;
      }

      // First-time sign-in: provision Firestore /platformRoles/{uid} with strict least privilege
      const defaultRole: PlatformRole = isBootstrapSuperAdmin(
        user.email,
        user.emailVerified
      )
        ? 'super_admin'
        : 'customer';

      const sanitized = sanitizeFirestoreRolePayload({
        uid: user.uid,
        email: user.email || `${user.uid}@vstrackpro.local`,
        displayName: user.displayName || 'VS TrackPro User',
        role: defaultRole,
        status: 'Active',
        company:
          defaultRole === 'super_admin'
            ? 'VS TrackPro HQ (Owner)'
            : 'Verified Customer Account',
        assignedBy: user.uid,
      });

      if (!sanitized.ok) {
        setAuthError(sanitized.error);
        return buildFallbackRecord();
      }

      try {
        await setDoc(ref, {
          ...sanitized.data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (writeErr) {
        try {
          handleFirestoreError(writeErr, OperationType.CREATE, rolePath);
        } catch (wrapped) {
          const msg =
            wrapped instanceof Error
              ? wrapped.message
              : 'Failed to provision RBAC role profile in Firestore.';
          setAuthError(msg);
        }
        return buildFallbackRecord();
      }

      const created: PlatformRoleGrantRecord = {
        ...sanitized.data,
      };
      setRoleGrant(created);
      return created;
    },
    []
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthError(null);
      if (!user) {
        setRoleGrant(null);
        setRoleGrantsDirectory([]);
        setAuthLoading(false);
        return;
      }
      setAuthLoading(true);
      await loadOrProvisionRoleGrant(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, [loadOrProvisionRoleGrant]);

  const verifiedRole: PlatformRole | null = useMemo(() => {
    if (!firebaseUser) return null;
    const resolved = resolveRoleFromGrant({
      email: firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      grant: roleGrant,
    });
    return resolved.role;
  }, [firebaseUser, roleGrant]);

  const refreshRoleDirectory = useCallback(async () => {
    if (!firebaseUser || verifiedRole !== 'super_admin') return;
    setRoleDirectoryLoading(true);
    try {
      const colRef = collection(db, 'platformRoles');
      const snap = await getDocs(colRef);
      const list: PlatformRoleGrantRecord[] = snap.docs.map((d) => {
        const data = d.data() as Partial<PlatformRoleGrantRecord>;
        const resolved = resolveRoleFromGrant({
          email: data.email,
          emailVerified: true,
          grant: data,
        });
        return {
          uid: d.id,
          email: data.email || '',
          displayName: data.displayName,
          role: resolved.role,
          status: resolved.status,
          adminId: data.adminId,
          clientId: data.clientId,
          company: data.company,
          assignedBy: data.assignedBy,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      setRoleGrantsDirectory(list);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.LIST, 'platformRoles');
      } catch {
        // Error logged structurally by handleFirestoreError
      }
    } finally {
      setRoleDirectoryLoading(false);
    }
  }, [firebaseUser, verifiedRole]);

  useEffect(() => {
    if (firebaseUser && verifiedRole === 'super_admin') {
      void refreshRoleDirectory();
    }
  }, [firebaseUser, verifiedRole, refreshRoleDirectory]);

  const assignFirestoreRole = useCallback(
    async (input: {
      uid: string;
      email: string;
      displayName?: string;
      role: PlatformRole;
      status: 'Active' | 'Blocked';
      company?: string;
      adminId?: string;
      clientId?: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      if (!firebaseUser || verifiedRole !== 'super_admin') {
        return {
          ok: false,
          error: 'Only a verified Super Admin can assign Firestore RBAC roles.',
        };
      }

      const sanitized = sanitizeFirestoreRolePayload({
        ...input,
        assignedBy: firebaseUser.uid,
      });

      if (!sanitized.ok) {
        return { ok: false, error: sanitized.error };
      }

      const targetPath = `platformRoles/${sanitized.data.uid}`;
      const targetRef = doc(db, 'platformRoles', sanitized.data.uid);

      let existing;
      try {
        existing = await getDoc(targetRef);
      } catch (getErr) {
        try {
          handleFirestoreError(getErr, OperationType.GET, targetPath);
        } catch (wrapped) {
          return {
            ok: false,
            error:
              wrapped instanceof Error
                ? wrapped.message
                : 'Permission denied reading Firestore role.',
          };
        }
        return { ok: false, error: 'Failed to read role in Firestore.' };
      }

      try {
        if (existing.exists()) {
          await updateDoc(targetRef, {
            email: sanitized.data.email,
            role: sanitized.data.role,
            status: sanitized.data.status,
            ...(sanitized.data.displayName
              ? { displayName: sanitized.data.displayName }
              : {}),
            ...(sanitized.data.company ? { company: sanitized.data.company } : {}),
            ...(sanitized.data.adminId ? { adminId: sanitized.data.adminId } : {}),
            ...(sanitized.data.clientId
              ? { clientId: sanitized.data.clientId }
              : {}),
            assignedBy: firebaseUser.uid,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(targetRef, {
            ...sanitized.data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await refreshRoleDirectory();
        if (sanitized.data.uid === firebaseUser.uid) {
          await loadOrProvisionRoleGrant(firebaseUser);
        }
        return { ok: true };
      } catch (writeErr) {
        const opType = existing.exists()
          ? OperationType.UPDATE
          : OperationType.CREATE;
        try {
          handleFirestoreError(writeErr, opType, targetPath);
        } catch (wrapped) {
          return {
            ok: false,
            error:
              wrapped instanceof Error
                ? wrapped.message
                : 'Permission denied updating Firestore role.',
          };
        }
        return { ok: false, error: 'Failed to update role in Firestore.' };
      }
    },
    [firebaseUser, verifiedRole, refreshRoleDirectory, loadOrProvisionRoleGrant]
  );

  const signInWithFirebaseGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const user = cred.user;
      const grant = await loadOrProvisionRoleGrant(user);
      const idToken = await user.getIdToken();
      setSandboxUser(null);
      return {
        ok: true,
        role: grant?.role ?? 'customer',
        idToken,
      };
    } catch (err) {
      const code = (err as { code?: string })?.code;
      const message =
        code === 'auth/popup-closed-by-user'
          ? 'Google sign-in popup was closed before completion.'
          : code === 'auth/popup-blocked'
          ? 'Popup was blocked by the browser. Allow popups for this site and try again.'
          : err instanceof Error
          ? err.message
          : 'Firebase authentication failed.';
      setAuthError(message);
      return { ok: false, error: message };
    } finally {
      setAuthLoading(false);
    }
  }, [loadOrProvisionRoleGrant]);

  const signOutPlatform = useCallback(async () => {
    setSandboxUser(null);
    setRoleGrant(null);
    setRoleGrantsDirectory([]);
    setAuthError(null);
    if (auth.currentUser) {
      await signOut(auth);
    }
  }, []);

  const getFreshFirebaseIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const activeSource: 'firebase' | 'sandbox' | 'none' = sandboxUser
    ? 'sandbox'
    : firebaseUser
    ? 'firebase'
    : 'none';

  const activeRole: PlatformRole | null = sandboxUser
    ? sandboxUser.role
    : verifiedRole;

  const activeStatus: 'Active' | 'Blocked' = sandboxUser
    ? sandboxUser.status
    : roleGrant?.status ?? 'Active';

  const identity: AuthGuardIdentity = useMemo(
    () => ({
      isAuthenticated: activeSource !== 'none' && activeRole !== null,
      uid: sandboxUser?.uid ?? firebaseUser?.uid ?? null,
      email: sandboxUser?.email ?? firebaseUser?.email ?? null,
      emailVerified: sandboxUser ? true : firebaseUser?.emailVerified ?? false,
      role: activeRole,
      status: activeStatus,
      authSource: activeSource,
    }),
    [activeSource, activeRole, activeStatus, sandboxUser, firebaseUser]
  );

  const value: PlatformAuthContextValue = {
    firebaseUser,
    authLoading,
    authError,
    roleGrant,
    verifiedRole,
    activeRole,
    activeStatus,
    authSource: activeSource,
    identity,
    signInWithFirebaseGoogle,
    signOutPlatform,
    setSandboxIdentity: setSandboxUser,
    roleGrantsDirectory,
    roleDirectoryLoading,
    refreshRoleDirectory,
    assignFirestoreRole,
    getFreshFirebaseIdToken,
  };

  return (
    <PlatformAuthContext.Provider value={value}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth(): PlatformAuthContextValue {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) {
    throw new Error('usePlatformAuth must be used inside <PlatformAuthProvider>.');
  }
  return ctx;
}
