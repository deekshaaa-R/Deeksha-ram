import {
  ROLE_NAV_MATRIX,
  type PlatformRole,
} from './unifiedPlatformLogic';

export const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'ramdeeksharam@gmail.com';

export const VALID_PLATFORM_ROLES: readonly PlatformRole[] = [
  'super_admin',
  'admin',
  'client',
  'customer',
] as const;

export const ROLE_HIERARCHY: Record<PlatformRole, number> = {
  super_admin: 4,
  admin: 3,
  client: 2,
  customer: 1,
};

export interface PlatformRoleGrantRecord {
  uid: string;
  email: string;
  displayName?: string;
  role: PlatformRole;
  status: 'Active' | 'Blocked';
  adminId?: string;
  clientId?: string;
  company?: string;
  assignedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuthGuardIdentity {
  isAuthenticated: boolean;
  uid?: string | null;
  email?: string | null;
  emailVerified?: boolean;
  role: PlatformRole | null;
  status: 'Active' | 'Blocked';
  authSource: 'firebase' | 'sandbox' | 'none';
}

export interface RouteAccessDecision {
  allowed: boolean;
  reason:
    | 'AUTHORIZED'
    | 'UNAUTHENTICATED'
    | 'ACCOUNT_BLOCKED'
    | 'EMAIL_UNVERIFIED'
    | 'ROLE_FORBIDDEN'
    | 'SCREEN_FORBIDDEN';
  message: string;
  fallbackScreenId: string | null;
}

export interface RoleCapabilities {
  canManageAdmins: boolean;
  canManageAllClients: boolean;
  canManageOwnClients: boolean;
  canManageCustomers: boolean;
  canManageDeviceCatalog: boolean;
  canManageVehicleTypes: boolean;
  canManageApiIntegrations: boolean;
  canManageFirebaseRoles: boolean;
  canEditGeofences: boolean;
  canUploadPods: boolean;
  canExportReports: boolean;
  isReadOnly: boolean;
}

export function isValidPlatformRole(value: unknown): value is PlatformRole {
  return (
    typeof value === 'string' &&
    (VALID_PLATFORM_ROLES as readonly string[]).includes(value)
  );
}

export function isBootstrapSuperAdmin(
  email: string | null | undefined,
  emailVerified: boolean | null | undefined
): boolean {
  if (!email || !emailVerified) return false;
  return email.trim().toLowerCase() === BOOTSTRAP_SUPER_ADMIN_EMAIL;
}

/**
 * Resolves the authoritative RBAC role for a Firebase user.
 * - Verified bootstrap Super Admin email always resolves to 'super_admin' unless explicitly blocked.
 * - Existing Firestore /platformRoles/{uid} grant is authoritative for all other users.
 * - Brand-new verified users with no grant default to least-privilege 'customer'.
 */
export function resolveRoleFromGrant(input: {
  email?: string | null;
  emailVerified?: boolean | null;
  grant?: Partial<PlatformRoleGrantRecord> | null;
}): { role: PlatformRole; status: 'Active' | 'Blocked' } {
  const grantStatus: 'Active' | 'Blocked' =
    input.grant?.status === 'Blocked' ? 'Blocked' : 'Active';

  if (isBootstrapSuperAdmin(input.email, input.emailVerified)) {
    return {
      role: 'super_admin',
      status: grantStatus,
    };
  }

  if (input.grant && isValidPlatformRole(input.grant.role)) {
    return {
      role: input.grant.role,
      status: grantStatus,
    };
  }

  return {
    role: 'customer',
    status: grantStatus,
  };
}

export function getDefaultScreenForRole(role: PlatformRole): string {
  const spec = ROLE_NAV_MATRIX[role];
  return spec.screens[0]?.id ?? 'dashboard';
}

export function canAccessPlatformRole(
  userRole: PlatformRole | null,
  allowedRoles: readonly PlatformRole[]
): boolean {
  if (!userRole || !isValidPlatformRole(userRole)) return false;
  return allowedRoles.includes(userRole);
}

export function canAccessPlatformScreen(
  userRole: PlatformRole | null,
  screenId: string | undefined
): boolean {
  if (!userRole || !isValidPlatformRole(userRole)) return false;
  if (!screenId) return true;
  const spec = ROLE_NAV_MATRIX[userRole];
  return spec.screens.some((s) => s.id === screenId);
}

export function evaluatePlatformRouteAccess(params: {
  identity: AuthGuardIdentity;
  allowedRoles?: readonly PlatformRole[];
  requiredScreen?: string;
  requireVerifiedEmailForFirebase?: boolean;
}): RouteAccessDecision {
  const {
    identity,
    allowedRoles,
    requiredScreen,
    requireVerifiedEmailForFirebase = true,
  } = params;

  if (!identity.isAuthenticated || !identity.role) {
    return {
      allowed: false,
      reason: 'UNAUTHENTICATED',
      message: 'Sign in with your assigned role account to access this workspace.',
      fallbackScreenId: null,
    };
  }

  if (identity.status === 'Blocked') {
    return {
      allowed: false,
      reason: 'ACCOUNT_BLOCKED',
      message:
        'This account is currently blocked by an administrator. Contact your fleet admin to restore access.',
      fallbackScreenId: null,
    };
  }

  if (
    requireVerifiedEmailForFirebase &&
    identity.authSource === 'firebase' &&
    identity.emailVerified === false
  ) {
    return {
      allowed: false,
      reason: 'EMAIL_UNVERIFIED',
      message:
        'Your Firebase email address must be verified before accessing protected fleet routes.',
      fallbackScreenId: null,
    };
  }

  const fallbackScreenId = getDefaultScreenForRole(identity.role);

  if (allowedRoles && allowedRoles.length > 0) {
    if (!canAccessPlatformRole(identity.role, allowedRoles)) {
      const activeLabel = ROLE_NAV_MATRIX[identity.role].roleLabel;
      const requiredLabels = allowedRoles
        .map((r) => ROLE_NAV_MATRIX[r].roleLabel)
        .join(' or ');
      return {
        allowed: false,
        reason: 'ROLE_FORBIDDEN',
        message: `Your verified role (${activeLabel}) cannot access this route. Required role: ${requiredLabels}.`,
        fallbackScreenId,
      };
    }
  }

  if (requiredScreen && !canAccessPlatformScreen(identity.role, requiredScreen)) {
    const activeLabel = ROLE_NAV_MATRIX[identity.role].roleLabel;
    return {
      allowed: false,
      reason: 'SCREEN_FORBIDDEN',
      message: `The screen "${requiredScreen}" is restricted and not available in the ${activeLabel} portal.`,
      fallbackScreenId,
    };
  }

  return {
    allowed: true,
    reason: 'AUTHORIZED',
    message: 'Access granted.',
    fallbackScreenId,
  };
}

export function getRoleCapabilities(role: PlatformRole): RoleCapabilities {
  return {
    canManageAdmins: role === 'super_admin',
    canManageAllClients: role === 'super_admin',
    canManageOwnClients: role === 'super_admin' || role === 'admin',
    canManageCustomers:
      role === 'super_admin' || role === 'admin' || role === 'client',
    canManageDeviceCatalog: role === 'super_admin' || role === 'admin',
    canManageVehicleTypes: role === 'super_admin',
    canManageApiIntegrations: role === 'super_admin',
    canManageFirebaseRoles: role === 'super_admin',
    canEditGeofences:
      role === 'super_admin' || role === 'admin' || role === 'client',
    canUploadPods:
      role === 'super_admin' || role === 'admin' || role === 'client',
    canExportReports:
      role === 'super_admin' || role === 'admin' || role === 'client',
    isReadOnly: role === 'customer',
  };
}

const SAFE_UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export const PLATFORM_ROLE_GRANT_ALLOWED_FIELDS = [
  'uid',
  'email',
  'displayName',
  'role',
  'status',
  'assignedBy',
  'company',
  'adminId',
  'clientId',
  'createdAt',
  'updatedAt',
] as const;

export function sanitizeFirestoreRolePayload(input: {
  uid: string;
  email: string;
  displayName?: string;
  role: PlatformRole;
  status?: 'Active' | 'Blocked';
  adminId?: string;
  clientId?: string;
  company?: string;
  assignedBy?: string;
}):
  | {
      ok: true;
      data: {
        uid: string;
        email: string;
        displayName?: string;
        role: PlatformRole;
        status: 'Active' | 'Blocked';
        adminId?: string;
        clientId?: string;
        company?: string;
        assignedBy?: string;
      };
    }
  | { ok: false; error: string } {
  const uid = input.uid.trim();
  if (!SAFE_UID_PATTERN.test(uid)) {
    return {
      ok: false,
      error: 'UID must be 1–128 alphanumeric, dash, or underscore characters.',
    };
  }

  const email = input.email.trim().toLowerCase();
  if (email.length < 3 || email.length > 160 || !email.includes('@')) {
    return {
      ok: false,
      error: 'A valid email address (3–160 characters) is required.',
    };
  }

  if (!isValidPlatformRole(input.role)) {
    return {
      ok: false,
      error: 'Role must be super_admin, admin, client, or customer.',
    };
  }

  const status: 'Active' | 'Blocked' =
    input.status === 'Blocked' ? 'Blocked' : 'Active';

  const clean: {
    uid: string;
    email: string;
    displayName?: string;
    role: PlatformRole;
    status: 'Active' | 'Blocked';
    adminId?: string;
    clientId?: string;
    company?: string;
    assignedBy?: string;
  } = {
    uid,
    email,
    role: input.role,
    status,
  };

  if (input.displayName && input.displayName.trim()) {
    clean.displayName = input.displayName.trim().slice(0, 120);
  }
  if (input.adminId && input.adminId.trim()) {
    const adminId = input.adminId.trim();
    if (!SAFE_UID_PATTERN.test(adminId)) {
      return {
        ok: false,
        error: 'adminId must be 1–128 alphanumeric, dash, or underscore characters.',
      };
    }
    clean.adminId = adminId;
  }
  if (input.clientId && input.clientId.trim()) {
    const clientId = input.clientId.trim();
    if (!SAFE_UID_PATTERN.test(clientId)) {
      return {
        ok: false,
        error: 'clientId must be 1–128 alphanumeric, dash, or underscore characters.',
      };
    }
    clean.clientId = clientId;
  }
  if (input.company && input.company.trim()) {
    clean.company = input.company.trim().slice(0, 120);
  }
  if (input.assignedBy && input.assignedBy.trim()) {
    const assignedBy = input.assignedBy.trim();
    if (!SAFE_UID_PATTERN.test(assignedBy)) {
      return {
        ok: false,
        error: 'assignedBy must be 1–128 alphanumeric, dash, or underscore characters.',
      };
    }
    clean.assignedBy = assignedBy;
  }

  return { ok: true, data: clean };
}
