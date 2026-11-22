import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOTSTRAP_SUPER_ADMIN_EMAIL,
  canAccessPlatformRole,
  canAccessPlatformScreen,
  evaluatePlatformRouteAccess,
  getDefaultScreenForRole,
  getRoleCapabilities,
  isBootstrapSuperAdmin,
  isValidPlatformRole,
  PLATFORM_ROLE_GRANT_ALLOWED_FIELDS,
  resolveRoleFromGrant,
  sanitizeFirestoreRolePayload,
} from './platformAuthGuard';

test('validates the 4 canonical RBAC roles strictly', () => {
  assert.equal(isValidPlatformRole('super_admin'), true);
  assert.equal(isValidPlatformRole('admin'), true);
  assert.equal(isValidPlatformRole('client'), true);
  assert.equal(isValidPlatformRole('customer'), true);
  assert.equal(isValidPlatformRole('owner'), false);
  assert.equal(isValidPlatformRole(''), false);
  assert.equal(isValidPlatformRole(null), false);
});

test('bootstrap Super Admin requires both exact email and verified flag', () => {
  assert.equal(isBootstrapSuperAdmin(BOOTSTRAP_SUPER_ADMIN_EMAIL, true), true);
  assert.equal(
    isBootstrapSuperAdmin(BOOTSTRAP_SUPER_ADMIN_EMAIL.toUpperCase(), true),
    true
  );
  assert.equal(isBootstrapSuperAdmin(BOOTSTRAP_SUPER_ADMIN_EMAIL, false), false);
  assert.equal(isBootstrapSuperAdmin('attacker@example.com', true), false);
});

test('resolveRoleFromGrant assigns super_admin to verified owner and least-privilege customer to new users', () => {
  const owner = resolveRoleFromGrant({
    email: BOOTSTRAP_SUPER_ADMIN_EMAIL,
    emailVerified: true,
    grant: null,
  });
  assert.deepEqual(owner, { role: 'super_admin', status: 'Active' });

  const newCustomer = resolveRoleFromGrant({
    email: 'fresh.user@example.com',
    emailVerified: true,
    grant: null,
  });
  assert.deepEqual(newCustomer, { role: 'customer', status: 'Active' });

  const adminGrant = resolveRoleFromGrant({
    email: 'ops@fleet.in',
    emailVerified: true,
    grant: { role: 'admin', status: 'Active' },
  });
  assert.deepEqual(adminGrant, { role: 'admin', status: 'Active' });

  const blockedClient = resolveRoleFromGrant({
    email: 'blocked@fleet.in',
    emailVerified: true,
    grant: { role: 'client', status: 'Blocked' },
  });
  assert.deepEqual(blockedClient, { role: 'client', status: 'Blocked' });
});

test('route protection blocks unauthenticated, blocked, and unverified Firebase users', () => {
  const unauth = evaluatePlatformRouteAccess({
    identity: {
      isAuthenticated: false,
      role: null,
      status: 'Active',
      authSource: 'none',
    },
    allowedRoles: ['super_admin'],
  });
  assert.equal(unauth.allowed, false);
  assert.equal(unauth.reason, 'UNAUTHENTICATED');

  const blocked = evaluatePlatformRouteAccess({
    identity: {
      isAuthenticated: true,
      uid: 'u-1',
      email: 'client@vstrackpro.in',
      emailVerified: true,
      role: 'client',
      status: 'Blocked',
      authSource: 'firebase',
    },
    allowedRoles: ['client'],
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'ACCOUNT_BLOCKED');

  const unverified = evaluatePlatformRouteAccess({
    identity: {
      isAuthenticated: true,
      uid: 'u-2',
      email: 'unverified@vstrackpro.in',
      emailVerified: false,
      role: 'customer',
      status: 'Active',
      authSource: 'firebase',
    },
    allowedRoles: ['customer'],
  });
  assert.equal(unverified.allowed, false);
  assert.equal(unverified.reason, 'EMAIL_UNVERIFIED');
});

test('enforces strict cross-role and per-screen isolation across all 4 roles', () => {
  assert.equal(canAccessPlatformRole('customer', ['super_admin', 'admin']), false);
  assert.equal(canAccessPlatformRole('client', ['client']), true);

  // Customer cannot open Super Admin or Client management screens
  assert.equal(canAccessPlatformScreen('customer', 'admins'), false);
  assert.equal(canAccessPlatformScreen('customer', 'api-integrations'), false);
  assert.equal(canAccessPlatformScreen('customer', 'geofences'), false);
  assert.equal(canAccessPlatformScreen('customer', 'home'), true);
  assert.equal(canAccessPlatformScreen('customer', 'pods'), true);

  // Admin cannot open Super Admin global screens
  assert.equal(canAccessPlatformScreen('admin', 'admins'), false);
  assert.equal(canAccessPlatformScreen('admin', 'api-integrations'), false);
  assert.equal(canAccessPlatformScreen('admin', 'clients'), true);

  // Super Admin can access global screens
  assert.equal(canAccessPlatformScreen('super_admin', 'admins'), true);
  assert.equal(canAccessPlatformScreen('super_admin', 'api-integrations'), true);

  const denied = evaluatePlatformRouteAccess({
    identity: {
      isAuthenticated: true,
      uid: 'cust-1',
      email: 'customer@vstrackpro.in',
      emailVerified: true,
      role: 'customer',
      status: 'Active',
      authSource: 'firebase',
    },
    allowedRoles: ['super_admin'],
    requiredScreen: 'admins',
  });
  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, 'ROLE_FORBIDDEN');
  assert.equal(denied.fallbackScreenId, getDefaultScreenForRole('customer'));

  const screenDenied = evaluatePlatformRouteAccess({
    identity: {
      isAuthenticated: true,
      uid: 'admin-1',
      email: 'admin@vstrackpro.in',
      emailVerified: true,
      role: 'admin',
      status: 'Active',
      authSource: 'firebase',
    },
    allowedRoles: ['super_admin', 'admin'],
    requiredScreen: 'api-integrations',
  });
  assert.equal(screenDenied.allowed, false);
  assert.equal(screenDenied.reason, 'SCREEN_FORBIDDEN');
});

test('role capabilities isolate write permissions cleanly', () => {
  const sa = getRoleCapabilities('super_admin');
  const ad = getRoleCapabilities('admin');
  const cl = getRoleCapabilities('client');
  const cu = getRoleCapabilities('customer');

  assert.equal(sa.canManageFirebaseRoles, true);
  assert.equal(sa.canManageAdmins, true);
  assert.equal(ad.canManageFirebaseRoles, false);
  assert.equal(ad.canManageOwnClients, true);
  assert.equal(cl.canManageOwnClients, false);
  assert.equal(cl.canUploadPods, true);
  assert.equal(cu.isReadOnly, true);
  assert.equal(cu.canUploadPods, false);
});

test('sanitizeFirestoreRolePayload validates uid pattern, email, and enforces exact PlatformRoleGrant blueprint bounds', () => {
  const invalidUid = sanitizeFirestoreRolePayload({
    uid: 'bad/uid/../inject',
    email: 'ok@vstrackpro.in',
    role: 'client',
  });
  assert.equal(invalidUid.ok, false);

  const invalidEmail = sanitizeFirestoreRolePayload({
    uid: 'uid_valid_123',
    email: 'not-an-email',
    role: 'admin',
  });
  assert.equal(invalidEmail.ok, false);

  const oversizedEmail = sanitizeFirestoreRolePayload({
    uid: 'uid_valid_123',
    email: `${'a'.repeat(155)}@example.com`,
    role: 'customer',
  });
  assert.equal(oversizedEmail.ok, false);

  const invalidAssignedBy = sanitizeFirestoreRolePayload({
    uid: 'uid_valid_123',
    email: 'ok@vstrackpro.in',
    role: 'customer',
    assignedBy: 'bad id with spaces!',
  });
  assert.equal(invalidAssignedBy.ok, false);

  const valid = sanitizeFirestoreRolePayload({
    uid: 'ZCVoAzxvqjYDUFvbSyd49UENBmf1',
    email: '  RamDeekshaRam@gmail.com  ',
    displayName: 'A'.repeat(200),
    role: 'super_admin',
    status: 'Active',
    company: 'B'.repeat(250),
    assignedBy: 'ZCVoAzxvqjYDUFvbSyd49UENBmf1',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.email, 'ramdeeksharam@gmail.com');
    assert.equal(valid.data.displayName?.length, 120);
    assert.equal(valid.data.company?.length, 120);

    const allowedSet = new Set<string>(PLATFORM_ROLE_GRANT_ALLOWED_FIELDS);
    for (const key of Object.keys(valid.data)) {
      assert.equal(
        allowedSet.has(key),
        true,
        `Key "${key}" emitted by sanitizeFirestoreRolePayload must exist in PlatformRoleGrant firestore.rules`
      );
    }
  }
});
