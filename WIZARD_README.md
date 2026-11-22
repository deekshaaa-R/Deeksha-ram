# New Vehicle Onboarding Wizard & TurboTrackers Live Tracking Companion

This module implements the **6-step "New Vehicle" Onboarding Wizard (Part A — former Step 2 "Transporter Access Manage" removed)**, the **TurboTrackers Live Tracking Companion (Part B — `com.turbotrack.gps`)**, **4-level Strong Authentication & RBAC (Part C)**, **Classic vs. Smart Material 3 UI/UX (Part D)**, and **Config-Driven Open Items (Part E)**.

> **Runtime Note**: This workspace runs a React + TypeScript + Vite + Express full-stack web application on port 3000. All Part A–E specifications, Android-first Material 3 layouts, RBAC guards, HMAC-signed Saves, AES-GCM encrypted drafts, and server-side enforcement are implemented live at `/new-vehicle` (or `/?view=new-vehicle`).

---

## Quick Start & Demo Credentials

1. Open the app and click **New Vehicle** in the navigation bar, or navigate directly to `/?view=new-vehicle`.
2. Sign in with any of the 5 seeded RBAC accounts (all share strong demo password **`Fleet#Secure2026!`** and 6-digit Step-Up PIN **`246810`**):

| Username | Role | Data Scope | Step Access Summary |
| --- | --- | --- | --- |
| `superadmin` | Super Admin | `all` | Steps 1–6 (`Y`), Live Tracking (`Y`), Security Log (`Y`) |
| `admin_ops` | Admin | `all` | Steps 1–6 (`Y`), Live Tracking (`Y`), Security Log (`Y`) |
| `deccan_trans` | Transporter Admin | `own_transporter` | Steps 3, 5, 6 (`Y`), Live Tracking (`Y`), Security Log (`Y`); Steps 1, 2, 4 (`N`) |
| `tech_ravi` | Technician | `assigned_installs` | Step 2 (`Y`), Live Tracking (`Y`); Steps 1, 3, 4, 5, 6 & Security Log (`N`) |
| `viewer_ananya` | Viewer | `own_transporter` | Live Tracking (`View-only`); Steps 1–6 & Security Log (`N`) |

3. Complete the mandatory **6-digit 2FA OTP** challenge (a demo OTP banner is displayed inline for testing; OTPs expire in 5 minutes, are single-use, and enforce a 30-second resend cooldown).
4. Toggle **Classic** vs **Smart** mode in the top App Bar or Account settings:
   - **Classic**: Strict Part A1 parity layout (exact labels including `"Data Restrication (in Days)"` and `"Imei"`, flat scrollable form, right-side icons, divider + full-width `"Save"` button).
   - **Smart** (default): Material 3 grouped collapsible cards, tappable step dots (`1..6`), `"All steps"` sheet with RBAC lock icons, pinned bottom Save bar with required-field progress ring, `"Quick add"` mode, searchable dropdown sheets, date quick chips (`Today`, `+6 months`, `+1 year`), and `"?"` help sheets.

---

## Wizard Step Sequence (6 Steps)

1. **Step 1/6 — Add Transporter** (18 fields + 3 checkboxes)
2. **Step 2/6 — Add Device** (7 fields + 2 switches + 4 checkboxes)
3. **Step 3/6 — Add Vehicle** (16 fields + 1 checkbox)
4. **Step 4/6 — Payment Details** (9 fields)
5. **Step 5/6 — Add Vehicle Detail** (10 fields)
6. **Step 6/6 — Custom Fields** (dynamic custom fields)

---

## Security Architecture (Part C: L1–L4)

- **L1 App Entry**:
  - Salted `scrypt` password & PIN hashing verified with `crypto.timingSafeEqual`.
  - Live 7-rule password policy (`10+ chars`, uppercase, lowercase, digit, symbol, not in common list, not equal username) + strength meter.
  - Mandatory 6-digit 2FA OTP (5-min expiry, single-use, 30s resend cooldown).
  - Exponential backoff on failed logins; 5 failed attempts trigger a 15-minute lockout with generic login error messages (`"Invalid username or password."`).
  - Short-lived access tokens (`<= 15 min`) + rotating refresh tokens with **session-family reuse revocation**.
  - Tokens and signing keys are kept strictly in JavaScript memory (never written to `localStorage`/`sessionStorage`).
  - Auto-logout respects Step 1 `"Inactive Time"` (default 12 min) with a 30-second `"Still there?"` countdown modal.
  - Password fields automatically clear on `visibilitychange` (app background), and a privacy veil protects sensitive screens.
- **L2 Role-Based Access Control**:
  - Driven entirely by `src/config/permissions.json`. Enforced in both the UI (`LockedChip` + `"No access"` route guard) and authoritative Express endpoints + row-level `dataScope`.
- **L3 Signed, Replay-Safe, Idempotent Saves & Step-Up Auth**:
  - Every `POST /api/wizard/step/:stepNumber` carries `Authorization: Bearer`, `X-Device-Id`, `X-Idempotency-Key`, `X-Request-Timestamp` (±5 min window), `X-Request-Nonce` (single-use replay check), and `X-Request-Signature` (HMAC-SHA256 over method, path, timestamp, nonce, idempotency key, and SHA-256 body hash).
  - Mandatory Step-Up Auth (Biometric / 6-digit PIN / 6-digit OTP) is required before Save on Steps 1, 2, 4, whenever `lastStepUp > 10 min` on Steps 3, 5, 6, and for sensitive actions (`Import From Inventory`, toggling `Active` off, checking `Overwrite Subscription for all vehicles`).
- **L4 Draft Encryption, Privacy & Audit**:
  - Non-sensitive wizard drafts are encrypted with Web Crypto **AES-GCM (256-bit)** with a 24-hour TTL, wiped on logout, and strictly strip passwords, OTPs, PINs, and tokens before encryption.
  - SIM and IMEI values are masked to their last 4 digits in summaries.
  - Includes Active Sessions (`Log out other devices`), Admin **Security Log**, location consent toggle, and `"Delete my data / account"` request flow.

---

## Part E-5: Open Items & Config-Driven Status Table

| Slot | Description | Status | Config File | Notes |
| --- | --- | --- | --- | --- |
| **E-1** | Ordered list of authentication levels (`L1..L4`) | `ASSUMED` | `src/config/levels.json` | `TODO(PART-E): Replace default L1..L4 auth levels if custom level ordering or names are provided.` |
| **E-2** | Former Step 2 (`Transporter Access Manage`) | `REMOVED` | — | Removed per user request; onboarding wizard now flows directly from Step 1 (`Add Transporter`) to Step 2 (`Add Device`). |
| **E-3** | Live Tracking screen layouts (`SCREEN_1..SCREEN_8`) & strictly 9 Part B fields | `ASSUMED` | `src/config/tracking_layout.json` | `TODO(PART-E): Replace SCREEN_1..SCREEN_8 placeholder metadata with final TurboTrackers screenshots; strictly limited to the 9 listed vehicle fields.` |
| **E-4** | Role × Feature RBAC matrix & `dataScope` | `ASSUMED` | `src/config/permissions.json` | `TODO(PART-E): Replace default 5-role permission matrix if a custom organizational matrix is supplied.` |

---

## Automated Tests

Run the parity & security test suite:

```bash
npx --yes tsx --test src/utils/wizardParitySecurity.test.ts
```

Covers:
1. Exact Part A 6-step counts, titles, field counts, switches, checkboxes, defaults, and original spellings (`"Data Restrication (in Days)"`, `"Imei"`).
2. Client & server validation rules (required fields, password match, 15-digit IMEI Luhn check, 24-digit SIM, 50-char Remark, Step 2 dual-ignition warning).
3. Password policy (7 checks) & strength scoring.
4. 5-attempt lockout, generic error messages, OTP 5-min expiry & single-use, and refresh token reuse family revocation.
5. Config-driven `permissions.json` RBAC enforcement + custom matrix override check (E-4).
6. AES-GCM encrypted draft secret exclusion and 24-hour TTL expiry.
7. HMAC-SHA256 signed, replay-safe, idempotent Step 4 (`Payment Details`) Save with mandatory Step-Up Auth.
