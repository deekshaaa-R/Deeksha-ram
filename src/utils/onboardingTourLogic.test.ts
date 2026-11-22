import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCOUNT_DASHBOARD_TOUR_ID,
  ACCOUNT_DASHBOARD_TOUR_STEPS,
  PLATFORM_DASHBOARD_TOUR_ID,
  PLATFORM_DASHBOARD_TOUR_STEPS,
  advanceTourStep,
  computeTooltipPosition,
  isTourCompleted,
  markTourCompleted,
  resetTourCompletion,
  retreatTourStep,
  type StorageLike,
} from './onboardingTourLogic';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

test('dashboard onboarding tours include tracking, order history, and role navigation steps', () => {
  assert.ok(ACCOUNT_DASHBOARD_TOUR_STEPS.length >= 4);
  const accountIds = ACCOUNT_DASHBOARD_TOUR_STEPS.map((s) => s.id);
  assert.ok(accountIds.includes('account-live-tracking'));
  assert.ok(accountIds.includes('account-order-history'));
  assert.equal(new Set(accountIds).size, accountIds.length);

  assert.ok(PLATFORM_DASHBOARD_TOUR_STEPS.length >= 3);
  const platformIds = PLATFORM_DASHBOARD_TOUR_STEPS.map((s) => s.id);
  assert.ok(platformIds.includes('platform-rto-search'));
  assert.ok(platformIds.includes('platform-role-nav'));
  assert.equal(new Set(platformIds).size, platformIds.length);
});

test('computeTooltipPosition centers below target and flips to top when near bottom edge', () => {
  const normal = computeTooltipPosition({
    targetRect: { top: 120, left: 400, width: 160, height: 40 },
    tooltipWidth: 320,
    tooltipHeight: 180,
    viewport: { width: 1440, height: 900 },
    preferredPlacement: 'bottom',
  });
  assert.equal(normal.placement, 'bottom');
  assert.equal(normal.top, 174); // 120 + 40 + 14
  assert.equal(normal.left, 320); // 480 - 160
  assert.equal(normal.arrowOffset, 160);

  const nearBottom = computeTooltipPosition({
    targetRect: { top: 760, left: 400, width: 160, height: 40 },
    tooltipWidth: 320,
    tooltipHeight: 180,
    viewport: { width: 1440, height: 900 },
    preferredPlacement: 'bottom',
  });
  assert.equal(nearBottom.placement, 'top');
  assert.equal(nearBottom.top, 566); // 760 - 14 - 180
});

test('computeTooltipPosition clamps near horizontal viewport edges and falls back from right on narrow screens', () => {
  const clampedLeft = computeTooltipPosition({
    targetRect: { top: 100, left: 10, width: 80, height: 36 },
    tooltipWidth: 320,
    tooltipHeight: 160,
    viewport: { width: 1280, height: 800 },
    preferredPlacement: 'bottom',
  });
  assert.equal(clampedLeft.left, 16);
  assert.ok(clampedLeft.arrowOffset >= 22 && clampedLeft.arrowOffset <= 298);

  const narrowFallback = computeTooltipPosition({
    targetRect: { top: 80, left: 40, width: 300, height: 60 },
    tooltipWidth: 320,
    tooltipHeight: 160,
    viewport: { width: 390, height: 844 },
    preferredPlacement: 'right',
  });
  assert.equal(narrowFallback.placement, 'bottom');
  assert.ok(narrowFallback.left >= 16);
  assert.ok(narrowFallback.top >= 140);
});

test('step transitions and tour completion persistence behave deterministically', () => {
  assert.deepEqual(advanceTourStep(0, 5), { nextIndex: 1, completed: false });
  assert.deepEqual(advanceTourStep(4, 5), { nextIndex: 4, completed: true });
  assert.equal(retreatTourStep(0, 5), 0);
  assert.equal(retreatTourStep(3, 5), 2);

  const store = createMemoryStorage();
  assert.equal(isTourCompleted(ACCOUNT_DASHBOARD_TOUR_ID, store), false);
  markTourCompleted(ACCOUNT_DASHBOARD_TOUR_ID, store);
  assert.equal(isTourCompleted(ACCOUNT_DASHBOARD_TOUR_ID, store), true);
  assert.equal(isTourCompleted(PLATFORM_DASHBOARD_TOUR_ID, store), false);

  resetTourCompletion(ACCOUNT_DASHBOARD_TOUR_ID, store);
  assert.equal(isTourCompleted(ACCOUNT_DASHBOARD_TOUR_ID, store), false);
});
