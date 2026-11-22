import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Monitor, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getInstallGuideSteps, type InstallPlatform } from '../utils/pwaLogic';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'drawer';
  onActionComplete?: () => void;
}

export function PWAInstallButton({
  variant = 'compact',
  onActionComplete,
}: PWAInstallButtonProps) {
  const { isInstalled, hasNativePrompt, platform, triggerNativeInstall } = usePWAInstall();
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<InstallPlatform>(platform);

  useEffect(() => {
    setSelectedPlatform(platform);
  }, [platform]);

  useEffect(() => {
    if (!guideOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGuideOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [guideOpen]);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      const result = await triggerNativeInstall();
      if (result === 'accepted') {
        onActionComplete?.();
        return;
      }
      if (result === 'dismissed') {
        return;
      }
    }
    setGuideOpen(true);
  };

  const guide = getInstallGuideSteps(selectedPlatform);

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          data-testid="pwa-install-btn"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-cyan-600/35 dark:border-[#00D4FF]/40 bg-cyan-500/10 text-cyan-800 dark:text-[#00D4FF] hover:bg-cyan-500/20 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3 h-3" aria-hidden="true" />
          <span>Install App</span>
        </button>
      ) : (
        <button
          type="button"
          data-testid="pwa-install-mobile-btn"
          onClick={handleInstallClick}
          className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-[#00D4FF]/15 to-cyan-500/5 border border-cyan-500/40 text-left cursor-pointer hover:border-[#00D4FF] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-[#00D4FF] text-[#0A1128] flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Install VS Tech App
              </div>
              <div className="text-xs text-slate-600 dark:text-[#A9B4D0]">
                Run standalone on mobile &amp; desktop with offline caching
              </div>
            </div>
          </div>
          <Download className="w-4 h-4 text-cyan-700 dark:text-[#00D4FF] shrink-0" aria-hidden="true" />
        </button>
      )}

      {guideOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-modal-title"
            data-testid="pwa-install-modal"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setGuideOpen(false);
              }
            }}
          >
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111B3A] p-6 shadow-2xl text-slate-900 dark:text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src="/pwa-192x192.png"
                    alt="VS Tech App Icon"
                    className="w-11 h-11 rounded-xl border border-cyan-500/40 shrink-0"
                  />
                  <div>
                    <h2
                      id="pwa-install-modal-title"
                      className="text-base font-bold leading-snug"
                    >
                      {guide.heading}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-[#A9B4D0] mt-0.5">
                      {guide.subtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGuideOpen(false)}
                  aria-label="Close install instructions"
                  className="p-1.5 rounded-lg text-slate-500 dark:text-[#A9B4D0] hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0A1128] border border-slate-200/80 dark:border-white/10">
                {(
                  [
                    ['android', 'Android', Smartphone],
                    ['ios', 'iPhone / iPad', Share],
                    ['desktop', 'Desktop', Monitor],
                  ] as const
                ).map(([key, label, Icon]) => {
                  const active = selectedPlatform === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedPlatform(key)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#00D4FF] text-[#0A1128]'
                          : 'text-slate-600 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              <ol className="mt-4 space-y-2.5">
                {guide.steps.map((step) => (
                  <li
                    key={step.title}
                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128]/70 p-3"
                  >
                    <div className="text-xs font-semibold text-cyan-800 dark:text-[#00D4FF]">
                      {step.title}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#A9B4D0] mt-1 leading-relaxed">
                      {step.detail}
                    </p>
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGuideOpen(false);
                    onActionComplete?.();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
