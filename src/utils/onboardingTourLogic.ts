export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface OnboardingTourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  preferredPlacement: TooltipPlacement;
  /** Optional AccountPage tab key to activate when this step becomes active */
  focusTab?: 'tracking' | 'devices' | 'service' | 'orders' | 'warranty' | 'bookings' | 'wishlist';
  /** Optional TrackPro OS screen ID to highlight */
  focusScreen?: string;
}

export interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface ComputedTooltipLayout {
  placement: TooltipPlacement;
  top: number;
  left: number;
  arrowOffset: number;
}

export const ACCOUNT_DASHBOARD_TOUR_ID = 'account-dashboard-v1';
export const PLATFORM_DASHBOARD_TOUR_ID = 'platform-dashboard-v1';

export const ACCOUNT_DASHBOARD_TOUR_STEPS: readonly OnboardingTourStep[] = [
  {
    id: 'account-live-tracking',
    targetSelector: '[data-testid="account-tab-tracking"]',
    title: 'Live Fleet Tracking',
    description:
      'Monitor every registered GPS vehicle in real time with live speed, ignition status, road coordinates, and route updates.',
    preferredPlacement: 'bottom',
    focusTab: 'tracking',
  },
  {
    id: 'account-vehicle-search',
    targetSelector: '[data-testid="vehicle-search-input"]',
    title: 'Instant Vehicle & IMEI Search',
    description:
      'Type any registration nickname or 15-digit IMEI to jump straight to that vehicle across tracking, devices, and service logs.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'account-service-odometer',
    targetSelector: '[data-testid="account-tab-service"]',
    title: 'Service & Odometer Alerts',
    description:
      'Stay ahead of overdue oil changes, brake inspections, and filter milestones calculated automatically from live mileage.',
    preferredPlacement: 'bottom',
    focusTab: 'service',
  },
  {
    id: 'account-order-history',
    targetSelector: '[data-testid="account-tab-orders"]',
    title: 'Order History & SIM Plans',
    description:
      'View all past GPS hardware orders, active Cloud SIM subscriptions, GST totals, and delivery statuses in one place.',
    preferredPlacement: 'bottom',
    focusTab: 'orders',
  },
  {
    id: 'account-export-reports',
    targetSelector: '[data-testid="open-export-reports-btn"]',
    title: 'Export Fleet Reports',
    description:
      'Download structured CSV or PDF reports for fleet utilization, mileage logs, and administrative audits anytime.',
    preferredPlacement: 'bottom',
  },
];

export const PLATFORM_DASHBOARD_TOUR_STEPS: readonly OnboardingTourStep[] = [
  {
    id: 'platform-rto-search',
    targetSelector: '[data-testid="topbar-rto-search"]',
    title: 'Global RTO Live Search',
    description:
      'Enter any RTO registration number to inspect vehicle metadata, driver contact details, and open Live Tracking immediately.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'platform-role-nav',
    targetSelector: '[data-testid="laptop-role-nav-groups"]',
    title: 'Role-Scoped Navigation',
    description:
      'Menus, live alert counters, and operational views adapt automatically to Super Admin, Admin, Client, and Customer permissions.',
    preferredPlacement: 'right',
  },
  {
    id: 'platform-device-switch',
    targetSelector: '[data-testid="switch-platform-laptop"]',
    title: 'Multi-Device Workspace Preview',
    description:
      'Preview and deliver the dashboard seamlessly across Laptop Web, Android, and iPhone interfaces.',
    preferredPlacement: 'bottom',
  },
];

const TOUR_STORAGE_PREFIX = 'vs_tech_onboarding_tour_';

export function getTourStorageKey(tourId: string): string {
  return `${TOUR_STORAGE_PREFIX}${tourId}`;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isTourCompleted(tourId: string, storage?: StorageLike | null): boolean {
  const store = resolveStorage(storage);
  if (!store) return false;
  try {
    return store.getItem(getTourStorageKey(tourId)) === 'completed';
  } catch {
    return false;
  }
}

export function markTourCompleted(tourId: string, storage?: StorageLike | null): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(getTourStorageKey(tourId), 'completed');
  } catch {
    // Ignore storage quota / private mode failures safely
  }
}

export function resetTourCompletion(tourId: string, storage?: StorageLike | null): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.removeItem(getTourStorageKey(tourId));
  } catch {
    // Ignore storage failures safely
  }
}

export function advanceTourStep(
  currentIndex: number,
  totalSteps: number
): { nextIndex: number; completed: boolean } {
  if (totalSteps <= 0) {
    return { nextIndex: 0, completed: true };
  }
  const safeCurrent = Math.max(0, Math.min(currentIndex, totalSteps - 1));
  if (safeCurrent >= totalSteps - 1) {
    return { nextIndex: safeCurrent, completed: true };
  }
  return { nextIndex: safeCurrent + 1, completed: false };
}

export function retreatTourStep(currentIndex: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return Math.max(0, Math.min(currentIndex - 1, totalSteps - 1));
}

function clamp(val: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(val, min), max);
}

/**
 * Pure geometry solver for anchoring an onboarding tooltip to a target DOM rect.
 * Flips placement automatically if the preferred side clips outside the viewport,
 * clamps coordinates inside the safe margin, and aligns the caret arrow with the target center.
 */
export function computeTooltipPosition(params: {
  targetRect: RectBox;
  tooltipWidth: number;
  tooltipHeight: number;
  viewport: ViewportSize;
  preferredPlacement: TooltipPlacement;
  offset?: number;
  margin?: number;
}): ComputedTooltipLayout {
  const {
    targetRect,
    tooltipWidth,
    tooltipHeight,
    viewport,
    preferredPlacement,
    offset = 14,
    margin = 16,
  } = params;

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const targetBottom = targetRect.top + targetRect.height;
  const targetRight = targetRect.left + targetRect.width;

  const fitsBottom = targetBottom + offset + tooltipHeight <= viewport.height - margin;
  const fitsTop = targetRect.top - offset - tooltipHeight >= margin;
  const fitsRight = targetRight + offset + tooltipWidth <= viewport.width - margin;
  const fitsLeft = targetRect.left - offset - tooltipWidth >= margin;

  let placement: TooltipPlacement = preferredPlacement;
  if (preferredPlacement === 'bottom' && !fitsBottom && fitsTop) {
    placement = 'top';
  } else if (preferredPlacement === 'top' && !fitsTop && fitsBottom) {
    placement = 'bottom';
  } else if (preferredPlacement === 'right' && !fitsRight) {
    if (fitsLeft) {
      placement = 'left';
    } else if (fitsBottom) {
      placement = 'bottom';
    } else if (fitsTop) {
      placement = 'top';
    }
  } else if (preferredPlacement === 'left' && !fitsLeft) {
    if (fitsRight) {
      placement = 'right';
    } else if (fitsBottom) {
      placement = 'bottom';
    } else if (fitsTop) {
      placement = 'top';
    }
  }

  let top = 0;
  let left = 0;
  let arrowOffset = 24;

  const arrowEdgeInset = 22;

  if (placement === 'bottom') {
    top = clamp(
      targetBottom + offset,
      margin,
      Math.max(margin, viewport.height - tooltipHeight - margin)
    );
    left = clamp(
      targetCenterX - tooltipWidth / 2,
      margin,
      Math.max(margin, viewport.width - tooltipWidth - margin)
    );
    arrowOffset = clamp(
      targetCenterX - left,
      arrowEdgeInset,
      Math.max(arrowEdgeInset, tooltipWidth - arrowEdgeInset)
    );
  } else if (placement === 'top') {
    top = clamp(
      targetRect.top - offset - tooltipHeight,
      margin,
      Math.max(margin, viewport.height - tooltipHeight - margin)
    );
    left = clamp(
      targetCenterX - tooltipWidth / 2,
      margin,
      Math.max(margin, viewport.width - tooltipWidth - margin)
    );
    arrowOffset = clamp(
      targetCenterX - left,
      arrowEdgeInset,
      Math.max(arrowEdgeInset, tooltipWidth - arrowEdgeInset)
    );
  } else if (placement === 'right') {
    left = clamp(
      targetRight + offset,
      margin,
      Math.max(margin, viewport.width - tooltipWidth - margin)
    );
    top = clamp(
      targetCenterY - tooltipHeight / 2,
      margin,
      Math.max(margin, viewport.height - tooltipHeight - margin)
    );
    arrowOffset = clamp(
      targetCenterY - top,
      arrowEdgeInset,
      Math.max(arrowEdgeInset, tooltipHeight - arrowEdgeInset)
    );
  } else {
    left = clamp(
      targetRect.left - offset - tooltipWidth,
      margin,
      Math.max(margin, viewport.width - tooltipWidth - margin)
    );
    top = clamp(
      targetCenterY - tooltipHeight / 2,
      margin,
      Math.max(margin, viewport.height - tooltipHeight - margin)
    );
    arrowOffset = clamp(
      targetCenterY - top,
      arrowEdgeInset,
      Math.max(arrowEdgeInset, tooltipHeight - arrowEdgeInset)
    );
  }

  return {
    placement,
    top: Math.round(top),
    left: Math.round(left),
    arrowOffset: Math.round(arrowOffset),
  };
}
