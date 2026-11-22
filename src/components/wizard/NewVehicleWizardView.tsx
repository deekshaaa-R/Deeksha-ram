import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  Lock,
  MapPin,
  PackageCheck,
  Plus,
  ShieldAlert,
  Sparkles,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import {
  buildWizardSteps,
  validateStepForm,
  type WizardFieldSpec,
  type WizardStepSpec,
} from '../../utils/wizardSchema';
import {
  canRoleAccessFeature,
  canRoleEditFeature,
  decryptWizardDraft,
  encryptWizardDraft,
  evaluatePasswordPolicy,
  generateDraftAesKey,
  getRolePermission,
  requiresStepUpAuth,
  signWizardRequest,
  type EncryptedDraftEnvelope,
} from '../../utils/wizardSecurity';
import type { WizardAuthSession } from './WizardAuthGate';
import {
  AllStepsSheet,
  AppDateField,
  AppDropdownField,
  AppTextField,
  EmptyState,
  IdleSplitField,
  ImeiScannerModal,
  LockedChip,
  OfflineBanner,
  PasswordStrengthMeter,
  SectionCard,
  StepUpAuthSheet,
  TooltipSheet,
  WizardHeader,
  type FormStyleMode,
} from './WizardSharedWidgets';

export interface WizardBootstrapData {
  dataScope: string;
  dropdowns: Record<string, string[]>;
  records: {
    transporters: Array<{ id: string; username: string; companyName: string; active: boolean; inactiveTime: number }>;
    devices: Array<{ id: string; imeiMasked: string; simMasked: string; simOperator: string; deviceType: string; active: boolean }>;
    vehicles: Array<{ id: string; vehicleNumber: string; transporterId: string; transporterName: string; deviceImei: string; vehicleType: string; odometerKm: number }>;
    inventoryDevices: Array<{ imei: string; simNumber: string; simOperator: string; deviceType: string }>;
  };
  lastStepUpAtMs: number | null;
}

interface QueuedSaveItem {
  id: string;
  stepNumber: number;
  values: Record<string, string | boolean>;
  idempotencyKey: string;
  queuedAt: string;
}

const DRAFT_STORAGE_KEY = 'tt_wizard_encrypted_draft_v1';

function buildInitialStepValues(steps: WizardStepSpec[]): Record<number, Record<string, string | boolean>> {
  const out: Record<number, Record<string, string | boolean>> = {};
  for (const step of steps) {
    const map: Record<string, string | boolean> = {};
    for (const f of step.fields) {
      if (f.type === 'idle_split') {
        map.idleHours = '';
        map.idleMinutes = '';
      } else {
        map[f.key] = f.defaultValue ?? '';
      }
    }
    for (const sw of step.switches) {
      map[sw.key] = sw.defaultValue;
    }
    for (const cb of step.checkboxes) {
      map[cb.key] = cb.defaultValue;
    }
    out[step.stepNumber] = map;
  }
  return out;
}

export function NewVehicleWizardView({
  session,
  bootstrap,
  formStyle,
  onChangeFormStyle,
  onRefreshBootstrap,
  onUpdateStepUpTimestamp,
  onExitToDashboard,
  onViewOnMap,
}: {
  session: WizardAuthSession;
  bootstrap: WizardBootstrapData;
  formStyle: FormStyleMode;
  onChangeFormStyle: (mode: FormStyleMode) => void;
  onRefreshBootstrap: () => Promise<void>;
  onUpdateStepUpTimestamp: (ts: number) => void;
  onExitToDashboard: () => void;
  onViewOnMap: (vehicleNumber?: string) => void;
}) {
  const steps = useMemo(() => buildWizardSteps(), []);
  const [currentStepNum, setCurrentStepNum] = useState<number>(() => {
    const firstAllowed = steps.find((s) =>
      canRoleAccessFeature(session.user.role, s.featureKey)
    );
    return firstAllowed ? firstAllowed.stepNumber : 1;
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentStepNum]);
  const [formValues, setFormValues] = useState<Record<number, Record<string, string | boolean>>>(() =>
    buildInitialStepValues(steps)
  );
  const [dirtySteps, setDirtySteps] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [stepWarnings, setStepWarnings] = useState<string[]>([]);
  const [bannerMessage, setBannerMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Cascading pre-selected items created during the wizard session
  const [createdTransporter, setCreatedTransporter] = useState<string | null>(null);
  const [createdDeviceLabel, setCreatedDeviceLabel] = useState<string | null>(null);
  const [createdVehicleNumber, setCreatedVehicleNumber] = useState<string | null>(null);
  const [recentChoices, setRecentChoices] = useState<Record<string, string[]>>({});

  // Smart UX states (Part D)
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [allStepsOpen, setAllStepsOpen] = useState(false);
  const [tooltipTopic, setTooltipTopic] = useState<string | null>(null);
  const [imeiScannerOpen, setImeiScannerOpen] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [wizardFinished, setWizardFinished] = useState(false);

  // Confirmation sheets (D10)
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [unsavedConfirmTarget, setUnsavedConfirmTarget] = useState<'exit' | 'prev' | null>(null);

  // Step-Up Auth modal state (C4)
  const [stepUpState, setStepUpState] = useState<{
    open: boolean;
    reason: string;
    loading: boolean;
    error: string | null;
    onSuccess: ((stepUpToken: string) => Promise<void> | void) | null;
  }>({ open: false, reason: '', loading: false, error: null, onSuccess: null });

  // Offline queue & simulator (D15)
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<QueuedSaveItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Encrypted draft autosave (C5 + D11)
  const draftKeyRef = useRef<CryptoKey | null>(null);
  const [resumeDraftAvailable, setResumeDraftAvailable] = useState<Record<string, Record<string, string | boolean>> | null>(null);

  const currentStep = steps[currentStepNum - 1];
  const currentValues = formValues[currentStepNum] || {};
  const role = session.user.role;
  const stepRight = getRolePermission(role, currentStep.featureKey);
  const canAccess = canRoleAccessFeature(role, currentStep.featureKey);
  const canEdit = canRoleEditFeature(role, currentStep.featureKey);

  // Initialize AES-GCM in-memory draft key & detect encrypted draft
  useEffect(() => {
    let active = true;
    generateDraftAesKey().then(async (key) => {
      if (!active) return;
      draftKeyRef.current = key;
      try {
        const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const env = JSON.parse(raw) as EncryptedDraftEnvelope;
          const decrypted = await decryptWizardDraft(key, env);
          if (decrypted && Object.keys(decrypted).length > 0) {
            setResumeDraftAvailable(decrypted);
          }
        }
      } catch {
        // Ignore stale or unreadable encrypted draft
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Auto-encrypt non-sensitive draft changes (passwords/OTPs/tokens stripped by encryptWizardDraft)
  useEffect(() => {
    if (!draftKeyRef.current) return;
    const hasDirty = Object.values(dirtySteps).some(Boolean);
    if (!hasDirty) return;
    const handle = window.setTimeout(async () => {
      if (!draftKeyRef.current) return;
      const keyed: Record<string, Record<string, string | boolean>> = {};
      for (const [k, v] of Object.entries(formValues)) {
        keyed[`step_${k}`] = v;
      }
      try {
        const env = await encryptWizardDraft(draftKeyRef.current, keyed);
        window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(env));
      } catch {
        // Ignore storage write errors
      }
    }, 600);
    return () => window.clearTimeout(handle);
  }, [formValues, dirtySteps]);

  // C1: Clear Step 1 & Step 2 (Add Device) password fields when app moves to background
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setFormValues((prev) => ({
          ...prev,
          1: { ...prev[1], password: '', confirmPassword: '' },
          2: { ...prev[2], password: '' },
        }));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Live Step 2 (Add Device) dual-ignition warning (D13)
  useEffect(() => {
    if (currentStepNum === 2) {
      if (
        currentValues.ignitionWirePositive === true &&
        currentValues.ignitionWireNotConnected === true
      ) {
        setStepWarnings([
          'Warning: Both "Ignition wire connected in (+)ve" and "Ignition wire not connected" are checked.',
        ]);
      } else {
        setStepWarnings([]);
      }
    } else {
      setStepWarnings([]);
    }
  }, [currentStepNum, currentValues.ignitionWirePositive, currentValues.ignitionWireNotConnected]);

  // Compute dropdown options including newly created cascading records
  const getOptionsForSource = useCallback(
    (source?: WizardFieldSpec['dropdownSource']): string[] => {
      if (!source) return [];
      const base = bootstrap.dropdowns[source] || [];
      if (source === 'transporters' && createdTransporter && !base.includes(createdTransporter)) {
        return [createdTransporter, ...base];
      }
      if (source === 'devices' && createdDeviceLabel && !base.includes(createdDeviceLabel)) {
        return [createdDeviceLabel, ...base];
      }
      if (source === 'vehicles' && createdVehicleNumber && !base.includes(createdVehicleNumber)) {
        return [createdVehicleNumber, ...base];
      }
      return base;
    },
    [bootstrap.dropdowns, createdTransporter, createdDeviceLabel, createdVehicleNumber]
  );

  // Required progress ring count for Smart pinned Save bar
  const requiredStats = useMemo(() => {
    const reqFields = currentStep.fields.filter((f) => f.required);
    const done = reqFields.filter((f) => {
      const val = currentValues[f.key];
      return typeof val === 'string' && val.trim().length > 0;
    }).length;
    return { done, total: reqFields.length };
  }, [currentStep, currentValues]);

  // Trigger Step-Up Modal (C4)
  const requestStepUp = useCallback(
    (reason: string, onSuccess: (stepUpToken: string) => Promise<void> | void) => {
      setStepUpState({
        open: true,
        reason,
        loading: false,
        error: null,
        onSuccess,
      });
    },
    []
  );

  const handleStepUpVerify = async (
    method: 'biometric' | 'pin' | 'otp',
    credential: string
  ) => {
    setStepUpState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/wizard-auth/step-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ method, credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStepUpState((prev) => ({
          ...prev,
          loading: false,
          error: data.error || 'Step-up verification failed.',
        }));
        return;
      }
      onUpdateStepUpTimestamp(Date.now());
      const cb = stepUpState.onSuccess;
      setStepUpState({
        open: false,
        reason: '',
        loading: false,
        error: null,
        onSuccess: null,
      });
      if (cb) {
        await cb(data.stepUpToken);
      }
    } catch {
      setStepUpState((prev) => ({
        ...prev,
        loading: false,
        error: 'Network error during step-up verification.',
      }));
    }
  };

  const updateField = (key: string, nextVal: string | boolean) => {
    setFormValues((prev) => ({
      ...prev,
      [currentStepNum]: {
        ...(prev[currentStepNum] || {}),
        [key]: nextVal,
      },
    }));
    setDirtySteps((prev) => ({ ...prev, [currentStepNum]: true }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    if (typeof nextVal === 'string' && nextVal.trim()) {
      setRecentChoices((prev) => {
        const list = prev[key] || [];
        return {
          ...prev,
          [key]: [nextVal, ...list.filter((i) => i !== nextVal)].slice(0, 3),
        };
      });
    }
  };

  // Sensitive checkbox guard (C4): turning Active OFF or checking Overwrite Subscription requires Step-Up
  const handleCheckboxToggle = (cbKey: string, label: string, nextChecked: boolean, sensitive?: boolean) => {
    if (!canEdit) return;
    const isTurningActiveOff = cbKey === 'active' && !nextChecked;
    const isEnablingOverwrite = cbKey === 'overwriteSubscriptionAll' && nextChecked;

    if (sensitive && (isTurningActiveOff || isEnablingOverwrite)) {
      requestStepUp(
        `Confirm identity before changing sensitive option "${label}".`,
        () => {
          updateField(cbKey, nextChecked);
          setBannerMessage({
            tone: 'info',
            text: `Verified change: "${label}" updated.`,
          });
        }
      );
      return;
    }
    updateField(cbKey, nextChecked);
  };

  // Signed + Idempotent API Submission (C4)
  const executeSignedSave = async (
    stepNum: number,
    valuesToSave: Record<string, string | boolean>,
    idempotencyKey: string,
    stepUpToken?: string
  ): Promise<boolean> => {
    setSaving(true);
    setBannerMessage(null);
    const bodyObj = { values: valuesToSave };
    const bodyString = JSON.stringify(bodyObj);
    const timestamp = String(Date.now());
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = `/api/wizard/step/${stepNum}`;

    try {
      const signature = await signWizardRequest({
        signingKey: session.signingKey,
        method: 'POST',
        path,
        timestamp,
        nonce,
        idempotencyKey,
        bodyString,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'X-Device-Id': session.deviceId,
        'X-Idempotency-Key': idempotencyKey,
        'X-Request-Timestamp': timestamp,
        'X-Request-Nonce': nonce,
        'X-Request-Signature': signature,
      };
      if (stepUpToken) {
        headers['X-Stepup-Token'] = stepUpToken;
      }

      const res = await fetch(path, {
        method: 'POST',
        headers,
        body: bodyString,
      });
      const data = await res.json();

      if (res.status === 428 && data.stepUpRequired) {
        setSaving(false);
        requestStepUp(
          `Step-up re-authentication required before saving Step ${stepNum} (${steps[stepNum - 1].title}).`,
          async (freshToken) => {
            await executeSignedSave(stepNum, valuesToSave, idempotencyKey, freshToken);
          }
        );
        return false;
      }

      if (!res.ok) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
        setBannerMessage({
          tone: 'error',
          text: data.error || `Could not save Step ${stepNum}.`,
        });
        return false;
      }

      // Cascade saved records to downstream steps (A3 + D8)
      if (stepNum === 1 && data.record?.companyName) {
        const companyName = String(data.record.companyName);
        setCreatedTransporter(companyName);
        setFormValues((prev) => ({
          ...prev,
          3: { ...prev[3], transporter: companyName },
          4: { ...prev[4], transporter: companyName },
          5: { ...prev[5], transporter: companyName },
        }));
      } else if (stepNum === 2 && data.record?.imeiMasked) {
        const label = `${data.record.deviceType} · ${data.record.imeiMasked}`;
        setCreatedDeviceLabel(label);
        setFormValues((prev) => ({
          ...prev,
          3: { ...prev[3], device: label },
        }));
      } else if (stepNum === 3 && data.record?.vehicleNumber) {
        const vNum = String(data.record.vehicleNumber);
        setCreatedVehicleNumber(vNum);
        setFormValues((prev) => ({
          ...prev,
          5: { ...prev[5], vehicle: vNum },
        }));
      }

      setCompletedSteps((prev) => (prev.includes(stepNum) ? prev : [...prev, stepNum]));
      setDirtySteps((prev) => ({ ...prev, [stepNum]: false }));
      await onRefreshBootstrap();

      if (stepNum === steps.length) {
        window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        setWizardFinished(true);
      } else {
        setBannerMessage({
          tone: 'success',
          text: `Saved Step ${stepNum} (${steps[stepNum - 1].title}) with HMAC signature.`,
        });
        setCurrentStepNum(stepNum + 1);
        setFieldErrors({});
      }
      return true;
    } catch {
      setBannerMessage({
        tone: 'error',
        text: 'Network error while submitting signed save. You can retry safely with the same idempotency key.',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = async () => {
    if (!canEdit) return;
    setFieldErrors({});
    setBannerMessage(null);

    // Client-side validation mirroring server rules
    const validation = validateStepForm(currentStep, currentValues);
    if (currentStepNum === 1) {
      const pwd = String(currentValues.password || '');
      const uname = String(currentValues.username || '');
      const policy = evaluatePasswordPolicy(pwd, uname);
      if (!policy.valid) {
        validation.valid = false;
        validation.fieldErrors.password =
          'Password must be 10+ chars with upper, lower, digit, symbol, not common, and not equal Username.';
      }
    }

    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setBannerMessage({
        tone: 'error',
        text: 'Please fix the highlighted required or invalid fields before saving.',
      });
      return;
    }

    const idempotencyKey = `idem-${currentStepNum}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // D15 Offline queue handling
    if (isOffline) {
      setOfflineQueue((prev) => [
        ...prev,
        {
          id: idempotencyKey,
          stepNumber: currentStepNum,
          values: { ...currentValues },
          idempotencyKey,
          queuedAt: new Date().toLocaleTimeString(),
        },
      ]);
      setBannerMessage({
        tone: 'info',
        text: `Offline: Step ${currentStepNum} queued safely. Tap Retry when back online.`,
      });
      return;
    }

    // Check Step-Up requirement (Steps 1, 2, 3, 5 always; Steps 4, 6, 7 when >10 min since last step-up)
    const needsStepUp = requiresStepUpAuth(
      currentStep.featureKey,
      session.lastStepUpAtMs,
      Date.now()
    );
    if (needsStepUp) {
      requestStepUp(
        `Step-up re-authentication required before saving Step ${currentStepNum} (${currentStep.title}).`,
        async (stepUpToken) => {
          await executeSignedSave(
            currentStepNum,
            currentValues,
            idempotencyKey,
            stepUpToken
          );
        }
      );
      return;
    }

    await executeSignedSave(currentStepNum, currentValues, idempotencyKey);
  };

  const handleRetryOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    const remaining: QueuedSaveItem[] = [];
    for (const item of offlineQueue) {
      const ok = await executeSignedSave(item.stepNumber, item.values, item.idempotencyKey);
      if (!ok) remaining.push(item);
    }
    setOfflineQueue(remaining);
  };

  const performSkip = async () => {
    setSkipConfirmOpen(false);
    setFieldErrors({});
    setBannerMessage(null);
    try {
      await fetch('/api/wizard/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ stepNumber: currentStepNum }),
      });
    } catch {
      // Non-blocking audit skip log
    }
    if (currentStepNum < steps.length) {
      setCurrentStepNum(currentStepNum + 1);
    }
  };

  const handleSkipClick = () => {
    const hasRequired = currentStep.fields.some((f) => f.required);
    if (hasRequired && formStyle === 'smart') {
      setSkipConfirmOpen(true);
    } else {
      performSkip();
    }
  };

  const handleBackNavigation = (target: 'exit' | 'prev') => {
    if (dirtySteps[currentStepNum] && formStyle === 'smart') {
      setUnsavedConfirmTarget(target);
      return;
    }
    if (target === 'exit') {
      onExitToDashboard();
    } else if (currentStepNum > 1) {
      setCurrentStepNum(currentStepNum - 1);
      setFieldErrors({});
    }
  };

  // Group fields by cardGroup for Smart Mode collapsible cards (preserving exact Part A order!)
  const groupedSections = useMemo(() => {
    const groups: Array<{
      groupName: string;
      fields: WizardFieldSpec[];
      hasRequired: boolean;
    }> = [];
    for (const f of currentStep.fields) {
      if (quickAddMode && !f.required) continue;
      let existing = groups.find((g) => g.groupName === f.cardGroup);
      if (!existing) {
        existing = { groupName: f.cardGroup, fields: [], hasRequired: false };
        groups.push(existing);
      }
      existing.fields.push(f);
      if (f.required) existing.hasRequired = true;
    }
    return groups;
  }, [currentStep.fields, quickAddMode]);

  const renderFieldWidget = (field: WizardFieldSpec) => {
    const val = String(currentValues[field.key] ?? '');
    const err = fieldErrors[field.key];

    if (field.type === 'idle_split') {
      return (
        <IdleSplitField
          key={field.key}
          hours={String(currentValues.idleHours ?? '')}
          minutes={String(currentValues.idleMinutes ?? '')}
          disabled={!canEdit}
          formStyle={formStyle}
          onChangeHours={(v) => updateField('idleHours', v)}
          onChangeMinutes={(v) => updateField('idleMinutes', v)}
          onOpenTooltip={setTooltipTopic}
        />
      );
    }

    if (field.type === 'date') {
      return (
        <AppDateField
          key={field.key}
          field={field}
          value={val}
          error={err}
          disabled={!canEdit}
          formStyle={formStyle}
          onChange={(v) => updateField(field.key, v)}
        />
      );
    }

    if (field.type === 'dropdown') {
      const options = getOptionsForSource(field.dropdownSource);
      let preselectedNote: string | undefined;
      if (field.key === 'transporter' && createdTransporter && val === createdTransporter) {
        preselectedNote = 'Pre-selected from Step 1';
      } else if (field.key === 'device' && createdDeviceLabel && val === createdDeviceLabel) {
        preselectedNote = 'Pre-selected from Step 2';
      } else if (field.key === 'vehicle' && createdVehicleNumber && val === createdVehicleNumber) {
        preselectedNote = 'Pre-selected from Step 3';
      }

      return (
        <AppDropdownField
          key={field.key}
          field={field}
          value={val}
          options={options}
          recentOptions={recentChoices[field.key]}
          error={err}
          disabled={!canEdit}
          formStyle={formStyle}
          preselectedNote={preselectedNote}
          canCreateNew={field.dropdownSource === 'transporters' && canRoleEditFeature(role, 'step_1')}
          onCreateNew={() => setCurrentStepNum(1)}
          onChange={(v) => updateField(field.key, v)}
          onOpenTooltip={setTooltipTopic}
        />
      );
    }

    return (
      <div key={field.key}>
        <AppTextField
          field={field}
          value={val}
          error={err}
          disabled={!canEdit}
          formStyle={formStyle}
          onChange={(v) => updateField(field.key, v)}
          onOpenTooltip={setTooltipTopic}
          onOpenImeiScanner={
            field.type === 'imei' ? () => setImeiScannerOpen(true) : undefined
          }
          onRightAction={
            field.rightActionLabel === 'Import From Inventory'
              ? () => {
                  requestStepUp(
                    'Step-up verification required before importing IMEI from hardware inventory.',
                    () => setInventoryModalOpen(true)
                  );
                }
              : undefined
          }
          onQuickQrFill={
            field.key === 'chassisNumber' || field.key === 'motorNumber'
              ? () => {
                  const prefix = field.key === 'chassisNumber' ? 'MAT466' : 'ENG892';
                  updateField(
                    field.key,
                    `${prefix}${Math.floor(100000 + Math.random() * 899999)}`
                  );
                }
              : undefined
          }
        />
        {currentStepNum === 1 && field.key === 'password' && (
          <PasswordStrengthMeter
            password={val}
            username={String(currentValues.username ?? '')}
            confirmPassword={String(currentValues.confirmPassword ?? '')}
          />
        )}
      </div>
    );
  };

  // Final Completion Screen after Step 7 Save (D14)
  if (wizardFinished) {
    return (
      <div className="min-h-[680px] bg-[#F6F5FA] dark:bg-[#120F1B] flex flex-col">
        <div
          className="px-4 h-14 flex items-center gap-3 text-white shadow-sm"
          style={{
            background: 'linear-gradient(90deg, #4B2166 0%, #160922 100%)',
          }}
        >
          <button
            type="button"
            onClick={onExitToDashboard}
            aria-label="Back to dashboard"
            className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold">New Vehicle</h1>
        </div>

        <div
          data-testid="wizard-completion-screen"
          className="flex-1 flex items-center justify-center p-5"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#191524] rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-white/10 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#00A88F]/15 text-[#00A88F] flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Vehicle Onboarding Complete
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                All completed steps were verified, signed, and saved cleanly.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Transporter</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {createdTransporter || String(formValues[3]?.transporter || 'Existing Transporter')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Device</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {createdDeviceLabel || String(formValues[3]?.device || 'Assigned GPS Unit')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Vehicle</span>
                <span className="font-mono font-bold text-[#4B2166] dark:text-purple-300">
                  {createdVehicleNumber || String(formValues[3]?.vehicle || 'Fleet Vehicle')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Completed Steps</span>
                <span className="font-semibold text-[#008C76] dark:text-teal-300">
                  {completedSteps.length} / {steps.length} saved
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                data-testid="completion-view-on-map"
                onClick={() => onViewOnMap(createdVehicleNumber || undefined)}
                className="w-full py-3 rounded-xl bg-[#4B2166] hover:bg-[#5E2A7F] text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>View on map</span>
              </button>
              <button
                type="button"
                data-testid="completion-add-another"
                onClick={() => {
                  setFormValues(buildInitialStepValues(steps));
                  setCompletedSteps([]);
                  setDirtySteps({});
                  setCurrentStepNum(1);
                  setWizardFinished(false);
                }}
                className="w-full py-3 rounded-xl bg-[#00A88F]/12 text-[#007B68] dark:bg-[#00A88F]/20 dark:text-teal-200 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add another vehicle</span>
              </button>
              <button
                type="button"
                data-testid="completion-go-dashboard"
                onClick={onExitToDashboard}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 text-sm font-semibold cursor-pointer"
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="new-vehicle-wizard"
      data-form-style={formStyle}
      className={`min-h-[680px] flex flex-col ${
        formStyle === 'classic'
          ? 'bg-[#F5F5F7] dark:bg-[#120F1B]'
          : 'bg-[#F6F5FA] dark:bg-[#120F1B]'
      }`}
    >
      {/* Part A1 Deep-Purple Gradient App Bar */}
      <header
        className="px-4 h-14 flex items-center justify-between gap-3 text-white shadow-sm shrink-0"
        style={{
          background: 'linear-gradient(90deg, #4B2166 0%, #240D36 65%, #12071C 100%)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            data-testid="wizard-appbar-back"
            onClick={() => handleBackNavigation('exit')}
            aria-label="Back"
            className="p-1.5 -ml-1 rounded-full hover:bg-white/10 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold tracking-tight truncate">
            New Vehicle
          </h1>
        </div>

        {/* Form style toggle (Classic vs Smart) + Quick Add + Offline Simulator */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            role="group"
            aria-label="Form style toggle"
            className="inline-flex rounded-lg bg-white/12 p-0.5 text-[11px] font-semibold"
          >
            <button
              type="button"
              data-testid="form-style-classic-btn"
              onClick={() => onChangeFormStyle('classic')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                formStyle === 'classic'
                  ? 'bg-white text-[#4B2166]'
                  : 'text-purple-100 hover:text-white'
              }`}
            >
              Classic
            </button>
            <button
              type="button"
              data-testid="form-style-smart-btn"
              onClick={() => onChangeFormStyle('smart')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                formStyle === 'smart'
                  ? 'bg-white text-[#4B2166]'
                  : 'text-purple-100 hover:text-white'
              }`}
            >
              Smart
            </button>
          </div>

          {formStyle === 'smart' && (
            <>
              <button
                type="button"
                data-testid="wizard-quick-add-btn"
                onClick={() => setQuickAddMode((v) => !v)}
                title="Show only required fields"
                className={`p-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  quickAddMode
                    ? 'bg-[#00A88F] text-white'
                    : 'bg-white/12 text-purple-100 hover:bg-white/20'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quick</span>
              </button>
              <button
                type="button"
                data-testid="wizard-offline-toggle-btn"
                onClick={() => setIsOffline((v) => !v)}
                title="Simulate offline save queue"
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isOffline
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-white/12 text-purple-100 hover:bg-white/20'
                }`}
              >
                {isOffline ? (
                  <WifiOff className="w-3.5 h-3.5" />
                ) : (
                  <Wifi className="w-3.5 h-3.5" />
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Offline Queue Banner */}
      <OfflineBanner
        isOffline={isOffline}
        queuedCount={offlineQueue.length}
        onRetry={handleRetryOfflineQueue}
        onToggleOffline={() => setIsOffline(false)}
      />

      {/* Part A1 / Smart Wizard Header */}
      <WizardHeader
        step={currentStep}
        allSteps={steps}
        formStyle={formStyle}
        role={role}
        completedSteps={completedSteps}
        onBack={() => handleBackNavigation('prev')}
        onSkip={handleSkipClick}
        onJumpToStep={(num) => {
          setCurrentStepNum(num);
          setFieldErrors({});
          setBannerMessage(null);
        }}
        onOpenAllSteps={() => setAllStepsOpen(true)}
      />

      {/* Resume Encrypted Draft Banner (D11) */}
      {resumeDraftAvailable && (
        <div
          data-testid="wizard-resume-draft-banner"
          className="px-4 py-2.5 bg-purple-50 dark:bg-purple-950/50 border-b border-purple-200 dark:border-purple-500/30 flex items-center justify-between gap-2 text-xs"
        >
          <span className="font-medium text-[#4B2166] dark:text-purple-200">
            Encrypted local draft found (passwords excluded). Resume where you left off?
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setFormValues((prev) => {
                  const merged = { ...prev };
                  for (const [k, v] of Object.entries(resumeDraftAvailable)) {
                    const num = Number(k.replace('step_', ''));
                    if (num >= 1 && num <= steps.length) {
                      merged[num] = { ...merged[num], ...v };
                    }
                  }
                  return merged;
                });
                setResumeDraftAvailable(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#4B2166] text-white font-semibold cursor-pointer"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => {
                window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
                setResumeDraftAvailable(null);
              }}
              className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-black/5 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Smart Mode Mini Section Outline Jumper (D3) */}
      {formStyle === 'smart' && canAccess && groupedSections.length > 1 && (
        <div className="px-4 py-2 bg-white/80 dark:bg-[#191524]/80 border-b border-slate-200/80 dark:border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {groupedSections.map((g) => (
            <button
              key={g.groupName}
              type="button"
              onClick={() => {
                const el = document.getElementById(`wiz-sec-${g.groupName.replace(/\s+/g, '-')}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-[#4B2166]/10 hover:text-[#4B2166] cursor-pointer"
            >
              {g.groupName}
            </button>
          ))}
        </div>
      )}

      {/* Main Scrollable Body */}
      <div className={`flex-1 overflow-y-auto px-4 py-5 ${formStyle === 'smart' ? 'pb-24' : 'pb-8'}`}>
        <div className="max-w-xl mx-auto space-y-4">
          {/* Role View-Only / Step-Up Info Strip */}
          {canAccess && !canEdit && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30">
              <LockedChip reason={`View-only for ${role}`} />
              <span className="text-xs text-amber-900 dark:text-amber-200">
                Save disabled by permissions.json
              </span>
            </div>
          )}

          {/* Status Banner */}
          {bannerMessage && (
            <div
              role="status"
              data-testid="wizard-status-banner"
              className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 border ${
                bannerMessage.tone === 'success'
                  ? 'bg-[#00A88F]/10 border-[#00A88F]/30 text-[#007764] dark:text-teal-200'
                  : bannerMessage.tone === 'error'
                  ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-200'
                  : 'bg-purple-50 dark:bg-purple-500/15 border-purple-200 dark:border-purple-500/30 text-[#4B2166] dark:text-purple-200'
              }`}
            >
              <span>{bannerMessage.text}</span>
              <button
                type="button"
                onClick={() => setBannerMessage(null)}
                className="p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Dual-Ignition Warning (D13) */}
          {stepWarnings.map((w) => (
            <div
              key={w}
              role="alert"
              data-testid="wizard-warning-banner"
              className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-500/40 text-xs font-medium text-amber-950 dark:text-amber-200 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}

          {/* L2 RBAC Route Guard: "No access" */}
          {!canAccess ? (
            <div
              data-testid="wizard-no-access-guard"
              className="rounded-2xl bg-white dark:bg-[#191524] border border-slate-200 dark:border-white/10 p-8 text-center space-y-4"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <LockedChip reason={`No access · Role: ${role}`} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-2">
                  No access to Step {currentStepNum}: {currentStep.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                  Your role ({role}) is set to &quot;{stepRight}&quot; for{' '}
                  <code className="font-mono">{currentStep.featureKey}</code> in{' '}
                  <code className="font-mono">permissions.json</code>. Contact an Admin to request access or skip to an authorized step.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {steps
                  .filter((s) => canRoleAccessFeature(role, s.featureKey))
                  .map((s) => (
                    <button
                      key={s.stepNumber}
                      type="button"
                      onClick={() => setCurrentStepNum(s.stepNumber)}
                      className="px-3 py-1.5 rounded-xl bg-[#4B2166]/10 text-[#4B2166] dark:bg-purple-500/20 dark:text-purple-200 text-xs font-semibold cursor-pointer"
                    >
                      Go to Step {s.stepNumber}: {s.title}
                    </button>
                  ))}
              </div>
            </div>
          ) : currentStepNum === 6 && currentStep.fields.length === 0 ? (
            /* Step 6 Custom Fields */
            formStyle === 'classic' ? (
              <div
                data-testid="step6-classic-blank"
                className="min-h-[260px] bg-white dark:bg-[#191524] rounded-xl border border-slate-200/80 dark:border-white/10"
              />
            ) : (
              <EmptyState
                title="No custom fields yet"
                description="Your workspace has no custom vehicle metadata fields configured. Tap Save below to finish onboarding this vehicle and view it on the live map."
              />
            )
          ) : formStyle === 'classic' ? (
            /* CLASSIC MODE: Strict flat scrollable Part A1 form */
            <div className="space-y-4">
              {currentStep.fields.map((f) => renderFieldWidget(f))}

              {/* Step 3 Switches with thin dividers exactly per Part A3 */}
              {currentStep.switches.length > 0 && (
                <div className="space-y-0">
                  {currentStep.switches.map((sw) => {
                    const checked = Boolean(currentValues[sw.key]);
                    return (
                      <div key={sw.key}>
                        <hr className="border-slate-200 dark:border-white/10 my-3" />
                        <div className="flex items-center justify-between py-1">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {sw.label}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={checked}
                            disabled={!canEdit}
                            data-testid={`wiz-switch-${sw.key}`}
                            onClick={() => updateField(sw.key, !checked)}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                              checked
                                ? 'bg-[#6B2D91]'
                                : 'bg-slate-400 dark:bg-slate-600'
                            } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                checked ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Checkboxes with thin top divider & purple-filled square with white tick */}
              {currentStep.checkboxes.length > 0 && (
                <div className="pt-1 space-y-3">
                  <hr className="border-slate-200 dark:border-white/10" />
                  {currentStep.checkboxes.map((cb) => {
                    const checked = Boolean(currentValues[cb.key]);
                    return (
                      <label
                        key={cb.key}
                        className="flex items-center gap-3 cursor-pointer select-none py-0.5"
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          disabled={!canEdit}
                          data-testid={`wiz-checkbox-${cb.key}`}
                          onClick={() =>
                            handleCheckboxToggle(cb.key, cb.label, !checked, cb.sensitiveAction)
                          }
                          className={`w-5 h-5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            checked
                              ? 'bg-[#6B2D91] border-[#6B2D91] text-white'
                              : 'bg-white dark:bg-[#120F1B] border-slate-400 dark:border-white/30'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <span className="text-sm text-slate-900 dark:text-slate-100">
                          {cb.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* SMART MODE: Grouped Collapsible SectionCards (D3 + D12) */
            <div className="space-y-4">
              {quickAddMode && (
                <div className="px-3.5 py-2 rounded-xl bg-[#00A88F]/12 text-[#007B68] dark:text-teal-200 text-xs font-semibold flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Quick add active: showing required fields only</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuickAddMode(false)}
                    className="underline cursor-pointer"
                  >
                    Show all
                  </button>
                </div>
              )}

              {groupedSections.map((group) => (
                <SectionCard
                  key={group.groupName}
                  id={`wiz-sec-${group.groupName.replace(/\s+/g, '-')}`}
                  title={group.groupName}
                  hasRequired={group.hasRequired}
                  defaultOpen={group.hasRequired || groupedSections.length <= 2}
                >
                  {group.fields.map((f) => renderFieldWidget(f))}
                </SectionCard>
              ))}

              {/* Switches card in Smart mode */}
              {!quickAddMode && currentStep.switches.length > 0 && (
                <SectionCard title="Device Settings" defaultOpen>
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {currentStep.switches.map((sw) => {
                      const checked = Boolean(currentValues[sw.key]);
                      return (
                        <div
                          key={sw.key}
                          className="flex items-center justify-between py-2.5"
                        >
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {sw.label}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={checked}
                            disabled={!canEdit}
                            data-testid={`wiz-switch-${sw.key}`}
                            onClick={() => updateField(sw.key, !checked)}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                              checked
                                ? 'bg-[#4B2166]'
                                : 'bg-slate-400 dark:bg-slate-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                checked ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              )}

              {/* Checkboxes card in Smart mode */}
              {currentStep.checkboxes.length > 0 && (
                <SectionCard
                  title={
                    currentStepNum === 2
                      ? 'Wiring & Status'
                      : currentStepNum === 3
                      ? 'Alarms'
                      : 'Status & Subscription Options'
                  }
                  defaultOpen
                >
                  <div className="space-y-3">
                    {currentStep.checkboxes.map((cb) => {
                      const checked = Boolean(currentValues[cb.key]);
                      return (
                        <label
                          key={cb.key}
                          className="flex items-center gap-3 cursor-pointer select-none"
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            disabled={!canEdit}
                            data-testid={`wiz-checkbox-${cb.key}`}
                            onClick={() =>
                              handleCheckboxToggle(
                                cb.key,
                                cb.label,
                                !checked,
                                cb.sensitiveAction
                              )
                            }
                            className={`w-5 h-5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                              checked
                                ? 'bg-[#6B2D91] border-[#6B2D91] text-white'
                                : 'bg-white dark:bg-[#120F1B] border-slate-400 dark:border-white/30'
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <span className="text-sm text-slate-900 dark:text-slate-100">
                            {cb.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {/* Classic Mode Bottom Divider + Full-Width Purple Save Button (Part A1) */}
          {canAccess && canEdit && formStyle === 'classic' && (
            <div className="pt-4 space-y-4">
              <hr className="border-slate-200 dark:border-white/10" />
              <button
                type="button"
                disabled={saving}
                data-testid="wizard-save-btn"
                onClick={handleSaveClick}
                className="w-full h-12 rounded-xl bg-[#4B2166] hover:bg-[#5E2A7F] text-white text-sm font-bold shadow-sm disabled:opacity-60 transition-colors cursor-pointer"
              >
                {saving ? 'Signing & Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Smart Mode Pinned Bottom Save Bar with Required-Fields Progress Ring (D4) */}
      {canAccess && canEdit && formStyle === 'smart' && (
        <div
          data-testid="wizard-pinned-save-bar"
          className="fixed bottom-0 inset-x-0 sm:sticky z-20 max-w-2xl mx-auto bg-white/95 dark:bg-[#191524]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 px-4 py-3"
        >
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-slate-200 dark:text-white/10"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="94.2"
                    strokeDashoffset={
                      requiredStats.total === 0
                        ? 0
                        : 94.2 - (94.2 * requiredStats.done) / requiredStats.total
                    }
                    className="text-[#00A88F] transition-all duration-300"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-slate-900 dark:text-white">
                  {requiredStats.total === 0
                    ? '✓'
                    : `${requiredStats.done}/${requiredStats.total}`}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {requiredStats.total === 0
                    ? 'Ready to save'
                    : `${requiredStats.done} of ${requiredStats.total} required fields done`}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate inline-flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#4B2166] dark:text-purple-300" />
                  <span>
                    {requiresStepUpAuth(currentStep.featureKey, session.lastStepUpAtMs)
                      ? 'HMAC signed + Step-Up required'
                      : 'HMAC signed & idempotent'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              data-testid="wizard-save-btn"
              onClick={handleSaveClick}
              className="px-7 h-11 rounded-xl bg-[#4B2166] hover:bg-[#5E2A7F] text-white text-sm font-bold shadow-sm disabled:opacity-60 transition-colors cursor-pointer shrink-0"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* All Steps Bottom Sheet */}
      <AllStepsSheet
        open={allStepsOpen}
        steps={steps}
        currentStepNumber={currentStepNum}
        completedSteps={completedSteps}
        role={role}
        onSelectStep={(num) => {
          setCurrentStepNum(num);
          setFieldErrors({});
          setBannerMessage(null);
        }}
        onClose={() => setAllStepsOpen(false)}
      />

      {/* Step-Up Verification Sheet */}
      <StepUpAuthSheet
        open={stepUpState.open}
        reason={stepUpState.reason}
        loading={stepUpState.loading}
        error={stepUpState.error}
        onVerify={handleStepUpVerify}
        onCancel={() =>
          setStepUpState({
            open: false,
            reason: '',
            loading: false,
            error: null,
            onSuccess: null,
          })
        }
      />

      {/* IMEI Barcode Scanner Modal */}
      <ImeiScannerModal
        open={imeiScannerOpen}
        onScan={(imei) => updateField('imei', imei)}
        onClose={() => setImeiScannerOpen(false)}
      />

      {/* Import From Inventory Modal (Step 3) */}
      {inventoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            data-testid="inventory-import-modal"
            className="w-full sm:max-w-md bg-white dark:bg-[#191524] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-[#4B2166] dark:text-purple-300" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Import From Inventory
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInventoryModalOpen(false)}
                className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Select an unassigned GPS unit from warehouse inventory to auto-fill Imei, Sim Number, Sim Operator, and Device Type.
            </p>
            <div className="space-y-2">
              {bootstrap.records.inventoryDevices.map((inv) => (
                <button
                  key={inv.imei}
                  type="button"
                  onClick={() => {
                    updateField('imei', inv.imei);
                    updateField('simNumber', inv.simNumber);
                    updateField('simOperator', inv.simOperator);
                    updateField('deviceType', inv.deviceType);
                    setInventoryModalOpen(false);
                    setBannerMessage({
                      tone: 'success',
                      text: `Imported ${inv.deviceType} (${inv.imei}) from inventory.`,
                    });
                  }}
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#4B2166] text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {inv.deviceType}
                    </div>
                    <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                      IMEI: {inv.imei}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {inv.simOperator} · 24-digit SIM ready
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-[#4B2166] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Skip Confirmation Sheet (D10) */}
      {skipConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            data-testid="skip-confirm-sheet"
            className="w-full sm:max-w-sm bg-white dark:bg-[#191524] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Skip this step?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Skip this step? You can come back later. Unsaved required fields on Step {currentStepNum} ({currentStep.title}) will remain in your encrypted draft.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSkipConfirmOpen(false)}
                className="py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Stay on Step {currentStepNum}
              </button>
              <button
                type="button"
                data-testid="confirm-skip-btn"
                onClick={performSkip}
                className="py-2.5 rounded-xl bg-[#4B2166] text-white text-xs font-bold cursor-pointer"
              >
                Skip step
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Guard Sheet (D10) */}
      {unsavedConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full sm:max-w-sm bg-white dark:bg-[#191524] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Unsaved changes
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              You have unsaved edits on Step {currentStepNum}. Leave anyway? Your non-sensitive draft is auto-saved encrypted locally.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setUnsavedConfirmTarget(null)}
                className="py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = unsavedConfirmTarget;
                  setUnsavedConfirmTarget(null);
                  if (target === 'exit') onExitToDashboard();
                  else if (currentStepNum > 1) setCurrentStepNum(currentStepNum - 1);
                }}
                className="py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                Leave step
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Tooltip Bottom Sheet */}
      <TooltipSheet topic={tooltipTopic} onClose={() => setTooltipTopic(null)} />
    </div>
  );
}
