import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  HelpCircle,
  Layers,
  ListChecks,
  Lock,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  Sliders,
  Truck,
  WifiOff,
  X,
} from 'lucide-react';
import {
  formatISOToDDMMYYYY,
  getOffsetDateDDMMYYYY,
  getTodayDDMMYYYY,
  isValidImeiLuhn,
  parseDDMMYYYYToISO,
  WIZARD_TOOLTIPS,
  type WizardFieldSpec,
  type WizardStepSpec,
} from '../../utils/wizardSchema';
import {
  canRoleAccessFeature,
  canRoleEditFeature,
  evaluatePasswordPolicy,
  type WizardRole,
} from '../../utils/wizardSecurity';

export type FormStyleMode = 'classic' | 'smart';

const STEP_ICONS: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Building2,
  2: Cpu,
  3: Truck,
  4: CreditCard,
  5: FileText,
  6: Sliders,
};

// ---------------------------------------------------------------------------
// LOCKED CHIP (L2 RBAC)
// ---------------------------------------------------------------------------
export function LockedChip({ reason }: { reason: string }) {
  return (
    <span
      data-testid="locked-chip"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200 border border-amber-300/70 dark:border-amber-400/30"
    >
      <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>{reason}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// OFFLINE BANNER & QUEUED SAVES (D15)
// ---------------------------------------------------------------------------
export function OfflineBanner({
  isOffline,
  queuedCount,
  onRetry,
  onToggleOffline,
}: {
  isOffline: boolean;
  queuedCount: number;
  onRetry: () => void;
  onToggleOffline?: () => void;
}) {
  if (!isOffline && queuedCount === 0) return null;
  return (
    <div
      role="status"
      data-testid="wizard-offline-banner"
      className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-950 dark:text-amber-100"
    >
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <span className="truncate font-medium">
          {isOffline
            ? `Offline mode active${queuedCount > 0 ? ` · ${queuedCount} signed save(s) queued` : ' · Saves will queue safely'}`
            : `${queuedCount} queued signed save(s) waiting to sync`}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isOffline && onToggleOffline && (
          <button
            type="button"
            onClick={onToggleOffline}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/10 border border-amber-300 dark:border-amber-500/40 font-semibold text-[11px] cursor-pointer"
          >
            Go Online
          </button>
        )}
        {queuedCount > 0 && !isOffline && (
          <button
            type="button"
            onClick={onRetry}
            data-testid="wizard-retry-queue-btn"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#4B2166] text-white font-semibold text-[11px] cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WIZARD HEADER (Exact Part A1 in Classic, Enhanced M3 in Smart)
// ---------------------------------------------------------------------------
export function WizardHeader({
  step,
  allSteps,
  formStyle,
  role,
  completedSteps,
  onBack,
  onSkip,
  onJumpToStep,
  onOpenAllSteps,
}: {
  step: WizardStepSpec;
  allSteps: WizardStepSpec[];
  formStyle: FormStyleMode;
  role: WizardRole;
  completedSteps: number[];
  onBack: () => void;
  onSkip: () => void;
  onJumpToStep: (stepNum: number) => void;
  onOpenAllSteps: () => void;
}) {
  const totalSteps = allSteps.length;
  const pct = Math.round((step.stepNumber / totalSteps) * 100);
  const StepIcon = STEP_ICONS[step.stepNumber] || Layers;

  return (
    <div
      data-testid="wizard-header"
      className="bg-white dark:bg-[#191524] border-b border-slate-200 dark:border-white/10 px-4 pt-3.5 pb-3"
    >
      {/* Row 1: <- Back | Step Title + Step X/6 | Skip -> */}
      <div className="grid grid-cols-[64px_1fr_64px] items-start gap-1">
        <div className="flex items-center justify-start pt-0.5">
          {step.stepNumber > 1 ? (
            <button
              type="button"
              data-testid="wizard-header-back"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-[#4B2166] dark:hover:text-purple-300 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Back</span>
            </button>
          ) : (
            <span className="h-5" />
          )}
        </div>

        <div className="text-center min-w-0">
          <div className="inline-flex items-center justify-center gap-1.5 max-w-full">
            {formStyle === 'smart' && (
              <span className="w-5 h-5 rounded-md bg-[#4B2166]/10 dark:bg-purple-500/20 text-[#4B2166] dark:text-purple-300 inline-flex items-center justify-center shrink-0">
                <StepIcon className="w-3.5 h-3.5" />
              </span>
            )}
            <h2
              data-testid="wizard-step-title"
              className="text-[15px] font-bold text-slate-900 dark:text-white leading-snug"
            >
              {step.title}
            </h2>
          </div>
          <p
            data-testid="wizard-step-counter"
            className="text-xs font-normal text-slate-600 dark:text-slate-300 mt-0.5"
          >
            Step {step.stepNumber}/{totalSteps}
          </p>
        </div>

        <div className="flex items-center justify-end pt-0.5">
          {step.stepNumber < totalSteps ? (
            <button
              type="button"
              data-testid="wizard-header-skip"
              onClick={onSkip}
              className="inline-flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-white hover:text-[#4B2166] dark:hover:text-purple-300 cursor-pointer whitespace-nowrap"
            >
              <span>Skip</span>
              <ArrowRight className="w-4 h-4 text-[#6B2D91] dark:text-purple-400 shrink-0" aria-hidden="true" />
            </button>
          ) : (
            <span className="h-5" />
          )}
        </div>
      </div>

      {/* Row 2: Full-width rounded progress bar */}
      <div className="mt-3">
        <div
          role="progressbar"
          aria-valuenow={step.stepNumber}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden"
        >
          <div
            className={`h-full rounded-full bg-[#6B2D91] dark:bg-[#9E5CD0] ${
              formStyle === 'smart' ? 'transition-all duration-300 ease-out' : ''
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Smart mode: tappable step dots + "All steps" bottom sheet button */}
        {formStyle === 'smart' && (
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Wizard steps">
              {allSteps.map((s) => {
                const accessible = canRoleAccessFeature(role, s.featureKey);
                const editable = canRoleEditFeature(role, s.featureKey);
                const isCurrent = s.stepNumber === step.stepNumber;
                const isDone = completedSteps.includes(s.stepNumber);
                return (
                  <button
                    key={s.stepNumber}
                    type="button"
                    data-testid={`wizard-step-dot-${s.stepNumber}`}
                    onClick={() => onJumpToStep(s.stepNumber)}
                    title={`Step ${s.stepNumber}: ${s.title}${!accessible ? ' (No access)' : !editable ? ' (View-only)' : ''}`}
                    className={`h-6 min-w-6 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#4B2166] text-white shadow-sm'
                        : isDone
                        ? 'bg-[#00A88F]/15 text-[#007B68] dark:bg-[#00A88F]/25 dark:text-teal-200'
                        : !accessible
                        ? 'bg-slate-100 dark:bg-white/5 text-slate-400'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                    }`}
                  >
                    {!accessible ? (
                      <Lock className="w-2.5 h-2.5" />
                    ) : isDone && !isCurrent ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span>{s.stepNumber}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="wizard-all-steps-btn"
              onClick={onOpenAllSteps}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#4B2166] dark:text-purple-300 bg-[#4B2166]/8 dark:bg-purple-500/15 hover:bg-[#4B2166]/15 cursor-pointer"
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>All steps</span>
            </button>
          </div>
        )}
      </div>

      {/* Row 3: Previous step label (left) & Next step label (right) */}
      <div className="mt-2.5 flex items-start justify-between gap-4 text-xs">
        <div className="min-w-0 text-left">
          {step.previousTitle && (
            <>
              <div className="font-bold text-slate-900 dark:text-white truncate">
                {step.previousTitle}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Previous
              </div>
            </>
          )}
        </div>
        <div className="min-w-0 text-right">
          {step.nextTitle && (
            <>
              <div className="font-bold text-slate-900 dark:text-white truncate">
                {step.nextTitle}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Next
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ALL STEPS BOTTOM SHEET (D2 + L2)
// ---------------------------------------------------------------------------
export function AllStepsSheet({
  open,
  steps,
  currentStepNumber,
  completedSteps,
  role,
  onSelectStep,
  onClose,
}: {
  open: boolean;
  steps: WizardStepSpec[];
  currentStepNumber: number;
  completedSteps: number[];
  role: WizardRole;
  onSelectStep: (stepNum: number) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="All wizard steps"
        data-testid="all-steps-sheet"
        className="w-full sm:max-w-md bg-white dark:bg-[#191524] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              All steps ({steps.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Role: {role} · Lock icons reflect permissions.json
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close all steps sheet"
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 max-h-[70vh] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
          {steps.map((s) => {
            const accessible = canRoleAccessFeature(role, s.featureKey);
            const editable = canRoleEditFeature(role, s.featureKey);
            const isCurrent = s.stepNumber === currentStepNumber;
            const isDone = completedSteps.includes(s.stepNumber);
            const StepIcon = STEP_ICONS[s.stepNumber] || Layers;

            return (
              <button
                key={s.stepNumber}
                type="button"
                onClick={() => {
                  onSelectStep(s.stepNumber);
                  onClose();
                }}
                className={`w-full px-3 py-3 flex items-center justify-between gap-3 text-left rounded-xl transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-[#4B2166]/10 dark:bg-purple-500/20'
                    : 'hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-[#4B2166] text-white'
                        : isDone
                        ? 'bg-[#00A88F] text-white'
                        : !accessible
                        ? 'bg-slate-100 dark:bg-white/5 text-slate-400'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {!accessible ? (
                      <Lock className="w-4 h-4" />
                    ) : isDone ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {s.stepNumber}. {s.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {!accessible
                        ? 'No access for your role'
                        : !editable
                        ? 'View-only'
                        : isDone
                        ? 'Saved'
                        : `${s.fields.filter((f) => f.required).length} required field(s)`}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SECTION CARD (Collapsible in Smart Mode)
// ---------------------------------------------------------------------------
export function SectionCard({
  title,
  subtitle,
  defaultOpen = true,
  hasRequired = false,
  id,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  hasRequired?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      id={id}
      className="bg-white dark:bg-[#191524] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            {!hasRequired && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300">
                Optional
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-slate-100 dark:border-white/5">
          {children}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// PASSWORD STRENGTH METER (C1 + D7)
// ---------------------------------------------------------------------------
export function PasswordStrengthMeter({
  password,
  username,
  confirmPassword,
}: {
  password: string;
  username?: string;
  confirmPassword?: string;
}) {
  const evalResult = useMemo(
    () => evaluatePasswordPolicy(password, username),
    [password, username]
  );

  const barColor =
    evalResult.score <= 1
      ? 'bg-rose-500'
      : evalResult.score === 2
      ? 'bg-amber-500'
      : evalResult.score === 3
      ? 'bg-sky-500'
      : 'bg-[#00A88F]';

  const checkItems = [
    { ok: evalResult.checks.minLength, label: '10+ chars' },
    { ok: evalResult.checks.hasUpper, label: 'Uppercase' },
    { ok: evalResult.checks.hasLower, label: 'Lowercase' },
    { ok: evalResult.checks.hasDigit, label: 'Digit' },
    { ok: evalResult.checks.hasSymbol, label: 'Symbol' },
    { ok: evalResult.checks.notCommon, label: 'Not common' },
    { ok: evalResult.checks.notEqualUsername, label: 'Not username' },
  ];

  const passwordsMatch =
    confirmPassword !== undefined &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  return (
    <div
      data-testid="password-strength-meter"
      className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          Password strength
        </span>
        <span
          className={`font-bold ${
            evalResult.valid
              ? 'text-[#008C76] dark:text-teal-300'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {password.length === 0 ? 'Enter password' : evalResult.label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className={`h-1.5 rounded-full transition-colors ${
              evalResult.score >= seg
                ? barColor
                : 'bg-slate-200 dark:bg-white/10'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {checkItems.map((item) => (
          <span
            key={item.label}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
              item.ok
                ? 'bg-[#00A88F]/15 text-[#007764] dark:text-teal-200'
                : 'bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Check className="w-2.5 h-2.5" />
            <span>{item.label}</span>
          </span>
        ))}
        {confirmPassword !== undefined && confirmPassword.length > 0 && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
              passwordsMatch
                ? 'bg-[#00A88F]/15 text-[#007764] dark:text-teal-200'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
            }`}
          >
            {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// APP TEXT / NUMBER / PASSWORD / IMEI FIELD (Part A1 Exact + Smart D6/D7)
// ---------------------------------------------------------------------------
export function AppTextField({
  field,
  value,
  error,
  disabled,
  formStyle,
  onChange,
  onOpenTooltip,
  onOpenImeiScanner,
  onRightAction,
  onQuickQrFill,
}: {
  field: WizardFieldSpec;
  value: string;
  error?: string;
  disabled?: boolean;
  formStyle: FormStyleMode;
  onChange: (next: string) => void;
  onOpenTooltip?: (topic: string) => void;
  onOpenImeiScanner?: () => void;
  onRightAction?: () => void;
  onQuickQrFill?: () => void;
}) {
  const [showPwd, setShowPwd] = useState(false);

  const labelText = field.required ? `${field.label} *` : field.label;
  const inputType =
    field.type === 'password'
      ? showPwd
        ? 'text'
        : 'password'
      : field.type === 'number'
      ? 'number'
      : 'text';

  const isBarcodeCandidate =
    formStyle === 'smart' &&
    (field.key === 'chassisNumber' || field.key === 'motorNumber');

  const showSimCounter =
    field.key === 'simNumber' || field.key === 'secondarySimNumber';
  const showRemarkCounter = field.key === 'remark' && field.maxLength === 50;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <label
            htmlFor={`wiz-field-${field.key}`}
            className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug"
          >
            {labelText}
          </label>
          {formStyle === 'smart' && field.tooltipTopic && onOpenTooltip && (
            <button
              type="button"
              onClick={() => onOpenTooltip(field.tooltipTopic!)}
              aria-label={`Help for ${field.label}`}
              className="text-slate-400 hover:text-[#4B2166] dark:hover:text-purple-300 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {field.rightActionLabel && onRightAction && (
          <button
            type="button"
            disabled={disabled}
            data-testid={`field-right-action-${field.key}`}
            onClick={onRightAction}
            className="text-xs font-semibold text-slate-900 dark:text-purple-200 underline underline-offset-2 hover:text-[#4B2166] disabled:opacity-50 cursor-pointer shrink-0"
          >
            {field.rightActionLabel}
          </button>
        )}
      </div>

      <div
        className={`relative flex items-center bg-white dark:bg-[#120F1B] rounded-[12px] border min-h-[56px] px-3.5 transition-colors ${
          error
            ? 'border-rose-500 ring-1 ring-rose-500/30'
            : 'border-slate-300 dark:border-white/15 focus-within:border-[#4B2166] dark:focus-within:border-purple-400'
        } ${disabled ? 'opacity-65 bg-slate-50 dark:bg-white/5' : ''}`}
      >
        <input
          id={`wiz-field-${field.key}`}
          data-testid={`wiz-input-${field.key}`}
          type={inputType}
          value={value}
          disabled={disabled}
          maxLength={field.maxLength}
          placeholder={field.placeholder ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            if (field.key === 'vehicle') {
              onChange(raw.toUpperCase());
            } else {
              onChange(raw);
            }
          }}
          className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none py-3.5"
        />

        {formStyle === 'smart' && field.unitSuffix && (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2 shrink-0">
            {field.unitSuffix}
          </span>
        )}

        {/* Right-side icons strictly matching Part A1 */}
        {!field.noIcon && (
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {field.type === 'password' ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                {showPwd ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            ) : field.type === 'imei' ? (
              <button
                type="button"
                disabled={disabled}
                data-testid="imei-scanner-trigger"
                onClick={onOpenImeiScanner}
                aria-label="Scan IMEI barcode"
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-500/20 hover:text-[#4B2166] cursor-pointer"
              >
                <ScanLine className="w-5 h-5" />
              </button>
            ) : isBarcodeCandidate && onQuickQrFill ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onQuickQrFill}
                aria-label={`Scan ${field.label}`}
                title="Scan QR/barcode"
                className="p-1.5 rounded-lg text-slate-500 hover:text-[#4B2166] cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
              </button>
            ) : (
              <Pencil
                className="w-4 h-4 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </div>

      {/* Helper text in small black text per Part A1 + live counters */}
      {(field.helperText || showSimCounter || showRemarkCounter || field.type === 'imei') && (
        <div className="flex items-center justify-between gap-2 text-xs text-slate-900 dark:text-slate-300">
          <span>{field.helperText || (field.type === 'imei' && value ? (isValidImeiLuhn(value) ? 'Valid 15-digit IMEI (Luhn verified)' : 'Enter 15 digits (Luhn verified)') : '')}</span>
          {showSimCounter && (
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
              {value.length}/24
            </span>
          )}
          {showRemarkCounter && (
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
              {value.length}/50
            </span>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          data-testid={`wiz-error-${field.key}`}
          className="text-xs font-medium text-rose-600 dark:text-rose-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// APP DROPDOWN FIELD + SEARCHABLE BOTTOM SHEET (Part A1 + D6 + D8)
// ---------------------------------------------------------------------------
export function AppDropdownField({
  field,
  value,
  options,
  recentOptions = [],
  error,
  disabled,
  formStyle,
  preselectedNote,
  canCreateNew,
  onCreateNew,
  onChange,
  onOpenTooltip,
}: {
  field: WizardFieldSpec;
  value: string;
  options: string[];
  recentOptions?: string[];
  error?: string;
  disabled?: boolean;
  formStyle: FormStyleMode;
  preselectedNote?: string;
  canCreateNew?: boolean;
  onCreateNew?: () => void;
  onChange: (next: string) => void;
  onOpenTooltip?: (topic: string) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState('');

  const labelText = field.required ? `${field.label} *` : field.label;

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.toLowerCase().includes(q))
      : options;
    if (!q && recentOptions.length > 0 && formStyle === 'smart') {
      const recents = recentOptions.filter((r) => list.includes(r));
      const rest = list.filter((item) => !recents.includes(item));
      return [...recents, ...rest];
    }
    return list;
  }, [options, query, recentOptions, formStyle]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={`wiz-dropdown-${field.key}`}
            className="text-sm font-medium text-slate-900 dark:text-slate-100"
          >
            {labelText}
          </label>
          {formStyle === 'smart' && field.tooltipTopic && onOpenTooltip && (
            <button
              type="button"
              onClick={() => onOpenTooltip(field.tooltipTopic!)}
              aria-label={`Help for ${field.label}`}
              className="text-slate-400 hover:text-[#4B2166] cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
        {formStyle === 'smart' && preselectedNote && value && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#007B68] dark:text-teal-300">
            <span>{preselectedNote}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="underline cursor-pointer"
              >
                Change
              </button>
            )}
          </span>
        )}
      </div>

      <button
        id={`wiz-dropdown-${field.key}`}
        type="button"
        disabled={disabled}
        data-testid={`wiz-dropdown-${field.key}`}
        onClick={() => {
          setQuery('');
          setSheetOpen(true);
        }}
        className={`w-full flex items-center justify-between gap-2 text-left bg-white dark:bg-[#120F1B] rounded-[12px] border min-h-[56px] px-3.5 transition-colors cursor-pointer ${
          error
            ? 'border-rose-500 ring-1 ring-rose-500/30'
            : 'border-slate-300 dark:border-white/15 hover:border-[#4B2166] dark:hover:border-purple-400'
        } ${disabled ? 'opacity-65 cursor-not-allowed' : ''}`}
      >
        <span
          className={`text-sm truncate ${
            value
              ? 'text-slate-900 dark:text-white'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {value || field.placeholder || `Select ${field.label}`}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
      </button>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {sheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Select ${field.label}`}
            className="w-full sm:max-w-md bg-white dark:bg-[#191524] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {field.placeholder || `Select ${field.label}`}
              </h3>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formStyle === 'smart' && (
              <div className="px-4 pt-3 pb-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${field.label}...`}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4B2166]/40"
                  />
                </div>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No matching options found.
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const selected = opt === value;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onChange(opt);
                        setSheetOpen(false);
                      }}
                      className={`w-full px-3.5 py-3 rounded-xl text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#4B2166]/10 text-[#4B2166] dark:bg-purple-500/20 dark:text-purple-200 font-semibold'
                          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {selected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {formStyle === 'smart' && canCreateNew && onCreateNew && (
              <div className="p-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setSheetOpen(false);
                    onCreateNew();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#4B2166]/10 text-[#4B2166] dark:bg-purple-500/20 dark:text-purple-200 text-sm font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create new {field.label}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// APP DATE FIELD (DD/MM/YYYY + Quick Chips Today / +6m / +1y in Smart Mode)
// ---------------------------------------------------------------------------
export function AppDateField({
  field,
  value,
  error,
  disabled,
  formStyle,
  onChange,
}: {
  field: WizardFieldSpec;
  value: string;
  error?: string;
  disabled?: boolean;
  formStyle: FormStyleMode;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const labelText = field.required ? `${field.label} *` : field.label;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={`wiz-date-${field.key}`}
        className="block text-sm font-medium text-slate-900 dark:text-slate-100"
      >
        {labelText}
      </label>
      <button
        id={`wiz-date-${field.key}`}
        type="button"
        disabled={disabled}
        data-testid={`wiz-date-${field.key}`}
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between gap-2 text-left bg-white dark:bg-[#120F1B] rounded-[12px] border min-h-[56px] px-3.5 cursor-pointer ${
          error
            ? 'border-rose-500'
            : 'border-slate-300 dark:border-white/15 hover:border-[#4B2166]'
        } ${disabled ? 'opacity-65 cursor-not-allowed' : ''}`}
      >
        <span className="text-sm text-slate-900 dark:text-white font-medium">
          {value || getTodayDDMMYYYY()}
        </span>
        <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
      </button>
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Select ${field.label}`}
            className="w-full sm:max-w-sm bg-white dark:bg-[#191524] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {field.label}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formStyle === 'smart' && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange(getTodayDDMMYYYY());
                    setOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#4B2166]/10 text-[#4B2166] dark:bg-purple-500/20 dark:text-purple-200 text-xs font-semibold cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(getOffsetDateDDMMYYYY(6));
                    setOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#4B2166]/10 text-[#4B2166] dark:bg-purple-500/20 dark:text-purple-200 text-xs font-semibold cursor-pointer"
                >
                  +6 months
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(getOffsetDateDDMMYYYY(12));
                    setOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#4B2166]/10 text-[#4B2166] dark:bg-purple-500/20 dark:text-purple-200 text-xs font-semibold cursor-pointer"
                >
                  +1 year
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                Pick date (saved as DD/MM/YYYY)
              </label>
              <input
                type="date"
                value={parseDDMMYYYYToISO(value)}
                onChange={(e) => {
                  if (e.target.value) {
                    onChange(formatISOToDDMMYYYY(e.target.value));
                  }
                }}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#120F1B] text-sm text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#4B2166] text-white text-sm font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// STEP 4 IDLE TIME SPLIT BOX (Single white box split by vertical line)
// ---------------------------------------------------------------------------
export function IdleSplitField({
  hours,
  minutes,
  disabled,
  formStyle,
  onChangeHours,
  onChangeMinutes,
  onOpenTooltip,
}: {
  hours: string;
  minutes: string;
  disabled?: boolean;
  formStyle: FormStyleMode;
  onChangeHours: (v: string) => void;
  onChangeMinutes: (v: string) => void;
  onOpenTooltip?: (topic: string) => void;
}) {
  const hourOptions = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, '0')
  );
  const minuteOptions = ['00', '05', '10', '15', '20', '30', '45', '50', '55'];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Idle Time
        </span>
        {formStyle === 'smart' && onOpenTooltip && (
          <button
            type="button"
            onClick={() => onOpenTooltip('idleTime')}
            aria-label="Help for Idle Time"
            className="text-slate-400 hover:text-[#4B2166] cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 bg-white dark:bg-[#120F1B] rounded-[12px] border border-slate-300 dark:border-white/15 min-h-[56px] overflow-hidden divide-x divide-slate-200 dark:divide-white/15">
        <div className="relative flex items-center">
          <select
            aria-label="Select Hours"
            disabled={disabled}
            value={hours}
            onChange={(e) => onChangeHours(e.target.value)}
            className="w-full h-full px-3.5 pr-8 bg-transparent text-sm text-slate-900 dark:text-white appearance-none focus:outline-none cursor-pointer"
          >
            <option value="">Select Hours</option>
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {h} hrs
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
        </div>
        <div className="relative flex items-center">
          <select
            aria-label="Select Minutes"
            disabled={disabled}
            value={minutes}
            onChange={(e) => onChangeMinutes(e.target.value)}
            className="w-full h-full px-3.5 pr-8 bg-transparent text-sm text-slate-900 dark:text-white appearance-none focus:outline-none cursor-pointer"
          >
            <option value="">Select Minutes</option>
            {minuteOptions.map((m) => (
              <option key={m} value={m}>
                {m} mins
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EMPTY STATE (Step 7 & Step 2 Shell)
// ---------------------------------------------------------------------------
export function EmptyState({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div
      data-testid="wizard-empty-state"
      className="rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-white dark:bg-[#191524] px-6 py-10 text-center space-y-2.5"
    >
      <div className="w-12 h-12 rounded-2xl bg-[#4B2166]/10 dark:bg-purple-500/20 text-[#4B2166] dark:text-purple-300 mx-auto flex items-center justify-center">
        <Sliders className="w-6 h-6" />
      </div>
      {badge && (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
          {badge}
        </span>
      )}
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OTP FIELD (C1: 6-digit, 5-min expiry, 30s resend cooldown)
// ---------------------------------------------------------------------------
export function OtpField({
  value,
  expiresSec,
  resendCooldownSec,
  channel,
  onChangeChannel,
  onChange,
  onResend,
}: {
  value: string;
  expiresSec: number;
  resendCooldownSec: number;
  channel: 'totp' | 'sms_email';
  onChangeChannel: (ch: 'totp' | 'sms_email') => void;
  onChange: (next: string) => void;
  onResend: () => void;
}) {
  const mins = Math.floor(expiresSec / 60);
  const secs = expiresSec % 60;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChangeChannel('totp')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
            channel === 'totp'
              ? 'border-[#4B2166] bg-[#4B2166]/10 text-[#4B2166] dark:text-purple-200'
              : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
          }`}
        >
          Authenticator (TOTP)
        </button>
        <button
          type="button"
          onClick={() => onChangeChannel('sms_email')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
            channel === 'sms_email'
              ? 'border-[#4B2166] bg-[#4B2166]/10 text-[#4B2166] dark:text-purple-200'
              : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
          }`}
        >
          SMS / Email Fallback
        </button>
      </div>

      <div>
        <label
          htmlFor="wiz-otp-input"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
        >
          Enter 6-digit verification code *
        </label>
        <input
          id="wiz-otp-input"
          data-testid="wizard-otp-input"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full text-center tracking-[0.55em] font-mono text-xl font-bold py-3.5 px-4 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#120F1B] text-slate-900 dark:text-white focus:outline-none focus:border-[#4B2166]"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
        <span>
          Expires in{' '}
          <strong className="font-mono text-slate-900 dark:text-white">
            {mins}:{String(secs).padStart(2, '0')}
          </strong>
        </span>
        <button
          type="button"
          disabled={resendCooldownSec > 0}
          onClick={onResend}
          className="font-semibold text-[#4B2166] dark:text-purple-300 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
        >
          {resendCooldownSec > 0
            ? `Resend in ${resendCooldownSec}s`
            : 'Resend code'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STEP-UP AUTH MODAL SHEET (C4: Biometric / 6-digit PIN / 6-digit OTP)
// ---------------------------------------------------------------------------
export function StepUpAuthSheet({
  open,
  reason,
  loading,
  error,
  onVerify,
  onCancel,
}: {
  open: boolean;
  reason: string;
  loading: boolean;
  error: string | null;
  onVerify: (method: 'biometric' | 'pin' | 'otp', credential: string) => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<'pin' | 'biometric' | 'otp'>('pin');
  const [pinOrOtp, setPinOrOtp] = useState('');

  useEffect(() => {
    if (open) {
      setPinOrOtp('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Step-up authentication"
        data-testid="step-up-auth-sheet"
        className="w-full sm:max-w-md bg-white dark:bg-[#191524] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#4B2166] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step-Up Verification Required
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {reason}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['pin', '6-Digit PIN'],
              ['biometric', 'Biometric'],
              ['otp', '6-Digit OTP'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMethod(m);
                setPinOrOtp('');
              }}
              className={`py-2 px-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                method === m
                  ? 'border-[#4B2166] bg-[#4B2166]/10 text-[#4B2166] dark:text-purple-200'
                  : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {method === 'biometric' ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#4B2166]/15 text-[#4B2166] dark:text-purple-300 flex items-center justify-center">
              <Fingerprint className="w-8 h-8" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Confirm with device Fingerprint / Face ID keystore assertion.
            </p>
            <button
              type="button"
              disabled={loading}
              data-testid="step-up-biometric-btn"
              onClick={() =>
                onVerify('biometric', `biometric-verified:${Date.now()}`)
              }
              className="w-full py-3 rounded-xl bg-[#4B2166] text-white text-sm font-semibold hover:bg-[#5E2A7F] disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Confirm Biometric'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                {method === 'pin'
                  ? 'Enter your 6-digit security PIN (Demo: 246810)'
                  : 'Enter 6-digit TOTP code (any 6 digits in demo)'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                data-testid="step-up-code-input"
                value={pinOrOtp}
                onChange={(e) =>
                  setPinOrOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="••••••"
                className="w-full text-center tracking-[0.45em] font-mono text-lg font-bold py-3 px-4 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#120F1B] text-slate-900 dark:text-white focus:outline-none focus:border-[#4B2166]"
              />
            </div>

            {method === 'pin' && (
              <button
                type="button"
                onClick={() => setPinOrOtp('246810')}
                className="text-xs font-semibold text-[#4B2166] dark:text-purple-300 underline cursor-pointer"
              >
                Use demo PIN (246810)
              </button>
            )}

            <button
              type="button"
              disabled={loading || pinOrOtp.length !== 6}
              data-testid="step-up-submit-btn"
              onClick={() => onVerify(method, pinOrOtp)}
              className="w-full py-3 rounded-xl bg-[#4B2166] text-white text-sm font-semibold hover:bg-[#5E2A7F] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-200 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IMEI BARCODE / CAMERA SCANNER MODAL (D13)
// ---------------------------------------------------------------------------
export function ImeiScannerModal({
  open,
  onScan,
  onClose,
}: {
  open: boolean;
  onScan: (imei: string) => void;
  onClose: () => void;
}) {
  const sampleImeis = [
    { label: 'Seaworld-R12 Box Label', imei: '864209051284928' },
    { label: 'Teltonika FMB920 Barcode', imei: '352099001761481' },
    { label: 'AIS-140 NavIC Seal', imei: '358240051111110' },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="IMEI barcode scanner"
        data-testid="imei-scanner-modal"
        className="w-full sm:max-w-md bg-[#120F1B] text-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-white/15 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-[#00A88F]" />
            <h3 className="text-base font-bold">Scan Device IMEI Barcode</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-300 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simulated viewfinder */}
        <div className="relative h-36 rounded-2xl bg-black/60 border border-white/15 flex flex-col items-center justify-center overflow-hidden">
          <div className="w-48 h-20 border-2 border-[#00A88F] rounded-xl relative">
            <div className="absolute inset-x-2 top-1/2 h-0.5 bg-[#00A88F] shadow-[0_0_12px_#00A88F]" />
          </div>
          <p className="text-[11px] text-slate-300 mt-2">
            Align 15-digit IMEI barcode inside frame (Luhn validated)
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300">
            Tap a detected device barcode to capture:
          </div>
          {sampleImeis.map((item) => (
            <button
              key={item.imei}
              type="button"
              onClick={() => {
                onScan(item.imei);
                onClose();
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-between text-left cursor-pointer"
            >
              <div>
                <div className="text-xs font-semibold text-white">
                  {item.label}
                </div>
                <div className="font-mono text-xs text-[#00A88F]">
                  {item.imei}
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-[#00A88F]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TOOLTIP BOTTOM SHEET (D7)
// ---------------------------------------------------------------------------
export function TooltipSheet({
  topic,
  onClose,
}: {
  topic: string | null;
  onClose: () => void;
}) {
  if (!topic || !WIZARD_TOOLTIPS[topic]) return null;
  const info = WIZARD_TOOLTIPS[topic];
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-md bg-white dark:bg-[#191524] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-white/10 space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {info.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {info.body}
        </p>
        <div className="p-3 rounded-xl bg-[#4B2166]/8 dark:bg-purple-500/15 text-xs font-medium text-[#4B2166] dark:text-purple-200">
          {info.example}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#4B2166] text-white text-sm font-semibold cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
