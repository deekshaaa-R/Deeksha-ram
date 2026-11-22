import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Cloud, Cpu, HardDrive, Plus, ShieldCheck, Truck, X } from 'lucide-react';
import type { TrackedDevice, VehicleType } from '../types';
import type { FieldErrors } from '../utils/storeLogic';
import {
  defaultModelForVehicleType,
  normalizeImeiInput,
  TRACKER_MODEL_OPTIONS,
  validateVehicleRegistrationFields,
  VEHICLE_TYPE_OPTIONS,
  type VehicleRegistrationField,
} from '../utils/vehicleDeviceLogic';

interface RegisterVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingImeis: string[];
  isCloudAuthenticated: boolean;
  onSubmitDevice: (input: {
    imei: string;
    nickname: string;
    vehicleType: VehicleType;
    model?: string;
  }) => Promise<{
    ok: boolean;
    device?: TrackedDevice;
    syncedToFirestore: boolean;
    error?: string;
  }>;
  onSuccess?: (device?: TrackedDevice) => void;
  onNavigateToLogin?: () => void;
}

export function RegisterVehicleModal({
  isOpen,
  onClose,
  existingImeis,
  isCloudAuthenticated,
  onSubmitDevice,
  onSuccess,
  onNavigateToLogin,
}: RegisterVehicleModalProps) {
  const titleId = useId();
  const imeiInputRef = useRef<HTMLInputElement>(null);

  const [imei, setImei] = useState('');
  const [nickname, setNickname] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    'Commercial Truck / Fleet'
  );
  const [model, setModel] = useState<string>(
    defaultModelForVehicleType('Commercial Truck / Fleet')
  );
  const [modelManuallyEdited, setModelManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<VehicleRegistrationField>>(
    {}
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form and focus IMEI field whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setImei('');
    setNickname('');
    setVehicleType('Commercial Truck / Fleet');
    setModel(defaultModelForVehicleType('Commercial Truck / Fleet'));
    setModelManuallyEdited(false);
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);

    const timer = window.setTimeout(() => {
      imeiInputRef.current?.focus();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleVehicleTypeChange = (nextType: VehicleType) => {
    setVehicleType(nextType);
    if (!modelManuallyEdited) {
      setModel(defaultModelForVehicleType(nextType));
    }
    if (errors.vehicleType) {
      setErrors((prev) => ({ ...prev, vehicleType: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const fieldErrors = validateVehicleRegistrationFields(
      { imei, nickname, vehicleType, model },
      existingImeis
    );
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await onSubmitDevice({
        imei,
        nickname: nickname.trim(),
        vehicleType,
        model,
      });

      if (!result.ok) {
        if (result.error?.toLowerCase().includes('imei')) {
          setErrors((prev) => ({ ...prev, imei: result.error }));
        } else {
          setSubmitError(
            result.error || 'Unable to register vehicle device. Please retry.'
          );
        }
        return;
      }

      onSuccess?.(result.device);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to save vehicle device to Firestore.';
      setSubmitError(
        message.includes('Missing or insufficient permissions')
          ? 'Firestore permission denied. Verify your Google account email or sign in again.'
          : 'Could not complete device registration. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      data-testid="register-vehicle-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111B3A] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-[#00D4FF] shrink-0">
              <Truck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id={titleId}
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                Register New Vehicle Device
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-0.5">
                Bind a 15-digit VS Technology GPS IMEI to your fleet dashboard.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-[#A9B4D0] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {/* Persistence Mode Info Bar */}
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-[#A9B4D0]">
              {isCloudAuthenticated ? (
                <>
                  <Cloud
                    className="w-4 h-4 text-emerald-600 dark:text-[#7CFF6B] shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    Persists directly to{' '}
                    <strong className="text-slate-900 dark:text-white">
                      Cloud Firestore
                    </strong>{' '}
                    under your verified account.
                  </span>
                </>
              ) : (
                <>
                  <HardDrive
                    className="w-4 h-4 text-amber-600 dark:text-[#FFB020] shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    Demo mode saves locally.{' '}
                    {onNavigateToLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToLogin();
                        }}
                        className="font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
                      >
                        Sign in with Google
                      </button>
                    )}{' '}
                    for Firestore sync.
                  </span>
                </>
              )}
            </div>
          </div>

          {submitError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-[#FF4D4F]"
            >
              {submitError}
            </div>
          )}

          {/* 15-Digit IMEI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="reg-vehicle-imei"
                className="text-xs font-semibold text-slate-700 dark:text-[#A9B4D0]"
              >
                Device IMEI Number (15 digits) *
              </label>
              <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-[#A9B4D0]">
                {imei.length} / 15
              </span>
            </div>
            <input
              ref={imeiInputRef}
              id="reg-vehicle-imei"
              name="imei"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={15}
              value={imei}
              onChange={(e) => {
                const next = normalizeImeiInput(e.target.value);
                setImei(next);
                if (errors.imei) {
                  setErrors((prev) => ({ ...prev, imei: undefined }));
                }
              }}
              placeholder="e.g. 864291053829555"
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00D4FF]"
            />
            {errors.imei ? (
              <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                {errors.imei}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-[#A9B4D0]">
                Printed on the hardware chassis barcode or retail box sticker.
              </p>
            )}
          </div>

          {/* Vehicle Nickname */}
          <div>
            <label
              htmlFor="reg-vehicle-nickname"
              className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0] mb-1"
            >
              Vehicle Nickname / Plate Number *
            </label>
            <input
              id="reg-vehicle-nickname"
              name="nickname"
              type="text"
              maxLength={80}
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (errors.nickname) {
                  setErrors((prev) => ({ ...prev, nickname: undefined }));
                }
              }}
              placeholder="e.g. KA-05-FL-7721 (Cold Chain)"
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00D4FF]"
            />
            {errors.nickname && (
              <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                {errors.nickname}
              </p>
            )}
          </div>

          {/* Vehicle Type & Tracker Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-vehicle-type"
                className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0] mb-1"
              >
                Vehicle Type *
              </label>
              <select
                id="reg-vehicle-type"
                name="vehicleType"
                value={vehicleType}
                onChange={(e) =>
                  handleVehicleTypeChange(e.target.value as VehicleType)
                }
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] pl-3 pr-7 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00D4FF]"
              >
                {VEHICLE_TYPE_OPTIONS.map((typeOption) => (
                  <option key={typeOption} value={typeOption}>
                    {typeOption}
                  </option>
                ))}
              </select>
              {errors.vehicleType && (
                <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                  {errors.vehicleType}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-vehicle-model"
                className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0] mb-1"
              >
                Hardware Model
              </label>
              <select
                id="reg-vehicle-model"
                name="model"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setModelManuallyEdited(true);
                }}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] pl-3 pr-7 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00D4FF]"
              >
                {TRACKER_MODEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Provisioned Defaults Preview */}
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#0A1128]/70 px-3.5 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-600 dark:text-[#A9B4D0]">
            <span className="inline-flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00D4FF]" aria-hidden="true" />
              Status: <strong className="text-slate-900 dark:text-white">Live Tracking Ready</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-[#7CFF6B]" aria-hidden="true" />
              1-Year eSIM Telemetry Provisioned
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-[#A9B4D0] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{isSubmitting ? 'Registering...' : 'Register Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
