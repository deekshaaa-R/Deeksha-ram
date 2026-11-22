import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import {
  advanceTourStep,
  computeTooltipPosition,
  isTourCompleted,
  markTourCompleted,
  retreatTourStep,
  type ComputedTooltipLayout,
  type OnboardingTourStep,
  type RectBox,
} from '../utils/onboardingTourLogic';

export interface OnboardingTooltipTourProps {
  tourId: string;
  steps: readonly OnboardingTourStep[];
  /** Controlled open state. When omitted, auto-opens once for new users who have not completed tourId. */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Automatically launch for first-time users who have not completed this tourId. Defaults to true. */
  autoStartForNewUsers?: boolean;
  /** Called whenever a step becomes active (useful for switching tabs before highlighting). */
  onStepActivate?: (step: OnboardingTourStep, index: number) => void;
  /** Called when the user finishes the last step or clicks Skip/Close. */
  onComplete?: (reason: 'finished' | 'skipped') => void;
}

const TOOLTIP_MAX_WIDTH = 340;
const ESTIMATED_TOOLTIP_HEIGHT = 188;
const SPOTLIGHT_PADDING = 6;

export function OnboardingTooltipTour({
  tourId,
  steps,
  isOpen,
  onOpenChange,
  autoStartForNewUsers = true,
  onStepActivate,
  onComplete,
}: OnboardingTooltipTourProps) {
  const prefersReducedMotion = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const autoStartedRef = useRef(false);

  const [internalOpen, setInternalOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const [layout, setLayout] = useState<ComputedTooltipLayout | null>(null);

  const open = isOpen !== undefined ? isOpen : internalOpen;

  const setOpenState = useCallback(
    (next: boolean) => {
      if (isOpen === undefined) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isOpen, onOpenChange]
  );

  // Auto-start once for new users after initial layout settles
  useEffect(() => {
    if (!autoStartForNewUsers || autoStartedRef.current || steps.length === 0) return;
    if (isTourCompleted(tourId)) {
      autoStartedRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      autoStartedRef.current = true;
      const firstTarget = document.querySelector(steps[0].targetSelector);
      if (firstTarget) {
        setStepIndex(0);
        setOpenState(true);
      }
    }, 550);

    return () => window.clearTimeout(timer);
  }, [autoStartForNewUsers, tourId, steps, setOpenState]);

  // Reset to step 0 when freshly opened
  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  const activeStep = open && steps.length > 0 ? steps[Math.min(stepIndex, steps.length - 1)] : null;

  // Notify parent when step changes (e.g., to reveal the right dashboard tab)
  useEffect(() => {
    if (!activeStep) return;
    onStepActivate?.(activeStep, stepIndex);
  }, [activeStep, stepIndex, onStepActivate]);

  const measureTarget = useCallback(() => {
    if (!activeStep || typeof window === 'undefined') {
      setTargetRect(null);
      setLayout(null);
      return;
    }

    const el = document.querySelector(activeStep.targetSelector) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      setLayout(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setTargetRect(null);
      setLayout(null);
      return;
    }

    const nextRect: RectBox = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
    setTargetRect(nextRect);

    const measuredWidth = Math.min(
      tooltipRef.current?.offsetWidth || TOOLTIP_MAX_WIDTH,
      window.innerWidth - 32
    );
    const measuredHeight = tooltipRef.current?.offsetHeight || ESTIMATED_TOOLTIP_HEIGHT;

    setLayout(
      computeTooltipPosition({
        targetRect: nextRect,
        tooltipWidth: measuredWidth,
        tooltipHeight: measuredHeight,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        preferredPlacement: activeStep.preferredPlacement,
      })
    );
  }, [activeStep]);

  // Scroll target smoothly into view when step changes, then measure
  useEffect(() => {
    if (!activeStep) return;
    const el = document.querySelector(activeStep.targetSelector) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      const outOfView = rect.top < 72 || rect.bottom > window.innerHeight - 72;
      if (outOfView) {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    }

    const raf1 = window.requestAnimationFrame(() => measureTarget());
    const settleTimer = window.setTimeout(() => measureTarget(), 240);
    return () => {
      window.cancelAnimationFrame(raf1);
      window.clearTimeout(settleTimer);
    };
  }, [activeStep, prefersReducedMotion, measureTarget]);

  // Re-measure on resize, scroll, or tooltip size changes
  useLayoutEffect(() => {
    if (!open || !activeStep) return;
    measureTarget();

    const onViewportChange = () => measureTarget();
    window.addEventListener('resize', onViewportChange, { passive: true });
    window.addEventListener('scroll', onViewportChange, true);

    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, activeStep, measureTarget]);

  const handleClose = useCallback(
    (reason: 'finished' | 'skipped') => {
      markTourCompleted(tourId);
      setOpenState(false);
      onComplete?.(reason);
    },
    [tourId, setOpenState, onComplete]
  );

  const handleNext = useCallback(() => {
    const result = advanceTourStep(stepIndex, steps.length);
    if (result.completed) {
      handleClose('finished');
    } else {
      setStepIndex(result.nextIndex);
    }
  }, [stepIndex, steps.length, handleClose]);

  const handleBack = useCallback(() => {
    setStepIndex((prev) => retreatTourStep(prev, steps.length));
  }, [steps.length]);

  // Keyboard shortcuts: Escape to skip, Left/Right arrows to step
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose('skipped');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose, handleNext, handleBack]);

  if (typeof document === 'undefined') return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= steps.length - 1;

  const transition = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const };

  const spotlightX = targetRect ? Math.max(4, targetRect.left - SPOTLIGHT_PADDING) : 0;
  const spotlightY = targetRect ? Math.max(4, targetRect.top - SPOTLIGHT_PADDING) : 0;
  const spotlightW = targetRect ? targetRect.width + SPOTLIGHT_PADDING * 2 : 0;
  const spotlightH = targetRect ? targetRect.height + SPOTLIGHT_PADDING * 2 : 0;

  return createPortal(
    <AnimatePresence>
      {open && activeStep && targetRect && layout && (
        <motion.div
          key="onboarding-tour-layer"
          data-testid="onboarding-tour-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          className="fixed inset-0 z-[1200] pointer-events-none"
        >
          {/* Transparent click-away backdrop that dismisses the tour if clicked outside */}
          <div
            aria-hidden="true"
            onClick={() => handleClose('skipped')}
            className="fixed inset-0 bg-transparent pointer-events-auto"
          />

          {/* Highlight spotlight frame: keeps target element at 100% brightness while dimming surroundings */}
          <motion.div
            aria-hidden="true"
            data-testid="onboarding-tour-spotlight"
            initial={false}
            animate={{
              x: spotlightX,
              y: spotlightY,
              opacity: 1,
            }}
            transition={transition}
            style={{
              width: spotlightW,
              height: spotlightH,
            }}
            className="fixed top-0 left-0 rounded-xl ring-2 ring-cyan-500 dark:ring-[#00D4FF] shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] dark:shadow-[0_0_0_9999px_rgba(2,6,23,0.62)] pointer-events-none"
          />

          {/* Animated Tooltip Popover */}
          <motion.div
            ref={tooltipRef}
            key={activeStep.id}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            aria-describedby={descId}
            data-testid="onboarding-tooltip-card"
            data-step-id={activeStep.id}
            data-placement={layout.placement}
            initial={
              prefersReducedMotion
                ? { opacity: 0, x: layout.left, y: layout.top }
                : { opacity: 0, scale: 0.96, x: layout.left, y: layout.top + 6 }
            }
            animate={{
              opacity: 1,
              scale: 1,
              x: layout.left,
              y: layout.top,
            }}
            exit={
              prefersReducedMotion
                ? { opacity: 0, x: layout.left, y: layout.top }
                : { opacity: 0, scale: 0.96, x: layout.left, y: layout.top + 4 }
            }
            transition={transition}
            style={{ width: `min(${TOOLTIP_MAX_WIDTH}px, calc(100vw - 32px))` }}
            className="fixed top-0 left-0 pointer-events-auto rounded-2xl border border-slate-200 dark:border-cyan-500/35 bg-white dark:bg-[#111B3A] p-4 shadow-2xl text-slate-900 dark:text-white"
          >
            {/* Directional Pointer Caret */}
            {layout.placement === 'bottom' && (
              <span
                aria-hidden="true"
                style={{ left: layout.arrowOffset - 6 }}
                className="absolute -top-1.5 w-3 h-3 rotate-45 border-t border-l border-slate-200 dark:border-cyan-500/35 bg-white dark:bg-[#111B3A]"
              />
            )}
            {layout.placement === 'top' && (
              <span
                aria-hidden="true"
                style={{ left: layout.arrowOffset - 6 }}
                className="absolute -bottom-1.5 w-3 h-3 rotate-45 border-b border-r border-slate-200 dark:border-cyan-500/35 bg-white dark:bg-[#111B3A]"
              />
            )}
            {layout.placement === 'right' && (
              <span
                aria-hidden="true"
                style={{ top: layout.arrowOffset - 6 }}
                className="absolute -left-1.5 w-3 h-3 rotate-45 border-b border-l border-slate-200 dark:border-cyan-500/35 bg-white dark:bg-[#111B3A]"
              />
            )}
            {layout.placement === 'left' && (
              <span
                aria-hidden="true"
                style={{ top: layout.arrowOffset - 6 }}
                className="absolute -right-1.5 w-3 h-3 rotate-45 border-t border-r border-slate-200 dark:border-cyan-500/35 bg-white dark:bg-[#111B3A]"
              />
            )}

            {/* Header Row: Unboxed step metadata + close button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-700 dark:text-[#00D4FF] tabular-nums">
                <span>
                  Step {stepIndex + 1} of {steps.length}
                </span>
                <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
                  ·
                </span>
                <span className="text-slate-500 dark:text-[#A9B4D0]">Quick Tour</span>
              </div>
              <button
                type="button"
                data-testid="onboarding-tour-close"
                aria-label="Close onboarding tour"
                onClick={() => handleClose('skipped')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Step Title & Explanation */}
            <h3
              id={titleId}
              className="mt-2 font-display text-sm font-bold text-slate-900 dark:text-white"
            >
              {activeStep.title}
            </h3>
            <p
              id={descId}
              className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-[#A9B4D0]"
            >
              {activeStep.description}
            </p>

            {/* Step Progress Track */}
            <div
              aria-hidden="true"
              className="mt-3.5 flex items-center gap-1"
            >
              {steps.map((s, idx) => (
                <span
                  key={s.id}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    idx <= stepIndex
                      ? 'bg-cyan-600 dark:bg-[#00D4FF]'
                      : 'bg-slate-200 dark:bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Footer Controls */}
            <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
              <button
                type="button"
                data-testid="onboarding-tour-skip"
                onClick={() => handleClose('skipped')}
                className="text-xs font-medium text-slate-500 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                Skip tour
              </button>

              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    type="button"
                    data-testid="onboarding-tour-back"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid="onboarding-tour-next"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>{isLast ? 'Finish' : 'Next'}</span>
                  {isLast ? (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
