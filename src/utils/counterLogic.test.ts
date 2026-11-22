import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCounterProgress,
  easeOutCubic,
  formatCounterValue,
} from './counterLogic';

test('computeCounterProgress clamps negative elapsed times to 0 and bounds to 1', () => {
  assert.equal(computeCounterProgress(-12, 800), 0);
  assert.equal(computeCounterProgress(0, 800), 0);
  assert.equal(computeCounterProgress(400, 800), 0.5);
  assert.equal(computeCounterProgress(1200, 800), 1);
  assert.equal(computeCounterProgress(10, 0), 1);
});

test('easeOutCubic curves monotonically between 0 and 1', () => {
  assert.equal(easeOutCubic(-0.2), 0);
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(0.5), 0.875);
  assert.equal(easeOutCubic(1.5), 1);
});

test('formatCounterValue formats integer and decimal telematics metrics safely', () => {
  assert.equal(formatCounterValue(14280, 0, '', '+'), '14,280+');
  assert.equal(formatCounterValue(4.8, 1, '', 'M+'), '4.8M+');
  assert.equal(formatCounterValue(18.4, 1, '', '%'), '18.4%');
  assert.equal(formatCounterValue(-5, 0, '', '+'), '0+');
});
