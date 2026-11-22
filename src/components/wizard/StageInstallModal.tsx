import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Monitor,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  CUSTOMER_STAGE_SPECS,
  type CustomerStage,
} from '../../utils/rtoLookup';

export function StageInstallModal({
  open,
  initialStage,
  onClose,
  onSelectStage,
}: {
  open: boolean;
  initialStage: CustomerStage;
  onClose: () => void;
  onSelectStage?: (stage: CustomerStage) => void;
}) {
  const { isInstalled, hasNativePrompt, triggerNativeInstall } = usePWAInstall();
  const [selectedStage, setSelectedStage] = useState<CustomerStage>(initialStage);
  const [copiedStage, setCopiedStage] = useState<CustomerStage | null>(null);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStage(initialStage);
  }, [initialStage]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const spec = CUSTOMER_STAGE_SPECS[selectedStage];
  const stageShareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?view=new-vehicle&stage=${selectedStage}`
      : `/?view=new-vehicle&stage=${selectedStage}`;

  const handleNativeInstall = async () => {
    setInstallFeedback(null);
    if (hasNativePrompt) {
      const outcome = await triggerNativeInstall();
      if (outcome === 'accepted') {
        setInstallFeedback('App installation started. Check your home screen or desktop apps.');
      } else if (outcome === 'dismissed') {
        setInstallFeedback('Installation prompt dismissed. You can also follow the steps below anytime.');
      }
    } else {
      setInstallFeedback(
        selectedStage === 'iphone'
          ? 'On iPhone/iPad, Safari uses the Share button → "Add to Home Screen" shown below.'
          : 'Use your browser address bar Install icon (⊕) or menu "Install App" using the 3 steps below.'
      );
    }
  };

  const handleCopyStageLink = async () => {
    try {
      await navigator.clipboard.writeText(stageShareUrl);
      setCopiedStage(selectedStage);
      window.setTimeout(() => setCopiedStage(null), 2500);
    } catch {
      setInstallFeedback(`Copy this link: ${stageShareUrl}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] bg-slate-950/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stage-install-modal-title"
      data-testid="stage-install-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-[#191524] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-white/10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="TurboTrackers App Icon"
              className="w-11 h-11 rounded-xl border border-slate-200 dark:border-white/15 shrink-0"
            />
            <div className="min-w-0">
              <h2
                id="stage-install-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white leading-snug"
              >
                Download &amp; Install App
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Available for Android, iPhone (iOS), and Laptop / PC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close download modal"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 3-Platform Selector Tabs */}
          <div
            role="tablist"
            aria-label="Choose download platform"
            className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10"
          >
            {(
              [
                ['android', 'Android', Smartphone],
                ['iphone', 'iPhone (iOS)', Share],
                ['web', 'Laptop / PC', Monitor],
              ] as const
            ).map(([key, label, Icon]) => {
              const active = selectedStage === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`install-tab-${key}`}
                  onClick={() => {
                    setSelectedStage(key);
                    setInstallFeedback(null);
                  }}
                  className={`min-h-[40px] px-2 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#4B2166] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Primary Native Install Action */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {spec.label}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                {spec.deviceSummary}
              </p>
            </div>

            {isInstalled ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Already installed and running in standalone app mode on this device.</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="stage-native-install-trigger"
                  onClick={handleNativeInstall}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#4B2166] hover:bg-[#5E2A7F] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>
                    {hasNativePrompt && selectedStage !== 'iphone'
                      ? 'Install App Now'
                      : spec.installButtonLabel}
                  </span>
                </button>
                {onSelectStage && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectStage(selectedStage);
                      onClose();
                    }}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Preview {spec.shortLabel} View</span>
                  </button>
                )}
              </div>
            )}

            {installFeedback && (
              <p className="text-xs text-[#4B2166] dark:text-purple-200 font-medium leading-relaxed">
                {installFeedback}
              </p>
            )}
          </div>

          {/* Step-by-Step Platform Download Guide */}
          <ol className="space-y-2.5">
            {spec.installSteps.map((step) => (
              <li
                key={step.title}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#120F1B]"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {step.title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>

          {/* Direct Customer Stage Link for Handover */}
          <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Direct customer link for {spec.label}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                aria-label="Customer stage link"
                value={stageShareUrl}
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-[#120F1B] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-200 focus:outline-none"
              />
              <button
                type="button"
                data-testid="copy-stage-link-btn"
                onClick={handleCopyStageLink}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedStage === selectedStage ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
