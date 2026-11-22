export type InstallPlatform = 'ios' | 'android' | 'desktop';
export type InstallPromptMode = 'installed' | 'native' | 'ios-guide' | 'desktop-guide';

export interface StandaloneCheckInput {
  displayModeStandalone: boolean;
  navigatorStandalone?: boolean;
  referrer?: string;
}

export interface InstallPlatformInput {
  userAgent: string;
  maxTouchPoints?: number;
}

export interface InstallGuideStep {
  title: string;
  detail: string;
}

export function detectStandaloneMode(input: StandaloneCheckInput): boolean {
  if (input.displayModeStandalone) return true;
  if (input.navigatorStandalone === true) return true;
  if (input.referrer && input.referrer.startsWith('android-app://')) return true;
  return false;
}

export function detectInstallPlatform(input: InstallPlatformInput): InstallPlatform {
  const ua = (input.userAgent || '').toLowerCase();
  const isIPadOSDesktopUA = ua.includes('macintosh') && (input.maxTouchPoints ?? 0) > 1;
  if (/iphone|ipad|ipod/.test(ua) || isIPadOSDesktopUA) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'desktop';
}

export function resolveInstallPromptMode(params: {
  isInstalled: boolean;
  hasNativePrompt: boolean;
  platform: InstallPlatform;
}): InstallPromptMode {
  if (params.isInstalled) return 'installed';
  if (params.hasNativePrompt) return 'native';
  if (params.platform === 'ios') return 'ios-guide';
  return 'desktop-guide';
}

export function getInstallGuideSteps(platform: InstallPlatform): {
  heading: string;
  subtitle: string;
  steps: InstallGuideStep[];
} {
  if (platform === 'ios') {
    return {
      heading: 'Install VS Tech on iPhone / iPad',
      subtitle: 'Add VS Technology to your Home Screen for full-screen mobile app access.',
      steps: [
        {
          title: '1. Tap the Share button',
          detail: 'In Safari, tap the Share icon (square with an upward arrow) in the bottom or top bar.',
        },
        {
          title: '2. Choose "Add to Home Screen"',
          detail: 'Scroll down the Share sheet and tap Add to Home Screen.',
        },
        {
          title: '3. Tap "Add"',
          detail: 'Launch VS Tech directly from your Home Screen just like a native app.',
        },
      ],
    };
  }

  if (platform === 'android') {
    return {
      heading: 'Install VS Tech on Android',
      subtitle: 'Install the web app to your home screen for one-tap fleet access and offline support.',
      steps: [
        {
          title: '1. Open Browser Menu',
          detail: 'Tap the three-dot menu icon in the top-right corner of Chrome or Edge.',
        },
        {
          title: '2. Tap "Install app" or "Add to Home screen"',
          detail: 'Confirm the VS Tech app icon and name when prompted.',
        },
        {
          title: '3. Open from Home Screen',
          detail: 'Runs in standalone app mode with cached fleet pages and offline tools.',
        },
      ],
    };
  }

  return {
    heading: 'Install VS Tech Desktop App',
    subtitle: 'Pin VS Technology as a standalone desktop window with offline asset caching.',
    steps: [
      {
        title: '1. Look at the browser address bar',
        detail: 'In Chrome or Edge, click the Install icon on the right side of the URL bar (or open Browser Menu -> Cast, save, and share -> Install page as app).',
      },
      {
        title: '2. Confirm installation',
        detail: 'Click Install to add VS Tech to your desktop / Applications dock.',
      },
      {
        title: '3. Note on embedded previews',
        detail: 'If viewing inside an embedded preview frame, open the live URL in a standalone browser tab first to enable one-click installation.',
      },
    ],
  };
}

export function resolveInitialViewFromSearch(
  search: string
): 'home' | 'account' | 'shop' | 'book-demo' | 'platform' | 'new-vehicle' {
  if (!search) return 'home';
  const params = new URLSearchParams(search);
  const view = params.get('view');
  if (
    view === 'account' ||
    view === 'shop' ||
    view === 'book-demo' ||
    view === 'platform' ||
    view === 'new-vehicle'
  ) {
    return view;
  }
  return 'home';
}

