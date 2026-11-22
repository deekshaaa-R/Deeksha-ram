import levelsConfig from '../config/levels.json' with { type: 'json' };
import permissionsConfig from '../config/permissions.json' with { type: 'json' };

export type WizardRole =
  | 'Super Admin'
  | 'Admin'
  | 'Transporter Admin'
  | 'Technician'
  | 'Viewer';

export type PermissionRight = 'Y' | 'N' | 'View-only';

export type WizardFeatureKey =
  | 'step_1'
  | 'step_2'
  | 'step_3'
  | 'step_4'
  | 'step_5'
  | 'step_6'
  | 'live_tracking'
  | 'security_log';

export interface PermissionMatrixConfig {
  roles: WizardRole[];
  dataScope: Record<string, string>;
  matrix: Record<
    string,
    {
      label: string;
      access: Record<string, PermissionRight>;
      stepUpRequired: boolean;
      stepUpMode: 'always' | 'window_10m' | 'none';
    }
  >;
}

export const AUTH_LEVELS = levelsConfig.levels;
export const DEFAULT_PERMISSIONS_MATRIX =
  permissionsConfig as unknown as PermissionMatrixConfig;

const COMMON_PASSWORDS = new Set([
  'password123!',
  'password@123',
  'admin@1234',
  'qwerty1234!',
  'welcome@123',
  '1234567890a!',
  'letmein123!',
  'turbotrack@1',
]);

export interface PasswordPolicyEvaluation {
  valid: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasDigit: boolean;
    hasSymbol: boolean;
    notCommon: boolean;
    notEqualUsername: boolean;
  };
}

export function evaluatePasswordPolicy(
  password: string,
  username = ''
): PasswordPolicyEvaluation {
  const cleanUser = username.trim().toLowerCase();
  const checks = {
    minLength: password.length >= 10,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
    notCommon: !COMMON_PASSWORDS.has(password.toLowerCase()),
    notEqualUsername:
      !cleanUser || password.trim().toLowerCase() !== cleanUser,
  };

  const passedCount = Object.values(checks).filter(Boolean).length;
  const valid = passedCount === 7;
  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (password.length === 0) score = 0;
  else if (passedCount <= 3) score = 1;
  else if (passedCount <= 5) score = 2;
  else if (passedCount === 6) score = 3;
  else score = 4;

  const label: PasswordPolicyEvaluation['label'] =
    score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';

  return { valid, score, label, checks };
}

export function getRolePermission(
  role: WizardRole | string,
  feature: WizardFeatureKey | string,
  matrixConfig: PermissionMatrixConfig = DEFAULT_PERMISSIONS_MATRIX
): PermissionRight {
  const entry = matrixConfig.matrix[feature];
  if (!entry) return 'N';
  return entry.access[role] ?? 'N';
}

export function canRoleAccessFeature(
  role: WizardRole | string,
  feature: WizardFeatureKey | string,
  matrixConfig: PermissionMatrixConfig = DEFAULT_PERMISSIONS_MATRIX
): boolean {
  const right = getRolePermission(role, feature, matrixConfig);
  return right === 'Y' || right === 'View-only';
}

export function canRoleEditFeature(
  role: WizardRole | string,
  feature: WizardFeatureKey | string,
  matrixConfig: PermissionMatrixConfig = DEFAULT_PERMISSIONS_MATRIX
): boolean {
  return getRolePermission(role, feature, matrixConfig) === 'Y';
}

export function getRoleDataScope(
  role: WizardRole | string,
  matrixConfig: PermissionMatrixConfig = DEFAULT_PERMISSIONS_MATRIX
): string {
  return matrixConfig.dataScope[role] ?? 'own_transporter';
}

export function requiresStepUpAuth(
  feature: WizardFeatureKey | string,
  lastStepUpAtMs: number | null,
  nowMs: number = Date.now(),
  matrixConfig: PermissionMatrixConfig = DEFAULT_PERMISSIONS_MATRIX
): boolean {
  const entry = matrixConfig.matrix[feature];
  if (!entry || !entry.stepUpRequired) return false;
  if (entry.stepUpMode === 'always') return true;
  if (entry.stepUpMode === 'window_10m') {
    if (!lastStepUpAtMs) return true;
    const TEN_MIN_MS = 10 * 60 * 1000;
    return nowMs - lastStepUpAtMs > TEN_MIN_MS;
  }
  return false;
}

export function maskSecretTail4(value: string): string {
  const clean = value.trim();
  if (clean.length <= 4) return clean;
  return `${'•'.repeat(Math.min(clean.length - 4, 12))}${clean.slice(-4)}`;
}

// Keys strictly excluded from encrypted local draft storage (C5)
const FORBIDDEN_DRAFT_KEYS = new Set([
  'password',
  'confirmPassword',
  'otp',
  'accessToken',
  'refreshToken',
  'stepUpToken',
  'pin',
]);

export function sanitizeDraftPayload(
  stepsData: Record<string, Record<string, string | boolean>>
): Record<string, Record<string, string | boolean>> {
  const cleaned: Record<string, Record<string, string | boolean>> = {};
  for (const [stepKey, fields] of Object.entries(stepsData)) {
    const safeFields: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries(fields || {})) {
      if (FORBIDDEN_DRAFT_KEYS.has(k)) continue;
      if (k.toLowerCase().includes('password') || k.toLowerCase().includes('token')) {
        continue;
      }
      safeFields[k] = v;
    }
    cleaned[stepKey] = safeFields;
  }
  return cleaned;
}

export interface EncryptedDraftEnvelope {
  v: 1;
  ivBase64: string;
  ciphertextBase64: string;
  savedAtMs: number;
  expiresAtMs: number;
}

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export async function generateDraftAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptWizardDraft(
  key: CryptoKey,
  stepsData: Record<string, Record<string, string | boolean>>,
  nowMs: number = Date.now()
): Promise<EncryptedDraftEnvelope> {
  const sanitized = sanitizeDraftPayload(stepsData);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(sanitized));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return {
    v: 1,
    ivBase64: bytesToBase64(iv),
    ciphertextBase64: bytesToBase64(new Uint8Array(cipherBuffer)),
    savedAtMs: nowMs,
    expiresAtMs: nowMs + DRAFT_TTL_MS,
  };
}

export async function decryptWizardDraft(
  key: CryptoKey,
  envelope: EncryptedDraftEnvelope,
  nowMs: number = Date.now()
): Promise<Record<string, Record<string, string | boolean>> | null> {
  if (!envelope || envelope.expiresAtMs <= nowMs) {
    return null;
  }
  try {
    const iv = base64ToBytes(envelope.ivBase64);
    const data = base64ToBytes(envelope.ciphertextBase64);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    const parsed = JSON.parse(new TextDecoder().decode(plain));
    return parsed as Record<string, Record<string, string | boolean>>;
  } catch {
    return null;
  }
}

export async function computeBodySha256Hex(bodyString: string): Promise<string> {
  const bytes = new TextEncoder().encode(bodyString);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signWizardRequest(params: {
  signingKey: string;
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  idempotencyKey: string;
  bodyString: string;
}): Promise<string> {
  const bodyHash = await computeBodySha256Hex(params.bodyString);
  const canonical = [
    params.method.toUpperCase(),
    params.path,
    params.timestamp,
    params.nonce,
    params.idempotencyKey,
    bodyHash,
  ].join('\n');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(params.signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(canonical)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
