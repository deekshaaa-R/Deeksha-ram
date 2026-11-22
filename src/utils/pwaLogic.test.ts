import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectInstallPlatform,
  detectStandaloneMode,
  getInstallGuideSteps,
  resolveInitialViewFromSearch,
  resolveInstallPromptMode,
} from './pwaLogic.ts';

test('detectStandaloneMode identifies standalone display mode, iOS navigator.standalone, and TWA referrer', () => {
  assert.equal(detectStandaloneMode({ displayModeStandalone: true }), true);
  assert.equal(detectStandaloneMode({ displayModeStandalone: false, navigatorStandalone: true }), true);
  assert.equal(
    detectStandaloneMode({
      displayModeStandalone: false,
      navigatorStandalone: false,
      referrer: 'android-app://com.vstech.fleet',
    }),
    true
  );
  assert.equal(
    detectStandaloneMode({
      displayModeStandalone: false,
      navigatorStandalone: false,
      referrer: 'https://google.com',
    }),
    false
  );
});

test('detectInstallPlatform distinguishes iOS, iPadOS desktop UA, Android, and Desktop browsers', () => {
  assert.equal(
    detectInstallPlatform({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
    }),
    'ios'
  );
  assert.equal(
    detectInstallPlatform({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      maxTouchPoints: 5,
    }),
    'ios'
  );
  assert.equal(
    detectInstallPlatform({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/125.0',
    }),
    'android'
  );
  assert.equal(
    detectInstallPlatform({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0',
      maxTouchPoints: 0,
    }),
    'desktop'
  );
});

test('resolveInstallPromptMode picks installed > native > ios-guide > desktop-guide', () => {
  assert.equal(
    resolveInstallPromptMode({ isInstalled: true, hasNativePrompt: true, platform: 'android' }),
    'installed'
  );
  assert.equal(
    resolveInstallPromptMode({ isInstalled: false, hasNativePrompt: true, platform: 'desktop' }),
    'native'
  );
  assert.equal(
    resolveInstallPromptMode({ isInstalled: false, hasNativePrompt: false, platform: 'ios' }),
    'ios-guide'
  );
  assert.equal(
    resolveInstallPromptMode({ isInstalled: false, hasNativePrompt: false, platform: 'desktop' }),
    'desktop-guide'
  );
});

test('getInstallGuideSteps returns non-empty instructions for every platform', () => {
  for (const platform of ['ios', 'android', 'desktop'] as const) {
    const guide = getInstallGuideSteps(platform);
    assert.ok(guide.heading.includes('VS Tech'));
    assert.equal(guide.steps.length, 3);
  }
});

test('resolveInitialViewFromSearch parses PWA shortcut query strings safely', () => {
  assert.equal(resolveInitialViewFromSearch('?view=account'), 'account');
  assert.equal(resolveInitialViewFromSearch('?view=shop'), 'shop');
  assert.equal(resolveInitialViewFromSearch('?view=book-demo'), 'book-demo');
  assert.equal(resolveInitialViewFromSearch('?view=unknown'), 'home');
  assert.equal(resolveInitialViewFromSearch(''), 'home');
});
