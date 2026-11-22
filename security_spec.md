# Firestore Security Architecture Specification

## 1. Core Data Invariants
1. **Master Gate Ownership**: Every `aiSessions/{sessionId}/messages/{messageId}` sub-document must reference a valid existing `/aiSessions/{sessionId}` parent owned by `request.auth.uid`, and `ownerId` must match `request.auth.uid`.
2. **PII Isolation**: Email and phone fields live strictly under `/users/{uid}/private/{docId}` (`isOwner(uid) || isAdmin()`). No PII is exposed on public or shared reads.
3. **Temporal & Identity Integrity**: Every `createdAt` must equal `request.time` and remain immutable; every `updatedAt` on update must equal `request.time`. All IDs match `^[a-zA-Z0-9_\\-]+$` and `<= 128` chars.
4. **Verified Email Gate**: All client writes require `request.auth != null && request.auth.token.email_verified == true`.
5. **Bounded Arrays & Strict Keys**: `wishlists/{uid}.productIds` is strictly bounded to `<= 50` entries. Create enforces `hasAll` + `hasOnly`; update splits into named action branches with `affectedKeys().hasOnly(...)` wrapped inside `isValid[Entity](incoming())`.
6. **Vehicle Device Registration & Live Telemetry Integrity**: Every `/vehicleDevices/{deviceId}` record validates a 15-digit numeric `imei`, allowlisted `vehicleType` and `status`, `ownerId == request.auth.uid`, immutable `imei`/`deviceId`/`ownerId`/`createdAt` after creation, and optional bounded live GPS fields (`latitude` in `[-90, 90]`, `longitude` in `[-180, 180]`, `speedKmh` in `[0, 240]`, `headingDeg` in `[0, 360]`, and `telemetrySource` in `['gps', 'simulated', 'manual']`).
7. **Vehicle Odometer & Maintenance Record Integrity**: Every `/vehicleMaintenance/{maintenanceId}` record enforces `ownerId == request.auth.uid`, a valid 15-digit `imei`, bounded numeric mileage (`0..2,000,000` km) across odometer and milestone baselines, immutable identity fields (`maintenanceId`, `ownerId`, `deviceId`, `imei`, `createdAt`), and `request.time` server timestamps.
8. **Four-Tier RBAC Role Grant Integrity (`/platformRoles/{uid}`)**: Role differentiation (`super_admin`, `admin`, `client`, `customer`) is enforced from `/platformRoles/{uid}` (never trusted from client tokens). Non-super-admin users can only self-provision as least-privilege read-only `customer` (`status: 'Active'`), can NEVER self-assign `super_admin`, `admin`, or `client`, can NEVER update their own role document, and can NEVER read another user's role grant.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Creating `/wishlists/u1` with `auth = null`. -> **PERMISSION_DENIED**
2. **Unverified Email Write**: Writing `/users/u1` with `auth.token.email_verified = false`. -> **PERMISSION_DENIED**
3. **Cross-Tenant Identity Spoof**: User `u1` creating `/aiSessions/s1` with `ownerId: "u2"`. -> **PERMISSION_DENIED**
4. **Ghost / Shadow Field Injection**: Creating `/users/u1` with extra `isAdmin: true` or `role: "superadmin"`. -> **PERMISSION_DENIED**
5. **Admin Privilege Escalation**: Non-admin user writing `/admins/u1`. -> **PERMISSION_DENIED**
6. **Admin Email Spoof (Unverified)**: Attacker with `email: "ramdeeksharam@gmail.com"` and `email_verified: false` attempting admin write. -> **PERMISSION_DENIED**
7. **PII Cross-Read**: User `u2` executing `get` on `/users/u1/private/profile`. -> **PERMISSION_DENIED**
8. **ID Poisoning**: Creating `/savedMedia/bad$id_with_1500_chars...` violating `isValidId`. -> **PERMISSION_DENIED**
9. **Array Exhaustion (Denial of Wallet)**: Updating `/wishlists/u1` with 51+ `productIds`. -> **PERMISSION_DENIED**
10. **Immutable Field Mutation**: Updating `/aiSessions/s1` to alter `createdAt` or `ownerId`. -> **PERMISSION_DENIED**
11. **Fake Client Timestamp**: Creating `/savedMedia/m1` with hardcoded `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`. -> **PERMISSION_DENIED**
12. **Orphaned Subcollection Write / Query Scraping**: Creating `/aiSessions/nonexistent/messages/m1` or `list`ing `/aiSessions` without `where('ownerId', '==', uid)`. -> **PERMISSION_DENIED**
13. **RBAC Self-Escalation to Super Admin**: Normal verified user `u1` creating `/platformRoles/u1` with `role: "super_admin"` or `"admin"`. -> **PERMISSION_DENIED**
14. **RBAC Role Update Hijack**: Authenticated `client` updating `/platformRoles/u1` to elevate `role: "super_admin"` or unblock `status: "Active"`. -> **PERMISSION_DENIED**
15. **RBAC Cross-User Role Enumeration**: Non-super-admin `u2` calling `get` on `/platformRoles/u1` or `list` on `/platformRoles`. -> **PERMISSION_DENIED**
16. **RBAC Shadow Field / Invalid Role Enum**: Writing `/platformRoles/u1` with `role: "root"` or extra `bypassGuard: true`. -> **PERMISSION_DENIED**
